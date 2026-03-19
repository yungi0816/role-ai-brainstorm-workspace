import { spawn } from 'node:child_process';
import { BaseProvider, ProviderError } from './baseProvider.js';

const STDIN_TASK_PROMPT = 'Use the stdin content as the complete task. Return only the final answer.';
const DEFAULT_GEMINI_CLI_MODEL = 'gemini-cli-default';
const GEMINI_CLI_MODEL_OPTIONS = [
  {
    id: DEFAULT_GEMINI_CLI_MODEL,
    label: 'Gemini CLI Default',
    sizeLabel: 'Cloud / CLI account',
    locality: 'remote'
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro Preview',
    sizeLabel: 'Cloud / CLI account access',
    locality: 'remote'
  },
  {
    id: 'gemini-3.1-pro-preview-customtools',
    label: 'Gemini 3.1 Pro Preview Custom Tools',
    sizeLabel: 'Cloud / CLI account access',
    locality: 'remote'
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    sizeLabel: 'Cloud / CLI account',
    locality: 'remote'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    sizeLabel: 'Cloud / CLI account',
    locality: 'remote'
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    sizeLabel: 'Cloud / CLI account',
    locality: 'remote'
  }
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
    return `Gemini CLI failed: ${output}`;
  }

  return `Gemini CLI failed with exit code ${code}.`;
}

function quotePowerShellValue(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export class GeminiCliProvider extends BaseProvider {
  constructor() {
    super({
      id: 'gemini-cli',
      label: 'Gemini CLI',
      status: 'ready',
      models: GEMINI_CLI_MODEL_OPTIONS.map((model) => model.id),
      modelOptions: GEMINI_CLI_MODEL_OPTIONS,
      capabilities: ['child-process', 'json-response']
    });
  }

  isConfigured() {
    return Boolean(process.env.GEMINI_CLI_COMMAND || 'gemini');
  }

  buildCommand(model = DEFAULT_GEMINI_CLI_MODEL) {
    const command = process.env.GEMINI_CLI_COMMAND || 'gemini';
    const modelArgs = model && model !== DEFAULT_GEMINI_CLI_MODEL
      ? ['--model', model]
      : [];

    if (process.platform === 'win32') {
      const modelCommand = modelArgs.length
        ? ` --model ${quotePowerShellValue(model)}`
        : '';

      return {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          `$input | & ${quotePowerShellValue(command)} --skip-trust${modelCommand} --prompt ${quotePowerShellValue(STDIN_TASK_PROMPT)}`
        ],
        options: {
          shell: false,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      };
    }

    return {
      command,
      args: [
        '--skip-trust',
        ...modelArgs,
        '--prompt',
        STDIN_TASK_PROMPT
      ],
      options: {
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    };
  }

  runCli(prompt, { model = DEFAULT_GEMINI_CLI_MODEL, timeoutMs = 120000 } = {}) {
    const { command, args, options } = this.buildCommand(model);

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
        finish(reject, new ProviderError('Gemini CLI process timed out.', {
          code: 'GEMINI_CLI_TIMEOUT',
          statusCode: 504,
          providerId: this.id
        }));
      }, timeoutMs);

      child.stdin.on('error', () => {
        // The close handler reports the actionable process failure.
      });
      child.stdin.end(prompt);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        finish(reject, new ProviderError(`Gemini CLI could not be started: ${error.message}`, {
          code: 'GEMINI_CLI_SPAWN_FAILED',
          statusCode: 503,
          providerId: this.id
        }));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          finish(reject, new ProviderError(buildFailureMessage({ stderr, stdout, code }), {
            code: 'GEMINI_CLI_FAILED',
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
