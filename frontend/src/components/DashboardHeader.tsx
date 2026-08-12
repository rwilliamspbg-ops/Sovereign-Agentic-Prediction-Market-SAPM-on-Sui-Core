'use client';

import React from 'react';
import { SAPM_LOGO } from '@/assets/sapmLogo';
import { SUI_LOGO } from '@/assets/suiLogo';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';
import ConfidenceGauge from '@/components/ConfidenceGauge';

const PROJECT_INFO_LINKS = [
  { label: 'Docs', href: '/docs', external: false },
  { label: 'Resource Hub', href: '/resource-hub', external: false },
  { label: 'GitHub', href: 'https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core', external: true },
];

const PROTOCOL_LOGOS = [
  { label: 'Sui Core', href: 'https://docs.sui.io/', logo: SUI_LOGO },
  { label: 'DeepBook', href: 'https://docs.sui.io/onchain-finance/deepbookv3/deepbook', logo: '/deepbook-logo.svg' },
  { label: 'Walrus', href: 'https://docs.wal.app/', logo: '/walrus-logo.svg' },
];

function handlePillEnter(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.backgroundColor = 'rgba(45, 212, 191, 0.16)';
  event.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.6)';
  event.currentTarget.style.transform = 'translateY(-1px)';
}

function handlePillLeave(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.backgroundColor = 'transparent';
  event.currentTarget.style.borderColor = 'transparent';
  event.currentTarget.style.transform = 'translateY(0)';
}

function handleInfoPillEnter(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.background = 'rgba(6, 182, 212, 0.18)';
  event.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.75)';
  event.currentTarget.style.transform = 'translateY(-1px)';
}

function handleInfoPillLeave(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
  event.currentTarget.style.borderColor = 'rgba(125, 211, 252, 0.32)';
  event.currentTarget.style.transform = 'translateY(0)';
}

function confidenceLabel(score: number): { label: string; className: string } {
  if (score >= 0.75) {
    return { label: 'High Confidence', className: 'confidence-high' };
  }
  if (score >= 0.45) {
    return { label: 'Moderate Confidence', className: 'confidence-medium' };
  }
  return { label: 'Low Confidence', className: 'confidence-low' };
}

export default function DashboardHeader() {
  const { marketData, walletConnected, walletAddress, densityMode } = useAgentState('currentMarket');
  const { setDensityMode } = useMarketActions();
  const confidence = confidenceLabel(marketData.compositeConfidence);

  return (
    <header className="dashboard-header">
      <div className="logo-group">
        <a href="/" aria-label="SAPM homepage" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
          <img src={SAPM_LOGO} alt="SAPM" className="logo-sapm" />
          <span style={{ color: '#c6f8ff', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.03em' }}>SAPM</span>
        </a>
        <span className="separator" aria-hidden>|</span>
        {PROTOCOL_LOGOS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              borderRadius: '999px',
              border: '1px solid transparent',
              padding: '0.15rem 0.35rem',
              transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
            }}
            title={`${item.label} docs`}
            onMouseEnter={handlePillEnter}
            onMouseLeave={handlePillLeave}
          >
            <img src={item.logo} alt={item.label} className="logo-protocol" />
            <span style={{ color: '#9bd3de', fontSize: '0.68rem', fontWeight: 700 }}>{item.label}</span>
          </a>
        ))}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.2rem', flexWrap: 'wrap' }}>
          {PROJECT_INFO_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              style={{
                color: '#b7f5ff',
                textDecoration: 'none',
                fontSize: '0.67rem',
                fontWeight: 700,
                border: '1px solid rgba(125, 211, 252, 0.32)',
                borderRadius: '999px',
                padding: '0.18rem 0.45rem',
                background: 'rgba(6, 182, 212, 0.08)',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={handleInfoPillEnter}
              onMouseLeave={handleInfoPillLeave}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="header-status-cluster">
        <div className="density-toggle-group" role="group" aria-label="Information density mode">
          <button
            type="button"
            className={`density-toggle ${densityMode === 'standard' ? 'active' : ''}`}
            aria-pressed={densityMode === 'standard'}
            onClick={() => setDensityMode('standard')}
          >
            Standard Mode
          </button>
          <button
            type="button"
            className={`density-toggle ${densityMode === 'advanced' ? 'active' : ''}`}
            aria-pressed={densityMode === 'advanced'}
            onClick={() => setDensityMode('advanced')}
          >
            Advanced Deep Dive
          </button>
        </div>

        <div className="confidence-widget">
          <span className="confidence-title">Market Confidence</span>
          <div className="confidence-meter-track">
            <div
              className={`confidence-meter-fill ${confidence.className}`}
              style={{ width: `${Math.round(marketData.compositeConfidence * 100)}%` }}
            />
          </div>
          <span className="confidence-text">
            {confidence.label} ({Math.round(marketData.compositeConfidence * 100)}%)
          </span>
          <ConfidenceGauge value={marketData.compositeConfidence} label="Composite" />
        </div>

        <span className={`connection-badge ${walletConnected ? 'connected' : 'disconnected'}`}>
          Wallet: {walletConnected ? `Connected (${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)})` : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}