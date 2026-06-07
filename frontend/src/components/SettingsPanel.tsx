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
      <NetworkSwitcher onNetworkChange={(net) => updateSetting('network', net)} compact={false} />

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
            <strong>SAPM Version:</strong> 1.0.0 (Phase 4 Complete)
          </p>
          <p>
            <strong>Network:</strong> {NETWORK_CONFIGS[settings.network].label}
          </p>
          <p>
            <strong>Status:</strong> Production Ready with A2UI Integration
          </p>
          <p>
            <strong>Features:</strong> Sui Integration, Agent Insights, Real-time Trading
          </p>
        </div>
      </div>
    </div>
  );
}
