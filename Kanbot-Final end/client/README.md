# Kanbot client

Agile task manager frontend: Backlog, Sprints, Board and an AI assistant.
Built with React 19, TypeScript, Vite, React Router, TanStack Query, react-hook-form + zod and dnd-kit.

## Run locally
1. Start the backend (`../server`): `npm install`, copy `.env.example` to `.env`, `npm run seed`, `npm run dev`.
2. In this folder: `npm install` then `npm run dev` and open http://localhost:5173
3. Demo login: `demo@kanbot.dev` / `password123`

## Environment
`VITE_API_URL` (default `http://localhost:4000/api`). Use your deployed backend URL in production.

## Features
- Auth with session restore and expired-session handling
- Projects list and creation
- Backlog: quick create, search and filters, details dialog, drag reorder
- Sprints: create, start, complete (move unfinished todos), history
- Board: four columns, drag and drop with optimistic updates, progress bar
- AI assistant: chat, generate todos, plan sprint, sprint summary (mock or real model)
- Light / dark / auto theme, responsive layout

## Deploy (Netlify or Vercel)
Build command `npm run build`, output `dist`. SPA rewrites are included (`public/_redirects`, `vercel.json`).
Set `VITE_API_URL` to the public backend URL, and add the frontend URL to `CLIENT_ORIGIN` in the server `.env`.
