const { spawn } = require('node:child_process');
const electronPath = require('electron');

const electronArgs = process.platform === 'linux' && process.env.CI === 'true'
  ? ['--no-sandbox', '.']
  : ['.'];

const child = spawn(electronPath, electronArgs, {
  cwd: __dirname + '/..',
  env: {
    ...process.env,
    DESKTOP_SMOKE_TEST: '1'
  },
  stdio: 'inherit',
  windowsHide: true
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
