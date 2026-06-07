const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/jest.setup.ts'],
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
    '**/src/__tests__/**/*.test.[jt]s?(x)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  // Use exports conditions so Jest resolves the CJS build of ESM-typed packages
  testEnvironmentOptions: {
    customExportConditions: ['require', 'node', 'default'],
  },
};

module.exports = createJestConfig(customJestConfig);
