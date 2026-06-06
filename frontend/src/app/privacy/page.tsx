'use client';

export default function Privacy() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>🔒 Privacy Policy</h1>
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '2rem', color: '#cbd5e1' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Privacy &amp; Data Protection</h2>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
          SAPM is committed to protecting your privacy. We collect minimal personal data and use it only to provide our services.
        </p>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>Data We Collect</h3>
        <ul style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
          <li>Wallet addresses (publicly visible on blockchain)</li>
          <li>Trading activity and transaction history</li>
          <li>Platform usage analytics</li>
        </ul>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>How We Use It</h3>
        <p style={{ color: '#94a3b8' }}>
          Your data is used to provide services, improve the platform, and comply with legal requirements. We do not sell or share your data with third parties.
        </p>
      </div>
    </div>
  );
}
