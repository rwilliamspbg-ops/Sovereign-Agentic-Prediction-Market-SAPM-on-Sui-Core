import { describe, expect, it, jest, beforeAll, afterAll } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Helper component that throws an error
const ProblemComponent = () => {
  throw new Error('Test caught error');
};

describe('ErrorBoundary Component Micro-UX & Accessibility', () => {
  // Prevent console.error clutter during test run
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn() as unknown as typeof console.error;
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Component Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Component Content')).toBeTruthy();
  });

  it('renders landmark region, role="alert" with aria-live="assertive", role="group", and recovery buttons when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ProblemComponent />
      </ErrorBoundary>
    );

    // 1. Check landmark region
    const section = screen.getByRole('region', { name: 'Component error display' });
    expect(section).toBeTruthy();

    // 2. Check alert container
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('aria-live')).toBe('assertive');

    // 3. Check error message display
    expect(screen.getByText('Test caught error')).toBeTruthy();

    // 4. Check action group and buttons
    const group = screen.getByRole('group', { name: 'Error recovery actions' });
    expect(group).toBeTruthy();

    const reloadBtn = screen.getByRole('button', { name: 'Reload page' });
    expect(reloadBtn).toBeTruthy();

    const homeBtn = screen.getByRole('button', { name: 'Go to home page' });
    expect(homeBtn).toBeTruthy();
  });
});
