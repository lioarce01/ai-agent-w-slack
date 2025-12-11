"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Workflow, WorkflowLog } from "@/lib/types"

interface WorkflowStatusProps {
  workflowId: string
  onClose: () => void
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-300",
  processing: "bg-blue-100 text-blue-700 border-blue-300",
  waiting_approval: "bg-amber-100 text-amber-700 border-amber-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  failed: "bg-red-100 text-red-700 border-red-300",
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-700",
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

    // Poll for updates if workflow is still processing
    const interval = setInterval(() => {
      if (
        workflow?.status === "pending" ||
        workflow?.status === "processing" ||
        workflow?.status === "waiting_approval"
      ) {
        fetchWorkflow()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [workflowId, workflow?.status])

  if (loading) {
    return (
      <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-500" />
            <p className="text-cyan-600">Loading workflow...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !workflow) {
    return (
      <Card className="border-2 border-red-200 bg-gradient-to-br from-white to-red-50">
        <CardContent className="py-8 text-center">
          <p className="text-red-600">{error || "Workflow not found"}</p>
          <button onClick={onClose} className="mt-4 text-pink-600 underline">
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
    <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl text-cyan-600">Workflow Details</CardTitle>
          <p className="mt-1 font-mono text-xs text-gray-500">{workflow.id}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={`${statusColors[workflow.status]} border px-3 py-1 font-medium`}>
            {workflow.status.replace("_", " ").toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-cyan-300 text-cyan-700">
            {formatType(workflow.type)}
          </Badge>
          {workflow.ai_analysis?.risk_level && (
            <Badge className={`${riskColors[workflow.ai_analysis.risk_level]} px-3 py-1`}>
              {workflow.ai_analysis.risk_level.toUpperCase()} RISK
            </Badge>
          )}
        </div>

        {/* Request Details */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-cyan-100">
          <h3 className="mb-3 font-semibold text-cyan-700">Request Details</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Description:</dt>
              <dd className="text-right font-medium text-gray-900 max-w-[60%]">{workflow.request_data.description}</dd>
            </div>
            {workflow.request_data.amount && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Amount:</dt>
                <dd className="font-medium text-gray-900">${workflow.request_data.amount.toLocaleString()}</dd>
              </div>
            )}
            {workflow.request_data.customer_name && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer:</dt>
                <dd className="font-medium text-gray-900">{workflow.request_data.customer_name}</dd>
              </div>
            )}
            {workflow.request_data.reason && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Reason:</dt>
                <dd className="font-medium text-gray-900">{workflow.request_data.reason}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* AI Analysis */}
        {workflow.ai_analysis && (
          <div className="rounded-xl bg-white p-4 shadow-sm border border-cyan-100">
            <h3 className="mb-3 font-semibold text-cyan-700">AI Analysis</h3>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Recommended Action:</span>{" "}
                {workflow.ai_analysis.recommended_action?.replace("_", " ")}
              </p>
              {workflow.ai_analysis.approval_reason && (
                <p className="text-gray-600 italic">{workflow.ai_analysis.approval_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Decision Info */}
        {workflow.decided_by && (
          <div className="rounded-xl bg-white p-4 shadow-sm border border-cyan-100">
            <h3 className="mb-3 font-semibold text-cyan-700">Decision</h3>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Decided by:</dt>
                <dd className="font-medium text-gray-900">{workflow.decided_by}</dd>
              </div>
              {workflow.decision_reason && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Reason:</dt>
                  <dd className="text-right font-medium text-gray-900 max-w-[60%]">{workflow.decision_reason}</dd>
                </div>
              )}
              {workflow.decided_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Decided at:</dt>
                  <dd className="font-medium text-gray-900">{new Date(workflow.decided_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Activity Log */}
        {logs.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm border border-cyan-100">
            <h3 className="mb-3 font-semibold text-cyan-700">Activity Log</h3>
            <div className="flex flex-col gap-3">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                    {index < logs.length - 1 && <div className="h-full w-px bg-cyan-200" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="font-medium text-gray-900">{log.step.replace("_", " ")}</p>
                    <p className="text-gray-600">{log.message}</p>
                    <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Approval Notice */}
        {workflow.status === "waiting_approval" && (
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
              <p className="text-amber-700 font-medium">Waiting for human approval via Slack...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
