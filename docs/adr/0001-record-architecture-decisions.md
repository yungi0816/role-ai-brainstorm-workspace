# ADR 0001: Track Desktop-First Local Architecture Decisions

## Status

Accepted

## Context

The project began as a browser-based MVP but shifted toward desktop software. The current runtime combines an Electron shell, a React renderer, a local Express API, SQLite persistence, and local or external AI providers.

This architecture has several decisions that affect future work:

- the backend runs locally instead of as a hosted service
- SQLite owns conversations, messages, role opinions, and mind map state
- provider-specific output is normalized before reaching the frontend
- Ollama is detected and managed as an external local runtime, not bundled into the app
- the desktop package currently copies backend and frontend resources into Electron resources

## Decision

Use ADRs for durable records of consequential architecture decisions. Keep phase-level progress in the roadmap and keep operational details in subsystem documentation.

## Consequences

- Future maintainers can evaluate architectural changes without relying only on commit history.
- Roadmap items and implemented behavior stay separate.
- Decisions such as provider integration strategy, desktop packaging model, and database migration policy can be reviewed independently.

## Alternatives Considered

- Keep all decisions in the root README. Rejected because the README was already becoming a phase log and setup reference.
- Keep decisions only in commit messages. Rejected because commit history is not a navigable documentation system.
