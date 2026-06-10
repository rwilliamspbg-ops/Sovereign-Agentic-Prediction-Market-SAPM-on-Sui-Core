/**
 * CopilotKit Next.js route handler
 *
 * Fixed: was importing from '@copilotkit/runtime/v2' which does not exist in
 * @copilotkit/runtime@1.x. The correct import is from the package root.
 *
 * Required environment variables (add to .env.local):
 *   OPENAI_API_KEY=sk-…
 *   COPILOTKIT_MODEL=openai/gpt-4o-mini   (optional, this is the default)
 */

import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { NextResponse } from 'next/server';

const systemPrompt = `You are SAPM Copilot, an execution-focused assistant for a Sui prediction market.

Rules:
1. Prioritize concrete actions over generic chat.
2. Never recommend bypassing wallet checks, risk caps, or preflight safeguards.
3. For action planning, return concise steps with explicit prerequisites.
4. If required context is missing, ask for the minimal missing fields.
5. Keep responses short, operational, and tied to market/trade workflows.
6. Output MUST follow this structure exactly:
  - PLAN: one sentence objective
  - PRECHECKS: bullet list
  - ACTIONS: numbered list where each step maps to one executable action type from {open-market, load-onchain-markets, run-judge-mode, archive-snapshot, refresh-integrations}
  - RISKS: bullet list with mitigations
  - STOP_CONDITION: one sentence
7. Do not invent action types, API routes, or wallet capabilities.
8. If a requested step is unsafe or unsupported, mark it as BLOCKED and explain the safe alternative.`;

const runtime = new CopilotRuntime({
  middleware: {
    onBeforeRequest: ({ properties }) => {
      // Inject the SAPM system prompt into every request.
      // Runtime v1 middleware mutates `properties` and must not return a value.
      properties.instructions = systemPrompt;
    },
  },
});

function missingKeyResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: 'OPENAI_API_KEY is not configured for Copilot runtime.',
    },
    { status: 503 },
  );
}

function createEndpoint() {
  const serviceAdapter = new OpenAIAdapter({
    model: process.env.COPILOTKIT_MODEL || 'gpt-4o-mini',
    // OpenAI SDK reads OPENAI_API_KEY from the environment automatically
  });

  return copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
}

async function handle(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[CopilotKit] OPENAI_API_KEY is not set — copilot requests will return 503 until configured.');
    return missingKeyResponse();
  }

  const endpoint = createEndpoint();
  return endpoint.handleRequest(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function OPTIONS(request: Request) {
  return handle(request);
}
