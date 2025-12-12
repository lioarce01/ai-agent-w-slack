import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { WebClient } from "@slack/web-api"
import crypto from "crypto"

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

// Verify Slack request signature
function verifySlackSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get("x-slack-signature")
  const timestamp = request.headers.get("x-slack-request-timestamp")

  if (!signature || !timestamp) {
    return false
  }

  // Check if timestamp is within 5 minutes
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false
  }

  // Compute the expected signature
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    console.error("SLACK_SIGNING_SECRET is not configured")
    return false
  }

  const sigBaseString = `v0:${timestamp}:${body}`
  const expectedSignature =
    "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBaseString).digest("hex")

  // Compare signatures (timing-safe comparison)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch (error) {
    // Buffers must be the same length for timingSafeEqual
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()

    // Verify Slack signature
    if (!verifySlackSignature(request, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse payload
    const payload = JSON.parse(new URLSearchParams(body).get("payload") || "{}")

    // Handle different payload types
    if (payload.type === "block_actions") {
      const action = payload.actions[0]
      const workflow_id = action.value
      const action_id = action.action_id // "approve" or "reject"
      const user = payload.user

      // Get workflow from database
      const supabase = await createClient()
      const { data: workflow, error: fetchError } = await supabase
        .from("workflows")
        .select()
        .eq("id", workflow_id)
        .single()

      if (fetchError || !workflow) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
      }

      const workflow_run_id = (workflow.request_data as any)?.workflow_run_id

      if (workflow.status !== "waiting_approval") {
        return NextResponse.json({ error: "Workflow is not waiting for approval" }, { status: 400 })
      }

      // Determine the status (convert "approve" -> "approved", "reject" -> "rejected")
      const decision_status = action_id === "approve" ? "approved" : "rejected"
      const decided_by = user.real_name || user.name || user.id
      const decision_reason = `${decision_status === "approved" ? "Approved" : "Rejected"} by ${decided_by} via Slack`

      await supabase
        .from("workflows")
        .update({
          status: decision_status,
          decision_reason,
          decided_by,
          decided_at: new Date().toISOString(),
        })
        .eq("id", workflow_id)

      await supabase.from("workflow_logs").insert({
        workflow_id,
        step: "human_decision",
        message: `Human decision received: ${decision_status}`,
        metadata: {
          decided_by,
          decision: decision_status,
          workflow_run_id,
        },
      })

      // Update Slack message to show decision
      if (workflow.slack_message_ts && workflow.slack_channel_id) {
        await slack.chat.update({
          channel: workflow.slack_channel_id,
          ts: workflow.slack_message_ts,
          text: `Workflow ${workflow_id} - Decision: ${decision_status}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: decision_status === "approved" ? "Workflow Approved" : "Workflow Rejected",
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Workflow ID:*\n${workflow_id}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Decision:*\n${decision_status.toUpperCase()}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Decided by:*\n${decided_by}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Time:*\n${new Date().toLocaleString()}`,
                },
              ],
            },
          ],
        })
      }

      // Complete workflow if approved
      if (decision_status === "approved") {
        await supabase
          .from("workflows")
          .update({ status: "completed" })
          .eq("id", workflow_id)

        await supabase.from("workflow_logs").insert({
          workflow_id,
          step: "completed",
          message: "Workflow completed after human approval",
          metadata: {
            workflow_run_id,
          },
        })
      } else {
        await supabase.from("workflow_logs").insert({
          workflow_id,
          step: "rejected",
          message: "Workflow rejected by human operator",
          metadata: {
            workflow_run_id,
          },
        })
      }

      // Acknowledge Slack action
      return NextResponse.json({ ok: true })
    }

    // Handle URL verification challenge (for initial setup)
    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Slack webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
