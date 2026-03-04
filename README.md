# Role AI Brainstorm Workspace

Role-based AI brainstorming workspace with a chat-first interface and an incrementally updated mind map.

## Current Scope

This repository is being built in small, reviewable phases. Commits are created only after a phase is complete and confirmed.

## Phase Log

### Phase 0: Repository Setup

- Created the GitHub repository: `yungi0816/role-ai-brainstorm-workspace`
- Initialized the local Git repository on `main`
- Connected `origin` to the GitHub repository
- No push has been performed yet

### Phase 1: Backend Server and SQLite Foundation

Goal:

- Add the Node.js/Express backend shell
- Add SQLite schema and database initialization
- Add route placeholders for the requested API surface
- Add environment and local run documentation

Status:

- Committed and pushed as `chore: initialize backend foundation`

### Phase 2: Provider Common Interface

Goal:

- Add the provider base contract
- Add provider classes for Ollama, Gemini CLI, OpenAI, and Copilot
- Add an AI router service for provider lookup and model validation
- Route provider API responses through the provider registry
- Keep actual Ollama runtime checks and real AI generation for later phases

## Planned Roadmap

1. Backend server and SQLite database
2. Provider common interface
3. Ollama runtime and provider
4. Prompt service and normalized JSON response contract
5. Mind map patch service
6. React chat UI
7. React Flow mind map
8. Node click follow-up questions
9. Gemini CLI, OpenAI, and Copilot provider implementations/stubs
10. README and GitHub documentation polish

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Health check:

```bash
curl http://localhost:4000/api/health
```

The backend creates the SQLite database file at `backend/data/app.db` by default.

## API Surface

Implemented in Phase 1 as working health/database checks plus placeholders for the target API:

- `GET /api/health`
- `POST /api/chat`
- `GET /api/providers`
- `GET /api/providers/ollama/status`
- `GET /api/providers/ollama/models`
- `GET /api/mindmap/:conversationId`
- `POST /api/mindmap/node-question`

