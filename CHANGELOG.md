# Changelog

All notable changes to this project are documented here.

## Unreleased

### Changed

- Rewrite the Korean README with a more personal project narrative, current-state notes, and implementation tradeoffs.
- Add a real workspace screenshot to the root README.
- Upgrade GitHub Actions workflow actions to the Node 24-ready v6 generation.

### Security

- Bind the backend to `127.0.0.1` by default for local-first execution.
- Restrict provider credential and OAuth callback routes to localhost unless explicitly enabled for a trusted private deployment.
- Add public repository security guidance.

### Fixed

- Run Electron desktop smoke checks without the Chromium sandbox on Linux CI runners.

### Added

- Direct mind map node editing for label, type, parent, and description.
- HTML conversation export for print/PDF-ready reports.
- Provider debug log API and settings-panel log viewer.
- Conversation export API for Markdown/JSON reports.
- Frontend Markdown download action for saved conversations.
- Korean portfolio case study with contribution summary and next feature candidates.
- Korean-first root README with English README preserved as `README_ENG.md`.
- Portfolio-focused key contributions and troubleshooting sections.
- GitHub Actions CI for backend API smoke, frontend build, and desktop smoke verification.
- Backend API smoke script for health and provider registration checks.
- Repository documentation hierarchy under `docs/`.
- Documentation index, architecture overview, API reference, database notes, deployment notes, workflow guide, roadmap, and ADR index.

## 0.1.0 - Prototype

### Added

- Express backend with SQLite persistence.
- Provider contract for Ollama, Gemini CLI, OpenAI, and Copilot.
- Ollama install, server, connection, model listing, and model pull checks.
- Role-based AI response normalization.
- Incremental mind map patch persistence.
- React chat UI and React Flow mind map.
- Electron desktop shell and Windows NSIS installer build.
- Chat-first desktop prototype with expandable mind map.
