import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorPage from '@/app/error';
import GlobalErrorPage from '@/app/global-error';

describe('Error Boundary Fallback Pages Accessibility & Micro-UX', () => {
  describe('Error component (error.tsx)', () => {
    it('renders semantic landmark region, alert container, recovery group, and trigger button', () => {
      const resetMock = jest.fn();
      const testErr = new Error('Failed to load market data');

      render(<ErrorPage error={testErr} reset={resetMock} />);

      // 1. Semantic landmark region
      const region = screen.getByRole('region', { name: 'Client-side error display' });
      expect(region).toBeTruthy();

      // 2. Alert announcement
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.getAttribute('aria-live')).toBe('assertive');
      expect(screen.getByText('Failed to load market data')).toBeTruthy();

      // 3. Action group and accessible retry button
      const group = screen.getByRole('group', { name: 'Error recovery actions' });
      expect(group).toBeTruthy();

      const retryBtn = screen.getByRole('button', { name: 'Retry loading page' });
      expect(retryBtn).toBeTruthy();
      expect(retryBtn.className).toContain('focus-visible:ring-2');

      // Click trigger
      fireEvent.click(retryBtn);
      expect(resetMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('GlobalError component (global-error.tsx)', () => {
    it('renders landmark region, alert container, recovery group, and reload button', () => {
      const resetMock = jest.fn();
      const testErr = new Error('Fatal initialization failure');

      render(<GlobalErrorPage error={testErr} reset={resetMock} />);

      // 1. Semantic landmark region
      const region = screen.getByRole('region', { name: 'Application error display' });
      expect(region).toBeTruthy();

      // 2. Alert announcement
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.getAttribute('aria-live')).toBe('assertive');
      expect(screen.getByText('Fatal initialization failure')).toBeTruthy();

      // 3. Action group and accessible reload button
      const group = screen.getByRole('group', { name: 'Error recovery actions' });
      expect(group).toBeTruthy();

      const reloadBtn = screen.getByRole('button', { name: 'Reload application' });
      expect(reloadBtn).toBeTruthy();
      expect(reloadBtn.className).toContain('focus-visible:ring-2');

      // Click trigger
      fireEvent.click(reloadBtn);
      expect(resetMock).toHaveBeenCalledTimes(1);
    });
  });
});
