const { spawn } = require('child_process');
const path = require('path');

const jestPath = path.join(__dirname, 'node_modules', '.bin', 'jest');
const configPath = path.join(__dirname, 'test-setup.js');

const child = spawn(jestPath, ['--config', configPath, '--verbose'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});