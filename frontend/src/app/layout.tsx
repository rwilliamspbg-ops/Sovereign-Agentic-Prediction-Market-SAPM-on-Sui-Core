import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SAPM - Agentic Prediction Markets on Sui | Sovereign Infrastructure",
  description: "AI-powered prediction markets with zero-copy performance and sovereign infrastructure. Trade predictions with machine learning agents.",
  keywords: ["prediction markets", "agentic AI", "Sui blockchain", "DeFi", "machine learning"],
  authors: [{ name: "Sovereign Map", url: "https://sovereignmap.local" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SAPM - Agentic Prediction Markets",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900 h-full`}>
        {/* Header Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <nav className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  SAPM
                </span>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                <a href="#markets" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Markets</a>
                <a href="#agents" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Agents</a>
                <a href="#leaderboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Leaderboard</a>
                <a href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">About</a>
              </div>

              {/* Wallet Connect Button */}
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl">
                Connect Wallet
              </button>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="pt-20 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-white font-semibold mb-4">About SAPM</h3>
                <p className="text-sm">AI-powered prediction markets with sovereign infrastructure and zero-copy performance.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Governance</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Community</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Risk Disclosure</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
              © 2026 SAPM. All rights reserved. Built on Sui Blockchain.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
