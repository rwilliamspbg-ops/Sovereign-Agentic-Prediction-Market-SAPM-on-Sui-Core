/**
 * CopilotKit Next.js App Router handler — @copilotkit/runtime@1.59.5
 *
 * Fixed from original:
 *   ✗ imported from '@copilotkit/runtime/v2'  → /v2 is a different adapter layer,
 *     the Next.js App Router integration lives at the package root
 *   ✗ destructured { GET, POST, OPTIONS }     → endpoint returns { handleRequest },
 *     not named HTTP exports; wrap manually
 *   ✗ onBeforeRequest middleware with wrong return type → removed; system prompt
 *     belongs on the CopilotChat `instructions` prop in the client component
 *   ✗ OPENAI_API_KEY undocumented             → documented in .env.example files
 *
 * Required env (add to frontend/.env.local):
 *   OPENAI_API_KEY=sk-…
 *   COPILOTKIT_TELEMETRY_DISABLED=true   (optional — suppresses telemetry banner)
 *
 * Note: the SAPM Copilot system prompt is injected client-side via the
 *   `instructions` prop on the <CopilotChat> component, not here.
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '[CopilotKit] OPENAI_API_KEY is not set — copilot requests will fail. ' +
      'Add OPENAI_API_KEY=sk-… to frontend/.env.local'
  );
}

const runtime = new CopilotRuntime();

const serviceAdapter = new OpenAIAdapter({
  model: process.env.COPILOTKIT_MODEL ?? 'gpt-4o-mini',
  // OpenAI SDK reads OPENAI_API_KEY from env automatically.
});

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter,
  endpoint: '/api/copilotkit',
});

// Next.js App Router requires named HTTP method exports.
// copilotRuntimeNextJSAppRouterEndpoint returns { handleRequest } — wrap it.
export const GET     = (req: NextRequest) => handleRequest(req);
export const POST    = (req: NextRequest) => handleRequest(req);
export const OPTIONS = (req: NextRequest) => handleRequest(req);
