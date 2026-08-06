import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
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
});
