export type WorkflowType = "refund" | "high_value_operation" | "ambiguous_request"

export type WorkflowStatus =
  | "pending"
  | "processing"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "failed"

export interface Workflow {
  id: string
  type: WorkflowType
  status: WorkflowStatus
  request_data: {
    description: string
    amount?: number
    customer_id?: string
    customer_name?: string
    reason?: string
    [key: string]: unknown
  }
  ai_analysis?: {
    requires_approval: boolean
    approval_reason?: string
    risk_level?: "low" | "medium" | "high"
    recommended_action?: string
    parsed_instructions?: string[]
  }
  slack_message_ts?: string
  slack_channel_id?: string
  decision_reason?: string
  decided_by?: string
  decided_at?: string
  created_at: string
  updated_at: string
}

export interface WorkflowLog {
  id: string
  workflow_id: string
  step: string
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface InstructionRule {
  condition: string
  action: "approve" | "reject" | "request_approval" | "clarify"
  threshold?: number
  message?: string
}

export interface ParsedInstructions {
  type: WorkflowType
  rules: InstructionRule[]
  defaultAction: "approve" | "reject" | "request_approval"
}
