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
});
