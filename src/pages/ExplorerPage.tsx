import { useCallback, useEffect, useMemo, useState } from 'react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTimelineView, densityBuckets } from '../hooks/useTimelineView';
import { useTimelineData, INITIAL_FILTERS, type Filters } from '../hooks/useTimelineData';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useApp } from '../state/AppContext';
import { useIsMobile } from '../hooks';
import { TimelineCanvas } from '../components/timeline/TimelineCanvas';
import { Minimap } from '../components/timeline/Minimap';
import { SearchOverlay } from '../components/explorer/SearchOverlay';
import { FilterPanel } from '../components/explorer/FilterPanel';
import { EventDetailPanel } from '../components/explorer/EventDetailPanel';
import { JourneyOverlay, nextSpeed } from '../components/explorer/JourneyOverlay';
import { IconButton, Kbd } from '../components/ui';
import { ERAS, type HistoricalEvent } from '../types';
import { ERA_COLORS, formatYear } from '../utils/date';

const GlobeLazy = lazy(() =>
  import('../components/explorer/GlobeCanvas').then((m) => ({ default: m.GlobeCanvas })),
);

const ZOOM_STEPS = [5030, 1200, 400, 120, 40, 12] as const;

function spanToZoomIndex(span: number): number {
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    if (span >= (ZOOM_STEPS[i] ?? 0) / 2) return i;
  }
  return ZOOM_STEPS.length - 1;
}

/**
 * The main explorer — full-screen futuristic timeline navigation system.
 */
export function ExplorerPage() {
  const app = useApp();
  const isMobile = useIsMobile();
  const { view, zoomAt, panBy, jumpTo, setRange } = useTimelineView();
  const { events, loading, offline } = useTimelineData(view);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<HistoricalEvent | null>(null);
  const [journey, setJourney] = useState(false);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* era jump from landing page */
  useEffect(() => {
    const era = new URLSearchParams(window.location.search).get('era');
    if (era) {
      const ranges: Record<string, [number, number]> = {
        Ancient: [-800, 300],
        Medieval: [800, 1400],
        Renaissance: [1400, 1700],
        Industrial: [1750, 1900],
        Modern: [1900, 1990],
        Digital: [1980, 2030],
      };
      const r = ranges[era];
      if (r) setRange(r[0]!, r[1]!);
      window.history.replaceState({}, '', '/explore');
    }
  }, [setRange]);

  /* filtering + range composition */
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filters.categories.size > 0 && !filters.categories.has(e.category)) return false;
      if (filters.from !== null && e.year < filters.from) return false;
      if (filters.to !== null && e.year > filters.to) return false;
      return true;
    });
  }, [events, filters]);

  const inView = useMemo(() => filtered.filter((e) => e.year >= view.from && e.year <= view.to), [filtered, view]);
  const density = useMemo(() => densityBuckets(inView, view.from, view.to, 40), [inView, view]);
  const densityMax = Math.max(1, ...density);

  /* journey mode playlist: curated highlight events, in order */
  const journeyList = useMemo(() => {
    const picks = [
      'e-giza', 'e-olympics-1', 'e-alexander', 'e-qin', 'e-rome-fall',
      'e-charlemagne', 'e-mongol', 'e-black-death', 'e-gutenberg', 'e-columbus',
      'e-monalisa', 'e-copernicus', 'e-principia', 'e-industrial-rev', 'e-independence',
      'e-french-rev', 'e-jenner', 'e-faraday', 'e-mendeleev', 'e-telephone',
      'e-bulb', 'e-wright', 'e-einstein-sr', 'e-ww1', 'e-quantum',
      'e-penicillin', 'e-ww2', 'e-colossus', 'e-trinity', 'e-transistor',
      'e-dna', 'e-sputnik', 'e-apollo11', 'e-arpanet', 'e-pong',
      'e-tetris', 'e-www', 'e-hubble', 'e-linux', 'e-doom',
      'e-wikipedia', 'e-hgp', 'e-iphone', 'e-higgs', 'e-crispr',
      'e-spacex-landing', 'e-alphago', 'e-jwst',
    ];
    const byId = new Map(events.map((e) => [e.id, e]));
    const list = picks.map((id) => byId.get(id)).filter((e): e is HistoricalEvent => Boolean(e));
    return list.length >= 10 ? list : [...filtered].slice(0, 48);
  }, [events, filtered]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const onSelectEvent = useCallback(
    (e: HistoricalEvent) => {
      setSelected(e);
      app.pushRecent(e.id);
    },
    [app],
  );

  const exploreRelated = useCallback(
    (e: HistoricalEvent) => {
      jumpTo(e.year, 90);
      setSelected(null);
      showToast(`Timeline centered on ${formatYear(e.year)} — related events in view`);
    },
    [jumpTo, showToast],
  );

  const toggleEraJump = useCallback(
    (era: (typeof ERAS)[number]) => {
      const centers: Record<string, [number, number]> = {
        Ancient: [-800, 300],
        Medieval: [800, 1400],
        Renaissance: [1400, 1700],
        Industrial: [1750, 1900],
        Modern: [1900, 1990],
        Digital: [1980, 2030],
      };
      const r = centers[era];
      if (r) setRange(r[0]!, r[1]!);
      showToast(`${era} era`);
    },
    [setRange, showToast],
  );

  /* journey playback */
  useEffect(() => {
    if (!journey || !playing) return;
    const ms = 4200 / speed;
    const id = setInterval(() => {
      setJourneyIndex((i) => {
        if (i >= journeyList.length - 1) {
          setPlaying(false);
          return i;
        }
        const nextIdx = i + 1;
        const ev = journeyList[nextIdx];
        if (ev) jumpTo(ev.year, 60);
        return nextIdx;
      });
    }, ms);
    return () => clearInterval(id);
  }, [journey, playing, speed, journeyList, jumpTo]);

  useEffect(() => {
    if (journey && journeyList[journeyIndex]) jumpTo(journeyList[journeyIndex]!.year, 60);
  }, [journey]);

  /* keyboard shortcuts */
  useKeyboardShortcuts(
    {
      onSearch: () => setSearchOpen((v) => !v),
      onJourneyToggle: () => {
        if (journey) setPlaying((p) => !p);
        else {
          setJourney(true);
          setJourneyIndex(0);
          setPlaying(true);
        }
      },
      onEscape: () => {
        if (searchOpen) setSearchOpen(false);
        else if (journey) setJourney(false);
        else if (globeOpen) setGlobeOpen(false);
        else if (app.filtersOpen) app.setFiltersOpen(false);
        else setSelected(null);
      },
      onArrow: (dir) => {
        const years = inView.map((e) => e.year);
        const center = (view.from + view.to) / 2;
        const next = dir === 1 ? years.find((y) => y > center + 0.001) : [...years].reverse().find((y) => y < center - 0.001);
        if (next !== undefined) jumpTo(next, Math.min(view.to - view.from, 60));
        else panBy(dir * (view.to - view.from) * 0.15);
      },
      onEnter: () => {
        if (inView.length > 0) onSelectEvent(inView[Math.floor(inView.length / 2)]!);
      },
      onFilters: () => app.setFiltersOpen(!app.filtersOpen),
      onGlobe: () => {
        setGlobeOpen((v) => !v);
        showToast(globeOpen ? 'Globe closed' : 'Globe opened — drag to rotate, click markers');
      },
    },
    !searchOpen,
  );

  const zoomIndex = spanToZoomIndex(view.to - view.from);
  const centerYear = Math.round((view.from + view.to) / 2);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-void" data-testid="explorer">
      {/* atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />

      {/* top bar */}
      <header className="relative z-30 flex items-center gap-2 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-display text-sm font-bold text-ink transition hover:text-cyan-glow"
          aria-label="TimeAtlas home"
        >
          <span aria-hidden className="text-gradient text-lg">◆</span> TimeAtlas
        </Link>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="ml-2 flex h-10 min-w-0 flex-1 max-w-md items-center gap-2 rounded-xl border border-white/10 bg-panel/60 px-3 text-left text-sm text-faint backdrop-blur transition hover:border-white/25"
          aria-label="Open search (slash)"
        >
          <span aria-hidden>🔎</span>
          <span className="hidden truncate sm:inline">Search events, people, places…</span>
          <span className="ml-auto hidden sm:block"><Kbd>/</Kbd></span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-panel/60 px-2.5 py-1.5 font-mono text-[10px] text-dim md:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-amber-glow' : offline ? 'bg-red-400' : 'bg-green-400'}`} />
            {loading ? 'syncing' : offline ? 'offline · local data' : 'live'}
          </span>
          <IconButton label="Toggle filters" shortcut="F" active={app.filtersOpen} onClick={() => app.setFiltersOpen(!app.filtersOpen)}>
            <span aria-hidden>⚙</span>
          </IconButton>
          <IconButton label="Toggle globe view" shortcut="G" active={globeOpen} onClick={() => setGlobeOpen((v) => !v)}>
            <span aria-hidden>🌐</span>
          </IconButton>
          <button
            type="button"
            onClick={() => {
              setJourney(true);
              setJourneyIndex(0);
              setPlaying(true);
            }}
            className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-glow to-violet-glow px-4 py-2 font-display text-xs font-semibold text-void shadow-glowCyan transition hover:scale-[1.03] active:scale-95 sm:flex"
          >
            ▶ Journey <Kbd>space</Kbd>
          </button>
        </div>
      </header>

      {/* era rail */}
      <nav aria-label="Era navigation" className="relative z-30 flex gap-1.5 overflow-x-auto px-4 pb-2 no-scrollbar">
        {ERAS.map((era) => (
          <button
            key={era}
            type="button"
            onClick={() => toggleEraJump(era)}
            className="shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] transition hover:scale-105"
            style={{ borderColor: `${ERA_COLORS[era]}44`, color: ERA_COLORS[era] }}
          >
            {era}
          </button>
        ))}
      </nav>

      {/* main stage */}
      <main className="relative z-10 min-h-0 flex-1" data-testid="timeline-stage">
        <TimelineCanvas
          events={filtered}
          view={view}
          onViewChange={(f, t) => setRange(f, t)}
          selectedId={selected?.id ?? null}
          onSelect={onSelectEvent}
          reducedMotion={app.reducedMotion}
        />

        {/* globe layer */}
        {globeOpen && (
          <div className="absolute inset-0 z-20 bg-void/70 backdrop-blur-sm">
            <div className="absolute right-4 top-4 z-30 flex gap-2">
              <button
                type="button"
                onClick={() => setGlobeOpen(false)}
                className="glass-strong rounded-lg px-3 py-1.5 text-xs text-dim transition hover:text-ink"
              >
                Close globe <Kbd>G</Kbd>
              </button>
            </div>
            <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-faint">loading globe…</div>}>
              <GlobeLazy events={filtered} onSelect={onSelectEvent} reducedMotion={app.reducedMotion} />
            </Suspense>
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-faint">
              drag to rotate · click a marker to inspect the event
            </p>
          </div>
        )}

        {/* HUD: zoom + readouts */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4">
          <div className="pointer-events-auto flex items-end justify-between gap-3">
            <div className="glass-strong hidden items-center gap-3 rounded-xl px-3 py-2 sm:flex" data-testid="hud">
              <span className="font-mono text-[10px] text-faint">DENSITY</span>
              <span className="flex h-6 items-end gap-px" aria-hidden>
                {density.slice(0, 30).map((c, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-sm bg-cyan-glow"
                    style={{ height: `${Math.max(10, (c / densityMax) * 100)}%`, opacity: 0.3 + (c / densityMax) * 0.7 }}
                  />
                ))}
              </span>
              <span className="font-mono text-[10px] text-cyan-glow">{inView.length} events in view</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <IconButton label="Zoom out" onClick={() => zoomAt(2, 0.5)}><span aria-hidden>−</span></IconButton>
              <div className="glass-strong flex items-center gap-1 rounded-xl p-1" role="group" aria-label="Zoom level">
                {ZOOM_STEPS.map((z, i) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => {
                      const center = (view.from + view.to) / 2;
                      setRange(center - z / 2, center + z / 2);
                    }}
                    aria-label={`Zoom to ${z < 100 ? `${z} years` : `${z} years span`}`}
                    aria-pressed={zoomIndex === i}
                    className={`h-7 w-7 rounded-lg font-mono text-[10px] transition ${
                      zoomIndex === i ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-faint hover:text-ink'
                    }`}
                  >
                    {z < 15 ? '•' : z < 60 ? '∙' : z < 500 ? '·' : '⌁'}
                  </button>
                ))}
              </div>
              <IconButton label="Zoom in" onClick={() => zoomAt(0.5, 0.5)}><span aria-hidden>+</span></IconButton>
              <IconButton label="Pan earlier" onClick={() => panBy(-(view.to - view.from) * 0.4)}><span aria-hidden>‹</span></IconButton>
              <IconButton label="Pan later" onClick={() => panBy((view.to - view.from) * 0.4)}><span aria-hidden>›</span></IconButton>
            </div>
          </div>
        </div>

        {/* position readout */}
        <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[10px] text-faint" aria-live="off">
          <span className="text-cyan-glow">{formatYear(view.from)}</span>
          <span> — </span>
          <span className="text-cyan-glow">{formatYear(view.to)}</span>
          <span className="mx-2">·</span>
          <span>center {formatYear(centerYear)}</span>
        </div>

        {/* offline notice */}
        {offline && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div role="status" className="glass-strong flex items-center gap-2 rounded-full border border-amber-glow/30 px-4 py-1.5 text-xs text-amber-glow">
              <span aria-hidden>📡</span> External data unreachable — exploring with the bundled dataset
            </div>
          </div>
        )}
      </main>

      {/* minimap */}
      <div className="relative z-30 px-4 pb-3 pt-1">
        <Minimap events={filtered} view={view} onJump={setRange} />
        <p className="mt-1.5 hidden text-center font-mono text-[10px] text-faint sm:block">
          drag · scroll to zoom · <Kbd>←</Kbd><Kbd>→</Kbd> step events · <Kbd>enter</Kbd> open center event · <Kbd>space</Kbd> journey · <Kbd>f</Kbd> filters · <Kbd>g</Kbd> globe
          {isMobile && ' · swipe on timeline'}
        </p>
      </div>

      {/* overlays */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onPickEvent={onSelectEvent} />
      <FilterPanel
        open={app.filtersOpen}
        onClose={() => app.setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        total={events.length}
        shown={filtered.length}
      />
      <EventDetailPanel
        event={selected}
        onClose={() => setSelected(null)}
        onSelectRelated={onSelectEvent}
        onExploreRelated={exploreRelated}
        allEvents={events}
      />

      {journey && (
        <JourneyOverlay
          events={journeyList}
          index={journeyIndex}
          playing={playing}
          speed={speed}
          onIndex={(i) => {
            setJourneyIndex(i);
            const ev = journeyList[i];
            if (ev) jumpTo(ev.year, 60);
          }}
          onPlayPause={() => setPlaying((p) => !p)}
          onSpeed={() => setSpeed((s) => nextSpeed(s))}
          onExit={() => setJourney(false)}
        />
      )}

      {/* toast */}
      {toast && (
        <div role="status" className="glass-strong fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-ink shadow-panel">
          {toast}
        </div>
      )}

      {/* mobile journey button */}
      {isMobile && !journey && (
        <button
          type="button"
          onClick={() => {
            setJourney(true);
            setJourneyIndex(0);
            setPlaying(true);
          }}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-glow to-violet-glow text-xl text-void shadow-glowCyan transition active:scale-90"
          aria-label="Start Journey Mode"
        >
          ▶
        </button>
      )}
    </div>
  );
}

export default ExplorerPage;
