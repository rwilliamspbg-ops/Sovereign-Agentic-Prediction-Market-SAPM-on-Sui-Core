import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MarketCurveView from '@/components/MarketCurveView';
import { useAgentState } from '@/hooks/useAgentState';

describe('MarketCurveView Component Quick Stake Amount Presets', () => {
  it('renders quick stake amount preset group and updates stake input value on click', () => {
    (useAgentState as unknown as jest.Mock).mockReturnValue({
      marketData: {
        id: 'market_1',
        eventName: 'Will SUI exceed $5 in 2026?',
        compositeConfidence: 0.82,
        liquidityScore: 0.9,
        signalConfidence: 0.85,
        stakesCount: 42,
        oddsRange: { min: 1.05, max: 10 },
        outcomes: [
          { name: 'Outcome A', odds: 1.85, stakeWeight: 60 },
          { name: 'Outcome B', odds: 2.15, stakeWeight: 40 },
        ],
      },
      isLoading: false,
      toasts: [],
      dismissToast: jest.fn(),
      walletBalance: 1250,
      divergenceAlert: { active: false, deviationPct: 0 },
      densityMode: 'standard',
      agentTrail: [],
      advancedMetrics: {
        hvi: 12.4,
        addressClusters: [],
      },
    });

    render(<MarketCurveView />);

    // Check for semantic group container
    const presetGroup = screen.getByRole('group', { name: 'Quick stake amount presets' });
    expect(presetGroup).toBeTruthy();

    // Find the input field
    const stakeInput = screen.getByLabelText(/Stake Amount \(SUI\)/) as HTMLInputElement;
    expect(stakeInput.value).toBe('10'); // Default value is 10

    // Find 100 SUI preset button
    const preset100Button = screen.getByRole('button', { name: 'Set stake amount to 100 SUI' });
    expect(preset100Button).toBeTruthy();
    expect(preset100Button.getAttribute('aria-pressed')).toBe('false');

    // Click 100 SUI preset button
    fireEvent.click(preset100Button);

    // Verify input value and aria-pressed updated
    expect(stakeInput.value).toBe('100');
    expect(preset100Button.getAttribute('aria-pressed')).toBe('true');

    // Find 500 SUI preset button and click
    const preset500Button = screen.getByRole('button', { name: 'Set stake amount to 500 SUI' });
    fireEvent.click(preset500Button);

    // Verify input value and aria-pressed updated
    expect(stakeInput.value).toBe('500');
    expect(preset500Button.getAttribute('aria-pressed')).toBe('true');
    expect(preset100Button.getAttribute('aria-pressed')).toBe('false');
  });
});
