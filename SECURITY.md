# Security Policy

Role AI Brainstorm Workspace is currently a local-first desktop prototype. The bundled backend is intended to run on the user's machine and communicate with local or user-configured AI providers.

## Supported Scope

Security fixes are handled on the `main` branch until formal releases are introduced.

## Public Safety Posture

- The backend binds to `127.0.0.1` by default.
- Provider credential routes are localhost-only by default.
- `.env` files, local SQLite databases, logs, and packaged installers are ignored by git.
- API keys are read from backend environment variables or held in backend process memory after local settings entry.
- OAuth and provider credential flows should not be exposed on an internet-facing server without a private access layer.

## Sensitive Data

Do not commit:

- API keys, OAuth client secrets, tokens, or private keys
- `.env` files
- local SQLite databases under `backend/data/`
- generated installers or packaged desktop artifacts
- logs that may contain provider output or user prompts

## Reporting

Open a GitHub issue with a minimal reproduction for non-sensitive security bugs. If a report contains credentials, private prompts, or exploitable details, remove those secrets before posting and rotate any exposed credentials immediately.
