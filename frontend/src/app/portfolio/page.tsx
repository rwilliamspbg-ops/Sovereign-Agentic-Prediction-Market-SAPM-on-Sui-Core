'use client';

export default function Portfolio() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
        📊 Your Portfolio
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Track your prediction market positions, holdings, and performance.
      </p>

      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        color: '#cbd5e1',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Connect Your Wallet</h2>
        <p style={{ color: '#94a3b8' }}>
          Connect your Sui wallet in the header to view your portfolio and active positions.
        </p>
      </div>
    </div>
  );
}
