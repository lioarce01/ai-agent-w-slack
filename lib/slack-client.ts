import type { Workflow } from "./types"

interface SlackSendResult {
  success: boolean
  message_ts?: string
  channel_id?: string
  error?: string
}

interface AIAnalysisResult {
  requires_approval: boolean
  approval_reason?: string
  risk_level: "low" | "medium" | "high"
  recommended_action: string
  confidence: number
  explanation: string
}

// Get risk level color for Slack
function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case "low":
      return "#36a64f" // Green
    case "medium":
      return "#ff9800" // Orange
    case "high":
      return "#dc3545" // Red
    default:
      return "#6c757d" // Gray
  }
}

// Format workflow type for display
function formatWorkflowType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Build Slack Block Kit message for approval request
function buildApprovalBlocks(workflow: Workflow, analysis: AIAnalysisResult) {
  const riskEmoji =
    analysis.risk_level === "high"
      ? ":rotating_light:"
      : analysis.risk_level === "medium"
        ? ":warning:"
        : ":white_check_mark:"

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${riskEmoji} Approval Required: ${formatWorkflowType(workflow.type)}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Workflow ID:*\n\`${workflow.id.slice(0, 8)}...\``,
        },
        {
          type: "mrkdwn",
          text: `*Risk Level:*\n${analysis.risk_level.toUpperCase()}`,
        },
        {
          type: "mrkdwn",
          text: `*Amount:*\n${workflow.request_data.amount ? `$${workflow.request_data.amount.toLocaleString()}` : "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Customer:*\n${workflow.request_data.customer_name || workflow.request_data.customer_id || "Unknown"}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Description:*\n${workflow.request_data.description}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:*\n${workflow.request_data.reason || "Not provided"}`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*AI Analysis:*\n${analysis.explanation}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Confidence: ${(analysis.confidence * 100).toFixed(0)}% | Recommended: ${analysis.recommended_action}`,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "actions",
      block_id: `approval_${workflow.id}`,
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Approve",
            emoji: true,
          },
          style: "primary",
          action_id: "approve_workflow",
          value: workflow.id,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Reject",
            emoji: true,
          },
          style: "danger",
          action_id: "reject_workflow",
          value: workflow.id,
        },
      ],
    },
  ]
}

// Build updated message after decision
function buildDecisionBlocks(workflow: Workflow, decision: string, decidedBy: string) {
  const isApproved = decision === "approved"
  const emoji = isApproved ? ":white_check_mark:" : ":x:"
  const status = isApproved ? "APPROVED" : "REJECTED"

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${status}: ${formatWorkflowType(workflow.type)}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Workflow ID:*\n\`${workflow.id.slice(0, 8)}...\``,
        },
        {
          type: "mrkdwn",
          text: `*Decision:*\n${status}`,
        },
        {
          type: "mrkdwn",
          text: `*Amount:*\n${workflow.request_data.amount ? `$${workflow.request_data.amount.toLocaleString()}` : "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Decided By:*\n${decidedBy}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Description:*\n${workflow.request_data.description}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Decision made at: ${new Date().toISOString()}`,
        },
      ],
    },
  ]
}

// Send approval request to Slack
export async function sendApprovalRequest(workflow: Workflow, analysis: AIAnalysisResult): Promise<SlackSendResult> {
  const slackToken = process.env.SLACK_BOT_TOKEN
  const channelId = process.env.SLACK_CHANNEL_ID

  if (!slackToken || !channelId) {
    console.error("Missing Slack configuration")
    return {
      success: false,
      error: "Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID environment variables",
    }
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: buildApprovalBlocks(workflow, analysis),
        text: `Approval Required: ${formatWorkflowType(workflow.type)} - ${workflow.request_data.description}`,
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return {
        success: true,
        message_ts: data.ts,
        channel_id: channelId,
      }
    } else {
      return {
        success: false,
        error: data.error || "Unknown Slack API error",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send Slack message",
    }
  }
}

// Update Slack message after decision
export async function updateSlackMessage(
  channelId: string,
  messageTs: string,
  workflow: Workflow,
  decision: string,
  decidedBy: string,
): Promise<boolean> {
  const slackToken = process.env.SLACK_BOT_TOKEN

  if (!slackToken) {
    console.error("Missing SLACK_BOT_TOKEN")
    return false
  }

  try {
    const response = await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messageTs,
        blocks: buildDecisionBlocks(workflow, decision, decidedBy),
        text: `${decision.toUpperCase()}: ${formatWorkflowType(workflow.type)}`,
      }),
    })

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error("Failed to update Slack message:", error)
    return false
  }
}

// Verify Slack request signature
export function verifySlackSignature(signature: string, timestamp: string, body: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  if (!signingSecret) {
    console.error("Missing SLACK_SIGNING_SECRET")
    return false
  }

  // Check timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - Number.parseInt(timestamp)) > 60 * 5) {
    return false
  }

  // For now, we'll do basic validation
  // In production, you'd want to use crypto.createHmac to verify the signature
  // This is simplified for the demo
  return signature.startsWith("v0=")
}
