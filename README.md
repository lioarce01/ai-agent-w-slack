# AI Workflow Agent with Human-in-the-Loop Approvals

An AI agent powered by plain-text instructions that can pause workflows and request human approval via Slack.

## Features

- **AI-Powered Analysis**: Requests are analyzed by an AI agent against plain-text policy instructions
- **Human-in-the-Loop**: Workflows can pause and request human approval via Slack
- **Three Workflow Types**:
  - **Refund Requests**: Evaluates refund requests against refund policies
  - **High-Value Operations**: Reviews operations that exceed value thresholds
  - **Ambiguous Requests**: Handles unclear or incomplete requests
- **Real-time Status**: Track workflow progress with live updates
- **Activity Logging**: Complete audit trail of all workflow steps

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Start Form  │  │ Status View  │  │ Workflow History       │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Backend)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ /api/agent  │  │ /api/slack   │  │ /api/workflows         │ │
│  │ (start)     │  │ (webhook)    │  │ (status/history)       │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   Supabase DB   │  │   Slack App     │  │   AI Analysis       │
│   (PostgreSQL)  │  │   (Approvals)   │  │   (Claude)          │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
\`\`\`

## Setup

### 1. Database Setup

Run the SQL migration script to create the necessary tables:

\`\`\`bash
# The script is located at: scripts/001-create-workflows-table.sql
# Run it against your Supabase database
\`\`\`

This creates:
- `workflows` table - Stores workflow state and data
- `workflow_logs` table - Stores step-by-step execution logs

### 2. Environment Variables

Add these environment variables to your Vercel project:

\`\`\`env
# Supabase (auto-configured if using Vercel integration)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Slack App
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CHANNEL_ID=C0123456789
\`\`\`

### 3. Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `chat:write` - Send messages
   - `chat:update` - Update messages after decisions
3. Under **Interactivity & Shortcuts**:
   - Enable Interactivity
   - Set Request URL to: `https://your-domain.com/api/slack/webhook`
4. Install the app to your workspace
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
6. Copy the **Signing Secret** from Basic Information
7. Get your channel ID (right-click channel > View channel details)

### 4. Deploy

Deploy to Vercel and ensure all environment variables are set.

## How It Works

### Workflow Lifecycle

1. **Submit Request**: User submits a workflow request via the web UI
2. **AI Analysis**: The AI agent analyzes the request against plain-text policies
3. **Decision Point**:
   - **Auto-Approve**: Low-risk requests that match approval criteria
   - **Auto-Reject**: Requests that clearly violate policies (high confidence)
   - **Request Approval**: Sends to Slack for human decision
4. **Human Decision**: Operator approves/rejects via Slack buttons
5. **Workflow Resumes**: Status updates and workflow completes

### Plain-Text Instructions

The AI agent is powered by plain-text policy files located in `lib/instruction-parser.ts`:

- **Refund Policy**: Rules for auto-approving small refunds, requiring approval for large amounts
- **High-Value Operations**: Thresholds and rules for expensive operations
- **Ambiguous Requests**: Handling unclear or incomplete requests

You can customize these policies by editing the instruction strings in the parser.

## API Reference

### POST /api/agent

Start a new workflow.

\`\`\`json
{
  "type": "refund" | "high_value_operation" | "ambiguous_request",
  "description": "Request description",
  "amount": 500,
  "customer_name": "John Doe",
  "reason": "Product defective"
}
\`\`\`

### GET /api/workflows

List all workflows.

\`\`\`json
{
  "success": true,
  "workflows": [...],
  "count": 10
}
\`\`\`

### GET /api/workflows/[id]

Get workflow details and logs.

\`\`\`json
{
  "success": true,
  "workflow": {...},
  "logs": [...]
}
\`\`\`

### POST /api/slack/webhook

Slack interactive webhook (called by Slack when buttons are clicked).

## Customizing Policies

To modify the approval rules, edit the instruction strings in `lib/instruction-parser.ts`:

\`\`\`typescript
const REFUND_POLICY = `
# Refund Policy Instructions

## Auto-Approve Conditions
- Refund amount is less than or equal to $100
- ...

## Require Human Approval
- Refund amount exceeds $500
- ...
`
\`\`\`

The AI agent reads these plain-text instructions and applies them to each request.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude via Vercel AI SDK
- **Notifications**: Slack Block Kit

## License

MIT
