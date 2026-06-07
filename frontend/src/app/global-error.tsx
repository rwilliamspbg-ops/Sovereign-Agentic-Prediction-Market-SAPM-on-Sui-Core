'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#050914', color: '#e2e8f0', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '42rem', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '1rem', background: 'rgba(15,23,42,0.92)', padding: '1.5rem', boxShadow: '0 18px 45px rgba(3, 7, 18, 0.55)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Application error</div>
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
              Reload app
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}