"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkflowType } from "@/lib/types"

interface WorkflowFormProps {
  onSubmit: (workflowId: string) => void
}

export function WorkflowForm({ onSubmit }: WorkflowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    type: "refund" as WorkflowType,
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
        type: "refund",
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
    <Card className="border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
      <CardHeader>
        <CardTitle className="text-2xl text-pink-600">Start New Workflow</CardTitle>
        <CardDescription>Submit a request for AI-powered processing with human oversight</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type" className="text-pink-700">
              Workflow Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: WorkflowType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type" className="border-pink-200 focus:ring-pink-400">
                <SelectValue placeholder="Select workflow type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refund">Refund Request</SelectItem>
                <SelectItem value="high_value_operation">High-Value Operation</SelectItem>
                <SelectItem value="ambiguous_request">Ambiguous Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-pink-700">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the request in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="min-h-[100px] border-pink-200 focus:ring-pink-400"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount" className="text-pink-700">
                Amount ($)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="border-pink-200 focus:ring-pink-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="customer_name" className="text-pink-700">
                Customer Name
              </Label>
              <Input
                id="customer_name"
                placeholder="John Doe"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="border-pink-200 focus:ring-pink-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="text-pink-700">
              Reason
            </Label>
            <Input
              id="reason"
              placeholder="Reason for this request..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="border-pink-200 focus:ring-pink-400"
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>}

          <Button
            type="submit"
            disabled={isSubmitting || !formData.description}
            className="mt-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full"
          >
            {isSubmitting ? "Creating Workflow..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
