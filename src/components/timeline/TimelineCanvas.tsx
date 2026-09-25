import { useCallback, useEffect, useRef, useState } from 'react';
import type { Era, HistoricalEvent } from '../../types';
import { CATEGORY_COLORS, ERA_RANGES, formatYear } from '../../utils/date';

interface Props {
  events: HistoricalEvent[];
  view: { from: number; to: number };
  onViewChange: (from: number, to: number) => void;
  selectedId: string | null;
  onSelect: (e: HistoricalEvent) => void;
  reducedMotion: boolean;
}

interface Hover {
  event: HistoricalEvent;
  x: number;
  y: number;
}

const ERA_ENTRIES = Object.entries(ERA_RANGES) as [Era, [number, number]][];
const MIN_SPAN = 4;
const MAX_SPAN = 5030;

/**
 * The core timeline engine — a custom canvas renderer with pan (drag),
 * zoom (wheel/pinch), hit-testing, animated connections, density
 * visualization, era bands and a live position indicator.
 */
export function TimelineCanvas({
  events,
  view,
  onViewChange,
  selectedId,
  onSelect,
  reducedMotion,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const live = useRef({ events, view, selectedId, hover, reducedMotion });
  live.current = { events, view, selectedId, hover, reducedMotion };
  const nodePos = useRef<{ e: HistoricalEvent; x: number; y: number }[]>([]);
  const drag = useRef<{ x: number; from: number; to: number; moved: boolean } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const momentum = useRef(0);
  const size = useRef({ w: 0, h: 0, dpr: 1 });

  /* ── coordinate helpers ── */
  const yearToX = (year: number, w: number, v: { from: number; to: number }) =>
    ((year - v.from) / (v.to - v.from)) * w;
  const xToYear = (x: number, w: number, v: { from: number; to: number }) =>
    v.from + (x / w) * (v.to - v.from);
  /** Deterministic wave lane so node layout is stable and organic. */
  const laneY = (year: number, h: number) =>
    h * 0.46 + Math.sin(year * 0.021) * h * 0.2 + Math.cos(year * 0.005) * h * 0.08;

  /* ── renderer ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = size.current;
    if (w === 0) return;
    const { events: evs, view: v, selectedId: sel } = live.current;
    const t = performance.now();

    ctx.clearRect(0, 0, w, h);
    const span = v.to - v.from;

    /* era bands */
    if (span > 240) {
      for (const [era, [ef, et]] of ERA_ENTRIES) {
        const x1 = yearToX(ef, w, v);
        const x2 = yearToX(et, w, v);
        if (x2 < 0 || x1 > w) continue;
        const cx1 = Math.max(0, x1);
        const cx2 = Math.min(w, x2);
        ctx.fillStyle = eraColor(era) + '0d';
        ctx.fillRect(cx1, 0, cx2 - cx1, h - 30);
        if (x2 - x1 > 120) {
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = eraColor(era) + '99';
          ctx.textAlign = 'center';
          ctx.fillText(era.toUpperCase(), (Math.max(x1, 0) + Math.min(x2, w)) / 2, 20);
        }
      }
    }

    /* time ticks */
    const steps = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
    const step = steps.find((s) => span / s < 14) ?? 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let y = Math.ceil(v.from / step) * step; y <= v.to; y += step) {
      const x = yearToX(y, w, v);
      ctx.strokeStyle = 'rgba(139,92,246,0.14)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
      ctx.fillStyle = 'rgba(154,163,184,0.65)';
      ctx.fillText(formatYear(y), x, h - 36);
    }

    /* central axis */
    const axisY = h * 0.46;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(34,211,238,0)');
    grad.addColorStop(0.5, 'rgba(34,211,238,0.55)');
    grad.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(w, axisY);
    ctx.stroke();

    /* nodes + connections */
    const positions: { e: HistoricalEvent; x: number; y: number }[] = [];
    const visible = evs.filter((e) => e.year >= v.from - 5 && e.year <= v.to + 5);
    // connections (drawn first, beneath nodes)
    ctx.lineWidth = 1;
    for (let i = 1; i < visible.length; i++) {
      const a = visible[i - 1];
      const b = visible[i];
      if (!a || !b) continue;
      const ax = yearToX(a.year, w, v);
      const ay = laneY(a.year, h);
      const bx = yearToX(b.year, w, v);
      const by = laneY(b.year, h);
      const dist = bx - ax;
      if (dist > w * 0.9) continue; // skip sparse jumps when zoomed out
      ctx.strokeStyle = (CATEGORY_COLORS[a.category] ?? '#22d3ee') + '22';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - Math.min(46, dist * 0.18), bx, by);
      ctx.stroke();
    }
    // nodes
    for (const e of visible) {
      const x = yearToX(e.year, w, v);
      const y = laneY(e.year, h);
      positions.push({ e, x, y });
      const color = CATEGORY_COLORS[e.category] ?? '#22d3ee';
      const isSel = sel === e.id;
      const isHov = live.current.hover?.event.id === e.id;
      // halo
      if (isSel) {
        const pulse = reducedMotion ? 1 : 1 + Math.sin(t / 300) * 0.25;
        ctx.beginPath();
        ctx.arc(x, y, (10 + 6 * pulse) * (isSel ? 1 : 0), 0, Math.PI * 2);
        ctx.strokeStyle = color + '55';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const r = isSel ? 7 : isHov ? 6 : 4;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = color + '20';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // connector to axis
      ctx.strokeStyle = color + '40';
      ctx.beginPath();
      ctx.moveTo(x, y > axisY ? y - r - 2 : y + r + 2);
      ctx.lineTo(x, axisY);
      ctx.stroke();
      // labels when dense zoom
      if (span < 130) {
        const above = y <= axisY;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = isSel || isHov ? '#e6ecf5' : 'rgba(154,163,184,0.85)';
        ctx.textAlign = 'center';
        const label = e.title.length > 22 ? e.title.slice(0, 21) + '…' : e.title;
        ctx.fillText(label, x, above ? y - 14 : y + 22);
      }
    }
    nodePos.current = positions;

    /* density visualization */
    const buckets = 60;
    const counts = new Array<number>(buckets).fill(0);
    for (const e of evs) {
      if (e.year < v.from || e.year > v.to) continue;
      const idx = Math.floor(((e.year - v.from) / span) * buckets);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    const max = Math.max(1, ...counts);
    const bw = w / buckets;
    for (let i = 0; i < buckets; i++) {
      const c = counts[i] ?? 0;
      if (!c) continue;
      const bh = (c / max) * 22;
      ctx.fillStyle = 'rgba(34,211,238,0.35)';
      ctx.fillRect(i * bw + 1, h - 4 - bh, bw - 2, bh);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, h - 30);
    ctx.lineTo(w, h - 30);
    ctx.stroke();

    /* position indicator */
    const cx = w / 2;
    ctx.strokeStyle = 'rgba(232,241,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx, h - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    const centerYear = Math.round(xToYear(cx, w, v));
    const label = formatYear(centerYear);
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(8,10,18,0.92)';
    ctx.strokeStyle = 'rgba(34,211,238,0.6)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, 2, tw, 20, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e6ecf5';
    ctx.fillText(label, cx, 16);
  }, [reducedMotion]);

  /* sizing + animation loop */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const loop = () => {
      draw();
      if (!live.current.reducedMotion) raf = requestAnimationFrame(loop);
    };
    if (reducedMotion) draw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [draw, reducedMotion]);

  useEffect(() => {
    draw();
  }, [events, view, selectedId, hover, draw]);

  /* ── interactions ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clampSpan = (s: number) => Math.min(MAX_SPAN, Math.max(MIN_SPAN, s));

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { w } = size.current;
      const v = live.current.view;
      const rect = canvas.getBoundingClientRect();
      const xr = (e.clientX - rect.left) / rect.width;
      if (e.shiftKey) {
        const delta = (e.deltaY / rect.width) * (v.to - v.from);
        onViewChange(v.from + delta, v.to + delta);
        return;
      }
      const factor = Math.exp(e.deltaY * 0.0014);
      const anchor = xToYear(xr * w, w, v);
      const span = clampSpan((v.to - v.from) * factor);
      onViewChange(anchor - span * xr, anchor + span * (1 - xr));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    let momentumRaf = 0;
    const stopMomentum = () => {
      cancelAnimationFrame(momentumRaf);
      momentum.current = 0;
    };

    const onPointerDown = (e: PointerEvent) => {
      stopMomentum();
      canvas.setPointerCapture(e.pointerId);
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = live.current.view;
      drag.current = { x: e.clientX, from: v.from, to: v.to, moved: false };
    };

    const onPointerMove = (e: PointerEvent) => {
      // hover hit-test
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (pinch.current.size < 2) {
        let found: Hover | null = null;
        let best = 18;
        for (const n of nodePos.current) {
          const d = Math.hypot(n.x - px, n.y - py);
          if (d < best) {
            best = d;
            found = { event: n.e, x: n.x, y: n.y };
          }
        }
        setHover(found);
        canvas.style.cursor = found ? 'pointer' : drag.current ? 'grabbing' : 'grab';
      }

      // pinch zoom
      if (pinch.current.has(e.pointerId)) {
        pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pinch.current.size === 2) {
        const [p1, p2] = [...pinch.current.values()];
        if (p1 && p2) {
          const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const prev = canvas.dataset.pinch ? parseFloat(canvas.dataset.pinch) : d;
          const v = live.current.view;
          const factor = prev / Math.max(1, d);
          const span = clampSpan((v.to - v.from) * factor);
          onViewChange((v.from + v.to) / 2 - span / 2, (v.from + v.to) / 2 + span / 2);
          canvas.dataset.pinch = String(d);
        }
        return;
      }

      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      const { w } = size.current;
      const span = d.to - d.from;
      const deltaYears = -(dx / Math.max(1, w)) * span;
      momentum.current = momentum.current * 0.6 + (e.movementX || 0) * 0.4;
      onViewChange(d.from + deltaYears, d.to + deltaYears);
    };

    const endDrag = (e: PointerEvent) => {
      pinch.current.delete(e.pointerId);
      if (pinch.current.size < 2) delete canvas.dataset.pinch;
      const d = drag.current;
      drag.current = null;
      if (!d || d.moved) {
        // momentum glide
        const v = live.current.view;
        const span = v.to - v.from;
        let vel = -(momentum.current / Math.max(1, size.current.w)) * span * 1.4;
        if (!reducedMotion && Math.abs(vel) > span * 0.001) {
          const glide = () => {
            vel *= 0.93;
            const cv = live.current.view;
            if (Math.abs(vel) < span * 0.0008) return;
            onViewChange(cv.from + vel, cv.to + vel);
            momentumRaf = requestAnimationFrame(glide);
          };
          glide();
        }
        return;
      }
      // click → hit test
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let best: { e: HistoricalEvent; d: number } | null = null;
      for (const n of nodePos.current) {
        const dist = Math.hypot(n.x - px, n.y - py);
        if (dist < 18 && (!best || dist < best.d)) best = { e: n.e, d: dist };
      }
      if (best?.e) onSelect(best.e);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      cancelAnimationFrame(momentumRaf);
    };
  }, [onViewChange, onSelect, reducedMotion]);

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none select-none">
      <canvas
        ref={canvasRef}
        role="application"
        aria-label="Interactive history timeline. Drag to move through time, scroll to zoom, click a node to inspect the event."
        className="h-full w-full touch-none"
      />
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-white/10 bg-abyss/95 p-3 text-xs shadow-panel backdrop-blur"
          style={{
            left: Math.min(Math.max(hover.x, 10), size.current.w - 250),
            top: Math.max(hover.y - 90, 8),
          }}
        >
          <p className="font-display font-semibold text-ink">{hover.event.title}</p>
          <p className="mt-1 font-mono text-[10px]" style={{ color: CATEGORY_COLORS[hover.event.category] }}>
            {formatYear(hover.event.year)} · {hover.event.category}
          </p>
          <p className="mt-1 line-clamp-2 text-dim">{hover.event.summary}</p>
        </div>
      )}
      {live.current.events.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-faint">No events in view — pan or zoom to explore.</p>
        </div>
      )}
    </div>
  );
}

function eraColor(era: Era): string {
  const map: Record<Era, string> = {
    Ancient: '#d4a24e',
    Medieval: '#c0563e',
    Renaissance: '#38bdf8',
    Industrial: '#a3a3a3',
    Modern: '#4ade80',
    Digital: '#22d3ee',
  };
  return map[era] ?? '#22d3ee';
}
