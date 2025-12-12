"use client"

import { useState } from "react"
import { WorkflowForm } from "@/components/workflow-form"
import { WorkflowStatus } from "@/components/workflow-status"
import { WorkflowHistory } from "@/components/workflow-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

export default function Home() {
  const [requestWorkflowId, setRequestWorkflowId] = useState<string | null>(null)
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [tab, setTab] = useState<"request" | "history">("request")
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleWorkflowCreated = (workflowId: string) => {
    setRequestWorkflowId(workflowId)
    setRefreshTrigger((prev) => prev + 1)
    setTab("request")
  }

  const handleTabChange = (value: string) => {
    const v = value as "request" | "history"
    setTab(v)
    if (v === "request") {
      setDetailsOpen(false)
      setHistoryWorkflowId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">AI Workflow Agent</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-12 flex-1 w-full">
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="bg-accent/40 border border-border/60">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
              <div className="flex flex-col gap-6">
                {requestWorkflowId ? (
                  <WorkflowStatus workflowId={requestWorkflowId} onClose={() => setRequestWorkflowId(null)} />
                ) : (
                  <WorkflowForm onSubmit={handleWorkflowCreated} />
                )}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.6)]">
                <div className="text-sm text-muted-foreground">
                  Submit a request or open History to view past workflows. Active request status appears on the left.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <WorkflowHistory
              onSelect={(id) => {
                setHistoryWorkflowId(id)
                setDetailsOpen(true)
              }}
              refreshTrigger={refreshTrigger}
            />
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogContent className="w-[min(96vw,1200px)] max-w-[1200px] p-0 border-border/70 bg-card shadow-2xl">
                <DialogHeader className="px-6 pt-4 pb-2">
                  <DialogTitle>
                    {historyWorkflowId ? "Workflow Details" : <VisuallyHidden>Workflow Details</VisuallyHidden>}
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[85vh] overflow-auto px-6 pb-6">
                  {historyWorkflowId && <WorkflowStatus workflowId={historyWorkflowId} hideClose />}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-16">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-center text-xs text-muted-foreground">AI Workflow Agent</p>
        </div>
      </footer>
    </div>
  )
}
