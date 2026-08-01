import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SettingsPanel } from '@/components/SettingsPanel';

describe('SettingsPanel Component Accessibility and Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('renders Settings heading and onClose button when provided', () => {
    const handleClose = jest.fn();
    render(<SettingsPanel onClose={handleClose} />);

    // Check heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Settings');

    // Check Close button accessibility and dimensions
    const closeButton = screen.getByRole('button', { name: 'Close settings' });
    expect(closeButton).toBeTruthy();
    expect(closeButton.getAttribute('aria-label')).toBe('Close settings');
    expect(closeButton.className).toContain('focus-visible:ring-2');
    expect(closeButton.className).toContain('focus-visible:ring-sky-500');

    // Check inline style for minimum touch target of 44x44px
    const style = window.getComputedStyle(closeButton);
    expect(style.width).toBe('44px');
    expect(style.height).toBe('44px');

    // Clicking close button triggers callback
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('declares semantic ARIA role="switch" and aria-checked on the Toggle buttons', () => {
    render(<SettingsPanel />);

    // Find the toggle button for "Enable Notifications"
    const enableNotificationsToggle = screen.getByRole('switch', { name: 'Enable Notifications' });
    expect(enableNotificationsToggle).toBeTruthy();
    // Default value is true for notifications in DEFAULT_SETTINGS
    expect(enableNotificationsToggle.getAttribute('aria-checked')).toBe('true');
    expect(enableNotificationsToggle.getAttribute('aria-labelledby')).toBe('enable-notifications-label');

    // Find the toggle button for "Auto-Refresh"
    const autoRefreshToggle = screen.getByRole('switch', { name: 'Auto-Refresh' });
    expect(autoRefreshToggle).toBeTruthy();
    expect(autoRefreshToggle.getAttribute('aria-checked')).toBe('true');
    expect(autoRefreshToggle.getAttribute('aria-labelledby')).toBe('auto-refresh-label');

    // Find the toggle button for "Advanced Mode"
    const advancedModeToggle = screen.getByRole('switch', { name: 'Advanced Mode' });
    expect(advancedModeToggle).toBeTruthy();
    expect(advancedModeToggle.getAttribute('aria-checked')).toBe('false');
    expect(advancedModeToggle.getAttribute('aria-labelledby')).toBe('advanced-mode-label');

    // Click on Advanced Mode toggle
    fireEvent.click(advancedModeToggle);

    const updatedToggle = screen.getByRole('switch', { name: 'Advanced Mode' });
    expect(updatedToggle.getAttribute('aria-checked')).toBe('true');
  });

  it('correctly associates Theme dropdown and label with htmlFor and id', () => {
    render(<SettingsPanel />);

    const label = screen.getByText('Theme');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBe('theme-select');
    expect(label.getAttribute('id')).toBe('theme-label');

    const select = screen.getByLabelText('Theme');
    expect(select.tagName).toBe('SELECT');
    expect(select.getAttribute('id')).toBe('theme-select');
  });

  it('renders dependent notification toggles only when notification is enabled', () => {
    render(<SettingsPanel />);

    // By default, notifications is true, so "Sound Effects" is visible
    expect(screen.queryByRole('switch', { name: 'Sound Effects' })).not.toBeNull();

    // Disable notifications
    const enableNotificationsToggle = screen.getByRole('switch', { name: 'Enable Notifications' });
    fireEvent.click(enableNotificationsToggle);

    // Now, dependent toggles should not be rendered
    expect(screen.queryByRole('switch', { name: 'Sound Effects' })).toBeNull();
  });
});
