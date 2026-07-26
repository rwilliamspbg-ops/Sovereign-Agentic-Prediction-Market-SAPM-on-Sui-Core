import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { OrderBook } from '@/components/trading/OrderBook';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('OrderBook Component Accessibility and Interaction', () => {
  it('renders order book header, price, spread and lists bid/ask levels', () => {
    const handlePlaceOrder = jest.fn();
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    expect(screen.getByText('Order Book')).toBeTruthy();
    expect(screen.getAllByText('Spread:').length).toBeGreaterThan(0);
    expect(screen.getByText('24h Volume:')).toBeTruthy();
  });

  it('renders action buttons with correct accessibility attributes and focus styles', () => {
    const handlePlaceOrder = jest.fn();
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
    const handlePlaceOrder = jest.fn();
    render(<OrderBook marketId="TEST_MKT_001" onPlaceOrder={handlePlaceOrder} />);

    const buyButtons = screen.getAllByRole('button', { name: /Buy at/ });
    fireEvent.click(buyButtons[0]);

    expect(handlePlaceOrder).toHaveBeenCalledTimes(1);
  });
});
