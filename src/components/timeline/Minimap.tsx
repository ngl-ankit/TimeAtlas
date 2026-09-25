import { useMemo, useRef } from 'react';
import { MAX_YEAR, MIN_YEAR, formatYear } from '../../utils/date';
import { densityBuckets } from '../../hooks/useTimelineView';

interface Props {
  events: { year: number }[];
  view: { from: number; to: number };
  onJump: (from: number, to: number) => void;
}

/** Full-range minimap: density profile + draggable viewport window. */
export function Minimap({ events, view, onJump }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const spanAtDown = useRef(view.to - view.from);

  const buckets = useMemo(
    () => densityBuckets(events, MIN_YEAR, MAX_YEAR, 120),
    [events],
  );
  const max = Math.max(1, ...buckets);

  const toPct = (year: number) => ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const xToYear = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return MIN_YEAR;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR);
  };

  const scrub = (clientX: number) => {
    const center = xToYear(clientX);
    const span = spanAtDown.current;
    onJump(center - span / 2, center + span / 2);
  };

  return (
    <div className="glass-strong rounded-xl px-3 pb-1 pt-2" data-testid="minimap">
      <div
        ref={trackRef}
        role="slider"
        aria-label="Timeline minimap — drag to move the viewport"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={Math.round((view.from + view.to) / 2)}
        tabIndex={0}
        className="relative h-10 cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          spanAtDown.current = view.to - view.from;
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && scrub(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          const span = view.to - view.from;
          if (e.key === 'ArrowRight') onJump(view.from + span * 0.2, view.to + span * 0.2);
          if (e.key === 'ArrowLeft') onJump(view.from - span * 0.2, view.to - span * 0.2);
        }}
      >
        {/* density bars */}
        <div className="absolute inset-x-0 bottom-3 flex h-6 items-end gap-px" aria-hidden>
          {buckets.map((c, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-cyan-glow/50"
              style={{ height: c ? `${Math.max(8, (c / max) * 100)}%` : '2px', opacity: c ? 0.25 + (c / max) * 0.75 : 0.15 }}
            />
          ))}
        </div>
        {/* viewport window */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-2.5 top-0 rounded border border-cyan-glow/80 bg-cyan-glow/10 shadow-glowCyan"
          style={{
            left: `${toPct(view.from)}%`,
            width: `${toPct(view.to) - toPct(view.from)}%`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[9px] text-faint" aria-hidden>
          <span>{formatYear(MIN_YEAR)}</span>
          <span>{formatYear(-1000)}</span>
          <span>{formatYear(0)}</span>
          <span>{formatYear(1000)}</span>
          <span>{formatYear(MAX_YEAR)}</span>
        </div>
      </div>
    </div>
  );
}
