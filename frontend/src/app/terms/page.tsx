'use client';

import Link from 'next/link';

export default function Terms() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
        <span aria-hidden="true">📄 </span>Terms of Service
      </h1>
      <section
        role="region"
        aria-label="Terms of Service Overview"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '2rem', color: '#cbd5e1' }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Terms &amp; Conditions</h2>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
          By using SAPM, you agree to our terms and conditions. These terms govern your use of the platform and services.
        </p>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>User Responsibilities</h3>
        <ul aria-label="User responsibilities list" style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
          <li>You are responsible for securing your wallet and private keys</li>
          <li>You agree not to use the platform for illegal purposes</li>
          <li>You accept all trading risks and losses</li>
        </ul>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>Disclaimer</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          SAPM is provided "as-is" without warranties. We are not responsible for losses resulting from market movements, technical issues, or user error.
        </p>

        <div
          role="group"
          aria-label="Terms page navigation actions"
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}
        >
          <Link
            href="/markets"
            aria-label="Explore active prediction markets"
            className="inline-flex items-center justify-center font-semibold rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:outline-none"
            style={{
              minHeight: '44px',
              padding: '0.6rem 1.2rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            Explore Markets
          </Link>
          <Link
            href="/resource-hub"
            aria-label="View developer resource hub"
            className="inline-flex items-center justify-center font-semibold rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:outline-none"
            style={{
              minHeight: '44px',
              padding: '0.6rem 1.2rem',
              backgroundColor: '#334155',
              color: '#e2e8f0',
              textDecoration: 'none',
            }}
          >
            Resource Hub
          </Link>
        </div>
      </section>
    </div>
  );
}
