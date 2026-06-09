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
import { NextRequest } from 'next/server';

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
  console.warn('[CopilotKit] OPENAI_API_KEY is not set — copilot requests will fail at the LLM call. Add it to .env.local.');
}

const runtime = new CopilotRuntime({
  middleware: {
    onBeforeRequest: ({ properties }) => {
      // Inject the SAPM system prompt into every request
      return {
        properties: {
          ...properties,
          instructions: systemPrompt,
        },
      };
    },
  },
});

const serviceAdapter = new OpenAIAdapter({
  model: process.env.COPILOTKIT_MODEL || 'gpt-4o-mini',
  // OpenAI SDK reads OPENAI_API_KEY from the environment automatically
});

const { GET, POST, OPTIONS } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter,
  endpoint: '/api/copilotkit',
});

export { GET, POST, OPTIONS };

export async function middleware(request: NextRequest) {
  return new Response(null, { status: 200 });
}
