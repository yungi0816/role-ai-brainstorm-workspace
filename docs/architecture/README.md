# Architecture

Role AI Brainstorm Workspace is currently organized as a local desktop application with a bundled backend and a React renderer.

## Runtime Topology

```mermaid
flowchart LR
    User["User"] --> Window["Electron BrowserWindow"]
    Window --> Renderer["React Renderer"]
    Renderer --> Bridge["Preload Bridge"]
    Renderer --> HTTP["HTTP API Client"]
    Bridge --> Main["Electron Main Process"]
    Main --> Express["Express App"]
    HTTP --> Express
    Express --> Services["Application Services"]
    Services --> SQLite["SQLite"]
    Services --> Providers["Provider Layer"]
    Providers --> Ollama["Ollama HTTP API"]
    Providers --> Gemini["Gemini CLI Process"]
    Providers --> OpenAI["OpenAI Provider Shell"]
    Providers --> Copilot["Copilot Provider Stub"]
```

## Subsystems

| Subsystem | Path | Responsibilities |
| --- | --- | --- |
| Electron shell | `desktop/` | Starts the backend, owns the desktop window, exposes safe preload APIs, builds Windows installer artifacts. |
| React renderer | `frontend/` | Chat-first UI, AI settings panel, Ollama setup panel, React Flow mind map visualization. |
| Express API | `backend/src/routes/` | Exposes chat, provider, and mind map HTTP routes. |
| Application services | `backend/src/services/` | AI routing, prompt construction, response normalization, persistence, mind map patching, Ollama runtime checks. |
| Provider layer | `backend/src/providers/` | Provides common provider contracts for Ollama, Gemini CLI, OpenAI, and Copilot. |
| Database layer | `backend/src/db/` | Initializes SQLite and applies the schema. |

## Primary AI Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Router as AI Router
    participant Provider as AI Provider
    participant Patch as Mind Map Patch Service
    participant DB as SQLite

    UI->>API: POST /api/chat
    API->>DB: Save user message
    API->>Router: Build role-based prompt
    Router->>Provider: Generate raw provider response
    Provider-->>Router: Raw text
    Router->>Router: Parse and normalize JSON
    API->>DB: Save assistant message and agent opinions
    API->>Patch: Apply mindmapPatch incrementally
    Patch->>DB: Insert/update/remove nodes and edges
    API-->>UI: Assistant message, opinions, full mind map
```

## AI Response Contract

All provider output is normalized into:

- `chatResponse`
- `agentOpinions`
- `mindmapPatch`
- `suggestedQuestions`

Providers are not allowed to leak provider-specific response structures to the frontend. JSON parsing failures fall back to a normalized response with empty mind map patches.

## Desktop Window Model

The application opens as a compact chat window. The globe control expands the Electron window from the chat shell so the mind map can occupy the newly available left and lower area. Minimize and close controls are shared at the app level, while provider settings and mind map toggles remain chat-level controls.

## Current Constraints

- The backend is local-only by default.
- The desktop package currently disables ASAR to keep backend resources directly available.
- `node:sqlite` is experimental in the Node version used during development.
- Ollama itself is not bundled; the app detects installation and guides the user to install or start it.
