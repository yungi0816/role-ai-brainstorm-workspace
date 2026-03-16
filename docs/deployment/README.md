# Deployment and Packaging

The current deployment target is a Windows desktop installer built with Electron Builder.

## Desktop Runtime

The Electron main process:

- starts the Express app in-process
- sets `PORT` for the local backend
- sets `DB_FILE` to Electron `userData` when not explicitly provided
- loads the built React renderer from `frontend/dist`
- exposes the API base URL and safe window/shell actions through the preload bridge

## Build Commands

Create an unpacked Windows app:

```bash
cd desktop
npm run pack
```

Create a Windows NSIS installer:

```bash
cd desktop
npm run dist
```

Run a desktop smoke test without opening the UI:

```bash
cd desktop
npm run smoke
```

## Artifacts

Installer output:

```text
desktop/artifacts/Role AI Brainstorm Workspace Setup 0.1.0.exe
```

Generated artifacts are ignored by git.

## Packaging Notes

- `frontend/dist` is copied into the packaged resources.
- `backend/src`, `backend/package.json`, and `backend/node_modules` are copied into packaged resources.
- ASAR is currently disabled so backend runtime resources remain directly accessible.
- The default Electron icon is still used.

## Operational Status

This is a prototype desktop build. It is not yet a signed production release with formal update, rollback, crash reporting, or installer branding policy.
