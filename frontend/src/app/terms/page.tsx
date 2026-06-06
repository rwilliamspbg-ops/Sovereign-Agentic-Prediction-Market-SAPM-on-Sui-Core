'use client';

export default function Terms() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>📄 Terms of Service</h1>
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '2rem', color: '#cbd5e1' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Terms &amp; Conditions</h2>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
          By using SAPM, you agree to our terms and conditions. These terms govern your use of the platform and services.
        </p>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>User Responsibilities</h3>
        <ul style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
          <li>You are responsible for securing your wallet and private keys</li>
          <li>You agree not to use the platform for illegal purposes</li>
          <li>You accept all trading risks and losses</li>
        </ul>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>Disclaimer</h3>
        <p style={{ color: '#94a3b8' }}>
          SAPM is provided "as-is" without warranties. We are not responsible for losses resulting from market movements, technical issues, or user error.
        </p>
      </div>
    </div>
  );
}
