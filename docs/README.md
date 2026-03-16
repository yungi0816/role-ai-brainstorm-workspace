# Documentation Index

This directory contains durable repository documentation for Role AI Brainstorm Workspace. The root README is the overview and navigation layer; this directory owns subsystem details.

## Sections

| Area | Purpose |
| --- | --- |
| [Architecture](architecture/README.md) | Runtime topology, subsystem boundaries, AI workflow, and data flow. |
| [API](api/README.md) | HTTP endpoints, request bodies, response contracts, and provider-specific routes. |
| [Database](database/README.md) | SQLite schema, persistence ownership, and state relationships. |
| [Deployment](deployment/README.md) | Desktop packaging, installer output, and runtime storage behavior. |
| [Workflow](workflow/README.md) | Local development, verification, commit, and release expectations. |
| [Roadmap](roadmap/README.md) | Phase log, implemented milestones, and planned work. |
| [ADRs](adr/README.md) | Architecture decision records for consequential choices. |

## Documentation Principles

- Keep implemented behavior separate from planned work.
- Keep README files as indexes and summaries.
- Document subsystem responsibilities where the code actually implements them.
- Avoid storing generated artifacts in documentation unless intentionally versioned.
