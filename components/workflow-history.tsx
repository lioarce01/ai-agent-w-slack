"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Workflow } from "@/lib/types"

interface WorkflowHistoryProps {
  onSelect: (workflowId: string) => void
  refreshTrigger?: number
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-blue-100 text-blue-700",
  waiting_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
}

export function WorkflowHistory({ onSelect, refreshTrigger }: WorkflowHistoryProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch("/api/workflows?limit=20")
        const data = await response.json()
        if (data.success) {
          setWorkflows(data.workflows)
        }
      } catch (err) {
        console.error("Failed to fetch workflows:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchWorkflows, 5000)
    return () => clearInterval(interval)
  }, [refreshTrigger])

  const formatType = (type: string) =>
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
      <CardHeader>
        <CardTitle className="text-xl text-purple-600">Workflow History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No workflows yet.</p>
            <p className="text-sm">Submit a request to get started!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => onSelect(workflow.id)}
                className="flex items-center justify-between rounded-xl bg-white p-3 text-left shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-purple-100"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-gray-900 text-sm line-clamp-1">
                    {workflow.request_data.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatType(workflow.type)}</span>
                    {workflow.request_data.amount && (
                      <span className="text-xs text-gray-500">${workflow.request_data.amount.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`${statusColors[workflow.status]} text-xs px-2 py-0.5`}>
                    {workflow.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatDate(workflow.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
