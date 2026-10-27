'use client';

import React, { useState } from 'react';
import { useCopilotChat as useChat } from '@copilotkit/react-core';

export function SimpleAgentInsight() {
  const chat = useChat();
  const [isRequesting, setIsRequesting] = useState(false);

  const sendIntent = (intent: Record<string, unknown>) => {
    setIsRequesting(true);
    setTimeout(() => setIsRequesting(false), 1200);

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
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 40 }}>
      <button
        onClick={() => sendIntent({ type: 'insight-request' })}
        disabled={isRequesting}
        aria-busy={isRequesting}
        aria-label={isRequesting ? 'Requesting AI agent insight on market predictions...' : 'Get AI agent insight on market predictions'}
        className="min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        style={{
          minHeight: '44px',
          minWidth: '44px',
          padding: '0.75rem 1.25rem',
          backgroundColor: '#0891b2',
          color: '#ffffff',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          border: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: isRequesting ? 'not-allowed' : 'pointer',
          opacity: isRequesting ? 0.8 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.15s ease-in-out',
        }}
        title={isRequesting ? 'Requesting AI agent insight on market predictions...' : 'Get AI agent insight on market predictions'}
      >
        {isRequesting ? (
          <>
            <svg
              className="animate-spin"
              style={{ width: '1rem', height: '1rem', color: '#ffffff' }}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Fetching Insight...</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">🤖 </span>
            <span>Get Agent Insight</span>
          </>
        )}
      </button>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {isRequesting ? 'Requesting AI agent insight...' : ''}
      </div>
    </div>
  );
}
