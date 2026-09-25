import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CATEGORY_COLORS, formatYear } from '../../utils/date';
import type { HistoricalEvent } from '../../types';
import { Kbd } from '../ui';

interface Props {
  events: HistoricalEvent[];
  index: number;
  playing: boolean;
  speed: number;
  onIndex: (i: number) => void;
  onPlayPause: () => void;
  onSpeed: () => void;
  onExit: () => void;
}

const SPEEDS = [0.5, 1, 2, 4];

/**
 * Journey Through Time — auto-piloted cinematic mode with narration,
 * transport controls and adjustable speed.
 */
export function JourneyOverlay({ events, index, playing, speed, onIndex, onPlayPause, onSpeed, onExit }: Props) {
  const event: HistoricalEvent | undefined = events[index];
  if (!event) return null;
  const color = CATEGORY_COLORS[event.category];
  const progress = ((index + 1) / events.length) * 100;

  return createPortal(
    <>
      {/* narration card */}
      <div className="pointer-events-none fixed inset-x-0 bottom-32 z-40 flex justify-center px-4 sm:bottom-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
            className="pointer-events-auto glass-strong max-w-lg rounded-2xl border border-white/10 p-5 text-center shadow-panel"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color }}>
              {formatYear(event.year)} · {event.category}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-ink">{event.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-dim">{event.summary}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* transport controls */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 bottom-[72px] z-40 flex justify-center px-4"
      >
        <div className="glass-strong flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 shadow-panel">
          <button
            type="button"
            onClick={() => onIndex(Math.max(0, index - 1))}
            aria-label="Previous event"
            className="rounded-lg px-2 py-1.5 text-dim transition hover:text-ink"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={onPlayPause}
            aria-label={playing ? 'Pause journey (Space)' : 'Play journey (Space)'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-glow to-violet-glow text-void shadow-glowCyan transition hover:scale-105 active:scale-95"
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => onIndex(Math.min(events.length - 1, index + 1))}
            aria-label="Next event"
            className="rounded-lg px-2 py-1.5 text-dim transition hover:text-ink"
          >
            ⏭
          </button>

          <div className="mx-2 h-6 w-px bg-white/10" aria-hidden />

          <button
            type="button"
            onClick={onSpeed}
            aria-label={`Journey speed: ${speed}x. Click to change.`}
            className="rounded-lg border border-white/10 px-2.5 py-1 font-mono text-xs text-cyan-glow transition hover:border-cyan-glow/50"
          >
            {speed}×
          </button>

          <span className="ml-1 font-mono text-[10px] text-faint" aria-live="off">
            {index + 1}/{events.length}
          </span>

          <div className="mx-2 h-6 w-px bg-white/10" aria-hidden />

          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-dim transition hover:border-red-400/50 hover:text-red-300"
          >
            Exit journey <Kbd>space</Kbd>
          </button>
        </div>
      </motion.div>

      {/* progress rail */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 h-0.5 bg-white/5" aria-hidden>
        <div
          className="h-full bg-gradient-to-r from-cyan-glow to-violet-glow transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </>,
    document.body,
  );
}

export function nextSpeed(current: number): number {
  const i = SPEEDS.indexOf(current);
  return SPEEDS[(i + 1) % SPEEDS.length] ?? 1;
}
