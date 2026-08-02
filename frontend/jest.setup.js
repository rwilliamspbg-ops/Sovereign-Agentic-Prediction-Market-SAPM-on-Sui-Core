globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { TextDecoder, TextEncoder } = require('util');

require('@testing-library/jest-dom');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Global mock to prevent ESM/TS compilation issues with CopilotKit in Jest/jsdom environment
jest.mock('@copilotkit/react-core', () => ({
  useCopilotChat: jest.fn(() => ({
    post: jest.fn(),
  })),
}));

jest.mock('@copilotkit/react-ui', () => ({
  CopilotChat: () => null,
}));

// Mock useAgentState globally to prevent next-jest ESM / path alias resolution discrepancies
jest.mock('@/hooks/useAgentState', () => {
  const mockRunScenarioSimulation = jest.fn();
  return {
    useAgentState: jest.fn(() => ({
      systemHealth: {
        deepbookConnected: true,
        walrusConnected: true,
        walrusMessage: 'Feed Ok',
      },
      simulationResult: null,
      densityMode: 'standard',
      advancedMetrics: {
        toolCallTrace: [],
      },
    })),
    useMarketActions: jest.fn(() => ({
      runScenarioSimulation: mockRunScenarioSimulation,
    })),
    // Export mock function on the module so individual tests can access/spy on it
    _mockRunScenarioSimulation: mockRunScenarioSimulation,
  };
});
