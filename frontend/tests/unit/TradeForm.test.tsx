import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TradeForm } from '@/components/TradeExecution';

describe('TradeForm Component Micro-UX and Accessibility', () => {
  const defaultProps = {
    marketId: '0x123abc',
    yesPrice: 0.65,
    noPrice: 0.35,
    isWalletConnected: true,
    onExecuteTrade: jest.fn(() => Promise.resolve({
      id: 'trade_1',
      status: 'success' as const,
      stage: 'finalized' as const,
      marketId: '0x123abc',
      side: 'yes' as const,
      amount: 10,
      executionPrice: 0.65,
      totalCost: 6.5,
      position: 10,
      timestamp: new Date(),
    })),
  };

  it('correctly associates the label with the amount input using htmlFor and id', () => {
    render(<TradeForm {...defaultProps} />);

    // Get input by its accessible label
    const amountInput = screen.getByLabelText(/Amount \(SUI\)/);
    expect(amountInput).toBeTruthy();
    expect(amountInput.tagName).toBe('INPUT');
    expect(amountInput.getAttribute('type')).toBe('number');
    expect(amountInput.getAttribute('id')).toBe('trade-amount');
    expect(amountInput.getAttribute('required')).not.toBeNull();
    expect(amountInput.getAttribute('aria-required')).toBe('true');
  });

  it('renders quick amount preset group and updates input value and aria-pressed when clicked', () => {
    render(<TradeForm {...defaultProps} />);

    // Check for semantic group container
    const presetGroup = screen.getByRole('group', { name: 'Quick amount presets' });
    expect(presetGroup).toBeTruthy();

    // Find the input field
    const amountInput = screen.getByLabelText(/Amount \(SUI\)/) as HTMLInputElement;
    expect(amountInput.value).toBe('10'); // Default value is '10' from state initializing as '10'

    // Click on '50 SUI' preset button (yesPrice is 0.65, so 50 * 0.65 = 32.50)
    const preset50Button = screen.getByRole('button', { name: /Set amount to 50 SUI \(Cost: 32.50 SUI\)/ });
    expect(preset50Button).toBeTruthy();
    expect(preset50Button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(preset50Button);

    // Verify input value and aria-pressed updated
    expect(amountInput.value).toBe('50');
    expect(preset50Button.getAttribute('aria-pressed')).toBe('true');

    // Click on '500 SUI' preset button
    const preset500Button = screen.getByRole('button', { name: /Set amount to 500 SUI \(Cost: 325.00 SUI\)/ });
    fireEvent.click(preset500Button);

    // Verify input value and aria-pressed updated
    expect(amountInput.value).toBe('500');
    expect(preset500Button.getAttribute('aria-pressed')).toBe('true');
    expect(preset50Button.getAttribute('aria-pressed')).toBe('false');
  });

  it('visually highlights the selected active preset button', () => {
    render(<TradeForm {...defaultProps} />);

    const preset10Button = screen.getByRole('button', { name: /Set amount to 10 SUI/ });
    const preset50Button = screen.getByRole('button', { name: /Set amount to 50 SUI/ });

    // By default, amount starts at '10', so 10 SUI preset should be active
    const style10 = window.getComputedStyle(preset10Button);
    expect(style10.color).toBe('rgb(14, 165, 233)'); // #0ea5e9 is rgb(14, 165, 233)
    expect(style10.borderColor).toBe('#0ea5e9');

    // 50 SUI should not be highlighted active
    const style50 = window.getComputedStyle(preset50Button);
    expect(style50.color).toBe('rgb(148, 163, 184)'); // #94a3b8 is rgb(148, 163, 184)
    expect(style50.borderColor).toBe('#334155');

    // Click 50 SUI preset
    fireEvent.click(preset50Button);

    // Now 50 SUI should be active
    const updatedStyle50 = window.getComputedStyle(preset50Button);
    expect(updatedStyle50.color).toBe('rgb(14, 165, 233)');
    expect(updatedStyle50.borderColor).toBe('#0ea5e9');

    // And 10 SUI should be inactive
    const updatedStyle10 = window.getComputedStyle(preset10Button);
    expect(updatedStyle10.color).toBe('rgb(148, 163, 184)');
    expect(updatedStyle10.borderColor).toBe('#334155');
  });

  it('declares and updates aria-pressed states on position toggle buttons', () => {
    render(<TradeForm {...defaultProps} initialSide="yes" />);

    const yesButton = screen.getByRole('button', { name: /Buy YES/i });
    const noButton = screen.getByRole('button', { name: /Buy NO/i });

    // Initially 'yes' is selected
    expect(yesButton.getAttribute('aria-pressed')).toBe('true');
    expect(noButton.getAttribute('aria-pressed')).toBe('false');

    // Click 'Buy NO'
    fireEvent.click(noButton);

    // Now 'no' is selected
    expect(yesButton.getAttribute('aria-pressed')).toBe('false');
    expect(noButton.getAttribute('aria-pressed')).toBe('true');
  });
});
