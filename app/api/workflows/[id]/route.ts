import { NextResponse } from "next/server"
import { getWorkflow, getWorkflowLogs } from "@/lib/database/queries"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const workflow = await getWorkflow(id)

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const logs = await getWorkflowLogs(id)

    return NextResponse.json({
      success: true,
      workflow,
      logs,
    })
  } catch (error) {
    console.error("Failed to get workflow:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get workflow" },
      { status: 500 },
    )
  }
}
