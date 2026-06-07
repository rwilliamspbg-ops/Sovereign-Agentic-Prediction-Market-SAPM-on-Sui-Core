'use client';

import React from 'react';
import { SUI_PACKAGE_ID, SUI_RESOURCE_HUB, SUISCAN_PACKAGE_URL } from '@/lib/sui-config';

export default function ResourceHubPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '5.2rem 1rem 2rem 1rem',
        background: 'radial-gradient(1000px 360px at 15% -10%, rgba(14,165,233,0.22), transparent 60%), radial-gradient(900px 300px at 88% 0%, rgba(16,185,129,0.18), transparent 60%), linear-gradient(180deg, #071023 0%, #050a16 100%)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <section
          style={{
            border: '1px solid #23344b',
            borderRadius: '1rem',
            padding: '1.2rem 1.25rem',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,8,23,0.92))',
            boxShadow: '0 24px 55px rgba(2, 6, 23, 0.5)',
            marginBottom: '1.2rem',
          }}
        >
          <div style={{ color: '#67e8f9', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Builder Command Center
          </div>
          <h1 style={{ margin: '0.45rem 0 0.6rem 0', color: '#f8fafc', fontSize: '1.75rem' }}>Sui Resource Hub</h1>
          <p style={{ margin: 0, color: '#94a3b8', maxWidth: '900px', lineHeight: 1.6 }}>
            Curated docs, SDKs, and infra resources for shipping faster on Sui. This hub is wired to your deployed package so product and protocol context stay aligned.
          </p>

          <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <a
              href={SUISCAN_PACKAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                border: '1px solid #155e75',
                backgroundColor: '#083344',
                color: '#67e8f9',
                borderRadius: '0.55rem',
                padding: '0.55rem 0.8rem',
                fontWeight: 700,
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              View Package On SuiScan
            </a>
            <div style={{ border: '1px solid #334155', backgroundColor: '#0b1324', color: '#cbd5e1', borderRadius: '0.55rem', padding: '0.55rem 0.8rem', fontSize: '0.8rem', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
              Package ID: {SUI_PACKAGE_ID}
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {SUI_RESOURCE_HUB.map((category) => (
            <article
              key={category.title}
              style={{
                border: '1px solid #223347',
                borderRadius: '0.95rem',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(6, 11, 23, 0.98))',
                boxShadow: '0 16px 35px rgba(2, 6, 23, 0.45)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '1rem', borderBottom: '1px solid #1e293b' }}>
                <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>{category.title}</h2>
                <p style={{ margin: '0.45rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.55 }}>{category.description}</p>
              </div>

              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {category.links.map((link) => (
                  <a
                    key={link.url + link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      border: '1px solid #2b3b52',
                      backgroundColor: '#0b1324',
                      color: '#cbd5e1',
                      borderRadius: '0.55rem',
                      padding: '0.55rem 0.7rem',
                      textDecoration: 'none',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
