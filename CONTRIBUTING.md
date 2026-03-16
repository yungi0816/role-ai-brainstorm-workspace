# Contributing

This repository is currently developed through small, phase-based local commits.

## Expectations

- Keep changes scoped to the current phase or issue.
- Preserve the frontend/backend/desktop boundaries unless the task explicitly changes architecture.
- Keep generated artifacts, local databases, `.env` files, and installer outputs out of git.
- Document implemented behavior as implemented. Mark planned behavior as planned.

## Verification

Before completing a phase, run the checks relevant to the touched area:

```bash
cd frontend
npm run build
```

```bash
cd desktop
npm run smoke
```

For backend-only changes, also verify import/syntax paths or run the relevant API manually.

## Commit Policy

- Commit when a phase is complete.
- Do not create a commit for every small edit.
- Do not push until the repository owner explicitly asks for a push.

## Security

Do not commit API keys, tokens, `.env` files, local SQLite databases, or packaged artifacts.
