'use client';

export default function Loading() {
  return (
    <section
      role="region"
      aria-label="Loading page state"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(1200px 380px at 20% -10%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(900px 320px at 90% 0%, rgba(56,189,248,0.1), transparent 60%), linear-gradient(180deg, #0b1220 0%, #060b17 40%, #050914 100%)',
        color: '#e2e8f0',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div role="status" aria-live="polite" style={{ maxWidth: '28rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span aria-hidden="true" style={{ fontSize: '3rem' }}>⚡</span>
          <svg
            aria-hidden="true"
            className="animate-spin"
            style={{ width: '2rem', height: '2rem', color: '#38bdf8' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Loading Markets...</div>
        <div style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Initializing the Sui dashboard and checking wallet, market, and data availability.
        </div>
      </div>
    </section>
  );
}
