# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

React 19 + Vite 8 app in plain JavaScript/JSX (no TypeScript), styled with Tailwind CSS v4 via the `@tailwindcss/vite` plugin (`src/index.css` is just `@import 'tailwindcss'`; there is no `tailwind.config.js`). `src/character.jsx` (served by `character.html` via `src/character-main.jsx`; `index.html`/`src/main.jsx` currently render the same component) implements the Star Wars Character Datapad layout from `wireframe.png`. All data comes from SWAPI (`https://swapi.info/api`, which returns plain JSON arrays, not paginated `results`): the character list from `/people`, the film strip from `/films`, and on selection `loadCharacter` fetches the person by its `url` plus its linked homeworld, first species, starships and vehicles, mapping them into the shape the UI renders. Fetches go through the local `useAsync(load, key)` hook, which aborts stale requests when the key changes. The README is the unmodified template README.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/` (multi-page: each root HTML file must be listed in `build.rolldownOptions.input` in `vite.config.js`)
- `npm run preview` — serve the built `dist/` locally
- `npm run lint` — lint with Oxlint (not ESLint)
- `npm test` — Vitest in watch mode; `npx vitest run` runs once (CI-style); `npx vitest run -t "search"` runs tests whose name matches

Tests use jsdom + React Testing Library (`src/test/setup.js` adds jest-dom matchers, cleanup, and a `scrollIntoView` stub). `src/character.test.jsx` never hits the network: it stubs `fetch` with fixtures keyed by SWAPI URL, so new endpoints the page calls need a fixture added there.

## Structure and conventions

- Entry: `index.html` → `src/main.jsx`, which mounts `<Character />` inside `StrictMode` into `#root` and imports global styles from `src/index.css`; `character.html` → `src/character-main.jsx` does the same.
- Assets imported from `src/assets/` are bundled by Vite; files in `public/` are served from the site root (e.g. `/icons.svg#...` sprite references).
- Linting is configured in `.oxlintrc.json` with the `react` and `oxc` plugins. Notable rules: `react/rules-of-hooks` is an error, and `react/only-export-components` warns (to keep Fast Refresh working, modules exporting components should export only components, constants excepted).
- The React Compiler is not enabled.
