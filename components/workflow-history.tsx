"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Workflow } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface WorkflowHistoryProps {
  onSelect: (workflowId: string) => void
  refreshTrigger?: number
}

const statusColors: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  processing: "bg-blue-100 text-blue-700",
  waiting_approval: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
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

    // Set up Supabase realtime subscription for new workflows
    const supabase = createClient()

    const workflowsChannel = supabase
      .channel("workflows-all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workflows",
        },
        (payload) => {
          setWorkflows((prev) => [payload.new as Workflow, ...prev].slice(0, 20))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflows",
        },
        (payload) => {
          setWorkflows((prev) =>
            prev.map((w) => (w.id === (payload.new as Workflow).id ? (payload.new as Workflow) : w)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(workflowsChannel)
    }
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
    <Card className="border border-zinc-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-zinc-900">Workflow History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <p className="text-sm">No workflows yet.</p>
            <p className="text-xs mt-1">Submit a request to get started!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => onSelect(workflow.id)}
                className="flex items-center justify-between rounded-md bg-zinc-50 p-3 text-left transition-all hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium text-zinc-900 text-sm line-clamp-1">
                    {workflow.request_data.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">{formatType(workflow.type)}</span>
                    {workflow.request_data.amount && (
                      <>
                        <span className="text-zinc-400">•</span>
                        <span className="text-xs text-zinc-600">${workflow.request_data.amount.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <Badge className={`${statusColors[workflow.status]} text-xs`}>
                    {workflow.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-zinc-400">{formatDate(workflow.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
