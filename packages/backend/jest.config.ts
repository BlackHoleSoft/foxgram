/**
 * Jest конфигурация для TypeScript.
 */

import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false,
    }],
  },

  testMatch: ['**/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  rootDir: '.',
  verbose: true,
  clearMocks: true,
  maxWorkers: 1,
  testTimeout: 30000,
  testEnvironment: 'node',

  // Маппинг путей (аналог tsconfig paths)
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
