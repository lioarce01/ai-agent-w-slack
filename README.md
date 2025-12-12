# AI Workflow Agent (Human-in-the-Loop)

An AI assistant that reviews operational requests, auto-approves safe cases, and routes sensitive ones to humans in Slack.

## What it does

- Reads your requests (refunds, high-value ops, or ambiguous asks) and classifies them automatically.
- Applies clear policies to decide: auto-approve, auto-reject, or escalate for approval.
- Escalates to humans in Slack with actionable buttons when needed.
- Keeps you in the loop with live status and a full activity log for every run.

## Typical requests it handles

- Refunds (e.g., “Refund $150 for defective product”)
- High-value or sensitive operations (e.g., bulk updates, data changes)
- Ambiguous asks where the agent first clarifies or escalates

## How you use it

1) Submit a request in the UI.  
2) The agent analyzes and decides: auto-approve/reject or send to Slack for a human decision.  
3) Track progress and history in the app; Slack decisions update the workflow instantly.

## Why it’s useful

- Faster approvals for low-risk items.  
- Human oversight where it matters.  
- Transparent logs so every decision is auditable.

## Notes

- Uses plain-text policies you can edit to tune behavior.  
- Minimalist UI inspired by Vercel/Supabase for clarity.  

