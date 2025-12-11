import { generateText } from "ai"
import { createClient } from "./supabase/server"
import type { Workflow, WorkflowType, WorkflowLog } from "./types"
import { getInstructionsContext, parseInstructions } from "./instruction-parser"
import { sendApprovalRequest, updateSlackMessage } from "./slack-client"

interface WorkflowInput {
  type: WorkflowType
  description: string
  amount?: number
  customer_id?: string
  customer_name?: string
  reason?: string
  metadata?: Record<string, unknown>
}

interface AIAnalysisResult {
  requires_approval: boolean
  approval_reason?: string
  risk_level: "low" | "medium" | "high"
  recommended_action: "approve" | "reject" | "request_approval" | "clarify"
  confidence: number
  explanation: string
}

// Create a new workflow
export async function createWorkflow(input: WorkflowInput): Promise<Workflow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      type: input.type,
      status: "pending",
      request_data: {
        description: input.description,
        amount: input.amount,
        customer_id: input.customer_id,
        customer_name: input.customer_name,
        reason: input.reason,
        ...input.metadata,
      },
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create workflow: ${error.message}`)

  await addWorkflowLog(data.id, "created", "Workflow created and queued for processing")

  return data
}

// Add a log entry to a workflow
export async function addWorkflowLog(
  workflowId: string,
  step: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<WorkflowLog> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflow_logs")
    .insert({
      workflow_id: workflowId,
      step,
      message,
      metadata,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add workflow log: ${error.message}`)

  return data
}

// Update workflow status
export async function updateWorkflowStatus(
  workflowId: string,
  status: Workflow["status"],
  additionalData?: Partial<Workflow>,
): Promise<Workflow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflows")
    .update({
      status,
      ...additionalData,
    })
    .eq("id", workflowId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update workflow: ${error.message}`)

  return data
}

// Get workflow by ID
export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("workflows").select().eq("id", workflowId).single()

  if (error) return null

  return data
}

// Get workflow logs
export async function getWorkflowLogs(workflowId: string): Promise<WorkflowLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflow_logs")
    .select()
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true })

  if (error) return []

  return data
}

// List all workflows
export async function listWorkflows(limit = 50): Promise<Workflow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflows")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return []

  return data
}

// AI-powered analysis of the workflow request
async function analyzeWithAI(workflow: Workflow): Promise<AIAnalysisResult> {
  const instructions = getInstructionsContext(workflow.type)
  const parsedRules = parseInstructions(workflow.type)

  const prompt = `You are an AI agent that analyzes requests and determines if they require human approval.

## Instructions/Policy:
${instructions}

## Request to Analyze:
Type: ${workflow.type}
Description: ${workflow.request_data.description}
Amount: ${workflow.request_data.amount ? `$${workflow.request_data.amount}` : "N/A"}
Customer: ${workflow.request_data.customer_name || workflow.request_data.customer_id || "Unknown"}
Reason: ${workflow.request_data.reason || "Not provided"}

## Your Task:
Analyze this request against the policy above and determine:
1. Does this request require human approval?
2. What is the risk level (low/medium/high)?
3. What action do you recommend (approve/reject/request_approval/clarify)?
4. Why did you reach this conclusion?

Respond in JSON format:
{
  "requires_approval": boolean,
  "approval_reason": "string explaining why approval is needed (if applicable)",
  "risk_level": "low" | "medium" | "high",
  "recommended_action": "approve" | "reject" | "request_approval" | "clarify",
  "confidence": number between 0 and 1,
  "explanation": "detailed explanation of your analysis"
}`

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
    })

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AIAnalysisResult
    }

    // Fallback if parsing fails
    return {
      requires_approval: true,
      approval_reason: "Could not parse AI response, defaulting to require approval",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0.5,
      explanation: text,
    }
  } catch (error) {
    console.error("AI analysis failed:", error)
    return {
      requires_approval: true,
      approval_reason: "AI analysis failed, defaulting to require approval",
      risk_level: "medium",
      recommended_action: "request_approval",
      confidence: 0,
      explanation: "Error during AI analysis",
    }
  }
}

// Main workflow processing function - this is the "DurableAgent" style processor
export async function processWorkflow(workflowId: string): Promise<Workflow> {
  let workflow = await getWorkflow(workflowId)
  if (!workflow) throw new Error("Workflow not found")

  try {
    // Step 1: Start processing
    await updateWorkflowStatus(workflowId, "processing")
    await addWorkflowLog(workflowId, "processing", "Starting workflow analysis")

    // Step 2: AI Analysis
    await addWorkflowLog(workflowId, "analyzing", "Running AI analysis on request")
    const analysis = await analyzeWithAI(workflow)

    // Store analysis results
    workflow = await updateWorkflowStatus(workflowId, "processing", {
      ai_analysis: {
        requires_approval: analysis.requires_approval,
        approval_reason: analysis.approval_reason,
        risk_level: analysis.risk_level,
        recommended_action: analysis.recommended_action,
      },
    })

    await addWorkflowLog(workflowId, "analyzed", `AI Analysis complete: ${analysis.explanation}`, {
      analysis,
    })

    // Step 3: Decision based on analysis
    if (analysis.recommended_action === "approve" && !analysis.requires_approval) {
      // Auto-approve
      workflow = await updateWorkflowStatus(workflowId, "approved", {
        decision_reason: analysis.explanation,
        decided_by: "AI Agent (Auto-approved)",
        decided_at: new Date().toISOString(),
      })
      await addWorkflowLog(workflowId, "auto_approved", "Request auto-approved by AI agent")

      // Complete the workflow
      workflow = await updateWorkflowStatus(workflowId, "completed")
      await addWorkflowLog(workflowId, "completed", "Workflow completed successfully")
    } else if (analysis.recommended_action === "reject" && analysis.confidence > 0.9) {
      // Auto-reject (only with high confidence)
      workflow = await updateWorkflowStatus(workflowId, "rejected", {
        decision_reason: analysis.explanation,
        decided_by: "AI Agent (Auto-rejected)",
        decided_at: new Date().toISOString(),
      })
      await addWorkflowLog(workflowId, "auto_rejected", "Request auto-rejected by AI agent")
    } else {
      // Request human approval via Slack
      await addWorkflowLog(workflowId, "requesting_approval", "Requesting human approval via Slack")

      const slackResult = await sendApprovalRequest(workflow, analysis)

      if (slackResult.success) {
        workflow = await updateWorkflowStatus(workflowId, "waiting_approval", {
          slack_message_ts: slackResult.message_ts,
          slack_channel_id: slackResult.channel_id,
        })
        await addWorkflowLog(workflowId, "waiting_approval", "Approval request sent to Slack", {
          slack_message_ts: slackResult.message_ts,
        })
      } else {
        // If Slack fails, mark as failed
        workflow = await updateWorkflowStatus(workflowId, "failed")
        await addWorkflowLog(workflowId, "failed", `Failed to send Slack notification: ${slackResult.error}`)
      }
    }

    return workflow
  } catch (error) {
    // Handle any errors
    await updateWorkflowStatus(workflowId, "failed")
    await addWorkflowLog(
      workflowId,
      "error",
      `Workflow processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    throw error
  }
}

// Resume a paused workflow after human decision
export async function resumeWorkflow(
  workflowId: string,
  decision: "approved" | "rejected",
  decidedBy: string,
  reason?: string,
): Promise<Workflow> {
  let workflow = await getWorkflow(workflowId)
  if (!workflow) throw new Error("Workflow not found")

  if (workflow.status !== "waiting_approval") {
    throw new Error("Workflow is not waiting for approval")
  }

  await addWorkflowLog(workflowId, "human_decision", `Human decision received: ${decision}`, {
    decided_by: decidedBy,
    reason,
  })

  // Update workflow with decision
  workflow = await updateWorkflowStatus(workflowId, decision, {
    decision_reason: reason || `${decision} by human operator`,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  })

  // Update Slack message
  if (workflow.slack_message_ts && workflow.slack_channel_id) {
    await updateSlackMessage(workflow.slack_channel_id, workflow.slack_message_ts, workflow, decision, decidedBy)
  }

  // Complete or handle rejection
  if (decision === "approved") {
    workflow = await updateWorkflowStatus(workflowId, "completed")
    await addWorkflowLog(workflowId, "completed", "Workflow completed after human approval")
  } else {
    await addWorkflowLog(workflowId, "rejected", "Workflow rejected by human operator")
  }

  return workflow
}
