'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const CopilotSidebar = dynamic(async () => {
  try {
    const core = await import('@copilotkit/react-core');
    const coreSidebar = (core as { CopilotSidebar?: React.ComponentType<Record<string, unknown>> }).CopilotSidebar;
    if (coreSidebar) {
      return coreSidebar;
    }
  } catch {
    // Fall back to react-ui import below.
  }

  try {
    const ui = await import('@copilotkit/react-ui');
    const uiSidebar = (ui as { CopilotSidebar?: React.ComponentType<Record<string, unknown>> }).CopilotSidebar;
    if (uiSidebar) {
      return uiSidebar;
    }
  } catch {
    // Use static fallback below.
  }

  return () => (
    <div className="sidebar-fallback">
      <h3>Market Context</h3>
      <ul>
        <li>Sui testnet connected workspace</li>
        <li>DeepBook order flow available</li>
        <li>Walrus archival path configured</li>
      </ul>
    </div>
  );
}, { ssr: false });

export default function CopilotSidebarPanel() {
  return (
    <div className="sidebar-shell">
      <CopilotSidebar />
    </div>
  );
}