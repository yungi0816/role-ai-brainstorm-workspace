import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'role-ai-brainstorm-backend-'));

process.env.NODE_ENV = 'test';
process.env.DB_FILE = path.join(tempDir, 'smoke.db');
process.env.HOST = '127.0.0.1';
process.env.CORS_ORIGIN = 'http://localhost:5173';

let server;
let closeDatabase = () => {};

function listen(app) {
  return new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });
}

async function fetchJson(baseUrl, pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`${pathname} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

try {
  const serverModule = await import('../src/server.js');
  const databaseModule = await import('../src/db/database.js');
  closeDatabase = databaseModule.closeDatabase;

  const app = serverModule.createApp();
  server = await listen(app);

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const health = await fetchJson(baseUrl, '/health');
  if (health.status !== 'ok' || health.database !== 'connected') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  }

  const providerPayload = await fetchJson(baseUrl, '/providers');
  const providerIds = new Set((providerPayload.providers || []).map((provider) => provider.id));
  for (const providerId of ['ollama', 'antigravity-cli', 'openai', 'copilot']) {
    if (!providerIds.has(providerId)) {
      throw new Error(`Provider "${providerId}" is missing from /api/providers.`);
    }
  }

  const created = await fetchJson(baseUrl, '/conversations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'ollama',
      model: 'gemma3:1b',
      title: 'Smoke export'
    })
  });

  const exportPayload = await fetchJson(
    baseUrl,
    `/conversations/${created.conversation.id}/export?format=markdown`
  );
  if (
    exportPayload.format !== 'markdown' ||
    !exportPayload.filename.endsWith('.md') ||
    !exportPayload.content.includes('# Smoke export')
  ) {
    throw new Error(`Unexpected export payload: ${JSON.stringify(exportPayload)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    checks: ['health', 'providers', 'conversation-export'],
    providerCount: providerIds.size
  }));
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
}
