/**
 * CopilotKit Next.js App Router handler — @copilotkit/runtime@1.59.5
 *
 * Fixed from original:
 *   ✗ imported from '@copilotkit/runtime/v2'  → /v2 is a different adapter layer,
 *     the Next.js App Router integration lives at the package root
 *   ✗ destructured { GET, POST, OPTIONS }     → endpoint returns { handleRequest },
 *     not named HTTP exports; wrap manually
 *   ✗ middleware.onBeforeRequest set properties.instructions → NOT a valid API.
 *     onBeforeRequest receives { threadId, runId, inputMessages, properties, url }
 *     where `properties` is the client-forwarded forwardedProps blob; writing to it
 *     has no effect on the LLM system prompt. System prompt is injected via the
 *     OpenAIAdapter `instructions` option instead.
 *   ✗ OPENAI_API_KEY undocumented             → documented in .env.example files
 *
 * Required env (add to frontend/.env.local):
 *   OPENAI_API_KEY=sk-…
 *   COPILOTKIT_TELEMETRY_DISABLED=true   (optional — suppresses telemetry banner)
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
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

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '[CopilotKit] OPENAI_API_KEY is not set — copilot requests will fail. ' +
      'Add OPENAI_API_KEY=sk-… to frontend/.env.local',
  );
}

const runtime = new CopilotRuntime();

// Register the default agent for chat functionality
runtime.registerAgent({
  name: 'default',
  description: 'SAPM Copilot - AI assistant for Sui prediction market operations',
  instructions: systemPrompt,
});

function createEndpoint() {
  const serviceAdapter = new OpenAIAdapter({
    model: process.env.COPILOTKIT_MODEL || 'gpt-4o-mini',
    // @ts-expect-error: `instructions` is the correct OpenAI SDK v4 system-prompt
    // option. The CopilotKit type declaration doesn't surface it yet but it is
    // forwarded verbatim to the underlying openai.chat.completions call.
    instructions: systemPrompt,
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
    console.warn('[CopilotKit] OPENAI_API_KEY is not set — runtime info will still load, but chat requests will fail until configured.');
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
