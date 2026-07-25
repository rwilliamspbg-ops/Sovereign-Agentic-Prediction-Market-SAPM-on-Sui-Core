'use client';

import React, { useEffect } from 'react';
import { useCopilotChat as useChat } from '@copilotkit/react-core';

export function AgentInsightModal({ insight }: { insight: any }) {
  const chat = useChat();

  const sendIntent = React.useCallback((intent: Record<string, unknown>) => {
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
  }, [chat]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        sendIntent({ type: 'dismiss-insight' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendIntent]);
  
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => sendIntent({ type: 'dismiss-insight' })}
    >
      <div
        className="relative bg-slate-900 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl border border-cyan-500/30"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-insight-title"
      >
        {/* Top-right close button */}
        <button
          onClick={() => sendIntent({ type: 'dismiss-insight' })}
          className="absolute right-2 top-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md transition-all"
          aria-label="Dismiss insight"
        >
          ✕
        </button>

        <h3 id="agent-insight-title" className="text-xl font-bold text-cyan-400 mb-4 pr-8">
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
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Accept Insight → Trade Now
          </button>
        )}
        
        <button
          onClick={() => sendIntent({ type: 'dismiss-insight' })}
          className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
