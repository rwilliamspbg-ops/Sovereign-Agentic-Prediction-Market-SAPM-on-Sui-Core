/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
    '**/src/__tests__/**/*.test.[jt]s?(x)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
};

module.exports = config;
