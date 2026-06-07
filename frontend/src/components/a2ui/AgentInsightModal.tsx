'use client';

import { useCopilotChat as useChat } from '@copilotkit/react-core';
import { useState, useEffect } from 'react';

export function AgentInsightModal({ insight }: { insight: any }) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-lg shadow-xl border border-cyan-500/30">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">
          🤖 Agent Insight
        </h3>
        
        <div className="mb-4">
          <p className="text-slate-300">{insight.message}</p>
          <p className="text-sm text-slate-500 mt-2">
            Confidence: {(insight.confidence * 100).toFixed(0)}%
          </p>
        </div>
        
        {insight.action && (
          <button
            onClick={() => sendIntent({ type: 'accept-insight', data: insight })}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded"
          >
            Accept Insight → Trade Now
          </button>
        )}
        
        <button
          onClick={() => sendIntent({ type: 'dismiss-insight' })}
          className="mt-4 w-full bg-slate-700 hover:bg-slate-600 py-3 rounded"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
