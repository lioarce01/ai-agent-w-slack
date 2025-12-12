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
  pending: "bg-accent/50 text-foreground",
  processing: "bg-blue-500/15 text-blue-200",
  waiting_approval: "bg-amber-500/15 text-amber-100",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive-foreground",
  completed: "bg-primary/18 text-primary",
  failed: "bg-destructive/15 text-destructive-foreground",
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
    <Card className="border border-border/60 bg-card/80 shadow-[0_12px_48px_-28px_rgba(0,0,0,0.7)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Workflow History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border/70 border-t-primary" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No workflows yet.</p>
            <p className="text-xs mt-1">Submit a request to get started!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => onSelect(workflow.id)}
                className="flex items-center justify-between rounded-lg bg-accent/30 p-3 text-left transition-all hover:bg-accent/50 border border-border/70 hover:border-border"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium text-foreground text-sm line-clamp-1">
                    {workflow.request_data.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatType(workflow.type)}</span>
                    {workflow.request_data.amount && (
                      <>
                        <span className="text-muted-foreground/70">•</span>
                        <span className="text-xs text-muted-foreground">${workflow.request_data.amount.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <Badge className={`${statusColors[workflow.status]} text-xs`}>
                    {workflow.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(workflow.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
