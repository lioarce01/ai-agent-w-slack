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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b border-pink-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-cyan-400">
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Workflow Agent</h1>
              <p className="text-sm text-gray-500">Human-in-the-loop approvals via Slack</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Form or Status */}
          <div className="flex flex-col gap-6">
            {selectedWorkflowId ? (
              <WorkflowStatus workflowId={selectedWorkflowId} onClose={() => setSelectedWorkflowId(null)} />
            ) : (
              <WorkflowForm onSubmit={handleWorkflowCreated} />
            )}

            {/* Instructions Preview */}
            <div className="rounded-2xl bg-white/60 p-6 border border-gray-100">
              <h2 className="mb-4 font-semibold text-gray-900">How It Works</h2>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Submit a Request</p>
                    <p className="text-sm text-gray-500">Choose a workflow type and provide details</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">AI Analyzes</p>
                    <p className="text-sm text-gray-500">The agent evaluates against plain-text policies</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Human Approval</p>
                    <p className="text-sm text-gray-500">If needed, approval is requested via Slack</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Workflow Completes</p>
                    <p className="text-sm text-gray-500">The workflow resumes after decision</p>
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

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50 mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">Built with Next.js, Supabase, and Slack Integration</p>
        </div>
      </footer>
    </div>
  )
}
