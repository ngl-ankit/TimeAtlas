import { useEffect, useMemo, useRef, useState } from 'react';
import type { HistoricalEvent } from '../types';
import { FALLBACK_EVENTS } from '../data/fallback';
import { loadEventsForRange } from '../api/wikidata';

export interface Filters {
  categories: Set<string>;
  from: number | null;
  to: number | null;
}

export const INITIAL_FILTERS: Filters = { categories: new Set(), from: null, to: null };

/**
 * Core dataset is always present (instant, offline-capable). When the user
 * zooms into a specific window, Wikidata range results merge in as they
 * arrive — deduplicated, abortable, debounced so timeline drags never
 * spam the network.
 */
export function useTimelineData(view: { from: number; to: number }) {
  const [remote, setRemote] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastRange = useRef<string>('');

  const core = useMemo(() => FALLBACK_EVENTS, []);

  useEffect(() => {
    const span = view.to - view.from;
    if (span > 700) return;

    const roundedFrom = Math.floor(view.from / 50) * 50 - 50;
    const roundedTo = Math.ceil(view.to / 50) * 50 + 50;
    const rangeKey = `${roundedFrom}:${roundedTo}`;
    if (rangeKey === lastRange.current) return;

    const t = setTimeout(() => {
      lastRange.current = rangeKey;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      loadEventsForRange(roundedFrom, roundedTo, ctrl.signal)
        .then((events) => {
          if (ctrl.signal.aborted) return;
          setRemote((prev) => {
            const seen = new Set(prev.map((e) => e.id));
            const fresh = events.filter((e) => !seen.has(e.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          setOffline(false);
          setLoading(false);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setOffline(true);
          setLoading(false);
        });
    }, 650);

    return () => clearTimeout(t);
  }, [view.from, view.to]);

  const events = useMemo(() => {
    const seen = new Set<string>();
    return [...core, ...remote]
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .sort((a, b) => a.year - b.year);
  }, [core, remote]);

  return { events, loading, offline };
}
