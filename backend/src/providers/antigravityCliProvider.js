import { spawn, spawnSync } from 'node:child_process';
import { BaseProvider, ProviderError } from './baseProvider.js';

const DEFAULT_ANTIGRAVITY_CLI_MODEL = 'antigravity-cli-default';
const ANTIGRAVITY_CLI_MODEL_OPTIONS = [
  {
    id: DEFAULT_ANTIGRAVITY_CLI_MODEL,
    label: 'Antigravity CLI Default',
    sizeLabel: 'Cloud / Google account',
    locality: 'remote'
  }
];

const LEGACY_GEMINI_MODEL_IDS = [
  'gemini-cli-default',
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash'
];

function cleanCliOutput(value, maxLength = 1400) {
  return String(value || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .trim()
    .slice(0, maxLength);
}

function buildFailureMessage({ stderr, stdout, code }) {
  const output = cleanCliOutput(stderr) || cleanCliOutput(stdout);
  if (output) {
    return `Antigravity CLI failed: ${output}`;
  }

  return `Antigravity CLI failed with exit code ${code}.`;
}

function getConfiguredCommand() {
  return process.env.ANTIGRAVITY_CLI_COMMAND || 'agy';
}

function commandExists(command) {
  if (!command) {
    return false;
  }

  const result = process.platform === 'win32'
    ? spawnSync('where.exe', [command], { stdio: 'ignore', windowsHide: true })
    : spawnSync('sh', ['-lc', `command -v ${JSON.stringify(command)}`], { stdio: 'ignore' });

  return result.status === 0;
}

export class AntigravityCliProvider extends BaseProvider {
  constructor() {
    super({
      id: 'antigravity-cli',
      label: 'Antigravity CLI',
      status: 'ready',
      models: ANTIGRAVITY_CLI_MODEL_OPTIONS.map((model) => model.id),
      modelOptions: ANTIGRAVITY_CLI_MODEL_OPTIONS,
      capabilities: ['child-process', 'json-response'],
      auth: {
        type: 'oauth_cli',
        label: 'Google Account (Antigravity CLI)',
        helpText: 'Antigravity CLI는 Google 계정 로그인을 사용합니다. 아래 버튼으로 CLI를 실행한 뒤 로그인하고 Refresh를 누르세요.'
      }
    });

    this.aliases = ['gemini-cli'];
  }

  getStatus() {
    return this.isConfigured() ? 'ready' : 'not_installed';
  }

  isConfigured() {
    return commandExists(this.getExecutable());
  }

  supportsModel(model) {
    return super.supportsModel(model) || LEGACY_GEMINI_MODEL_IDS.includes(model);
  }

  getExecutable() {
    return getConfiguredCommand();
  }

  async configureCredentials() {
    const command = this.getExecutable();

    spawn(command, [], {
      shell: process.platform === 'win32',
      windowsHide: false,
      stdio: 'ignore'
    }).unref();

    return {
      ...this.getMetadata(),
      note: 'Antigravity CLI에서 로그인을 완료한 뒤 Refresh 버튼을 눌러주세요.'
    };
  }

  buildCommand(_model = DEFAULT_ANTIGRAVITY_CLI_MODEL, prompt) {
    return {
      command: this.getExecutable(),
      args: [
        '--print',
        '--print-timeout',
        '5m',
        prompt
      ],
      options: {
        shell: process.platform === 'win32',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    };
  }

  runCli(prompt, { model = DEFAULT_ANTIGRAVITY_CLI_MODEL, timeoutMs = 300000 } = {}) {
    const { command, args, options } = this.buildCommand(model, prompt);

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (callback, value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        callback(value);
      };

      const timer = setTimeout(() => {
        child.kill();
        finish(reject, new ProviderError('Antigravity CLI process timed out.', {
          code: 'ANTIGRAVITY_CLI_TIMEOUT',
          statusCode: 504,
          providerId: this.id
        }));
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        finish(reject, new ProviderError(`Antigravity CLI could not be started: ${error.message}`, {
          code: 'ANTIGRAVITY_CLI_SPAWN_FAILED',
          statusCode: 503,
          providerId: this.id
        }));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          finish(reject, new ProviderError(buildFailureMessage({ stderr, stdout, code }), {
            code: 'ANTIGRAVITY_CLI_FAILED',
            statusCode: 502,
            providerId: this.id,
            details: {
              exitCode: code,
              stderr: cleanCliOutput(stderr),
              stdout: cleanCliOutput(stdout)
            }
          }));
          return;
        }

        finish(resolve, stdout);
      });
    });
  }

  async generateText({ model, prompt }) {
    this.validateModel(model);
    return this.runCli(prompt, { model });
  }
}
