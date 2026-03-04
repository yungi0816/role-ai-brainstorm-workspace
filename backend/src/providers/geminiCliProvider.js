import { spawn } from 'node:child_process';
import { BaseProvider, ProviderError } from './baseProvider.js';

export class GeminiCliProvider extends BaseProvider {
  constructor() {
    super({
      id: 'gemini-cli',
      label: 'Gemini CLI',
      status: 'interface_ready',
      models: ['gemini-cli-default'],
      capabilities: ['child-process', 'json-response']
    });
  }

  isConfigured() {
    return Boolean(process.env.GEMINI_CLI_COMMAND || 'gemini');
  }

  buildCommand(prompt) {
    return {
      command: process.env.GEMINI_CLI_COMMAND || 'gemini',
      args: ['-p', prompt],
      options: {
        shell: true,
        windowsHide: true
      }
    };
  }

  runCli(prompt, { timeoutMs = 120000 } = {}) {
    const { command, args, options } = this.buildCommand(prompt);

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill();
        reject(new ProviderError('Gemini CLI process timed out.', {
          code: 'GEMINI_CLI_TIMEOUT',
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
        clearTimeout(timer);
        reject(new ProviderError(error.message, {
          code: 'GEMINI_CLI_SPAWN_FAILED',
          statusCode: 503,
          providerId: this.id
        }));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new ProviderError('Gemini CLI exited with a non-zero status.', {
            code: 'GEMINI_CLI_FAILED',
            statusCode: 502,
            providerId: this.id,
            details: { code, stderr }
          }));
          return;
        }

        resolve(stdout);
      });
    });
  }
}
