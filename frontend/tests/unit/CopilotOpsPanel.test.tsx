import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CopilotOpsPanel } from '@/components/a2ui/CopilotOpsPanel';

describe('CopilotOpsPanel Component Micro-UX & Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quick prompt group with role group and accessible aria-label', () => {
    render(<CopilotOpsPanel open={true} onClose={jest.fn()} />);

    const quickPromptGroup = screen.getByRole('group', { name: 'Quick prompt presets' });
    expect(quickPromptGroup).toBeTruthy();

    const quickPromptButtons = screen.getAllByRole('button', { name: /^Select quick prompt:/ });
    expect(quickPromptButtons.length).toBe(4);

    quickPromptButtons.forEach((btn) => {
      expect(btn.className).toContain('focus-visible:ring-2');
      expect(btn.className).toContain('focus-visible:ring-cyan-500');
    });
  });

  it('contains character counter, maxLength constraint, and live region on the action prompt textarea', () => {
    render(<CopilotOpsPanel open={true} onClose={jest.fn()} />);

    const textarea = screen.getByLabelText('Describe what Copilot should execute');
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute('maxLength')).toBe('500');
    expect(textarea.getAttribute('aria-describedby')).toBe('copilot-ops-prompt-count');

    const counter = screen.getByText('0/500 characters');
    expect(counter).toBeTruthy();
    expect(counter.getAttribute('id')).toBe('copilot-ops-prompt-count');
    expect(counter.getAttribute('aria-live')).toBe('polite');

    // Type text into textarea and verify counter updates
    fireEvent.change(textarea, { target: { value: 'Analyze market risks and proposal actions' } });

    const updatedCounter = screen.getByText('41/500 characters');
    expect(updatedCounter).toBeTruthy();
  });

  it('renders action control button groups with role group, aria-label, and focus-visible styling', () => {
    render(<CopilotOpsPanel open={true} onClose={jest.fn()} />);

    const runStateGroup = screen.getByRole('group', { name: 'Run state controls' });
    expect(runStateGroup).toBeTruthy();

    const copilotActionGroup = screen.getByRole('group', { name: 'Copilot action controls' });
    expect(copilotActionGroup).toBeTruthy();

    const generateBtn = screen.getByRole('button', { name: 'Generate Plan' });
    expect(generateBtn.className).toContain('focus-visible:ring-2');
    expect(generateBtn.className).toContain('focus-visible:ring-cyan-500');

    const closeBtn = screen.getByRole('button', { name: 'Close Copilot Ops panel' });
    expect(closeBtn.className).toContain('focus-visible:ring-2');
    expect(closeBtn.className).toContain('focus-visible:ring-cyan-500');
  });
});
