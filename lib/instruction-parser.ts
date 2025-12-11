import type { WorkflowType, InstructionRule, ParsedInstructions } from "./types"

// Plain-text instruction files
const REFUND_POLICY = `
# Refund Policy Instructions

## Auto-Approve Conditions
- Refund amount is less than or equal to $100
- Customer has been a member for more than 1 year AND refund is under $300
- Reason is "defective product" or "wrong item shipped" AND amount is under $500

## Require Human Approval
- Refund amount exceeds $500
- Customer has requested more than 3 refunds in the past 30 days
- Refund reason is vague or unclear
- Amount is between $100 and $500 for new customers (less than 3 months)

## Auto-Reject Conditions
- Refund request is for a non-refundable item
- Request is made more than 90 days after purchase
- Customer account is flagged for fraud

## Default Action
If none of the above conditions match, REQUEST_APPROVAL from a human operator.
`

const HIGH_VALUE_OPS_POLICY = `
# High-Value Operations Policy

## Auto-Approve Conditions
- Operation value is less than $1,000
- Operator has "senior" or "manager" role AND value is under $5,000
- Operation type is "routine maintenance" regardless of value

## Require Human Approval
- Operation value exceeds $1,000
- Operation involves customer data deletion
- Operation affects more than 100 records
- Operation involves third-party integrations
- Operation is flagged as "irreversible"

## Auto-Reject Conditions
- Operation would violate compliance rules
- Requested by a suspended or inactive operator
- Operation conflicts with ongoing maintenance window

## Default Action
If none of the above conditions match, REQUEST_APPROVAL from a human operator.
`

const AMBIGUOUS_REQUESTS_POLICY = `
# Ambiguous Request Handling Policy

## Clarification Required
- Request lacks specific details (who, what, when, how much)
- Multiple interpretations are possible
- Request references undefined terms or internal jargon
- Conflicting information provided in the request

## Auto-Approve Conditions
- Request is clear and well-defined
- All required fields are present and valid
- Request matches a known pattern or template

## Require Human Approval
- Request is partially clear but missing some context
- Request involves sensitive data or operations
- Request comes from an unverified source
- AI confidence in interpretation is below 80%

## Auto-Reject Conditions
- Request is completely unintelligible
- Request appears to be spam or malicious
- Request violates terms of service

## Default Action
When in doubt, REQUEST_CLARIFICATION from the requester via Slack.
`

export function getInstructionsForType(type: WorkflowType): string {
  switch (type) {
    case "refund":
      return REFUND_POLICY
    case "high_value_operation":
      return HIGH_VALUE_OPS_POLICY
    case "ambiguous_request":
      return AMBIGUOUS_REQUESTS_POLICY
    default:
      return REFUND_POLICY
  }
}

export function parseInstructions(type: WorkflowType): ParsedInstructions {
  const instructions = getInstructionsForType(type)
  const rules: InstructionRule[] = []

  // Parse Auto-Approve section
  const autoApproveMatch = instructions.match(/## Auto-Approve Conditions\n([\s\S]*?)(?=##|$)/)
  if (autoApproveMatch) {
    const lines = autoApproveMatch[1].split("\n").filter((l) => l.trim().startsWith("-"))
    lines.forEach((line) => {
      rules.push({
        condition: line.replace(/^-\s*/, "").trim(),
        action: "approve",
      })
    })
  }

  // Parse Require Human Approval section
  const approvalMatch = instructions.match(/## Require Human Approval\n([\s\S]*?)(?=##|$)/)
  if (approvalMatch) {
    const lines = approvalMatch[1].split("\n").filter((l) => l.trim().startsWith("-"))
    lines.forEach((line) => {
      rules.push({
        condition: line.replace(/^-\s*/, "").trim(),
        action: "request_approval",
      })
    })
  }

  // Parse Auto-Reject section
  const rejectMatch = instructions.match(/## Auto-Reject Conditions\n([\s\S]*?)(?=##|$)/)
  if (rejectMatch) {
    const lines = rejectMatch[1].split("\n").filter((l) => l.trim().startsWith("-"))
    lines.forEach((line) => {
      rules.push({
        condition: line.replace(/^-\s*/, "").trim(),
        action: "reject",
      })
    })
  }

  return {
    type,
    rules,
    defaultAction: "request_approval",
  }
}

export function getInstructionsContext(type: WorkflowType): string {
  return getInstructionsForType(type)
}
