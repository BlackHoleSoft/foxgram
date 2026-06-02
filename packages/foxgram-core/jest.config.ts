/**
 * Jest конфигурация для интеграционных тестов foxgram-core.
 *
 * Использует ts-jest (CJS) для транспиляции TypeScript.
 * Бэкенд тоже компилируется как CJS — совместимо с __dirname.
 */

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'commonjs',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          baseUrl: '.',
          paths: {
            '@src/*': ['../backend/src/*'],
          },
        },
      },
    ],
  },

  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node',
  rootDir: '.',
  verbose: true,
  clearMocks: true,
  maxWorkers: 1,
  testTimeout: 60000,
  forceExit: true,

  // Маппинг путей: @src/* → backend/src/, libsodium-wrappers → CJS сборка
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/../backend/src/$1',
    'libsodium-wrappers$': '<rootDir>/node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js',
  },

  // Резолвим зависимости backend (express, better-sqlite3, argon2, ...)
  modulePaths: ['<rootDir>/../backend/node_modules'],

  // Загружаем переменные окружения для backend перед тестами
  setupFiles: ['<rootDir>/test/setup.ts'],
};

export default config;
