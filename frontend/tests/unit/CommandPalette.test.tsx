import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette';

describe('CommandPalette Component Accessibility and Functionality', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('renders command palette trigger button initially closed', () => {
    render(<CommandPalette />);

    // Trigger button should be present
    const trigger = screen.getByRole('button', { name: 'Open command palette' });
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    // Dialog contents should not be visible
    expect(screen.queryByLabelText('Search commands, routes, docs')).toBeNull();
  });

  it('opens command palette on trigger click and renders associated label/input with visually hidden styling and dialog attributes', () => {
    render(<CommandPalette />);

    const trigger = screen.getByRole('button', { name: 'Open command palette' });
    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Check dialog container accessibility properties
    const dialog = screen.getByRole('dialog', { name: 'Command palette' });
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Check visually hidden label association with htmlFor
    const label = screen.getByText('Search commands, routes, docs');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBe('command-palette-search');

    // Check custom inline styling for visual hiding
    expect(label.style.position).toBe('absolute');
    expect(label.style.width).toBe('1px');
    expect(label.style.height).toBe('1px');
    expect(label.style.overflow).toBe('hidden');

    const input = screen.getByLabelText('Search commands, routes, docs');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('id')).toBe('command-palette-search');
  });

  it('renders clear search button when text is typed and clears query on click', () => {
    render(<CommandPalette />);

    const trigger = screen.getByRole('button', { name: 'Open command palette' });
    fireEvent.click(trigger);

    const input = screen.getByLabelText('Search commands, routes, docs') as HTMLInputElement;
    expect(screen.queryByRole('button', { name: 'Clear search query' })).toBeNull();

    fireEvent.change(input, { target: { value: 'Markets' } });

    const clearBtn = screen.getByRole('button', { name: 'Clear search query' });
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn);

    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear search query' })).toBeNull();
  });

  it('filters actions correctly based on fuzzy search query', () => {
    render(<CommandPalette />);

    const trigger = screen.getByRole('button', { name: 'Open command palette' });
    fireEvent.click(trigger);

    const input = screen.getByLabelText('Search commands, routes, docs') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Portfolio' } });

    // Should match "Open Portfolio"
    expect(screen.getAllByText('Open Portfolio').length).toBeGreaterThan(0);
    // Non-matching should be filtered out
    expect(screen.queryByText('Open Help')).toBeNull();
  });

  it('closes command palette on Escape key down', () => {
    render(<CommandPalette />);

    const trigger = screen.getByRole('button', { name: 'Open command palette' });
    fireEvent.click(trigger);

    // Dropdown list should be open
    expect(screen.getByLabelText('Search commands, routes, docs')).toBeTruthy();

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });

    // Dropdown should close
    expect(screen.queryByLabelText('Search commands, routes, docs')).toBeNull();
  });
});
