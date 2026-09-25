# TimeAtlas — Navigate Human History

A futuristic, interactive history explorer. TimeAtlas turns 5,000 years of
human civilization into a cinematic, navigable timeline: drag through time,
zoom from millennia to single events, inspect rich details from Wikipedia,
search across the Wikidata knowledge graph, fly through history in Journey
Mode, and see where it all happened on a live 3D globe.

**Data sources:** [Wikidata](https://www.wikidata.org) (SPARQL + EntitySearch,
CC0) and [Wikipedia](https://en.wikipedia.org) (REST API, CC BY-SA), used
through their documented public APIs — no keys, no scraping. A bundled,
hand-curated dataset of 115+ verified events keeps the full experience
working offline.

## Features

- **Cinematic landing page** — animated particles, glowing timeline preview, era showcase
- **Interactive timeline engine** — canvas-rendered, drag with momentum, wheel/pinch zoom, hit-testing, animated connections, density visualization, era bands, live position indicator
- **Event details** — Wikipedia summaries + images, related events, categories, coordinates, favorites
- **Search** — debounced hybrid search (local + Wikidata entities), keyboard navigation, recents & favorites quick access
- **Filters** — 10 categories, custom date ranges, era presets; live event counts
- **Era mode** — one-click jumps between Ancient → Digital
- **Journey Mode** — auto-piloted tour through 48 curated milestones with narration, play/pause, next/previous, adjustable speed
- **World view** — lightweight Three.js globe with event markers, arcs and click-to-inspect (lazy-loaded, optional)
- **Minimap** — full-range density map with draggable viewport window
- **localStorage** — favorites, recently viewed, reduced-motion preference
- **Resilience** — caching + dedupe + concurrency limits, timeouts, graceful offline fallback, never exposes raw API errors

## Tech Stack

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | React 18 + TypeScript (strict)                    |
| Build      | Vite 5                                            |
| Styling    | Tailwind CSS 3 (dark-first custom design system)  |
| Animation  | Framer Motion                                     |
| 3D         | Three.js (lazy-loaded, optional globe)            |
| Data       | Wikidata SPARQL, Wikipedia REST — no keys         |
| Hosting    | Render static site (free)                         |

## Local Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
npm run lint
```

Node 20+ required.

## Data Sources & Attribution

- **Wikidata** — structured event/entity data via the public
  [SPARQL endpoint](https://query.wikidata.org/sparql) and
  [EntitySearch API](https://www.wikidata.org/w/api.php) (CC0).
- **Wikipedia** — readable summaries and images via the public
  [REST API](https://en.wikipedia.org/api/rest_v1/) (CC BY-SA).
- Attribution is displayed in-app (event panel footer + landing page footer).

The bundled fallback dataset (`src/data/fallback.ts`) contains 115+
historically documented events spanning all six eras and all ten categories —
the app is fully explorable with zero network access.

## Deploy on Render

1. Push this repository to GitHub (it already includes `render.yaml`).
2. In the Render dashboard: **New → Blueprint**, select the repo.
3. Render reads `render.yaml` and deploys a **free static site**:
   - build: `npm ci && npm run build`
   - publish: `dist/`
   - SPA fallback route, immutable asset caching, Node 22.

No environment variables, no secrets, no database. Auto-deploys on every
push to `main`.

## Keyboard Shortcuts

| Key            | Action                          |
| -------------- | ------------------------------- |
| `/`            | Open / close search             |
| `Space`        | Start journey / play-pause      |
| `Esc`          | Close panel, overlay or journey |
| `←` `→`        | Step to previous / next event   |
| `Enter`        | Open the centered event         |
| `F`            | Toggle filters                  |
| `G`            | Toggle globe / world view       |
| `↑` `↓`        | Navigate search results         |

## Architecture Overview

```
src/
├── api/            # centralized API client (cache, dedupe, timeouts)
│   ├── client.ts   #   fetch core: TTL caches, concurrency queue, retry
│   └── wikidata.ts #   SPARQL queries, search, enrichment
├── components/
│   ├── background/ # particle field
│   ├── timeline/   # canvas timeline engine + minimap
│   ├── explorer/   # search, filters, details, journey, globe
│   └── ui/         # shared primitives (badges, skeletons, buttons)
├── data/           # bundled fallback dataset (115+ events)
├── hooks/          # timeline view, data loading, shortcuts, prefs
├── pages/          # LandingPage, ExplorerPage (lazy-loaded)
├── state/          # AppContext (favorites, recents, prefs, UI state)
├── utils/          # date/era logic, localStorage persistence
└── types.ts        # domain models
```

Performance: code-split explorer + globe, manual vendor chunks, canvas
timeline (no per-node DOM), debounced/deduped/aborted requests, lazy images,
requestAnimationFrame rendering with reduced-motion support, `prefers-reduced-motion` respected globally.

## License

MIT — see [LICENSE](LICENSE). Data by Wikidata & Wikipedia contributors under
CC0 / CC BY-SA respectively.
