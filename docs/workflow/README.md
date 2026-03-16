# Development Workflow

This repository is developed in small, reviewable phases. Local commits are created after a phase is complete. Pushes are intentionally batched until requested.

## Local Development

Install package dependencies separately:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

```bash
cd desktop
npm install
```

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Run the desktop app:

```bash
cd desktop
npm start
```

## Verification

Frontend build:

```bash
cd frontend
npm run build
```

Desktop smoke test:

```bash
cd desktop
npm run smoke
```

Desktop installer build:

```bash
cd desktop
npm run dist
```

## Commit Discipline

- Commit after a coherent phase is complete.
- Do not create one commit per small edit.
- Do not push until explicitly requested.
- Keep generated installer artifacts out of git.

## Environment Files

Use `.env.example` files as configuration references. Do not commit `.env`, API keys, tokens, local databases, or generated build artifacts.
