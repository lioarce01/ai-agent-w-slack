import { NextResponse } from "next/server"
import { createWorkflow, processWorkflow } from "@/lib/workflow-engine"
import type { WorkflowType } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { type, description, amount, customer_id, customer_name, reason, metadata } = body

    // Validate required fields
    if (!type || !description) {
      return NextResponse.json({ error: "Missing required fields: type and description" }, { status: 400 })
    }

    // Validate workflow type
    const validTypes: WorkflowType[] = ["refund", "high_value_operation", "ambiguous_request"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid workflow type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      )
    }

    // Create the workflow
    const workflow = await createWorkflow({
      type,
      description,
      amount: amount ? Number(amount) : undefined,
      customer_id,
      customer_name,
      reason,
      metadata,
    })

    // Process the workflow asynchronously (don't await to return quickly)
    // In production, you might use a queue like Vercel Queues
    processWorkflow(workflow.id).catch((error) => {
      console.error(`Failed to process workflow ${workflow.id}:`, error)
    })

    return NextResponse.json({
      success: true,
      workflow_id: workflow.id,
      status: workflow.status,
      message: "Workflow created and processing started",
    })
  } catch (error) {
    console.error("Failed to create workflow:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workflow" },
      { status: 500 },
    )
  }
}
