---
estimated_steps: 4
estimated_files: 6
skills_used: []
---

# T01: Scaffold foxgram-core package and build pipeline

Create the foxgram-core package scaffold: package.json with libsodium-wrappers + dev deps, tsconfig.json (strict ES2020), jest.config.ts, ts-jest config, src/index.ts re-export stub, src/crypto.ts stub, tests/crypto.test.ts stub. Verify the test runner runs (zero tests is fine) and tsc --noEmit passes. This establishes the build pipeline before any crypto logic is written.

- Files: packages/foxgram-core/package.json, packages/foxgram-core/tsconfig.json, packages/foxgram-core/jest.config.ts, packages/foxgram-core/src/index.ts, packages/foxgram-core/src/crypto.ts, packages/foxgram-core/tests/crypto.test.ts
- Verify: cd packages/foxgram-core && npx jest --testPathPattern=crypto.test.ts --passWithNoTests && npx tsc --noEmit
- Done when: jest runs without errors (zero tests is fine) and tsc --noEmit shows no errors

## Inputs

- None specified.

## Expected Output

- `packages/foxgram-core/package.json`
- `packages/foxgram-core/tsconfig.json`
- `packages/foxgram-core/jest.config.ts`
- `packages/foxgram-core/src/index.ts`
- `packages/foxgram-core/src/crypto.ts`
- `packages/foxgram-core/tests/crypto.test.ts`

## Verification

cd packages/foxgram-core && npx jest --testPathPattern=crypto.test.ts --passWithNoTests && npx tsc --noEmit
