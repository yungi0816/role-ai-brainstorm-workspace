# API

The backend exposes local HTTP endpoints under `/api`. The Electron renderer uses the same API surface as the standalone frontend development server.

## Health

### `GET /api/health`

Returns backend and database connectivity status.

## Chat

### `POST /api/chat`

Creates or continues a conversation, sends a user message to the selected provider, normalizes the provider response, persists the assistant result, and applies the mind map patch.

Request:

```json
{
  "conversationId": "optional-existing-conversation-id",
  "provider": "ollama",
  "model": "gemma3:1b",
  "message": "브레인스토밍할 내용"
}
```

Response includes:

- `conversation`
- `message`
- `provider`
- `chatResponse`
- `agentOpinions`
- `mindmap`
- `mindmapPatch`
- `suggestedQuestions`
- `metadata`

## Providers

### `GET /api/providers`

Returns provider metadata for Ollama, Antigravity CLI, OpenAI, and Copilot.

### `GET /api/providers/:providerId`

Returns metadata for one registered provider.

### `GET /api/providers/:providerId/diagnostics`

Runs non-generative readiness checks for a provider. The optional `model` query parameter checks whether the current model is usable by that provider.

Response includes:

- `provider`
- `model`
- `checkedAt`
- `summary`
- `checks`

### `POST /api/providers/:providerId/test`

Runs a short execution test against the selected provider and model. The test asks the provider to return a small JSON object, then reports whether execution and JSON parsing succeeded.

Request:

```json
{
  "model": "antigravity-cli-default"
}
```

Failure categories include `not_installed`, `authentication`, `permission`, `timeout`, `json_response`, and `execution`.

### `GET /api/providers/debug/logs`

Returns recent in-memory provider execution events. Logs are local runtime diagnostics and are not persisted to SQLite.

Query:

| Parameter | Description |
| --- | --- |
| `providerId` | Optional provider filter. |
| `limit` | Optional max entries, capped by the backend. |

### `DELETE /api/providers/debug/logs`

Clears provider debug logs. Passing `providerId` clears only that provider's entries.

## Conversations

### `GET /api/conversations`

Returns saved conversations ordered by last update time.

### `GET /api/conversations/:conversationId`

Returns a conversation snapshot with messages, role opinions attached to assistant messages, and the current mind map.

### `GET /api/conversations/:conversationId/export`

Exports a saved conversation as Markdown or JSON. The route is read-only and does not call an AI provider.

Query:

| Parameter | Values | Default |
| --- | --- | --- |
| `format` | `markdown`, `html`, `json` | `markdown` |

Markdown response:

```json
{
  "format": "markdown",
  "filename": "role-ai-brainstorm-workspace.md",
  "content": "# Role AI Brainstorm Workspace\n\n..."
}
```

JSON response:

```json
{
  "format": "json",
  "filename": "role-ai-brainstorm-workspace.json",
  "content": {
    "exportedAt": "2026-05-21T00:00:00.000Z",
    "conversation": {},
    "messages": [],
    "mindmap": {
      "nodes": [],
      "edges": []
    }
  }
}
```

HTML response:

```json
{
  "format": "html",
  "filename": "role-ai-brainstorm-workspace.html",
  "content": "<!doctype html>..."
}
```

## Ollama

### `GET /api/providers/ollama/status`

Checks:

- Ollama CLI installation
- Ollama process status
- HTTP connection to `OLLAMA_HOST`
- recommended small local models

### `GET /api/providers/ollama/models`

Returns Ollama status plus installed model metadata and missing recommended models.

### `POST /api/providers/ollama/models/pull`

Pulls one supported small local model through the Ollama HTTP API.

Request:

```json
{
  "model": "gemma3:1b"
}
```

Supported pull targets:

- `gemma3:1b`
- `gemma3:4b`
- `qwen2.5-coder:1.5b`
- `llama3.2:1b`

## Mind Map

### `GET /api/mindmap/:conversationId`

Returns the persisted nodes and edges for a conversation.

### `PATCH /api/mindmap/:conversationId/nodes/:nodeId`

Updates a saved mind map node without calling an AI provider. The route reuses the same patch application path used by AI-generated updates, so parent validation and cycle protection still apply.

Request:

```json
{
  "label": "MVP Scope",
  "type": "decision",
  "parentId": "parent-node-id or null",
  "description": "What this node means"
}
```

Response includes:

- `conversation`
- `node`
- `mindmap`
- `metadata.patchApplied`

### `POST /api/mindmap/node-question`

Uses a selected mind map node as context for a follow-up AI turn. The route reuses the conversation's saved provider and model.

Request:

```json
{
  "conversationId": "conversation-id",
  "nodeId": "mind-map-node-id",
  "question": "이 노드를 더 구체화해줘"
}
```

## Error Shape

Errors return a consistent `error` object where possible:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```
