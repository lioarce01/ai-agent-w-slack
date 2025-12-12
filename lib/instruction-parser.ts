import type { WorkflowType, InstructionRule, ParsedInstructions } from "./types"
import fs from "fs"
import path from "path"

// Load instructions from plain-text markdown files
function loadInstruction(filename: string): string {
  const filePath = path.join(process.cwd(), "instructions", filename)
  try {
    return fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    console.error(`Failed to load instruction file: ${filename}`, error)
    return ""
  }
}

// Load all policy files from plain text (.txt)
const BASE_POLICY = loadInstruction("base-policy.txt")
const REFUND_POLICY = loadInstruction("refund-policy.txt")
const HIGH_VALUE_POLICY = loadInstruction("high-value-operations.txt")
const AMBIGUOUS_POLICY = loadInstruction("ambiguous-requests.txt")

export function getUnifiedInstructions(): string {
  // Combine all policies into a single prompt
  return `${BASE_POLICY}

---

${REFUND_POLICY}

---

${HIGH_VALUE_POLICY}

---

${AMBIGUOUS_POLICY}
`
}

export function getInstructionsForType(type: WorkflowType): string {
  // Return base policy plus specific policy for the type
  switch (type) {
    case "refund":
      return `${BASE_POLICY}\n\n---\n\n${REFUND_POLICY}`
    case "high_value_operation":
      return `${BASE_POLICY}\n\n---\n\n${HIGH_VALUE_POLICY}`
    case "ambiguous_request":
      return `${BASE_POLICY}\n\n---\n\n${AMBIGUOUS_POLICY}`
    case "general":
    default:
      return getUnifiedInstructions()
  }
}

export function parseInstructions(type: WorkflowType): ParsedInstructions {
  const rules: InstructionRule[] = [
    { condition: "Low-value refund (<= $100) with clear reason", action: "approve" },
    { condition: "Refund > $500 or vague reason", action: "request_approval" },
    { condition: "Fraud-flagged or non-refundable item", action: "reject" },
    { condition: "High-value op > $1,000 or irreversible", action: "request_approval" },
    { condition: "Compliance violation or suspended requester", action: "reject" },
    { condition: "Ambiguous intent or missing details", action: "clarify" },
  ]

  return {
    type,
    rules,
    defaultAction: "request_approval",
  }
}

export function getInstructionsContext(_type: WorkflowType): string {
  return BASE_POLICY
}
