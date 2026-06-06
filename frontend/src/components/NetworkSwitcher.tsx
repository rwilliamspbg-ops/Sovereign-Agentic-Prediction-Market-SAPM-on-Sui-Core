'use client';

import React, { useState, useEffect } from 'react';

type Network = 'testnet' | 'mainnet';

export interface NetworkConfig {
  name: Network;
  label: string;
  rpcUrl: string;
  color: string;
  bgColor: string;
  badge: string;
}

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    name: 'testnet',
    label: 'Sui Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    color: '#fbbf24',
    bgColor: '#78350f',
    badge: 'TESTNET',
  },
  mainnet: {
    name: 'mainnet',
    label: 'Sui Mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    color: '#34d399',
    bgColor: '#064e3b',
    badge: 'MAINNET',
  },
};

interface NetworkSwitcherProps {
  onNetworkChange?: (network: Network) => void;
  compact?: boolean;
}

export function NetworkSwitcher({ onNetworkChange, compact = false }: NetworkSwitcherProps) {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('testnet');
  const [isOpen, setIsOpen] = useState(false);

  // Load network preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preferredNetwork') as Network;
    if (saved && (saved === 'testnet' || saved === 'mainnet')) {
      setCurrentNetwork(saved);
    }
  }, []);

  const handleNetworkChange = (network: Network) => {
    setCurrentNetwork(network);
    localStorage.setItem('preferredNetwork', network);
    localStorage.setItem('rpcEndpoint', NETWORK_CONFIGS[network].rpcUrl);
    onNetworkChange?.(network);
    setIsOpen(false);
  };

  const config = NETWORK_CONFIGS[currentNetwork];

  if (compact) {
    // Compact version for header
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '0.4rem 0.75rem',
            backgroundColor: config.bgColor,
            color: config.color,
            border: `1px solid ${config.color}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
        >
          🌐 {config.badge}
          <span style={{ fontSize: '0.9rem' }}>▼</span>
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              minWidth: '180px',
              zIndex: 1000,
            }}
          >
            {Object.entries(NETWORK_CONFIGS).map(([key, net]) => (
              <button
                key={key}
                onClick={() => handleNetworkChange(net.name)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: currentNetwork === net.name ? net.bgColor : 'transparent',
                  color: currentNetwork === net.name ? net.color : '#cbd5e1',
                  border: 'none',
                  borderBottom: key !== 'mainnet' ? '1px solid #334155' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    currentNetwork === net.name ? net.bgColor : 'transparent';
                }}
              >
                {currentNetwork === net.name ? '✓' : '○'} {net.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version for settings page
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#1e293b',
        border: `2px solid ${config.color}`,
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: config.color, fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
          🌐 Network Configuration
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
          Choose which Sui network to connect to
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {Object.entries(NETWORK_CONFIGS).map(([key, net]) => (
          <button
            key={key}
            onClick={() => handleNetworkChange(net.name)}
            style={{
              padding: '1rem',
              backgroundColor: currentNetwork === net.name ? net.bgColor : '#0f172a',
              border: `2px solid ${currentNetwork === net.name ? net.color : '#334155'}`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              color: currentNetwork === net.name ? net.color : '#94a3b8',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (currentNetwork !== net.name) {
                e.currentTarget.style.borderColor = net.color;
              }
            }}
            onMouseLeave={(e) => {
              if (currentNetwork !== net.name) {
                e.currentTarget.style.borderColor = '#334155';
              }
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>
              {currentNetwork === net.name ? '✓' : '○'} {net.label}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {net.rpcUrl}
            </div>
            {currentNetwork === net.name && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: net.color }}>
                ✓ Currently connected
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
