'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

type PaletteAction = {
  id: string;
  title: string;
  description: string;
  group: 'Navigate' | 'Trading' | 'System' | 'External' | 'Recent';
  hint: string;
  keywords: string[];
  shortcut?: string[];
  run: () => void;
};

interface CommandPaletteProps {
  actions?: PaletteAction[];
}

type RankedAction = { action: PaletteAction; score: number };
const RECENT_COMMANDS_KEY = 'sapm.commandPalette.recent';
const MAX_RECENT = 5;

const fuzzyScore = (query: string, action: PaletteAction): number => {
  if (!query) {
    return 1;
  }

  const q = query.trim().toLowerCase();
  const title = action.title.toLowerCase();
  const hint = action.hint.toLowerCase();
  const description = action.description.toLowerCase();
  const keywords = action.keywords.map((k) => k.toLowerCase());

  if (title === q) {
    return 120;
  }
  if (title.startsWith(q)) {
    return 100;
  }
  if (title.includes(q)) {
    return 80;
  }
  if (hint.includes(q)) {
    return 70;
  }
  if (description.includes(q)) {
    return 55;
  }
  if (keywords.some((k) => k.includes(q))) {
    return 50;
  }

  let lastIndex = -1;
  let seqScore = 0;
  for (const char of q) {
    const idx = title.indexOf(char, lastIndex + 1);
    if (idx === -1) {
      return 0;
    }
    seqScore += idx === lastIndex + 1 ? 7 : 3;
    lastIndex = idx;
  }
  return seqScore;
};

const createDefaultActions = (
  navigate: (path: string) => void,
  pathname: string,
): PaletteAction[] => {
  const base: PaletteAction[] = [
    {
      id: 'markets',
      title: 'Open Markets',
      description: 'Browse active prediction markets and liquidity.',
      group: 'Navigate',
      hint: '/markets',
      keywords: ['trade', 'markets', 'discover', 'order book'],
      shortcut: ['G', 'M'],
      run: () => navigate('/markets'),
    },
    {
      id: 'portfolio',
      title: 'Open Portfolio',
      description: 'Review open positions, exposure, and PnL snapshots.',
      group: 'Navigate',
      hint: '/portfolio',
      keywords: ['positions', 'wallet', 'portfolio', 'pnl'],
      shortcut: ['G', 'P'],
      run: () => navigate('/portfolio'),
    },
    {
      id: 'leaderboard',
      title: 'Open Leaderboard',
      description: 'See top wallets and trading performance rankings.',
      group: 'Navigate',
      hint: '/leaderboard',
      keywords: ['leaderboard', 'rankings', 'performance'],
      shortcut: ['G', 'L'],
      run: () => navigate('/leaderboard'),
    },
    {
      id: 'help',
      title: 'Open Help',
      description: 'Get support and usage guidance quickly.',
      group: 'Navigate',
      hint: '/help',
      keywords: ['help', 'support', 'guide'],
      shortcut: ['G', 'H'],
      run: () => navigate('/help'),
    },
    {
      id: 'docs',
      title: 'Open Docs',
      description: 'Read protocol docs, operations notes, and planning docs.',
      group: 'Navigate',
      hint: '/docs',
      keywords: ['docs', 'documentation', 'guides', 'runbook'],
      shortcut: ['G', 'D'],
      run: () => navigate('/docs'),
    },
    {
      id: 'markets-yes',
      title: 'Go to Markets (YES focus)',
      description: 'Jump into market flow with YES-side trading intent.',
      group: 'Trading',
      hint: '/markets?side=yes',
      keywords: ['yes', 'long', 'bullish', 'trade'],
      shortcut: ['T', 'Y'],
      run: () => navigate('/markets?side=yes'),
    },
    {
      id: 'markets-no',
      title: 'Go to Markets (NO focus)',
      description: 'Jump into market flow with NO-side trading intent.',
      group: 'Trading',
      hint: '/markets?side=no',
      keywords: ['no', 'short', 'bearish', 'trade'],
      shortcut: ['T', 'N'],
      run: () => navigate('/markets?side=no'),
    },
    {
      id: 'home',
      title: 'Return to Home',
      description: 'Go back to the main dashboard overview.',
      group: 'System',
      hint: '/',
      keywords: ['home', 'dashboard', 'overview'],
      shortcut: ['G', 'O'],
      run: () => navigate('/'),
    },
    {
      id: 'refresh',
      title: 'Refresh Current Page',
      description: 'Reload route data and refresh the current experience.',
      group: 'System',
      hint: 'F5',
      keywords: ['refresh', 'reload', 'sync'],
      shortcut: ['R'],
      run: () => {
        window.location.reload();
      },
    },
    {
      id: 'sui-pilot',
      title: 'Open Sui Pilot Repository',
      description: 'Open the reference project used for command-first UX inspiration.',
      group: 'External',
      hint: 'github.com/contract-hero/sui-pilot',
      keywords: ['sui', 'pilot', 'move', 'reference', 'github'],
      shortcut: ['G', 'S'],
      run: () => {
        window.open('https://github.com/contract-hero/sui-pilot', '_blank', 'noopener,noreferrer');
      },
    },
  ];

  if (pathname.startsWith('/markets')) {
    base.unshift({
      id: 'market-context-portfolio',
      title: 'Context: Review Portfolio Risk',
      description: 'From markets, jump to risk and performance review in portfolio.',
      group: 'Trading',
      hint: '/portfolio',
      keywords: ['context', 'risk', 'portfolio'],
      shortcut: ['C', 'R'],
      run: () => navigate('/portfolio'),
    });
  }

  if (pathname.startsWith('/portfolio')) {
    base.unshift({
      id: 'portfolio-context-markets',
      title: 'Context: Find New Markets',
      description: 'From portfolio, jump to discover additional opportunities.',
      group: 'Trading',
      hint: '/markets',
      keywords: ['context', 'markets', 'trade'],
      shortcut: ['C', 'M'],
      run: () => navigate('/markets'),
    });
  }

  return base;
};

export function CommandPalette({ actions }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentActionIds, setRecentActionIds] = React.useState<string[]>([]);

  const dynamicActions = React.useMemo(() => {
    const navigate = (path: string) => {
      router.push(path);
    };
    if (Array.isArray(actions) && actions.length > 0) {
      return actions;
    }
    return createDefaultActions(navigate, pathname);
  }, [actions, pathname, router]);

  const withRecentActions = React.useMemo(() => {
    if (recentActionIds.length === 0 || dynamicActions.length === 0) {
      return dynamicActions;
    }

    const lookup = new Map(dynamicActions.map((action) => [action.id, action]));
    const recent = recentActionIds
      .map((id) => lookup.get(id))
      .filter((action): action is PaletteAction => Boolean(action))
      .map((action) => ({
        ...action,
        group: 'Recent' as const,
        keywords: [...action.keywords, 'recent'],
      }));

    const baseWithoutRecents = dynamicActions.filter((action) => !recentActionIds.includes(action.id));
    return [...recent, ...baseWithoutRecents];
  }, [dynamicActions, recentActionIds]);

  const trackRecentAction = React.useCallback((actionId: string) => {
    setRecentActionIds((current) => {
      const next = [actionId, ...current.filter((id) => id !== actionId)].slice(0, MAX_RECENT);
      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const rankedActions = React.useMemo<RankedAction[]>(() => {
    const normalized = query.trim().toLowerCase();
    return withRecentActions
      .map((action) => ({ action, score: fuzzyScore(normalized, action) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query, withRecentActions]);

  const filteredActions = React.useMemo(() => rankedActions.map((entry) => entry.action), [rankedActions]);

  const selectedAction = filteredActions[selectedIndex] ?? null;

  const groupedActions = React.useMemo(() => {
    const groups = new Map<string, PaletteAction[]>();
    filteredActions.forEach((action) => {
      const existing = groups.get(action.group) ?? [];
      existing.push(action);
      groups.set(action.group, existing);
    });
    return Array.from(groups.entries());
  }, [filteredActions]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecentActionIds(parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_RECENT));
      }
    } catch {
      setRecentActionIds([]);
    }
  }, []);

  React.useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
        return;
      }

      if (!isOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => (filteredActions.length === 0 ? 0 : (current + 1) % filteredActions.length));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (filteredActions.length === 0) {
            return 0;
          }

          return (current - 1 + filteredActions.length) % filteredActions.length;
        });
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const action = filteredActions[selectedIndex];
        if (!action) {
          return;
        }

        trackRecentAction(action.id);
        action.run();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [filteredActions, isOpen, selectedIndex, trackRecentAction]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  React.useEffect(() => {
    setQuery('');
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          minHeight: '44px',
          padding: '0.45rem 0.8rem',
          borderRadius: '0.5rem',
          border: '1px solid #334155',
          backgroundColor: '#111827',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          letterSpacing: '0.02em',
        }}
        title="Open command palette"
      >
        <span style={{ fontSize: '0.72rem', border: '1px solid #334155', borderRadius: '0.25rem', padding: '0.1rem 0.3rem' }}>
          ⌘K
        </span>
        <span>Commands</span>
      </button>

      {isOpen && (
        <div
          className="command-palette-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.75)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '10vh 1rem 1rem 1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="command-palette-modal"
            style={{
              width: 'min(900px, 100%)',
              borderRadius: '0.85rem',
              border: '1px solid #334155',
              backgroundColor: '#020617',
              boxShadow: '0 25px 80px rgba(2, 132, 199, 0.35)',
              overflow: 'hidden',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: '0.9rem', borderBottom: '1px solid #1f2937' }}>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands, routes, docs..."
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '0.55rem',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                }}
              />
              <div style={{ marginTop: '0.45rem', color: '#64748b', fontSize: '0.76rem' }}>
                <span>Use ↑ ↓ to navigate, Enter to execute, Esc to close. Recent commands are pinned first.</span>
              </div>
            </div>

            <div
              style={{
                maxHeight: '55vh',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.3fr) minmax(220px, 0.7fr)',
              }}
            >
              <div style={{ overflowY: 'auto', padding: '0.4rem', borderRight: '1px solid #1f2937' }}>
                {filteredActions.length === 0 && (
                  <div style={{ padding: '0.8rem', color: '#94a3b8', fontSize: '0.9rem' }}>No matching commands.</div>
                )}

                {groupedActions.map(([group, actionsInGroup]) => (
                  <div key={group} style={{ marginBottom: '0.8rem' }}>
                    <div
                      style={{
                        color: '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '0.35rem 0.5rem',
                      }}
                    >
                      {group}
                    </div>
                    {actionsInGroup.map((action) => {
                      const index = filteredActions.findIndex((entry) => entry.id === action.id);
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => {
                            trackRecentAction(action.id);
                            action.run();
                            setIsOpen(false);
                          }}
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            border: 'none',
                            borderRadius: '0.45rem',
                            padding: '0.65rem 0.75rem',
                            marginBottom: '0.32rem',
                            backgroundColor: isSelected ? '#0c4a6e' : 'transparent',
                            color: isSelected ? '#e0f2fe' : '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{action.title}</span>
                            <span style={{ color: isSelected ? '#bae6fd' : '#64748b', fontSize: '0.75rem' }}>
                              {action.description}
                            </span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {action.shortcut && action.shortcut.length > 0 && (
                              <span style={{ display: 'flex', gap: '0.18rem' }}>
                                {action.shortcut.map((keyPart) => (
                                  <span
                                    key={`${action.id}-${keyPart}`}
                                    style={{
                                      border: `1px solid ${isSelected ? '#7dd3fc' : '#334155'}`,
                                      color: isSelected ? '#7dd3fc' : '#94a3b8',
                                      borderRadius: '0.22rem',
                                      fontSize: '0.66rem',
                                      padding: '0.08rem 0.25rem',
                                      lineHeight: 1.2,
                                      fontWeight: 700,
                                      letterSpacing: '0.03em',
                                      minWidth: '1.1rem',
                                      textAlign: 'center',
                                    }}
                                  >
                                    {keyPart}
                                  </span>
                                ))}
                              </span>
                            )}
                            <span style={{ color: isSelected ? '#7dd3fc' : '#64748b', fontSize: '0.75rem' }}>{action.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div style={{ padding: '0.9rem', backgroundColor: '#020a1f' }}>
                <div style={{ color: '#64748b', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Action Preview
                </div>
                {selectedAction ? (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem' }}>{selectedAction.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>{selectedAction.description}</div>
                    <div style={{ color: '#7dd3fc', fontSize: '0.78rem' }}>{selectedAction.hint}</div>
                    <div style={{ color: '#64748b', fontSize: '0.76rem' }}>
                      Group: <span style={{ color: '#94a3b8' }}>{selectedAction.group}</span>
                    </div>
                    {selectedAction.shortcut && selectedAction.shortcut.length > 0 && (
                      <div style={{ color: '#64748b', fontSize: '0.76rem' }}>
                        Shortcut: <span style={{ color: '#94a3b8' }}>{selectedAction.shortcut.join(' + ')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.82rem' }}>
                    Select a command to preview its action details.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommandPalette;