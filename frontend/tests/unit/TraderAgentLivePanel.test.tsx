import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TraderAgentLivePanel } from '@/components/agents/TraderAgentLivePanel';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

describe('TraderAgentLivePanel Accessibility & UX', () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  it('renders start/stop button with proper ARIA attributes and focus styles', () => {
    render(<TraderAgentLivePanel />);

    const startButton = screen.getByRole('button', { name: 'Start trader agent live feed' });
    expect(startButton).toBeTruthy();
    expect(startButton.getAttribute('aria-pressed')).toBe('false');
    expect(startButton.className).toContain('focus-visible:ring-2');

    // Toggle running state
    fireEvent.click(startButton);

    const stopButton = screen.getByRole('button', { name: 'Stop trader agent live feed' });
    expect(stopButton).toBeTruthy();
    expect(stopButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders cadence selection dropdown with explicit aria-label and options', () => {
    render(<TraderAgentLivePanel />);

    const select = screen.getByLabelText('Select trader agent update cadence');
    expect(select).toBeTruthy();
    expect(select.tagName).toBe('SELECT');
    expect(select.className).toContain('focus-visible:ring-2');

    // Change value
    fireEvent.change(select, { target: { value: '2000' } });
    expect((select as HTMLSelectElement).value).toBe('2000');
  });

  it('renders stream status container with role="status" and aria-live="polite"', () => {
    render(<TraderAgentLivePanel />);

    const statusContainer = screen.getByRole('status');
    expect(statusContainer).toBeTruthy();
    expect(statusContainer.getAttribute('aria-live')).toBe('polite');
    expect(statusContainer.textContent).toContain('Decisions: 0');
  });
});
