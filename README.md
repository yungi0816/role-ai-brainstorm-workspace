# Role AI Brainstorm Workspace

Role-based AI brainstorming workspace with a chat-first interface and an incrementally updated mind map.

## Current Scope

This repository is being built in small, reviewable phases. Commits are created only after a phase is complete and confirmed.

## Phase Log

### Phase 0: Repository Setup

- Created the GitHub repository: `yungi0816/role-ai-brainstorm-workspace`
- Initialized the local Git repository on `main`
- Connected `origin` to the GitHub repository
- Initial push was deferred until the first phase commit was ready

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

Status:

- Completed locally and pushed as `feat: add provider interface layer`

### Phase 3: Ollama Runtime and Provider

Goal:

- Detect whether the Ollama CLI is installed
- Detect whether an Ollama process is running
- Check the Ollama HTTP API at `OLLAMA_HOST`
- Return local Ollama models from `/api/tags`
- Expose the supported small local model candidates
- Prepare a non-streaming pull function for supported small local models
- Add a raw text generation function for the Ollama provider

Status:

- Completed locally and pushed as `feat: add ollama runtime checks`

### Phase 4: Prompt Service and JSON Normalization

Goal:

- Build the role-based brainstorming system prompt in `promptService`
- Require provider responses to return JSON only
- Normalize provider responses into the common AI response structure
- Add fallback parsing when a provider returns malformed JSON
- Keep mind map persistence for the next patch service phase

Status:

- Completed locally as `feat: normalize ai json responses`

### Phase 5: Mind Map Patch Persistence

Goal:

- Apply normalized `mindmapPatch` objects to SQLite incrementally
- Insert, update, and remove mind map nodes and edges without regenerating the whole map
- Skip invalid patch entries, including edges whose endpoints do not exist
- Store role-based agent opinions for each assistant message
- Return the updated full mind map plus patch application metadata from chat responses

Status:

- Completed locally as `feat: persist mindmap patches`

### Phase 6: React Chat UI

Goal:

- Add a Vite React frontend scaffold
- Add Tailwind CSS styling
- Add API client functions for providers, chat, Ollama status/models, and node questions
- Add provider/model selection controls
- Add chat message input and response display
- Add role opinion cards below AI responses
- Add a basic mind map data panel for the next React Flow phase

Status:

- Completed locally as `feat: add react chat workspace`

### Phase 7: React Flow Mind Map

Goal:

- Replace the placeholder mind map list with a React Flow canvas
- Convert saved mind map nodes and edges into React Flow elements
- Style nodes by semantic type
- Support node selection and pane deselection
- Show a selected-node detail summary for the next node-question phase

Status:

- Completed locally as `feat: render mindmap with react flow`

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

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:5173
```

## API Surface

Implemented in Phase 1 as working health/database checks plus placeholders for the target API:

- `GET /api/health`
- `POST /api/chat`
- `GET /api/providers`
- `GET /api/providers/ollama/status`
- `GET /api/providers/ollama/models`
- `POST /api/providers/ollama/models/pull`
- `GET /api/mindmap/:conversationId`
- `POST /api/mindmap/node-question`

