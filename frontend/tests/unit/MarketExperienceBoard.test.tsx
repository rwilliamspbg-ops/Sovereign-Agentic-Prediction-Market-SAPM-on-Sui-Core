import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MarketExperienceBoard from '@/components/markets/MarketExperienceBoard';

// Mock child components or external modules if they disrupt the render
jest.mock('@/components/agents/TraderAgentLivePanel', () => {
  return {
    TraderAgentLivePanel: () => <div data-testid="live-panel">Trader Agent Live Panel Mock</div>,
  };
});

describe('MarketExperienceBoard Accessibility and Label Associations', () => {
  it('correctly associates inputs with their corresponding labels', () => {
    render(<MarketExperienceBoard />);

    // Get range slider input by its accessible label text
    const rangeInput = screen.getByLabelText('Order size (USD)');
    expect(rangeInput).toBeTruthy();
    expect(rangeInput.tagName).toBe('INPUT');
    expect(rangeInput.getAttribute('type')).toBe('range');
    expect(rangeInput.getAttribute('id')).toBe('ticket-order-range');

    // Get number input by its hidden accessible label text
    const numberInput = screen.getByLabelText('Order size USD (numeric)');
    expect(numberInput).toBeTruthy();
    expect(numberInput.tagName).toBe('INPUT');
    expect(numberInput.getAttribute('type')).toBe('number');
    expect(numberInput.getAttribute('id')).toBe('ticket-order-number');

    // Query standard compiled 'for' attributes
    const rangeLabel = screen.getByText('Order size (USD)');
    expect(rangeLabel.getAttribute('for')).toBe('ticket-order-range');

    const numberLabel = screen.getByText('Order size USD (numeric)');
    expect(numberLabel.getAttribute('for')).toBe('ticket-order-number');
  });

  it('renders quick preset buttons and updates the order size input when clicked', () => {
    render(<MarketExperienceBoard />);

    const numberInput = screen.getByLabelText('Order size USD (numeric)') as HTMLInputElement;
    // Initial value is 250 by default in MarketExperienceBoard
    expect(numberInput.value).toBe('250');

    // Find the 500 USD preset button
    const preset500Button = screen.getByRole('button', { name: 'Set order size to 500 USD' });
    expect(preset500Button).toBeTruthy();

    fireEvent.click(preset500Button);

    // Verify input value is updated to '500'
    expect(numberInput.value).toBe('500');

    // Find the 1000 USD preset button
    const preset1000Button = screen.getByRole('button', { name: 'Set order size to 1000 USD' });
    fireEvent.click(preset1000Button);

    // Verify input value is updated to '1000'
    expect(numberInput.value).toBe('1000');
  });

  it('visually highlights the selected active preset button and updates aria-pressed', () => {
    render(<MarketExperienceBoard />);

    const preset250Button = screen.getByRole('button', { name: 'Set order size to 250 USD' });
    const preset500Button = screen.getByRole('button', { name: 'Set order size to 500 USD' });

    // Initial aria-pressed states
    expect(preset250Button.getAttribute('aria-pressed')).toBe('true');
    expect(preset500Button.getAttribute('aria-pressed')).toBe('false');

    // Since initial amount is 250, 250 USD preset should be active
    const style250 = window.getComputedStyle(preset250Button);
    expect(style250.color).toBe('rgb(34, 211, 238)'); // #22d3ee

    // 500 USD should be inactive
    const style500 = window.getComputedStyle(preset500Button);
    expect(style500.color).toBe('rgb(166, 230, 217)'); // #a6e6d9

    // Click 500 USD preset
    fireEvent.click(preset500Button);

    // Now 500 USD should be active with aria-pressed="true"
    expect(preset250Button.getAttribute('aria-pressed')).toBe('false');
    expect(preset500Button.getAttribute('aria-pressed')).toBe('true');

    const updatedStyle500 = window.getComputedStyle(preset500Button);
    expect(updatedStyle500.color).toBe('rgb(34, 211, 238)');

    // And 250 USD should be inactive
    const updatedStyle250 = window.getComputedStyle(preset250Button);
    expect(updatedStyle250.color).toBe('rgb(166, 230, 217)');
  });

  it('renders semantic group containers with aria-labels and dynamic aria-pressed attributes', () => {
    render(<MarketExperienceBoard />);

    // Group containers
    expect(screen.getByRole('group', { name: 'Filter markets by category' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filter markets by status' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Select outcome side' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Quick order size presets' })).toBeTruthy();

    // Side selection buttons
    const buyYesButton = screen.getByRole('button', { name: 'Buy YES' });
    const buyNoButton = screen.getByRole('button', { name: 'Buy NO' });

    expect(buyYesButton.getAttribute('aria-pressed')).toBe('true');
    expect(buyNoButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(buyNoButton);

    expect(buyYesButton.getAttribute('aria-pressed')).toBe('false');
    expect(buyNoButton.getAttribute('aria-pressed')).toBe('true');
  });
});
