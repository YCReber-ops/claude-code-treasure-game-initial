# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always reply in Traditional Chinese (繁體中文), whether the user writes in English or Chinese. Keep code, commands, file names and technical terms in their original form, adding a brief Chinese explanation where needed.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server (port 3000, auto-opens browser)
- `npm run server` — start the auth/score API (port 3001, SQLite file `server/data/game.db`, created on first run; needs Node 22.5+ for `node:sqlite`)
- `npm run dev:all` — run API server and Vite together (Vite proxies `/api` to 3001)
- `npm run build` — production build to `build/` (not `dist/`)

There is no test runner, linter, or type-check script configured.

## Architecture

A small single-page React 18 + TypeScript + Vite (SWC) treasure-chest game. Three chests are rendered; one randomly hides treasure (+$100), the others hold a skeleton (-$50). The game ends when the treasure is found or all chests are open.

- **All game logic lives in `src/App.tsx`**: `boxes` / `score` / `gameEnded` state, `initializeGame` (runs on mount and on "Play Again"), `openBox`. Animations use `motion/react` (framer-motion successor). Chest images are in `src/assets/`; sound effects in `src/audios/` (`chest_open.mp3`, `chest_open_with_evil_laugh.mp3` for the skeleton chest) are imported as modules but not yet wired up in `App.tsx`. `src/assets/key.png` is intended as a hover cursor over closed chests.
- **Auth & scores**: `server/index.mjs` (plain `node:http` + `node:sqlite`; tables `users`, `sessions`, `scores`; scrypt passwords, Bearer tokens). It only runs locally: the Vercel deployment is static, so sign-in/leaderboard don't work there (guest mode only). Client wrapper `src/lib/api.ts` (token in localStorage), sign-in UI `src/components/AuthScreen.tsx`. `App.tsx` saves the score on `gameEnded` only when `user` is set; guest mode makes no API calls. Needs `npm run dev:all` (or `server` + `dev`) for sign-in to work.
- **`src/components/ui/`** is a generated shadcn/ui-style library (Radix primitives + `class-variance-authority` + `tailwind-merge`, helper `cn` in `ui/utils.ts`). Only `Button` is currently used by the app; the rest is boilerplate — don't edit or lint-clean it without a reason. `src/components/figma/` is Figma-export scaffolding.
- **`vite.config.ts`** contains many version-pinned aliases (e.g. `'lucide-react@0.487.0': 'lucide-react'`) so Figma-exported imports with version suffixes resolve; keep them when adding UI components. `@` aliases `src/`.
- Styling is Tailwind utility classes (amber palette); global CSS in `src/index.css` and `src/styles/globals.css`.
- `src/guidelines/Guidelines.md` is an unfilled template (all commented out).

## Notes

- `openBox` calls `setScore` inside the `setBoxes` updater function — a side effect in an updater (double-invoked under React StrictMode); be careful when modifying that flow.
- The README is a workshop script of prompts for exploring this project with Claude Code (adding sounds, hover cursor, SQLite sign-in with guest mode, custom deploy commands in `.claude/commands/`), not conventional docs. Per that workflow, new functions should get a one-line top comment summarizing usage and documenting inputs/output.
