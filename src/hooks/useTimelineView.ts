import { useCallback, useMemo, useState } from 'react';
import { MAX_YEAR, MIN_YEAR, clampYear } from '../utils/date';

export interface TimelineView {
  from: number;
  to: number;
}

const MIN_SPAN = 4;
const MAX_SPAN = MAX_YEAR - MIN_YEAR;

/** Interactive timeline viewport state: zoom, pan, jump — clamped and stable. */
export function useTimelineView(initial?: Partial<TimelineView>) {
  const [view, setView] = useState<TimelineView>({
    from: initial?.from ?? -500,
    to: initial?.to ?? 2030,
  });

  const clampView = useCallback((v: TimelineView): TimelineView => {
    let span = v.to - v.from;
    if (span < MIN_SPAN) span = MIN_SPAN;
    if (span > MAX_SPAN) span = MAX_SPAN;
    let from = clampYear(v.from);
    let to = from + span;
    if (to > MAX_YEAR) {
      to = MAX_YEAR;
      from = clampYear(to - span);
    }
    return { from, to };
  }, []);

  const zoomAt = useCallback(
    (factor: number, anchorRatio: number) => {
      setView((v) => {
        const anchor = v.from + (v.to - v.from) * anchorRatio;
        const span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, (v.to - v.from) * factor));
        return clampView({ from: anchor - span * anchorRatio, to: anchor + span * (1 - anchorRatio) });
      });
    },
    [clampView],
  );

  const panBy = useCallback(
    (deltaYears: number) => {
      setView((v) => clampView({ from: v.from + deltaYears, to: v.to + deltaYears }));
    },
    [clampView],
  );

  const jumpTo = useCallback(
    (year: number, spanYears?: number) => {
      setView((v) => {
        const span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, spanYears ?? v.to - v.from));
        return clampView({ from: year - span / 2, to: year + span / 2 });
      });
    },
    [clampView],
  );

  const setRange = useCallback(
    (from: number, to: number) => setView(clampView({ from, to })),
    [clampView],
  );

  const decadeBands = useMemo(() => {
    const bands: number[] = [];
    const step = view.to - view.from > 1200 ? 100 : view.to - view.from > 200 ? 10 : 1;
    const start = Math.floor(view.from / step) * step;
    for (let d = start; d <= view.to; d += step) bands.push(d);
    return bands;
  }, [view]);

  return { view, zoomAt, panBy, jumpTo, setRange, decadeBands };
}

/** Bucket events into N density columns across a range. */
export function densityBuckets(
  events: { year: number }[],
  from: number,
  to: number,
  buckets = 60,
): number[] {
  const out = new Array<number>(buckets).fill(0);
  const span = Math.max(1, to - from);
  for (const e of events) {
    if (e.year < from || e.year > to) continue;
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor(((e.year - from) / span) * buckets)));
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}
