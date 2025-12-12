"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Workflow, WorkflowLog } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface WorkflowStatusProps {
  workflowId: string
  onClose: () => void
}

const statusColors: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-300",
  processing: "bg-blue-100 text-blue-700 border-blue-300",
  waiting_approval: "bg-amber-100 text-amber-700 border-amber-300",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  failed: "bg-red-100 text-red-700 border-red-300",
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
}

export function WorkflowStatus({ workflowId, onClose }: WorkflowStatusProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [logs, setLogs] = useState<WorkflowLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${workflowId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch workflow")
        }

        setWorkflow(data.workflow)
        setLogs(data.logs)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflow()

    // Set up Supabase realtime subscription for workflow updates
    const supabase = createClient()

    const workflowChannel = supabase
      .channel(`workflow:${workflowId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflows",
          filter: `id=eq.${workflowId}`,
        },
        (payload) => {
          setWorkflow(payload.new as Workflow)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workflow_logs",
          filter: `workflow_id=eq.${workflowId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as WorkflowLog])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(workflowChannel)
    }
  }, [workflowId])

  if (loading) {
    return (
      <Card className="border border-zinc-200 bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
            <p className="text-sm text-zinc-600">Loading workflow...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !workflow) {
    return (
      <Card className="border border-red-200 bg-red-50 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-900">{error || "Workflow not found"}</p>
          <button onClick={onClose} className="mt-4 text-sm text-zinc-900 underline">
            Go back
          </button>
        </CardContent>
      </Card>
    )
  }

  const formatType = (type: string) =>
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")

  return (
    <Card className="border border-zinc-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-zinc-900">Workflow Details</CardTitle>
          <p className="mt-1 font-mono text-xs text-zinc-500">{workflow.id}</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Status and Type */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${statusColors[workflow.status]} border text-xs font-medium`}>
            {workflow.status.replace("_", " ").toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-zinc-300 text-zinc-700 text-xs">
            {formatType(workflow.type)}
            {workflow.ai_analysis?.inferred_type && (
              <span className="ml-1 text-zinc-400" title="Type was automatically classified by AI">
                ✨
              </span>
            )}
          </Badge>
          {workflow.ai_analysis?.risk_level && (
            <Badge className={`${riskColors[workflow.ai_analysis.risk_level]} text-xs`}>
              {workflow.ai_analysis.risk_level.toUpperCase()} RISK
            </Badge>
          )}
        </div>

        {/* Request Details */}
        <div className="rounded-md bg-zinc-50 p-4 border border-zinc-200">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Request Details</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Description:</dt>
              <dd className="text-right font-medium text-zinc-900">{workflow.request_data.description}</dd>
            </div>
            {workflow.request_data.amount && (
              <div className="flex justify-between">
                <dt className="text-zinc-600">Amount:</dt>
                <dd className="font-medium text-zinc-900">${workflow.request_data.amount.toLocaleString()}</dd>
              </div>
            )}
            {workflow.request_data.customer_name && (
              <div className="flex justify-between">
                <dt className="text-zinc-600">Customer:</dt>
                <dd className="font-medium text-zinc-900">{workflow.request_data.customer_name}</dd>
              </div>
            )}
            {workflow.request_data.reason && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-600">Reason:</dt>
                <dd className="text-right font-medium text-zinc-900">{workflow.request_data.reason}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* AI Analysis */}
        {workflow.ai_analysis && (
          <div className="rounded-md bg-zinc-50 p-4 border border-zinc-200">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">AI Analysis</h3>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-zinc-700">
                <span className="font-medium">Recommended Action:</span>{" "}
                {workflow.ai_analysis.recommended_action?.replace("_", " ")}
              </p>
              {workflow.ai_analysis.approval_reason && (
                <p className="text-zinc-600 italic text-xs">{workflow.ai_analysis.approval_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Decision Info */}
        {workflow.decided_by && (
          <div className="rounded-md bg-zinc-50 p-4 border border-zinc-200">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Decision</h3>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Decided by:</dt>
                <dd className="font-medium text-zinc-900">{workflow.decided_by}</dd>
              </div>
              {workflow.decision_reason && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Reason:</dt>
                  <dd className="text-right font-medium text-zinc-900">{workflow.decision_reason}</dd>
                </div>
              )}
              {workflow.decided_at && (
                <div className="flex justify-between">
                  <dt className="text-zinc-600">Decided at:</dt>
                  <dd className="font-medium text-zinc-900 text-xs">
                    {new Date(workflow.decided_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Activity Log */}
        {logs.length > 0 && (
          <div className="rounded-md bg-zinc-50 p-4 border border-zinc-200">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Activity Log</h3>
            <div className="flex flex-col gap-3">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-zinc-400" />
                    {index < logs.length - 1 && <div className="flex-1 w-px bg-zinc-200 mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium text-zinc-900 text-sm">{log.step.replace("_", " ")}</p>
                    <p className="text-zinc-600 text-xs">{log.message}</p>
                    <p className="text-zinc-400 text-xs mt-1">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Approval Notice */}
        {workflow.status === "waiting_approval" && (
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <p className="text-amber-900 text-sm font-medium">Waiting for human approval via Slack...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
