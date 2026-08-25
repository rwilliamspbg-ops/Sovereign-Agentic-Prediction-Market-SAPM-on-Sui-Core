'use client';

import { useCopilotChat as useChat } from '@copilotkit/react-core';

export function SimpleAgentInsight() {
  const chat = useChat();

  const sendIntent = (intent: Record<string, unknown>) => {
    const chatAny = chat as unknown as {
      post?: (payload: Record<string, unknown>) => void;
      appendMessage?: (payload: Record<string, unknown>) => void;
    };

    if (typeof chatAny.post === 'function') {
      chatAny.post(intent);
      return;
    }

    if (typeof chatAny.appendMessage === 'function') {
      chatAny.appendMessage(intent);
      return;
    }

    console.log('Copilot chat intent (fallback):', intent);
  };
  
  return (
    <button 
      onClick={() => sendIntent({ type: 'insight-request' })}
      aria-label="Get AI agent insight on market predictions"
      className="fixed bottom-4 right-4 bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-colors z-40"
      title="Get AI agent insight on market predictions"
    >
      🤖 Get Agent Insight
    </button>
  );
}
