"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface WorkflowFormProps {
  onSubmit: (workflowId: string) => void
}

export function WorkflowForm({ onSubmit }: WorkflowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    customer_name: "",
    reason: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? Number(formData.amount) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create workflow")
      }

      // Reset form
      setFormData({
        description: "",
        amount: "",
        customer_name: "",
        reason: "",
      })

      onSubmit(data.workflow_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border border-border/60 bg-card/80 shadow-[0_12px_48px_-28px_rgba(0,0,0,0.7)]">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Ask the AI Agent</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Describe your request; the agent will classify, analyze, and route with HITL when needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-xs font-medium text-foreground">
              What do you need?
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Refund $150 for order #1234 due to defective product"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="min-h-[110px] resize-none rounded-xl border border-border/70 bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground">
              The AI auto-classifies the request and decides whether to auto-approve, reject, or escalate to Slack.
            </p>
          </div>

          <details className="rounded-xl border border-border/70 bg-accent/40 p-3.5 text-foreground">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Additional Details (Optional)
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount" className="text-xs font-medium text-foreground">
                    Amount ($)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-9 rounded-lg border border-border/70 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer_name" className="text-xs font-medium text-foreground">
                    Customer Name
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="John Doe"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="h-9 rounded-lg border border-border/70 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason" className="text-xs font-medium text-foreground">
                  Additional Notes
                </Label>
                <Input
                  id="reason"
                  placeholder="Any extra context..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="h-9 rounded-lg border border-border/70 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </details>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !formData.description}
            className="mt-1 h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? "Creating Workflow..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
