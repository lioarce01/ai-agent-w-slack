import { NextResponse } from "next/server"
import { runWorkflow, type WorkflowInput } from "@/lib/workflows/workflow-runner"
import type { WorkflowType } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { type, description, amount, customer_id, customer_name, reason, metadata } = body

    // Validate required fields
    if (!description) {
      return NextResponse.json({ error: "Missing required field: description" }, { status: 400 })
    }

    // Validate workflow type if provided (map "general" to auto-classify)
    let normalizedType: WorkflowType | undefined = undefined
    if (type) {
      const validTypes: WorkflowType[] = ["refund", "high_value_operation", "ambiguous_request"]
      if (type === "general") {
        normalizedType = undefined
      } else if (validTypes.includes(type)) {
        normalizedType = type
      } else {
        return NextResponse.json(
          { error: `Invalid workflow type. Must be one of: ${[...validTypes, "general"].join(", ")}` },
          { status: 400 },
        )
      }
    }

    // Prepare workflow input
    const workflowInput: WorkflowInput = {
      type: normalizedType,
      description,
      amount: amount ? Number(amount) : undefined,
      customer_id,
      customer_name,
      reason,
      metadata,
    }

    // Run the workflow - creates workflow record and starts durable execution
    const { workflow_id, run_id } = await runWorkflow(workflowInput)

    return NextResponse.json({
      success: true,
      workflow_id,
      run_id,
      message: "Workflow started",
    })
  } catch (error) {
    console.error("Failed to create workflow:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workflow" },
      { status: 500 },
    )
  }
}
