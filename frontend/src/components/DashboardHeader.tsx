'use client';

import React from 'react';
import { SAPM_LOGO } from '@/assets/sapmLogo';
import { SUI_LOGO } from '@/assets/suiLogo';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';
import ConfidenceGauge from '@/components/ConfidenceGauge';

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
        <img src={SAPM_LOGO} alt="SAPM" className="logo-sapm" />
        <span className="separator" aria-hidden>
          |
        </span>
        <img src={SUI_LOGO} alt="Sui Core" className="logo-protocol" />
        <img src="/deepbook-logo.svg" alt="DeepBook" className="logo-protocol" />
        <img src="/walrus-logo.svg" alt="Walrus" className="logo-protocol" />
      </div>

      <div className="header-status-cluster">
        <div className="density-toggle-group" role="group" aria-label="Information density mode">
          <button
            type="button"
            className={`density-toggle ${densityMode === 'standard' ? 'active' : ''}`}
            onClick={() => setDensityMode('standard')}
          >
            Standard Mode
          </button>
          <button
            type="button"
            className={`density-toggle ${densityMode === 'advanced' ? 'active' : ''}`}
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