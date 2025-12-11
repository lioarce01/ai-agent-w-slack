import { NextResponse } from "next/server"
import { listWorkflows } from "@/lib/workflow-engine"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit")) || 50

    const workflows = await listWorkflows(limit)

    return NextResponse.json({
      success: true,
      workflows,
      count: workflows.length,
    })
  } catch (error) {
    console.error("Failed to list workflows:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list workflows" },
      { status: 500 },
    )
  }
}
