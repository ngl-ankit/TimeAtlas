import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { search, entityToEvent, type SearchHit } from '../../api/wikidata';
import { FALLBACK_EVENTS } from '../../data/fallback';
import { CATEGORY_COLORS, formatYear } from '../../utils/date';
import type { HistoricalEvent } from '../../types';
import { useApp } from '../../state/AppContext';
import { Kbd } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onPickEvent: (e: HistoricalEvent) => void;
}

/**
 * Full search overlay: debounced hybrid search (local dataset + Wikidata
 * entities), keyboard navigation, recent & favorites quick access.
 */
export function SearchOverlay({ open, onClose, onPickEvent }: Props) {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce + abortable fetch
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      search(q, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setHits(r);
          setActive(0);
          setError(null);
          setLoading(false);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setHits([]);
          setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const recents = useMemo(
    () => app.recents.map((id) => FALLBACK_EVENTS.find((e) => e.id === id)).filter((e): e is HistoricalEvent => Boolean(e)).slice(0, 5),
    [app.recents],
  );
  const favorites = useMemo(
    () => app.favorites.map((id) => FALLBACK_EVENTS.find((e) => e.id === id)).filter((e): e is HistoricalEvent => Boolean(e)).slice(0, 5),
    [app.favorites],
  );

  const pick = async (hit: SearchHit) => {
    if (hit.kind === 'local' && hit.year !== undefined) {
      const ev = FALLBACK_EVENTS.find((e) => e.id === hit.id);
      if (ev) {
        onPickEvent(ev);
        onClose();
      }
      return;
    }
    // Wikidata entity → resolve to event
    setLoading(true);
    const ev = await entityToEvent(hit.qid);
    setLoading(false);
    if (ev) {
      onPickEvent(ev);
      onClose();
    } else {
      setError(`"${hit.label}" has no usable date on the timeline. Try another result.`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) void pick(hit);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-void/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Search history"
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <span aria-hidden className="text-dim">🔎</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search events, people, places, topics…"
                aria-label="Search historical events and entities"
                className="w-full bg-transparent font-body text-sm text-ink outline-none placeholder:text-faint"
              />
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-glow/30 border-t-cyan-glow" />}
              <Kbd>esc</Kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto" role="listbox" aria-label="Search results">
              {query.trim().length < 2 && (
                <div className="p-4">
                  {recents.length > 0 && (
                    <>
                      <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-faint">Recently viewed</p>
                      {recents.map((e) => (
                        <QuickRow key={e.id} event={e} onPick={() => { onPickEvent(e); onClose(); }} />
                      ))}
                    </>
                  )}
                  {favorites.length > 0 && (
                    <>
                      <p className="mb-2 mt-4 px-1 font-mono text-[10px] uppercase tracking-widest text-faint">Favorites</p>
                      {favorites.map((e) => (
                        <QuickRow key={e.id} event={e} onPick={() => { onPickEvent(e); onClose(); }} />
                      ))}
                    </>
                  )}
                  {recents.length === 0 && favorites.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-faint">
                      Type to search across the timeline and the Wikidata knowledge graph.
                    </p>
                  )}
                </div>
              )}

              {query.trim().length >= 2 && hits.length === 0 && !loading && (
                <p className="px-4 py-8 text-center text-xs text-faint">
                  No matches. Wikidata may be offline — local results are always available.
                </p>
              )}

              {hits.map((hit, i) => (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? 'bg-cyan-glow/10' : 'hover:bg-white/[0.03]'
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => void pick(hit)}
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: hit.kind === 'local' ? CATEGORY_COLORS[hit.category ?? 'World History'] : '#8b5cf6',
                      boxShadow: `0 0 8px ${hit.kind === 'local' ? CATEGORY_COLORS[hit.category ?? 'World History'] : '#8b5cf6'}`,
                    }}
                  />
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-display text-sm text-ink">{hit.label}</span>
                      {hit.year !== undefined && (
                        <span className="shrink-0 font-mono text-[10px] text-cyan-glow">{formatYear(hit.year)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-dim">{hit.description}</span>
                    <span className="mt-1 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
                      {hit.kind === 'local' ? 'timeline' : `wikidata · ${hit.qid}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {error && <p className="border-t border-amber-glow/20 bg-amber-glow/5 px-4 py-2 text-xs text-amber-glow">{error}</p>}
            <div className="flex items-center gap-3 border-t border-white/[0.07] px-4 py-2 font-mono text-[10px] text-faint">
              <span><Kbd>↑↓</Kbd> navigate</span>
              <span><Kbd>enter</Kbd> open</span>
              <span><Kbd>esc</Kbd> close</span>
              <span className="ml-auto">local + Wikidata</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function QuickRow({ event, onPick }: { event: HistoricalEvent; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.04]"
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: CATEGORY_COLORS[event.category], boxShadow: `0 0 8px ${CATEGORY_COLORS[event.category]}` }}
      />
      <span className="truncate text-sm text-ink">{event.title}</span>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">{formatYear(event.year)}</span>
    </button>
  );
}
