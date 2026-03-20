import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BaseProvider, ProviderError } from './baseProvider.js';

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
      capabilities: ['child-process', 'json-response'],
      auth: {
        type: 'oauth_cli',
        label: 'Google Account (CLI)',
        helpText: 'Gemini CLI가 아직 인증되지 않았습니다. 아래 버튼을 눌러 터미널 로그인(브라우저 인증)을 진행하세요.'
      }
    });

    this._isAuthorized = true; // 기본값은 true로 설정하여 차단 방지
    this._lastCheckTime = 0;

    // 초기 인증 체크 (비동기)
    this._checkAuthBackground();
  }

  getStatus() {
    // 마지막 체크 후 1분이 지났으면 백그라운드에서 다시 체크 시작
    if (Date.now() - this._lastCheckTime > 60000) {
      this._checkAuthBackground();
    }
    return this._isAuthorized ? 'ready' : 'needs_auth';
  }

  async _checkAuthBackground() {
    this._lastCheckTime = Date.now();
    try {
      // 아주 짧은 실행으로 인증 확인
      await this.runCli('hi', { timeoutMs: 3000 });
      this._isAuthorized = true;
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('auth') || msg.includes('login') || msg.includes('401') || msg.includes('key')) {
        this._isAuthorized = false;
      }
      // 기타 실행 오류(명령어 없음 등)는 기존 로직 유지
    }
  }

  isConfigured() {
    return true;
  }

  getExecutable() {
    const command = process.env.GEMINI_CLI_COMMAND || 'gemini';
    if (process.platform === 'win32' && command === 'gemini') {
      return 'gemini.cmd';
    }
    return command;
  }

  async configureCredentials() {
    const command = this.getExecutable();
    const args = ['--skip-trust'];
    // 비동기로 프로세스 실행 (브라우저 열기 전용)
    spawn(command, args, { shell: process.platform === 'win32', windowsHide: true, stdio: 'ignore' }).unref();

    // 상태 강제 갱신 트리거
    setTimeout(() => this._checkAuthBackground(), 5000);

    return {
      ...this.getMetadata(),
      note: '브라우저에서 로그인을 완료한 후 "Refresh" 버튼을 눌러주세요.'
    };
  }

  buildCommand(model = DEFAULT_GEMINI_CLI_MODEL) {
    const command = this.getExecutable();
    const modelArgs = model && model !== DEFAULT_GEMINI_CLI_MODEL
      ? ['--model', model]
      : [];

    return {
      command,
      args: [
        '--skip-trust',
        ...modelArgs,
        '--prompt',
        'headless'
      ],
      options: {
        shell: process.platform === 'win32',
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

      // STDIN으로 프롬프트를 직접 주입
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
