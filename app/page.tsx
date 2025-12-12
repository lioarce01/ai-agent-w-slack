"use client"

import { useState } from "react"
import { WorkflowForm } from "@/components/workflow-form"
import { WorkflowStatus } from "@/components/workflow-status"
import { WorkflowHistory } from "@/components/workflow-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleWorkflowCreated = (workflowId: string) => {
    setSelectedWorkflowId(workflowId)
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Tabs defaultValue="request" className="space-y-8">
          <TabsList className="bg-accent/40 border border-border/60">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-6">
                {selectedWorkflowId ? (
                  <WorkflowStatus workflowId={selectedWorkflowId} onClose={() => setSelectedWorkflowId(null)} />
                ) : (
                  <WorkflowForm onSubmit={handleWorkflowCreated} />
                )}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.6)]">
                <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  How It Works
                </h2>
                <div className="flex flex-col gap-4 text-sm text-foreground">
                  {[
                    { title: "Describe your request", desc: "AI classifies and analyzes automatically." },
                    { title: "Intelligent decision", desc: "Auto-approve safe actions instantly." },
                    { title: "Human oversight", desc: "Slack notifications for critical decisions." },
                  ].map((item, idx) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <WorkflowHistory
              onSelect={(id) => {
                setSelectedWorkflowId(id)
              }}
              refreshTrigger={refreshTrigger}
            />
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
