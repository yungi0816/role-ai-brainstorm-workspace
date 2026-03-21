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
