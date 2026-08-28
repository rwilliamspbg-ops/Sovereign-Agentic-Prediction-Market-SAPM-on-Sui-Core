import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AIAssistantPanel from '@/components/AIAssistantPanel';
// Import the hooks and the exported mock reference from the global mock in jest.setup.js
import { _mockRunScenarioSimulation } from '@/hooks/useAgentState';

describe('AIAssistantPanel Component accessibility & interaction tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly associates input textarea with an accessible label using id and htmlFor', () => {
    render(<AIAssistantPanel />);

    // Get the textarea using its label
    const textarea = screen.getByLabelText('What-if Scenario Description');
    expect(textarea).toBeTruthy();
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea.getAttribute('id')).toBe('simulation-scenario-input');

    // Confirm focus-ring styling is present
    expect(textarea.className).toContain('focus:ring-2');
    expect(textarea.className).toContain('focus:ring-cyan-500');
  });

  it('triggers runScenarioSimulation with custom scenario text on clicking Run Simulation', () => {
    render(<AIAssistantPanel />);

    const textarea = screen.getByLabelText('What-if Scenario Description');
    const runButton = screen.getByRole('button', { name: 'Run Simulation' });

    expect(runButton).toBeTruthy();
    expect(runButton.className).toContain('focus-visible:ring-2');
    expect(runButton.className).toContain('focus-visible:ring-cyan-500');

    // Simulate typing in a custom scenario
    fireEvent.change(textarea, { target: { value: 'What if market volume spikes by 50%?' } });

    // Simulate clicking the simulation button
    fireEvent.click(runButton);

    expect(_mockRunScenarioSimulation).toHaveBeenCalledTimes(1);
    expect(_mockRunScenarioSimulation).toHaveBeenCalledWith('What if market volume spikes by 50%?');
  });

  it('contains character counter and maxLength constraints on the scenario textarea', () => {
    render(<AIAssistantPanel />);

    const textarea = screen.getByLabelText('What-if Scenario Description');
    expect(textarea.getAttribute('maxLength')).toBe('300');
    expect(textarea.getAttribute('aria-describedby')).toBe('scenario-char-count');

    // Default scenarioText has some length, verify the counter displays it out of 300
    const counter = screen.getByText(/300 characters/);
    expect(counter).toBeTruthy();
    expect(counter.getAttribute('id')).toBe('scenario-char-count');
    expect(counter.getAttribute('aria-live')).toBe('polite');

    // Change input value and assert that character counter updates
    fireEvent.change(textarea, { target: { value: 'Hello World' } });
    expect(screen.getByText('11/300 characters')).toBeTruthy();
  });

  it('renders scenario preset group and updates textarea and aria-pressed state when clicked', () => {
    render(<AIAssistantPanel />);

    const presetGroup = screen.getByRole('group', { name: 'Scenario presets' });
    expect(presetGroup).toBeTruthy();

    const fundingButton = screen.getByRole('button', { name: 'Select Funding Shift scenario preset' });
    const volumeButton = screen.getByRole('button', { name: 'Select Volume Spike scenario preset' });

    // By default, Funding Shift is selected
    expect(fundingButton.getAttribute('aria-pressed')).toBe('true');
    expect(volumeButton.getAttribute('aria-pressed')).toBe('false');

    // Click Volume Spike preset
    fireEvent.click(volumeButton);

    const textarea = screen.getByLabelText('What-if Scenario Description') as HTMLInputElement;
    expect(textarea.value).toBe('If market trading volume spikes by 50% in the next hour, how will odds react?');
    expect(volumeButton.getAttribute('aria-pressed')).toBe('true');
    expect(fundingButton.getAttribute('aria-pressed')).toBe('false');
  });
});
