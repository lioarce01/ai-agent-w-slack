# AI Workflow Agent with Human-in-the-Loop (HITL)

A production-ready Next.js application that uses AI to analyze workflow requests and integrates human approval via Slack when needed. Built with a minimalist design inspired by Vercel and Supabase.

## Features

- **AI-Powered Analysis**: Uses Google Gemini to analyze requests against plain-text policy instructions
- **Human-in-the-Loop**: Seamless Slack integration for approval workflows with interactive buttons
- **Real-time Updates**: Event-driven UI using Supabase realtime subscriptions (no polling)
- **Step-Based Workflows**: Modular, durable workflow execution with automatic state persistence
- **Three Workflow Types**:
  - **Refund Requests**: Evaluates refund requests against refund policies
  - **High-Value Operations**: Reviews operations that exceed value thresholds
  - **Ambiguous Requests**: Handles unclear or incomplete requests
- **Activity Logging**: Complete audit trail of all workflow steps
- **Minimalist UI**: Clean, sophisticated design with Vercel/Supabase color palette

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
│   Supabase DB   │  │   Slack App     │  │  AI Gateway         │
│   (PostgreSQL)  │  │   (Approvals)   │  │  (Gemini 2.0)       │
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

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your-google-gemini-api-key
\`\`\`

#### Google Gemini Setup (Free Tier)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API Key"** or **"Create API Key"**
3. Copy your API key (starts with `AIza...`)
4. Add it to your `.env.local` file as `GOOGLE_GENERATIVE_AI_API_KEY`

**Benefits:**
- ✅ No credit card required
- ✅ Generous free tier (60 requests/minute, 1M tokens/day)
- ✅ Works with all Gemini models (1.5 Pro, 2.0 Flash, etc.)
- ✅ Perfect for development and low-to-medium production workloads

### 3. Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `chat:write` - Send messages
   - `chat:update` - Update messages after decisions
3. Under **Interactivity & Shortcuts**:
   - Enable Interactivity
   - Set Request URL to: `https://your-domain.com/api/workflows/slack/webhook`
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

### POST /api/workflows/slack/webhook

Slack interactive webhook (called by Slack when buttons are clicked). This endpoint handles workflow resume/pause via HITL.

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

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL) with Realtime subscriptions
- **AI**: Vercel AI Gateway with Google Gemini 2.0 Flash (via `@workflow/ai` DurableAgent)
- **Workflows**: Vercel Workflow DevKit for durable execution
- **HITL**: Slack Web API (`@slack/web-api`)
- **Styling**: Minimalist design with Vercel/Supabase color palette
- **TypeScript**: Full type safety with strict mode

## License

MIT
