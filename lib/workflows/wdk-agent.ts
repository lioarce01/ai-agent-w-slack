import { DurableAgent } from "@workflow/ai/agent"
import { WebClient } from "@slack/web-api"
import type { ModelMessage } from "ai"
import { randomUUID } from "node:crypto"
import { WritableStream } from "node:stream/web"
import { createClient } from "../supabase/server"
import type { Workflow, WorkflowType } from "../types"
import { getUnifiedInstructions } from "../instruction-parser"

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export interface WorkflowInput {
  type?: WorkflowType // Optional - will be inferred by AI if not provided
  description: string
  amount?: number
  customer_id?: string
  customer_name?: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface AIAnalysisResult {
  requires_approval: boolean
  approval_reason?: string
  risk_level: "low" | "medium" | "high"
  recommended_action: "approve" | "reject" | "request_approval" | "clarify"
  confidence: number
  explanation: string
  inferred_type?: WorkflowType
  classification_confidence?: number
}

interface StepContext {
  workflow_id: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

const ALLOWED_TYPES: WorkflowType[] = ["refund", "high_value_operation", "ambiguous_request"]

function normalizeWorkflowType(inputType?: WorkflowType): WorkflowType {
  if (inputType && ALLOWED_TYPES.includes(inputType)) {
    return inputType
  }
  return "ambiguous_request"
}

async function logStep(ctx: StepContext, step: string, message: string, metadata?: Record<string, unknown>) {
  "use step"
  await ctx.supabase.from("workflow_logs").insert({
    workflow_id: ctx.workflow_id,
    step,
    message,
    metadata,
  })
}

async function updateWorkflowStatus(
  ctx: StepContext,
  status: Workflow["status"],
  updates?: Partial<Workflow>,
) {
  "use step"
  await ctx.supabase
    .from("workflows")
    .update({
      status,
      ...updates,
    })
    .eq("id", ctx.workflow_id)
}

async function initStep(input: WorkflowInput, run_id: string): Promise<{ workflow_id: string; context: StepContext }> {
  "use step"
  const supabase = await createClient()
  const normalizedType = normalizeWorkflowType(input.type)

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      type: normalizedType,
      status: "pending",
      request_data: {
        description: input.description,
        amount: input.amount,
        customer_id: input.customer_id,
        customer_name: input.customer_name,
        reason: input.reason,
        workflow_run_id: run_id,
        original_type: input.type || "unspecified",
        ...input.metadata,
      },
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create workflow: ${error.message}`)

  const context: StepContext = {
    workflow_id: data.id,
    supabase,
  }

  await logStep(
    context,
    "initialized",
    "Workflow initialized (WDK) - Type: " + (input.type || "auto-classify -> ambiguous_request"),
    { normalizedType, original_type: input.type || "unspecified" },
  )

  return { workflow_id: data.id, context }
}

async function runDurableAgent(input: WorkflowInput): Promise<AIAnalysisResult> {
  "use step"
  const agent = new DurableAgent({
    model: process.env.WORKFLOW_AI_MODEL || "google/gemini-2.0-flash",
    system: getUnifiedInstructions(),
  })

  const userMessage = buildUserMessage(input)
  const { messages } = await agent.stream({
    messages: [userMessage],
    writable: new WritableStream(), // discard streaming chunks; we only need final message
    sendStart: false,
    sendFinish: false,
  })

  const assistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
  const analysis = parseAssistantMessage(assistantMessage)
  return analysis
}

function buildUserMessage(input: WorkflowInput): ModelMessage {
  const scenarioText = input.type ? `- Scenario: ${input.type}` : ""

  return {
    role: "user",
    content: [
      {
        type: "text",
        text: `You are an AI workflow agent. Analyze the following request and respond with a JSON object.\n\n${input.type ? "" : "IMPORTANT: First classify this request into one of these types: refund, high_value_operation, ambiguous_request, or general.\n\n"}Request:\n${scenarioText}\n- Description: ${input.description}\n- Amount: ${input.amount ?? "N/A"}\n- Customer: ${input.customer_name || input.customer_id || "Unknown"}\n- Reason: ${input.reason || "Not provided"}`,
      },
    ],
  }
}

function parseAssistantMessage(message: ModelMessage | undefined): AIAnalysisResult {
  if (!message) {
    return {
      requires_approval: true,
      approval_reason: "No response from agent",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0,
      explanation: "Agent returned no assistant message",
    }
  }

  const text =
    typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
        ? message.content
            .map((c: any) => {
              if (typeof c === "string") return c
              if (c?.text) return c.text
              if (c?.content) return c.content
              return ""
            })
            .filter(Boolean)
            .join("\n")
        : ""
  if (!text) {
    return {
      requires_approval: true,
      approval_reason: "Empty response from agent",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0,
      explanation: "Agent returned empty content",
    }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      requires_approval: true,
      approval_reason: "Unstructured response",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0.5,
      explanation: text,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult
    return parsed
  } catch {
    return {
      requires_approval: true,
      approval_reason: "Failed to parse agent JSON",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0.5,
      explanation: text,
    }
  }
}

async function aiAnalysisStep(ctx: StepContext, input: WorkflowInput): Promise<AIAnalysisResult> {
  "use step"
  await updateWorkflowStatus(ctx, "processing")
  await logStep(ctx, "processing", "Starting AI analysis (DurableAgent)")

  const result = await runDurableAgent(input)

  // Update workflow with inferred type if classified
  const updates: Record<string, unknown> = {
    ai_analysis: {
      requires_approval: result.requires_approval,
      approval_reason: result.approval_reason,
      risk_level: result.risk_level,
      recommended_action: result.recommended_action,
      inferred_type: result.inferred_type,
      classification_confidence: result.classification_confidence,
    },
  }

  // Update the workflow type if it was inferred
  if (result.inferred_type && !input.type && normalizeWorkflowType(result.inferred_type) === result.inferred_type) {
    updates.type = result.inferred_type
  }

  await ctx.supabase.from("workflows").update(updates).eq("id", ctx.workflow_id)

  await logStep(ctx, "analyzed", `AI Analysis complete: ${result.explanation}`, { analysis: result })

  return result
}

async function autoApprove(ctx: StepContext, analysis: AIAnalysisResult) {
  "use step"
  await updateWorkflowStatus(ctx, "approved", {
    decision_reason: analysis.explanation,
    decided_by: "AI Agent (Auto-approved)",
    decided_at: new Date().toISOString(),
  })
  await logStep(ctx, "auto_approved", "Request auto-approved by AI agent")
  await updateWorkflowStatus(ctx, "completed")
  await logStep(ctx, "completed", "Workflow completed successfully")
}

async function autoReject(ctx: StepContext, analysis: AIAnalysisResult) {
  "use step"
  await updateWorkflowStatus(ctx, "rejected", {
    decision_reason: analysis.explanation,
    decided_by: "AI Agent (Auto-rejected)",
    decided_at: new Date().toISOString(),
  })
  await logStep(ctx, "auto_rejected", "Request auto-rejected by AI agent")
}

async function requestHumanApproval(ctx: StepContext, input: WorkflowInput, analysis: AIAnalysisResult) {
  "use step"
  await logStep(ctx, "requesting_approval", "Requesting human approval via Slack (WDK)")

  const channel_id = process.env.SLACK_CHANNEL_ID!

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Workflow Approval Required",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Workflow ID:*\n\`${ctx.workflow_id}\``,
        },
        {
          type: "mrkdwn",
          text: `*Scenario:*\n${input.type}`,
        },
        {
          type: "mrkdwn",
          text: `*Amount:*\n${input.amount ? `$${input.amount}` : "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Risk Level:*\n${analysis.risk_level.toUpperCase()}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Description:*\n${input.description}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:*\n${input.reason || "Not provided"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*AI Recommendation:*\n${analysis.recommended_action}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*AI Explanation:*\n${analysis.explanation}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Approve",
          },
          style: "primary",
          action_id: "approve",
          value: ctx.workflow_id,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Reject",
          },
          style: "danger",
          action_id: "reject",
          value: ctx.workflow_id,
        },
      ],
    },
  ]

  try {
    const result = await slack.chat.postMessage({
      channel: channel_id,
      text: `Workflow ${ctx.workflow_id} requires approval`,
      blocks,
    })

    await updateWorkflowStatus(ctx, "waiting_approval", {
      slack_message_ts: result.ts!,
      slack_channel_id: result.channel!,
    })

    await logStep(ctx, "waiting_approval", "Approval request sent to Slack", {
      slack_message_ts: result.ts,
    })
  } catch (error) {
    await updateWorkflowStatus(ctx, "failed")
    await logStep(ctx, "failed", `Failed to send Slack notification: ${error instanceof Error ? error.message : "Unknown error"}`)
    throw error
  }
}

async function routeDecision(ctx: StepContext, input: WorkflowInput, analysis: AIAnalysisResult) {
  "use step"
  if (analysis.recommended_action === "approve" && !analysis.requires_approval) {
    await autoApprove(ctx, analysis)
    return
  }
  if (analysis.recommended_action === "reject" && analysis.confidence > 0.9) {
    await autoReject(ctx, analysis)
    return
  }

  await requestHumanApproval(ctx, input, analysis)
}

export async function startWorkflow(input: WorkflowInput): Promise<{ workflow_id: string; run_id: string }> {
  "use workflow"
  const run_id = randomUUID()
  const { workflow_id, context } = await initStep(input, run_id)

  try {
    const analysis = await aiAnalysisStep(context, input)
    await routeDecision(context, input, analysis)
  } catch (error) {
    await context.supabase.from("workflows").update({ status: "failed" }).eq("id", workflow_id)
    await context.supabase.from("workflow_logs").insert({
      workflow_id,
      step: "error",
      message: `Workflow execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }

  return { workflow_id, run_id }
}

