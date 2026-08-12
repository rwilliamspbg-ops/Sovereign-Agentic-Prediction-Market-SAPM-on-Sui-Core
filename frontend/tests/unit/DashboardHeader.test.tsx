import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DashboardHeader from '@/components/DashboardHeader';
// Import mock reference from the global mock in jest.setup.js
import { _mockSetDensityMode } from '@/hooks/useAgentState';

describe('DashboardHeader Component accessibility & interaction tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders standard layout elements correctly', () => {
    render(<DashboardHeader />);

    // Brand/logo name is present
    expect(screen.getByText('SAPM')).toBeTruthy();

    // Check project links
    expect(screen.getByText('Docs')).toBeTruthy();
    expect(screen.getByText('Resource Hub')).toBeTruthy();
    expect(screen.getByText('GitHub')).toBeTruthy();
  });

  it('possesses correct initial aria-pressed states on density-toggle buttons', () => {
    render(<DashboardHeader />);

    const standardBtn = screen.getByRole('button', { name: 'Standard Mode' });
    const advancedBtn = screen.getByRole('button', { name: 'Advanced Deep Dive' });

    expect(standardBtn).toBeTruthy();
    expect(advancedBtn).toBeTruthy();

    // The global mock returns 'standard' by default for densityMode
    expect(standardBtn.getAttribute('aria-pressed')).toBe('true');
    expect(advancedBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('triggers setDensityMode transition callback on clicking the toggle buttons', () => {
    render(<DashboardHeader />);

    const standardBtn = screen.getByRole('button', { name: 'Standard Mode' });
    const advancedBtn = screen.getByRole('button', { name: 'Advanced Deep Dive' });

    // Click advanced button
    fireEvent.click(advancedBtn);
    expect(_mockSetDensityMode).toHaveBeenCalledTimes(1);
    expect(_mockSetDensityMode).toHaveBeenCalledWith('advanced');

    // Click standard button
    fireEvent.click(standardBtn);
    expect(_mockSetDensityMode).toHaveBeenCalledTimes(2);
    expect(_mockSetDensityMode).toHaveBeenCalledWith('standard');
  });
});
