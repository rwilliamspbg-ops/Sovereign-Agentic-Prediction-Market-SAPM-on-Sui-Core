import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAPM - Agentic Prediction Markets",
  description: "AI-powered prediction markets on Sui blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: inter.style.fontFamily, margin: 0, padding: 0 }}>
        {/* Header */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>
                ⚡ SAPM
              </span>
            </div>
            <button style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              Connect Wallet
            </button>
          </nav>
        </header>

        {/* Main Content */}
        <main style={{ paddingTop: '4rem', minHeight: '100vh' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: '#1f2937',
          color: '#9ca3af',
          padding: '2rem 1rem',
          marginTop: '3rem',
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0 }}>© 2026 SAPM. All rights reserved. Built on Sui Blockchain.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
