import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';

describe('NetworkSwitcher Component Keyboard Navigation and Close Events', () => {
  it('renders compact network switcher with dropdown initially closed', () => {
    render(<NetworkSwitcher compact={true} />);

    // Header trigger is visible
    expect(screen.getByRole('button', { name: 'Select Sui network' })).toBeTruthy();

    // Dropdown list is not visible
    expect(screen.queryByRole('listbox', { name: 'Sui networks' })).toBeNull();
  });

  it('opens dropdown on click, and closes on Escape keydown', () => {
    render(<NetworkSwitcher compact={true} />);

    const trigger = screen.getByRole('button', { name: 'Select Sui network' });
    fireEvent.click(trigger);

    // Dropdown list should be open
    expect(screen.getByRole('listbox', { name: 'Sui networks' })).toBeTruthy();

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });

    // Dropdown should close
    expect(screen.queryByRole('listbox', { name: 'Sui networks' })).toBeNull();
  });

  it('closes dropdown on clicking outside', () => {
    render(<NetworkSwitcher compact={true} />);

    const trigger = screen.getByRole('button', { name: 'Select Sui network' });
    fireEvent.click(trigger);

    // Dropdown list should be open
    expect(screen.getByRole('listbox', { name: 'Sui networks' })).toBeTruthy();

    // Click outside
    fireEvent.mouseDown(document.body);

    // Dropdown should close
    expect(screen.queryByRole('listbox', { name: 'Sui networks' })).toBeNull();
  });
});
