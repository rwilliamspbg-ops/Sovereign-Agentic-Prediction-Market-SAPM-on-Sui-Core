'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(1200px 380px at 20% -10%, rgba(239,68,68,0.15), transparent 55%), radial-gradient(900px 320px at 90% 0%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, #0b1220 0%, #060b17 40%, #050914 100%)',
        color: '#e2e8f0',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '42rem', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '1rem', background: 'rgba(15,23,42,0.92)', padding: '1.5rem', boxShadow: '0 18px 45px rgba(3, 7, 18, 0.55)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>The page hit a client-side error</div>
        <div style={{ color: '#fca5a5', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
          {error.message}
        </div>
        <button
          onClick={() => reset()}
          style={{
            minHeight: '40px',
            borderRadius: '0.5rem',
            border: '1px solid #155e75',
            backgroundColor: '#083344',
            color: '#67e8f9',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.4rem 0.9rem',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}