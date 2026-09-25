import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { enrichEvent } from '../../api/wikidata';
import { CATEGORY_COLORS, ERA_COLORS, formatYear } from '../../utils/date';
import type { HistoricalEvent } from '../../types';
import { useApp } from '../../state/AppContext';
import { useIsMobile } from '../../hooks';
import { Badge, Skeleton } from '../ui';

interface Props {
  event: HistoricalEvent | null;
  onClose: () => void;
  onSelectRelated: (e: HistoricalEvent) => void;
  onExploreRelated: (e: HistoricalEvent) => void;
  allEvents: HistoricalEvent[];
}

interface Enriched {
  description: string;
  image: string | null;
  wikiUrl: string;
}

/**
 * Event details: floating side panel on desktop, swipeable bottom sheet
 * on mobile. Enriches with Wikipedia summary + image on open.
 */
export function EventDetailPanel({ event, onClose, onSelectRelated, onExploreRelated, allEvents }: Props) {
  const app = useApp();
  const isMobile = useIsMobile();
  const [enriched, setEnriched] = useState<Enriched | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!event) {
      setEnriched(null);
      return;
    }
    const ctrl = new AbortController();
    setEnriched(null);
    setImgFailed(false);
    enrichEvent(event, ctrl.signal)
      .then((r) => {
        if (!ctrl.signal.aborted) setEnriched(r);
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setEnriched({ description: event.summary, image: null, wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(event.wiki || event.title)}` });
      });
    return () => ctrl.abort();
  }, [event]);

  const related = useMemo(() => {
    if (!event) return [];
    return allEvents
      .filter((e) => e.id !== event.id && e.category === event.category && Math.abs(e.year - event.year) <= 90)
      .slice(0, 6);
  }, [event, allEvents]);

  if (!event) return null;
  const color = CATEGORY_COLORS[event.category];
  const fav = app.isFavorite(event.id);

  const content = (
    <div className="flex h-full flex-col">
      {enriched?.image && !imgFailed && (
        <div className="relative h-40 shrink-0 overflow-hidden sm:h-48">
          <img
            src={enriched.image}
            alt={event.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-panel via-panel/30 to-transparent" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={color}>{event.category}</Badge>
            <Badge color={ERA_COLORS[event.era]}>{event.era} era</Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details (Escape)"
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-dim transition hover:border-white/25 hover:text-ink"
          >
            Esc ✕
          </button>
        </div>

        <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-ink">{event.title}</h2>
        <p className="mt-1 font-mono text-sm" style={{ color }}>
          {formatYear(event.year)}
          {event.lat !== undefined && event.lon !== undefined && (
            <span className="ml-3 text-faint">
              📍 {event.lat.toFixed(1)}°, {event.lon.toFixed(1)}°
            </span>
          )}
        </p>

        <div className="mt-4">
          {!enriched ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-dim">{enriched.description || event.summary}</p>
          )}
        </div>

        {related.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">Related events</p>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRelated(r)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-dim transition hover:border-cyan-glow/50 hover:text-cyan-glow"
                >
                  {formatYear(r.year)} · {r.title.length > 28 ? r.title.slice(0, 27) + '…' : r.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onExploreRelated(event)}
            className="flex-1 rounded-lg bg-gradient-to-r from-cyan-glow to-violet-glow px-3 py-2.5 font-display text-xs font-semibold text-void transition hover:brightness-110 active:scale-95"
          >
            Explore related events
          </button>
          <a
            href={enriched?.wikiUrl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(event.wiki || event.title)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 text-center font-display text-xs font-medium text-ink transition hover:border-cyan-glow/60 hover:text-cyan-glow"
          >
            Open on Wikipedia ↗
          </a>
          <button
            type="button"
            onClick={() => app.toggleFavorite(event.id)}
            aria-pressed={fav}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            className={`rounded-lg border px-3 py-2.5 text-sm transition ${
              fav ? 'border-amber-glow/60 text-amber-glow' : 'border-white/15 text-dim hover:text-ink'
            }`}
          >
            {fav ? '★' : '☆'}
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[9px] text-faint">
          Description from Wikipedia (CC BY-SA) · Structured data from Wikidata (CC0)
        </p>
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {event && (
        <>
          {!isMobile && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-void/40"
              onClick={onClose}
            />
          )}
          <motion.aside
            key={event.id}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.4, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            initial={isMobile ? { y: '100%' } : { x: 60, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            role="dialog"
            aria-modal="false"
            aria-label={`Event details: ${event.title}`}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-hidden rounded-t-2xl border-t border-white/10 bg-panel/95 shadow-panel backdrop-blur-xl'
                : 'fixed bottom-24 right-4 top-[76px] z-40 w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-panel/90 shadow-panel backdrop-blur-xl'
            }
          >
            {isMobile && (
              <div aria-hidden className="flex justify-center pb-1 pt-2">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
            )}
            <div className={isMobile ? 'h-[calc(78vh-16px)]' : 'h-full'}>{content}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
