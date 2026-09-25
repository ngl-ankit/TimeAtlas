# TimeAtlas

TimeAtlas is an interactive history explorer for moving through events, people, places, discoveries, and ideas across time. Explore a curated local timeline, search public Wikimedia sources, or take a guided journey through history.

## Features

- Interactive, zoomable timeline with era navigation, event details, and date/category filters
- Search across events, people, places, and topics
- Journey mode, world view, favorites, and recently viewed events
- A bundled historical dataset keeps core exploration available offline
- Optional Wikimedia lookups add context when a network connection is available
- Responsive layout, keyboard controls, reduced-motion support, and accessible focus states

## Tech stack

React, TypeScript, Vite, Tailwind CSS, and browser-native storage and networking. The app is a static frontend with no server, database, authentication, paid service, or API key.

## Run locally

Requirements: Node.js 20 or newer and pnpm.

```sh
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/time-atlas run dev
```

Create a production build with:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/time-atlas run build
```

## Data sources

The bundled event collection is the offline-first foundation. When connected, TimeAtlas can query the public Wikidata SPARQL endpoint for structured event data and the Wikipedia REST API for article summaries and images. Results are cached in the browser; API availability is not required to use the core explorer.

Wikidata content is available under CC0. Wikipedia content is provided under the applicable Creative Commons Attribution-ShareAlike license. Article and data source links are shown in the app.

## Deploy on Render

Connect this repository to Render and deploy the `render.yaml` blueprint. It creates a free static site, builds the Vite app, publishes its generated files, and rewrites app routes to the single-page entry point. Deploys follow the `main` branch. No environment variables or secrets are required.

## Keyboard shortcuts

- `/` — focus search
- `Space` — play or pause Journey mode
- `Escape` — close the active panel
- Arrow keys — move through the timeline
- `Enter` — open the selected event
- `F` — toggle filters
- `G` — toggle World view

## Architecture

The React app and curated event data live in `artifacts/time-atlas`. Wikimedia requests are made by a small typed browser client; local fallback data remains available when requests fail. The project uses Vite's static production build, with Render configured to publish that build directly.