/**
 * CopilotKit Next.js App Router runtime handler — @copilotkit/runtime@1.59.5
 * 
 * This is the main endpoint for CopilotKit runtime operations.
 * The [[...slug]] directory handles nested routes (e.g., /api/copilotkit/chat).
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { BuiltInAgent } from '@copilotkit/runtime/v2';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

function resolveOpenAIKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.COPILOTKIT_OPENAI_API_KEY ||
    process.env.OPENAI_KEY
  );
}

function hasUsableOpenAIKey(): boolean {
  const key = resolveOpenAIKey();
  return Boolean(key && !key.includes('TODO_REPLACE_WITH_YOUR_OPENAI_KEY'));
}

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

if (!hasUsableOpenAIKey()) {
  console.warn(
    '[CopilotKit] OPENAI_API_KEY is not set — copilot requests will fail. ' +
      'Add OPENAI_API_KEY=sk-… to frontend/.env.local',
  );
}

// Register a "default" agent so the CopilotKit React client's useAgent('default')
// resolves successfully (it queries the runtime's /info handler for known agents).
const builtInAgentModel = (() => {
  const configured = process.env.COPILOTKIT_MODEL || 'gpt-4o-mini';
  return configured.includes('/') ? configured : `openai/${configured}`;
})();

const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: builtInAgentModel,
      prompt: systemPrompt,
    }),
  },
});

function createEndpoint() {
  const apiKey = resolveOpenAIKey();

  const serviceAdapterConfig: ConstructorParameters<typeof OpenAIAdapter>[0] = {
    model: process.env.COPILOTKIT_MODEL || 'gpt-4o-mini',
  };

  if (apiKey) {
    // Provide an explicit OpenAI client when a key is configured.
    serviceAdapterConfig.openai = new OpenAI({ apiKey });
  }

  const serviceAdapter = new OpenAIAdapter(serviceAdapterConfig);

  return copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
}

async function handle(request: Request) {
  if (!hasUsableOpenAIKey()) {
    console.warn('[CopilotKit] OPENAI_API_KEY is not set — runtime info will still load, but chat requests will fail until configured.');
  }

  const endpoint = createEndpoint();
  return endpoint.handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function OPTIONS(request: NextRequest) {
  return handle(request);
}
