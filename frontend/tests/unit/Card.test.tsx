import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card Component Micro-UX & Accessibility', () => {
  it('renders content, title, subtitle, and icon without polluting landmark roles by default', () => {
    render(
      <Card
        title="Market Analytics"
        subtitle="Real-time sentiment data"
        icon={<span data-testid="card-icon">📊</span>}
      >
        <p>Market content details</p>
      </Card>
    );

    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByText('Market Analytics')).toBeTruthy();
    expect(screen.getByText('Real-time sentiment data')).toBeTruthy();
    expect(screen.getByText('Market content details')).toBeTruthy();

    const iconWrapper = screen.getByTestId('card-icon').parentElement;
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true');
  });

  it('behaves as an accessible button when onClick is provided', () => {
    const handleClick = jest.fn();
    render(
      <Card
        title="Interactive Market"
        onClick={handleClick}
        aria-label="Click to view market details"
      >
        <p>Card body</p>
      </Card>
    );

    const button = screen.getByRole('button', { name: 'Click to view market details' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('tabIndex')).toBe('0');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('supports headerAction and footer action blocks cleanly', () => {
    render(
      <Card
        title="System Status"
        headerAction={<button aria-label="Header action">Edit</button>}
        action={<button aria-label="Footer action">Save</button>}
      >
        <p>All systems operational</p>
      </Card>
    );

    expect(screen.getByRole('button', { name: 'Header action' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Footer action' })).toBeTruthy();
  });

  it('allows explicit role override when specified', () => {
    render(
      <Card
        title="Dashboard Section"
        role="region"
        aria-label="Dashboard Section Landmark"
      >
        <p>Section details</p>
      </Card>
    );

    expect(screen.getByRole('region', { name: 'Dashboard Section Landmark' })).toBeTruthy();
  });
});
