'use client';

import React from 'react';

export default function CopilotSidebarPanel() {
  return (
    <div className="sidebar-shell">
      <div className="sidebar-fallback">
        <h3>Market Context</h3>
        <ul>
          <li>Sui testnet connected workspace</li>
          <li>DeepBook order flow available</li>
          <li>Walrus archival path configured</li>
          <li>Canonical schema ingress checks enabled</li>
        </ul>
      </div>
    </div>
  );
}