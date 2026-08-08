import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PositionManager } from '@/components/trading/PositionManager';

describe('PositionManager Component Micro-UX and Accessibility', () => {
  const defaultProps = {
    marketId: '0x123abc',
    yesPrice: 0.65,
    noPrice: 0.35,
    onDeposit: jest.fn(() => Promise.resolve()),
    onRedeem: jest.fn(() => Promise.resolve()),
  };

  it('correctly associates the label with the deposit input using htmlFor and id', () => {
    render(<PositionManager {...defaultProps} />);

    // Get input by its accessible label
    const depositInput = screen.getByLabelText(/Deposit Stake/);
    expect(depositInput).toBeTruthy();
    expect(depositInput.tagName).toBe('INPUT');
    expect(depositInput.getAttribute('type')).toBe('number');
    expect(depositInput.getAttribute('id')).toBe('deposit-amount-input');

    // Query standard compiled 'for' attribute on label
    const label = screen.getByText('Deposit Stake');
    expect(label.getAttribute('for')).toBe('deposit-amount-input');
  });

  it('renders quick deposit amount preset buttons and updates input value when clicked', () => {
    render(<PositionManager {...defaultProps} />);

    const depositInput = screen.getByLabelText(/Deposit Stake/) as HTMLInputElement;
    expect(depositInput.value).toBe(''); // Initially empty

    // Click on '50 SUI' deposit preset button
    const preset50Button = screen.getByRole('button', { name: 'Set deposit amount to 50 SUI' });
    expect(preset50Button).toBeTruthy();

    fireEvent.click(preset50Button);

    // Verify deposit input value is updated to '50'
    expect(depositInput.value).toBe('50');

    // Click on '500 SUI' deposit preset button
    const preset500Button = screen.getByRole('button', { name: 'Set deposit amount to 500 SUI' });
    fireEvent.click(preset500Button);

    // Verify deposit input value is updated to '500'
    expect(depositInput.value).toBe('500');
  });

  it('visually highlights the selected active deposit preset button', () => {
    render(<PositionManager {...defaultProps} />);

    const preset10Button = screen.getByRole('button', { name: 'Set deposit amount to 10 SUI' });
    const preset50Button = screen.getByRole('button', { name: 'Set deposit amount to 50 SUI' });

    // Initially none are active as input is empty
    expect(preset10Button.className).toContain('bg-gray-50');
    expect(preset50Button.className).toContain('bg-gray-50');

    // Click 10 SUI preset
    fireEvent.click(preset10Button);

    // Now 10 SUI should be active
    expect(preset10Button.className).toContain('bg-blue-50');
    expect(preset50Button.className).not.toContain('bg-blue-50');

    // Click 50 SUI preset
    fireEvent.click(preset50Button);

    // Now 50 SUI should be active, 10 SUI should be inactive
    expect(preset50Button.className).toContain('bg-blue-50');
    expect(preset10Button.className).not.toContain('bg-blue-50');
  });

  it('renders the Close Position Confirmation Modal with correct ARIA properties and closes on Escape/backdrop click', () => {
    render(<PositionManager {...defaultProps} />);

    // Open active YES position first
    const openYesButton = screen.getByRole('button', { name: 'Open YES Position' });
    fireEvent.click(openYesButton);

    // Click Close Position button
    const closePositionButton = screen.getByRole('button', { name: 'Close Position' });
    fireEvent.click(closePositionButton);

    // Verify confirmation modal is open with proper ARIA attributes
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');

    // Verify modal title
    const modalTitle = screen.getByText('Close Position?');
    expect(modalTitle.getAttribute('id')).toBe('modal-title');

    // Verify buttons have correct focus-visible styles
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const confirmButton = screen.getByRole('button', { name: 'Confirm Close' });
    expect(cancelButton.className).toContain('focus-visible:ring-gray-500');
    expect(confirmButton.className).toContain('focus-visible:ring-red-500');

    // Verify global escape key dismisses the modal
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Re-open modal
    fireEvent.click(closePositionButton);
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Verify overlay backdrop click dismisses the modal
    const overlayBackdrop = screen.getByText('Close Position?').closest('.fixed') as HTMLElement;
    fireEvent.click(overlayBackdrop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
