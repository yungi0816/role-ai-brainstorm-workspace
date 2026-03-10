const { spawn } = require('node:child_process');
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], {
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
