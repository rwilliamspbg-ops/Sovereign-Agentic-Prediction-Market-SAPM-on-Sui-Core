'use client';

import { useCopilotChat as useChat } from '@copilotkit/react-core';

export function SimpleAgentInsight() {
  const chat = useChat();
  
  return (
    <button 
      onClick={() => chat.post({ type: 'insight-request' })}
      className="fixed bottom-4 right-4 bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-cyan-500 transition-colors z-40"
      title="Get AI agent insight on market predictions"
    >
      🤖 Get Agent Insight
    </button>
  );
}
