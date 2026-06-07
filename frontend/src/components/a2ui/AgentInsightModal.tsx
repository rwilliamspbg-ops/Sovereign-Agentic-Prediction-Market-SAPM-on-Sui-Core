'use client';

import { useChat } from 'copilotkit-react';
import { useState, useEffect } from 'react';

export function AgentInsightModal({ insight }: { insight: any }) {
  const chat = useChat();
  
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
            onClick={() => chat.post({ type: 'accept-insight', data: insight })}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded"
          >
            Accept Insight → Trade Now
          </button>
        )}
        
        <button
          onClick={() => chat.post({ type: 'dismiss-insight' })}
          className="mt-4 w-full bg-slate-700 hover:bg-slate-600 py-3 rounded"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
