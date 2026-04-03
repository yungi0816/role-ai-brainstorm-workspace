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
  const mindmapPatchModule = await import('../src/services/mindmapPatchService.js');
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

  await fetchJson(baseUrl, '/providers/openai/diagnostics?model=gpt-4.1-mini');
  const providerLogs = await fetchJson(baseUrl, '/providers/debug/logs?providerId=openai');
  if (!providerLogs.logs?.some((entry) => entry.event === 'provider.diagnostics.complete')) {
    throw new Error(`Expected provider diagnostics log entry: ${JSON.stringify(providerLogs)}`);
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
  const rootNode = mindmapPatchModule.ensureRootMindmapNode({
    conversationId: created.conversation.id,
    label: 'Smoke export',
    description: 'Smoke test root node'
  });

  const editedNode = await fetchJson(baseUrl, `/mindmap/${created.conversation.id}/nodes/${rootNode.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      label: 'Edited smoke node',
      type: 'decision',
      parentId: null,
      description: 'Edited by backend smoke test'
    })
  });
  if (
    editedNode.node.label !== 'Edited smoke node' ||
    editedNode.node.type !== 'decision' ||
    editedNode.node.description !== 'Edited by backend smoke test'
  ) {
    throw new Error(`Unexpected edited node payload: ${JSON.stringify(editedNode)}`);
  }

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

  const htmlExportPayload = await fetchJson(
    baseUrl,
    `/conversations/${created.conversation.id}/export?format=html`
  );
  if (
    htmlExportPayload.format !== 'html' ||
    !htmlExportPayload.filename.endsWith('.html') ||
    !htmlExportPayload.content.includes('<!doctype html>') ||
    !htmlExportPayload.content.includes('Smoke export')
  ) {
    throw new Error(`Unexpected HTML export payload: ${JSON.stringify(htmlExportPayload)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    checks: ['health', 'providers', 'provider-debug-logs', 'mindmap-node-edit', 'conversation-export', 'html-export'],
    providerCount: providerIds.size
  }));
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
}
