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
    <Card className="border border-neutral-200/60 bg-white shadow-none">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base font-semibold text-neutral-900">Ask the AI Agent</CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          Describe your request and the AI will analyze and handle it automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-xs font-medium text-neutral-700">
              What do you need?
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., 'I need a refund of $150 for order #1234 because the product was defective' or 'Please update pricing for 500 products in the catalog'"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="min-h-[110px] border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/10 text-sm resize-none"
            />
            <p className="text-xs text-neutral-400">
              The AI will automatically classify your request and determine if human approval is needed
            </p>
          </div>

          <details className="rounded-lg border border-neutral-200/60 p-3.5 bg-neutral-50/30">
            <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-900">
              Additional Details (Optional)
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount" className="text-xs font-medium text-neutral-600">
                    Amount ($)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/10 text-sm h-9"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer_name" className="text-xs font-medium text-neutral-600">
                    Customer Name
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="John Doe"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/10 text-sm h-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason" className="text-xs font-medium text-neutral-600">
                  Additional Notes
                </Label>
                <Input
                  id="reason"
                  placeholder="Any extra context..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/10 text-sm h-9"
                />
              </div>
            </div>
          </details>

          {error && (
            <div className="rounded-lg bg-red-50/50 p-3 text-xs text-red-900 border border-red-200/60">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !formData.description}
            className="mt-1 bg-black hover:bg-neutral-800 text-white font-medium text-sm h-10 transition-colors"
          >
            {isSubmitting ? "Creating Workflow..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
