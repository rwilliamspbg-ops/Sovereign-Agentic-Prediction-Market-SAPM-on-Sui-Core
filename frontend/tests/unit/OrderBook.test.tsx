import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { OrderBook } from '@/components/trading/OrderBook';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('OrderBook Component Accessibility and Interaction', () => {
  it('renders order book header, price, spread and lists bid/ask levels', () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    expect(screen.getByText('Order Book')).toBeTruthy();
    expect(screen.getAllByText('Spread:').length).toBeGreaterThan(0);
    expect(screen.getByText('24h Volume:')).toBeTruthy();
  });

  it('renders action buttons with correct accessibility attributes and focus styles', () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    // Query for action buttons
    const sellButtons = screen.getAllByRole('button', { name: /Sell at/ });
    const buyButtons = screen.getAllByRole('button', { name: /Buy at/ });

    expect(sellButtons.length).toBeGreaterThan(0);
    expect(buyButtons.length).toBeGreaterThan(0);

    // Verify aria-label has the price format (e.g., "Sell at 0.8800 SUI")
    expect(sellButtons[0].getAttribute('aria-label')).toMatch(/Sell at \d+\.\d{4} SUI/);
    expect(buyButtons[0].getAttribute('aria-label')).toMatch(/Buy at \d+\.\d{4} SUI/);

    // Verify focus styles are declared in the className
    expect(sellButtons[0].className).toContain('focus-visible:ring-2');
    expect(sellButtons[0].className).toContain('focus-visible:ring-red-500');
    expect(buyButtons[0].className).toContain('focus-visible:ring-2');
    expect(buyButtons[0].className).toContain('focus-visible:ring-green-500');
  });

  it('triggers onPlaceOrder on button clicks', () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    const buyButtons = screen.getAllByRole('button', { name: /Buy at/ });
    fireEvent.click(buyButtons[0]);

    expect(handlePlaceOrder).toHaveBeenCalledTimes(1);
  });

  it('renders the accessible fee structure details tooltip with proper roles and tabIndex', () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    // Get the Maker and Taker fee trigger blocks by their explicit aria-labels
    const makerFeeBlock = screen.getByLabelText(/Maker Fee:.*percent/);
    const takerFeeBlock = screen.getByLabelText(/Taker Fee:.*percent/);

    expect(makerFeeBlock).toBeTruthy();
    expect(takerFeeBlock).toBeTruthy();

    expect(makerFeeBlock.getAttribute('tabIndex')).toBe('0');
    expect(takerFeeBlock.getAttribute('tabIndex')).toBe('0');

    expect(makerFeeBlock.className).toContain('focus-visible:ring-2');
    expect(makerFeeBlock.className).toContain('focus-visible:ring-sky-500');

    // Get tooltip by its role
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Fee Structure Details');
    expect(tooltip.textContent).toContain('Maker:');
    expect(tooltip.textContent).toContain('Taker:');
  });

  it('renders order size presets in a semantic group with aria-label and aria-pressed states', () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    const presetGroup = screen.getByRole('group', { name: 'Order size presets' });
    expect(presetGroup).toBeTruthy();

    const preset100 = screen.getByRole('button', { name: 'Set order size to 100 SUI' });
    const preset500 = screen.getByRole('button', { name: 'Set order size to 500 SUI' });
    const preset1000 = screen.getByRole('button', { name: 'Set order size to 1000 SUI' });
    const preset5000 = screen.getByRole('button', { name: 'Set order size to 5000 SUI' });

    expect(preset100.getAttribute('aria-pressed')).toBe('true');
    expect(preset500.getAttribute('aria-pressed')).toBe('false');
    expect(preset1000.getAttribute('aria-pressed')).toBe('false');
    expect(preset5000.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates selected order size when preset is clicked and passes selected size to onPlaceOrder', async () => {
    const handlePlaceOrder = jest.fn<any>().mockImplementation(() => Promise.resolve());
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    const preset500 = screen.getByRole('button', { name: 'Set order size to 500 SUI' });
    const preset100 = screen.getByRole('button', { name: 'Set order size to 100 SUI' });

    // Select 500 SUI preset
    fireEvent.click(preset500);

    expect(preset500.getAttribute('aria-pressed')).toBe('true');
    expect(preset100.getAttribute('aria-pressed')).toBe('false');

    // Click first Buy button
    const buyButtons = screen.getAllByRole('button', { name: /Buy at/i });
    expect(buyButtons.length).toBeGreaterThan(0);

    fireEvent.click(buyButtons[0]);

    expect(handlePlaceOrder).toHaveBeenCalledTimes(1);
    expect(handlePlaceOrder).toHaveBeenCalledWith(expect.any(Number), 500, 'buy');
  });
});
