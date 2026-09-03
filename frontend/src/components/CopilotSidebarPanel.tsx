'use client';

import React, { useState } from 'react';

export default function CopilotSidebarPanel() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready'>('all');

  const contextItems = [
    { id: 'sui', label: 'Sui testnet connected workspace', isReady: true, details: 'Network connected and synced' },
    { id: 'deepbook', label: 'DeepBook order flow available', isReady: true, details: 'Active liquidity feed' },
    { id: 'walrus', label: 'Walrus archival path configured', isReady: true, details: 'Blob storage active' },
    { id: 'schema', label: 'Canonical schema ingress checks enabled', isReady: true, details: 'Schema validation active' },
  ];

  const visibleItems = activeFilter === 'ready' ? contextItems.filter(i => i.isReady) : contextItems;

  return (
    <aside
      role="region"
      aria-label="Market Context Overview"
      className="sidebar-shell p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-100"
    >
      <div className="sidebar-fallback">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Market Context</h3>
          <div role="group" aria-label="Filter context items" className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              aria-pressed={activeFilter === 'all'}
              aria-label="Show all context items"
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeFilter === 'all' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ready')}
              aria-pressed={activeFilter === 'ready'}
              aria-label="Filter ready context items"
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeFilter === 'ready' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ready
            </button>
          </div>
        </div>
        <ul className="space-y-2 text-xs">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              tabIndex={0}
              aria-label={`${item.label}. Status: ${item.details}`}
              className="group relative flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-help"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-300 group-hover:text-slate-100 transition-colors">{item.label}</span>
              <div
                role="tooltip"
                className="hidden group-hover:block group-focus-within:block absolute left-0 bottom-full mb-1.5 p-2 bg-slate-950 text-slate-200 text-[11px] rounded border border-slate-700 shadow-xl z-20 pointer-events-none whitespace-nowrap"
              >
                {item.details}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
