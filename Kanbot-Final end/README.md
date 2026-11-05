# Kanbot — Final Project Package

Kanbot is an Agile task-management application with projects, a backlog, sprint planning, a Kanban board, authentication, preferences, and an optional AI assistant.

## Project structure

- `client/` — React + Vite + TypeScript frontend
- `server/` — Express + TypeScript API and JSON-file development store

## Requirements

- Node.js 20 or newer
- npm

## Run locally

Open two terminals from this folder.

### Terminal 1 — API

```bash
cd server
npm install
```

Copy `.env.example` to `.env` (or create `.env` with the same values), then run:

```bash
npm run dev
```

API: `http://localhost:4000/api`
Health check: `http://localhost:4000/api/health`

### Terminal 2 — frontend

```bash
cd client
npm install
```

Copy `.env.example` to `.env`, then run:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Useful checks

In `server/`:

```bash
npm run typecheck
npm run smoke
npm run build
```

In `client/`:

```bash
npm run build
```

## AI

The API includes a mock assistant when `AI_API_KEY` is empty. Configure a supported OpenAI-compatible provider later by setting `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in `server/.env`. Never commit `.env` or publish API keys.

## Deployment notes

Deploy the API and frontend separately. Set the frontend environment variable `VITE_API_URL` to the deployed API base URL ending in `/api`. Set backend `CLIENT_ORIGIN` to the deployed frontend origin. The included JSON-file store is intended for local/single-process development; do not rely on the default ephemeral filesystem of a free hosting instance for permanent user data. Use a persistent database before production deployment.

## Important status

This package consolidates the latest supplied frontend (`client 6`) with the supplied API. It is a clean project package, not a claim that every flow has been browser-tested. The supplied Sprint details route was completed in this package with a sprint overview and task breakdown. Automated builds and browser-level QA could not be run in this environment because dependency installation did not complete. Run the checks above and manually test authentication, projects, backlog, sprint lifecycle, board drag-and-drop, settings, sprint details, and responsive layouts before presenting it as fully verified.
