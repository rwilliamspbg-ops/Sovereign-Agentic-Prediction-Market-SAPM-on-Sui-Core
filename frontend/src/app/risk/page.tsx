'use client';

export default function Risk() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>⚠️ Risk Disclosure</h1>
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '2rem', color: '#cbd5e1' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Trading Risks</h2>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
          Prediction market trading carries significant risks. Please understand these risks before participating.
        </p>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem' }}>Key Risks</h3>
        <ul style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
          <li><strong>Market Risk:</strong> Prices can move against your prediction</li>
          <li><strong>Liquidity Risk:</strong> Difficulty exiting positions in low-volume markets</li>
          <li><strong>Resolution Risk:</strong> Disputes over market outcome determination</li>
          <li><strong>Smart Contract Risk:</strong> Potential bugs or exploits in protocols</li>
          <li><strong>Regulatory Risk:</strong> Changing regulations may affect operations</li>
          <li><strong>Total Loss:</strong> You can lose your entire investment</li>
        </ul>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>Not Investment Advice</h3>
        <p style={{ color: '#94a3b8' }}>
          SAPM and its operators provide no investment advice. Do your own research and never invest more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}
