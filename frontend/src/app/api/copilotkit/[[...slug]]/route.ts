import { BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';

// Keep runtime endpoint available to satisfy runtime discovery and avoid 404.
// Chat requests require OPENAI_API_KEY (or swapping this agent implementation).
const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: 'openai/gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
      prompt: 'You are the SAPM assistant for Sui prediction market users.',
      maxSteps: 3,
    }),
  },
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: '/api/copilotkit',
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
