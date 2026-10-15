'use client';

import Link from 'next/link';

export default function Governance() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
        <span aria-hidden="true">⚖️ </span>Governance
      </h1>
      <section
        role="region"
        aria-label="Governance overview"
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#cbd5e1',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          <span aria-hidden="true">🗳️</span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#e2e8f0' }}>
          Governance System
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          DAO governance and voting mechanisms coming soon.
        </p>

        <div
          role="group"
          aria-label="Governance page navigation actions"
          style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
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
