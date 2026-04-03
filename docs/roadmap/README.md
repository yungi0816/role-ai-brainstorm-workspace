# Roadmap and Phase Log

This log separates implemented work from planned work. It reflects repository state, not production readiness.

## Completed Phases

| Phase | Summary | Commit Status |
| --- | --- | --- |
| 0 | Repository setup and GitHub origin configuration. | Completed |
| 1 | Backend server and SQLite foundation. | `chore: initialize backend foundation` |
| 2 | Provider interface layer for Ollama, Antigravity CLI, OpenAI, and Copilot. Legacy CLI provider ids are accepted for existing conversations. | `feat: add provider interface layer` |
| 3 | Ollama runtime checks, connection checks, model listing, and pull support. | `feat: add ollama runtime checks` |
| 4 | Role-based prompt service and JSON response normalization. | `feat: normalize ai json responses` |
| 5 | Incremental mind map patch persistence. | `feat: persist mindmap patches` |
| 6 | React chat workspace scaffold. | `feat: add react chat workspace` |
| 7 | React Flow mind map visualization. | `feat: render mindmap with react flow` |
| 8 | Electron desktop shell. | `feat: add electron desktop shell` |
| 9 | Windows installer packaging. | `feat: package desktop installer` |
| 10 | Mind map node follow-up questions. | `feat: add node follow-up questions` |
| 11 | Chat-first desktop UX, frameless window controls, expandable mind map, Ollama setup panel. | Multiple local commits |
| 12 | Repository documentation structure. | Current documentation phase |
| 13 | Conversation export API, Markdown download UI, and portfolio case study. | Current feature phase |
| 14 | Direct mind map node editing through patch-backed API and UI controls. | Current feature phase |
| 15 | HTML export for print/PDF-ready conversation reports. | Current feature phase |
| 16 | Provider debug logs for diagnostics, execution tests, and chat calls. | Current feature phase |

## Near-Term Roadmap

| Item | Status |
| --- | --- |
| Improve desktop visual polish and window behavior. | In progress |
| Add stronger Ollama setup guidance and runtime recovery flows. | In progress |
| Harden Antigravity CLI provider error handling and command configuration. | Planned |
| Implement OpenAI provider execution behind API-key checks. | Planned |
| Keep Copilot provider as a stable interface until OAuth/SDK integration is selected. | Planned |
| Add test coverage around API contracts and patch application. | Planned |
| Add branded installer assets and production packaging policy. | Planned |
| Add native PDF generation from exported HTML reports. | Planned |
| Add mind map node merge controls. | Planned |

## Deferred Work

- Authenticated cloud sync
- Multi-user collaboration
- Production auto-update
- Formal telemetry and crash reporting
- Full WebGL mind map renderer
