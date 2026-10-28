'use client';

import Link from 'next/link';

export default function Help() {
  const faqs = [
    {
      q: 'How do I connect my wallet?',
      a: 'Click the "💼 Connect Wallet" button in the header and authorize the connection in your Sui wallet extension.',
    },
    {
      q: 'What prediction markets are available?',
      a: 'We offer markets on cryptocurrency prices, technology adoption, AI developments, DeFi metrics, and more. Check the Markets page for the full list.',
    },
    {
      q: 'How do I place a prediction?',
      a: 'Click "Trade" on any market card to open the detail modal, select your outcome (YES/NO), enter the amount, and execute the trade.',
    },
    {
      q: 'How are markets resolved?',
      a: 'Markets are resolved using data from reliable sources like CoinGecko, DeFiLlama, and official APIs. Resolution sources are displayed on each market.',
    },
    {
      q: 'What fees do I pay?',
      a: 'Trading fees vary by market and are displayed at trade execution. Creator fees go to the market creator.',
    },
    {
      q: 'Can I see my trading history?',
      a: 'Connect your wallet to view your portfolio, active positions, and complete trading history.',
    },
  ];

  return (
    <section role="region" aria-label="Help and Documentation" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
        <span aria-hidden="true">❓ </span>Help & Documentation
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Frequently asked questions and getting started guide.
      </p>

      <div role="group" aria-label="Frequently asked questions" style={{ display: 'grid', gap: '1.5rem' }}>
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="hover:border-slate-500 hover:bg-slate-800/80 transition-all duration-200 focus-within:ring-2 focus-within:ring-cyan-500"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.75rem' }}>
              {faq.q}
            </h3>
            <p style={{ color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        backgroundColor: '#0ea5e922',
        border: '1px solid #06b6d4',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginTop: '2rem',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#06b6d4', marginBottom: '0.75rem' }}>
          <span aria-hidden="true">ℹ️ </span>Need More Help?
        </h3>
        <p style={{ color: '#22d3ee', margin: 0, marginBottom: '1rem' }}>
          Join our Discord community or check the documentation for more detailed information.
        </p>

        <div
          role="group"
          aria-label="Help page navigation actions"
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
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
            href="/docs"
            aria-label="View platform documentation"
            className="inline-flex items-center justify-center font-semibold rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:outline-none"
            style={{
              minHeight: '44px',
              padding: '0.6rem 1.2rem',
              backgroundColor: '#334155',
              color: '#e2e8f0',
              textDecoration: 'none',
            }}
          >
            View Documentation
          </Link>
          <Link
            href="/resource-hub"
            aria-label="Explore developer resource hub"
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
      </div>
    </section>
  );
}
