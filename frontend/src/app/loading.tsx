'use client';

export default function Loading() {
  return (
    <div
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
      <div style={{ maxWidth: '28rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Loading Markets...</div>
        <div style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Initializing the Sui dashboard and checking wallet, market, and data availability.
        </div>
      </div>
    </div>
  );
}