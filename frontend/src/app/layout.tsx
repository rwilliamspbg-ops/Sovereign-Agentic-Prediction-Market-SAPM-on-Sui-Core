'use client';

import React, { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [walletConnected, setWalletConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      // Generate mock Sui address for demo (64 hex chars with 0x prefix)
      const mockAddress = '0x' + Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      localStorage.setItem('walletAddress', mockAddress);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Please install a Sui wallet (Sui Wallet, Nightly Wallet, or similar)');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setShowWalletMenu(false);
    localStorage.removeItem('walletAddress');
  };

  // Format address for display (show first 6 and last 4 chars)
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Load wallet on mount if previously connected
  React.useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setWalletConnected(true);
    }
  }, []);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f172a', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {/* Header Navigation */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid #334155',
          backdropFilter: 'blur(10px)',
        }}>
          <nav style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '4rem',
          }}>
            {/* Logo with SUI Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* SUI Logo SVG */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* SUI Blue Geometric Logo */}
                <path d="M16 2L2 9.33L2 22.67L16 30L30 22.67L30 9.33L16 2Z" fill="url(#gradient)" stroke="#06b6d4" strokeWidth="1"/>
                <path d="M16 2L16 30M2 9.33L30 22.67M30 9.33L2 22.67" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  lineHeight: '1',
                }}>
                  SAPM
                </span>
                <span style={{
                  fontSize: '0.625rem',
                  color: '#64748b',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                }}>
                  on Sui
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <a href="#markets" style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}>
                Markets
              </a>
              <a href="#portfolio" style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}>
                Portfolio
              </a>
              <a href="#leaderboard" style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}>
                Leaderboard
              </a>
              <a href="#help" style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}>
                Help
              </a>

              {/* Notifications */}
              <button style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0.5rem',
              }}>
                🔔
                <span style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#ef4444',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                }}>
                  2
                </span>
              </button>

              {/* Wallet Button or Connected State */}
              {!walletConnected ? (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontWeight: '600',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                    opacity: isConnecting ? 0.7 : 1,
                  }}
                >
                  {isConnecting ? '🔗 Connecting...' : '💼 Connect Wallet'}
                </button>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowWalletMenu(!showWalletMenu)}
                    style={{
                      padding: '0.6rem 1.5rem',
                      background: 'linear-gradient(135deg, #34d399, #10b981)',
                      color: 'white',
                      borderRadius: '0.375rem',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(52, 211, 153, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    ✓ {formatAddress(walletAddress!)}
                    <span style={{ fontSize: '1.1rem' }}>▼</span>
                  </button>

                  {/* Wallet Menu */}
                  {showWalletMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                      minWidth: '200px',
                      zIndex: 1000,
                    }}>
                      <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid #334155',
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                          Connected Wallet
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#e2e8f0',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}>
                          {walletAddress}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(walletAddress!);
                          alert('Address copied to clipboard!');
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#cbd5e1',
                          border: 'none',
                          borderBottom: '1px solid #334155',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        📋 Copy Address
                      </button>

                      <button
                        onClick={() => {
                          window.open(`https://suiscan.xyz/account/${walletAddress}`, '_blank');
                          setShowWalletMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#cbd5e1',
                          border: 'none',
                          borderBottom: '1px solid #334155',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        🔗 View on SuiScan
                      </button>

                      <button
                        onClick={handleDisconnectWallet}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#f87171',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        🚪 Disconnect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main style={{ paddingTop: '4rem', minHeight: '100vh' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          padding: '3rem 1rem 2rem 1rem',
          marginTop: '6rem',
          borderTop: '1px solid #334155',
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}>
            {/* About */}
            <div>
              <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>About SAPM</h3>
              <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: '1.6' }}>AI-powered prediction markets built on Sui blockchain with sovereign infrastructure and zero-copy performance.</p>
            </div>

            {/* Resources */}
            <div>
              <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Resources</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#docs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>📚 Documentation</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#api" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🔌 API Reference</a></li>
                <li><a href="#governance" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>⚖️ Governance</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Community</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#discord" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>💬 Discord</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#github" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🐙 GitHub</a></li>
                <li><a href="#twitter" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>𝕏 Twitter</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Legal</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🔒 Privacy Policy</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#terms" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>📄 Terms of Service</a></li>
                <li><a href="#risk" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>⚠️ Risk Disclosure</a></li>
              </ul>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #334155',
            paddingTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
          }}>
            <p style={{ margin: 0, color: '#64748b' }}>© 2025 SAPM on Sui. All rights reserved. | Built with ⚡ on Sui Blockchain</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
