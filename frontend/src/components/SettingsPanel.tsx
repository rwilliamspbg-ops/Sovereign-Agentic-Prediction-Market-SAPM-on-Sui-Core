'use client';

import React, { useState, useEffect } from 'react';
import { NetworkSwitcher, NETWORK_CONFIGS } from './NetworkSwitcher';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  loadNotificationPreferences,
  saveNotificationPreferences,
  notifyLocalPreview,
  type NotificationPermissionState,
} from '@/lib/firebase-config';

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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('default');
  const [notificationPrefs, setNotificationPrefs] = useState(loadNotificationPreferences());

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

  // Handle global Escape key to close the settings panel
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setNotificationPermission(getNotificationPermissionState());
  }, []);

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('userSettings', JSON.stringify(updated));
    onSettingsChange?.(updated);
  };

  const updateNotificationPreference = (key: keyof typeof notificationPrefs, value: boolean) => {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    saveNotificationPreferences(next);
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const SettingRow = ({
    label,
    description,
    children,
    htmlFor,
    labelId,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
    htmlFor?: string;
    labelId?: string;
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
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            id={labelId}
            style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem', display: 'block', cursor: 'pointer' }}
          >
            {label}
          </label>
        ) : (
          <div id={labelId} style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem' }}>
            {label}
          </div>
        )}
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
    ariaLabel,
    ariaLabelledBy,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel?: string;
    ariaLabelledBy?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onChange(!checked)}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-full"
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
            aria-label="Close settings"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '1.5rem',
              cursor: 'pointer',
              width: '44px',
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
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

        <SettingRow label="Theme" description="Choose your interface theme" htmlFor="theme-select" labelId="theme-label">
          <select
            id="theme-select"
            value={settings.theme}
            onChange={(e) => updateSetting('theme', e.target.value)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
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

        <SettingRow label="Enable Notifications" description="Get alerts for market updates" labelId="enable-notifications-label">
          <Toggle
            checked={settings.notifications}
            onChange={(val) => updateSetting('notifications', val)}
            ariaLabelledBy="enable-notifications-label"
          />
        </SettingRow>

        <SettingRow label="Permission Status" description="Browser notification access">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span style={{
              color: notificationPermission === 'granted' ? '#34d399' : notificationPermission === 'denied' ? '#f87171' : '#fbbf24',
              fontWeight: '600',
              fontSize: '0.875rem',
            }}>
              {notificationPermission.toUpperCase()}
            </span>
            {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
              <button
                onClick={handleEnableNotifications}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '0.5rem',
                  border: '1px solid #06b6d4',
                  backgroundColor: '#083344',
                  color: '#22d3ee',
                  fontWeight: '600',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                }}
              >
                Grant Permission
              </button>
            )}
          </div>
        </SettingRow>

        {settings.notifications && (
          <SettingRow label="Sound Effects" description="Play sound for notifications" labelId="sound-effects-label">
            <Toggle
              checked={settings.notificationSound}
              onChange={(val) => updateSetting('notificationSound', val)}
              ariaLabelledBy="sound-effects-label"
            />
          </SettingRow>
        )}

        {settings.notifications && (
          <>
            <SettingRow label="Market Resolution Alerts" description="Notify when markets resolve" labelId="resolution-alerts-label">
              <Toggle
                checked={notificationPrefs.marketResolutionAlerts}
                onChange={(val) => updateNotificationPreference('marketResolutionAlerts', val)}
                ariaLabelledBy="resolution-alerts-label"
              />
            </SettingRow>
            <SettingRow label="Price Change Alerts" description="Notify on >5% market move" labelId="price-alerts-label">
              <Toggle
                checked={notificationPrefs.priceChangeAlerts}
                onChange={(val) => updateNotificationPreference('priceChangeAlerts', val)}
                ariaLabelledBy="price-alerts-label"
              />
            </SettingRow>
            <SettingRow label="Agent Forecast Alerts" description="Notify for high-confidence forecasts" labelId="forecast-alerts-label">
              <Toggle
                checked={notificationPrefs.agentForecastAlerts}
                onChange={(val) => updateNotificationPreference('agentForecastAlerts', val)}
                ariaLabelledBy="forecast-alerts-label"
              />
            </SettingRow>

            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => notifyLocalPreview('SAPM Alert Preview', 'Notifications are configured for this browser.')}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                }}
              >
                Send Test Notification
              </button>
            </div>
          </>
        )}

        <SettingRow label="Auto-Refresh" description="Automatically refresh market data" labelId="auto-refresh-label">
          <Toggle
            checked={settings.autoRefresh}
            onChange={(val) => updateSetting('autoRefresh', val)}
            ariaLabelledBy="auto-refresh-label"
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

        <SettingRow label="Advanced Mode" description="Show advanced trading options" labelId="advanced-mode-label">
          <Toggle
            checked={settings.advancedMode}
            onChange={(val) => updateSetting('advancedMode', val)}
            ariaLabelledBy="advanced-mode-label"
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
