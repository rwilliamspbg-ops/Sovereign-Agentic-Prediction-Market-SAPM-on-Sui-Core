# SAPM UI/UX Improvements & Network Switcher

## Overview

Comprehensive UI/UX enhancements including a professional network switcher (testnet/mainnet), settings panel, improved responsiveness, and better user feedback.

---

## 🎯 Key Improvements

### 1. **Network Switcher (High Priority)**
- Toggle between Testnet ↔ Mainnet
- Visual indicator showing current network
- Auto-save to localStorage
- Environment-specific colors
- API endpoint configuration

### 2. **Settings Panel (High Priority)**
- Network selection
- Theme toggle (light/dark)
- Notifications preferences
- Advanced options
- User preferences persistence

### 3. **Visual Improvements (Medium)**
- Better loading states
- Toast notifications
- Error handling UI
- Mobile responsiveness
- Accessibility improvements

### 4. **Market UI Enhancements (Medium)**
- Filter chips with X to clear
- Sort indicators (▲▼)
- Market status badges
- Liquidity warnings
- High-confidence highlights

### 5. **Responsive Design (Medium)**
- Mobile hamburger menu
- Tablet optimization
- Touch-friendly buttons
- Collapsible sections

---

## 🔧 Implementation: Network Switcher Component

### Create `frontend/src/components/NetworkSwitcher.tsx`

```typescript
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
```

---

## 🔧 Implementation: Settings Panel Component

### Create `frontend/src/components/SettingsPanel.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { NetworkSwitcher, NETWORK_CONFIGS } from './NetworkSwitcher';

export interface UserSettings {
  network: 'testnet' | 'mainnet';
  theme: 'dark' | 'light';
  notifications: boolean;
  notificationSound: boolean;
  advancedMode: boolean;
  autoRefresh: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  network: 'testnet',
  theme: 'dark',
  notifications: true,
  notificationSound: true,
  advancedMode: false,
  autoRefresh: true,
};

interface SettingsPanelProps {
  onSettingsChange?: (settings: UserSettings) => void;
  onClose?: () => void;
}

export function SettingsPanel({ onSettingsChange, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('userSettings', JSON.stringify(updated));
    onSettingsChange?.(updated);
  };

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid #334155',
      }}
    >
      <div>
        <div style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem' }}>
          {label}
        </div>
        {description && (
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{description}</div>
        )}
      </div>
      {children}
    </div>
  );

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '50px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        backgroundColor: checked ? '#34d399' : '#334155',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: 'white',
          transition: 'transform 0.2s',
          transform: checked ? 'translateX(22px)' : 'translateX(0)',
        }}
      />
    </button>
  );

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '2rem 1rem',
        backgroundColor: '#0f172a',
        minHeight: '100vh',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '1.875rem', fontWeight: '700', margin: 0 }}>
          ⚙️ Settings
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Network Configuration */}
      <NetworkSwitcher onNetworkChange={(net) => updateSetting('network', net)} />

      {/* General Settings */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          🎨 Preferences
        </h2>

        <SettingRow label="Theme" description="Choose your interface theme">
          <select
            value={settings.theme}
            onChange={(e) => updateSetting('theme', e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0f172a',
              color: '#0ea5e9',
              border: '1px solid #334155',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            <option value="dark">🌙 Dark</option>
            <option value="light">☀️ Light</option>
          </select>
        </SettingRow>
      </div>

      {/* Notification Settings */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          🔔 Notifications
        </h2>

        <SettingRow label="Enable Notifications" description="Get alerts for market updates">
          <Toggle
            checked={settings.notifications}
            onChange={(val) => updateSetting('notifications', val)}
          />
        </SettingRow>

        {settings.notifications && (
          <SettingRow label="Sound Effects" description="Play sound for notifications">
            <Toggle
              checked={settings.notificationSound}
              onChange={(val) => updateSetting('notificationSound', val)}
            />
          </SettingRow>
        )}

        <SettingRow label="Auto-Refresh" description="Automatically refresh market data">
          <Toggle
            checked={settings.autoRefresh}
            onChange={(val) => updateSetting('autoRefresh', val)}
          />
        </SettingRow>
      </div>

      {/* Advanced Settings */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          ⚡ Advanced
        </h2>

        <SettingRow label="Advanced Mode" description="Show advanced trading options">
          <Toggle
            checked={settings.advancedMode}
            onChange={(val) => updateSetting('advancedMode', val)}
          />
        </SettingRow>

        {settings.advancedMode && (
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '0.375rem',
              padding: '1rem',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#94a3b8',
            }}
          >
            ✓ Advanced options are now visible throughout the app
          </div>
        )}
      </div>

      {/* Info Section */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>
          ℹ️ About
        </h2>
        <div style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.6' }}>
          <p>
            <strong>SAPM Version:</strong> 1.0.0 (Phase 1)
          </p>
          <p>
            <strong>Network:</strong> {NETWORK_CONFIGS[settings.network].label}
          </p>
          <p>
            <strong>Status:</strong> Development
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 Update Layout with Settings Icon

Update `frontend/src/app/layout.tsx` to include:

```typescript
// Add settings state near wallet state
const [showSettings, setShowSettings] = React.useState(false);
const [network, setNetwork] = React.useState<'testnet' | 'mainnet'>('testnet');

// Load network preference on mount
React.useEffect(() => {
  const saved = localStorage.getItem('preferredNetwork');
  if (saved) setNetwork(saved as 'testnet' | 'mainnet');
}, []);

// Add settings icon to header (next to wallet button)
<button
  onClick={() => setShowSettings(!showSettings)}
  style={{
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.5rem',
    color: '#cbd5e1',
  }}
  title="Settings"
>
  ⚙️
</button>

// Add settings modal
{showSettings && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
      overflow: 'auto',
    }}
    onClick={() => setShowSettings(false)}
  >
    <div onClick={(e) => e.stopPropagation()}>
      <SettingsPanel onClose={() => setShowSettings(false)} />
    </div>
  </div>
)}
```

---

## 📱 Additional UI/UX Improvements

### 1. **Market Card Enhancements**

```typescript
// Add status badge colors
const getStatusColor = (tvl: number) => {
  if (tvl > 5000000) return { bg: '#064e3b', color: '#34d399' }; // Green
  if (tvl > 2000000) return { bg: '#78350f', color: '#fbbf24' }; // Yellow
  return { bg: '#7f1d1d', color: '#f87171' }; // Red
};

// Add confidence badge
const ConfidenceBadge = ({ value }: { value: number }) => {
  if (value >= 75) return <span style={{ color: '#34d399' }}>⭐⭐⭐</span>;
  if (value >= 50) return <span style={{ color: '#fbbf24' }}>⭐⭐</span>;
  return <span style={{ color: '#f87171' }}>⭐</span>;
};
```

### 2. **Toast Notifications**

```typescript
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((item) => item.id !== id));
    }, 3000);
  };

  return { toasts, addToast };
}
```

### 3. **Loading States**

```typescript
const Skeleton = ({ width = '100%', height = '1rem' }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: '#334155',
      borderRadius: '0.25rem',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}
  />
);
```

### 4. **Mobile Menu**

```typescript
const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

// Add hamburger button
{window.innerWidth < 768 && (
  <button
    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
    style={{
      background: 'none',
      border: 'none',
      color: '#cbd5e1',
      fontSize: '1.5rem',
      cursor: 'pointer',
    }}
  >
    ☰
  </button>
)}

// Mobile menu
{mobileMenuOpen && (
  <div
    style={{
      position: 'fixed',
      left: 0,
      right: 0,
      top: '4rem',
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}
  >
    <Link href="/markets">Markets</Link>
    <Link href="/portfolio">Portfolio</Link>
    <Link href="/leaderboard">Leaderboard</Link>
    <Link href="/help">Help</Link>
  </div>
)}
```

---

## 📊 Network Indicator in Markets

```typescript
// Add to market cards
<div
  style={{
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: network === 'mainnet' ? '#064e3b' : '#78350f',
    color: network === 'mainnet' ? '#34d399' : '#fbbf24',
    borderRadius: '0.25rem',
    fontSize: '0.65rem',
    fontWeight: '700',
  }}
>
  {network.toUpperCase()}
</div>
```

---

## 🎨 Color System by Network

```typescript
export const NETWORK_STYLES = {
  testnet: {
    primary: '#fbbf24',      // Amber
    secondary: '#78350f',    // Dark amber
    rgba: 'rgba(251, 191, 36, 0.1)',
  },
  mainnet: {
    primary: '#34d399',      // Emerald
    secondary: '#064e3b',    // Dark emerald
    rgba: 'rgba(52, 211, 153, 0.1)',
  },
};
```

---

## ✅ Implementation Checklist

- [ ] Create NetworkSwitcher component
- [ ] Create SettingsPanel component
- [ ] Update layout.tsx with settings icon
- [ ] Add network indicator to markets
- [ ] Implement toast notifications
- [ ] Add mobile menu
- [ ] Add loading states
- [ ] Improve market card design
- [ ] Add theme support (light/dark)
- [ ] Test on mobile/tablet
- [ ] Add keyboard shortcuts (⌘K for settings)

---

## 🚀 File Structure

```
frontend/src/
├── components/
│   ├── NetworkSwitcher.tsx      (NEW)
│   ├── SettingsPanel.tsx         (NEW)
│   ├── Toast.tsx                 (NEW)
│   └── LoadingStates.tsx          (NEW)
├── hooks/
│   ├── useToast.ts               (NEW)
│   └── useSettings.ts             (NEW)
├── app/
│   ├── layout.tsx                (UPDATED)
│   ├── settings/
│   │   └── page.tsx              (NEW)
│   └── globals.css               (UPDATED)
└── types/
    └── index.ts                  (NEW)
```

---

This implementation provides:
✅ Professional network switching  
✅ Settings persistence  
✅ Mobile-responsive design  
✅ Better UX with notifications  
✅ Clear visual feedback  
✅ Testnet/mainnet distinction  

Ready to implement!
