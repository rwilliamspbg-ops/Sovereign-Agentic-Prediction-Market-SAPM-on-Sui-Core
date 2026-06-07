/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
    '**/src/__tests__/**/*.test.[jt]s?(x)',
  ],
  // No transform needed for plain .js CommonJS test files.
  // TypeScript tests are skipped via testPathIgnorePatterns until ts-jest is added.
  transform: {},
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Ignore .tsx tests that need TypeScript transform (not available without ts-jest)
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.tsx?$',
  ],
  // Use exports conditions so Jest resolves the CJS build of ESM-typed packages
  resolver: undefined,
  customExportConditions: ['require', 'node', 'default'],
};

module.exports = config;
