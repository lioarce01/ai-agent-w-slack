import { NextResponse } from "next/server"
import { resumeWorkflow } from "@/lib/workflow-engine"
import { verifySlackSignature } from "@/lib/slack-client"

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Get Slack headers
    const signature = request.headers.get("x-slack-signature") || ""
    const timestamp = request.headers.get("x-slack-request-timestamp") || ""

    // Verify signature (simplified for demo - in production use proper HMAC verification)
    if (process.env.SLACK_SIGNING_SECRET && !verifySlackSignature(signature, timestamp, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the payload
    const formData = new URLSearchParams(rawBody)
    const payloadString = formData.get("payload")

    if (!payloadString) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 })
    }

    const payload = JSON.parse(payloadString)

    // Handle different payload types
    if (payload.type === "block_actions") {
      const action = payload.actions?.[0]
      const user = payload.user

      if (!action) {
        return NextResponse.json({ error: "No action found" }, { status: 400 })
      }

      const workflowId = action.value
      const actionId = action.action_id

      if (!workflowId) {
        return NextResponse.json({ error: "Missing workflow ID" }, { status: 400 })
      }

      // Determine decision based on action
      let decision: "approved" | "rejected"
      if (actionId === "approve_workflow") {
        decision = "approved"
      } else if (actionId === "reject_workflow") {
        decision = "rejected"
      } else {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
      }

      // Get user info for attribution
      const decidedBy = user?.real_name || user?.name || user?.username || "Unknown User"

      // Resume the workflow with the decision
      await resumeWorkflow(workflowId, decision, decidedBy)

      // Acknowledge the action immediately (Slack expects quick response)
      return NextResponse.json({
        response_action: "update",
        text: `Workflow ${decision} by ${decidedBy}`,
      })
    }

    // Handle URL verification challenge (for initial setup)
    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Slack webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    )
  }
}
