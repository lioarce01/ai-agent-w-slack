"use client"

import { useState } from "react"
import { WorkflowForm } from "@/components/workflow-form"
import { WorkflowStatus } from "@/components/workflow-status"
import { WorkflowHistory } from "@/components/workflow-history"

export default function Home() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleWorkflowCreated = (workflowId: string) => {
    setSelectedWorkflowId(workflowId)
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Vercel Style */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black">
                <svg
                  className="h-4 w-4 text-white"
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
                <h1 className="text-sm font-semibold text-neutral-900">AI Workflow Agent</h1>
                <p className="text-xs text-neutral-500">Intelligent automation with human oversight</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Cleaner Layout */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Form or Status */}
          <div className="flex flex-col gap-6">
            {selectedWorkflowId ? (
              <WorkflowStatus workflowId={selectedWorkflowId} onClose={() => setSelectedWorkflowId(null)} />
            ) : (
              <WorkflowForm onSubmit={handleWorkflowCreated} />
            )}

            {/* Instructions - Minimal Card */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-6">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">How It Works</h2>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white font-medium text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Describe your request</p>
                    <p className="text-xs text-neutral-500 mt-0.5">AI classifies and analyzes automatically</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white font-medium text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Intelligent decision</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Auto-approve safe actions instantly</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white font-medium text-xs">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Human oversight</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Slack notifications for critical decisions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - History */}
          <div>
            <WorkflowHistory onSelect={setSelectedWorkflowId} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-neutral-100 mt-20">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-center text-xs text-neutral-400">
            Powered by Vercel Workflow DevKit, Supabase & Gemini AI
          </p>
        </div>
      </footer>
    </div>
  )
}
