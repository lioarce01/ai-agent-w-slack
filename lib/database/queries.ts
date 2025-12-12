import { createClient } from "../supabase/server"
import type { Workflow, WorkflowLog } from "../types"

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
