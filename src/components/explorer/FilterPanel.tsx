import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CATEGORIES, type Category } from '../../types';
import { CATEGORY_COLORS } from '../../utils/date';
import type { Filters } from '../../hooks/useTimelineData';
import { useIsMobile } from '../../hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  total: number;
  shown: number;
}

const PRESETS: { label: string; from: number; to: number }[] = [
  { label: 'All time', from: -3000, to: 2030 },
  { label: 'Ancient', from: -3000, to: 499 },
  { label: 'Medieval', from: 500, to: 1399 },
  { label: 'Renaissance', from: 1400, to: 1699 },
  { label: 'Industrial', from: 1700, to: 1899 },
  { label: 'Modern', from: 1900, to: 1979 },
  { label: 'Digital', from: 1980, to: 2030 },
];

/** Category + custom-date-range filter panel. Live-applies, no submit. */
export function FilterPanel({ open, onClose, filters, onChange, total, shown }: Props) {
  const isMobile = useIsMobile();

  const toggleCategory = (c: Category) => {
    const next = new Set(filters.categories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({ ...filters, categories: next });
  };

  const clearAll = () => onChange({ categories: new Set(), from: null, to: null });
  const hasFilters = filters.categories.size > 0 || filters.from !== null || filters.to !== null;

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">Filters</h2>
        <button type="button" onClick={onClose} aria-label="Close filters" className="rounded p-1 text-dim hover:text-ink">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">Categories</p>
        <div className="space-y-0.5">
          {CATEGORIES.map((c) => {
            const checked = filters.categories.has(c);
            return (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(c)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-cyan-glow"
                  aria-label={`Filter by ${c}`}
                />
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: CATEGORY_COLORS[c], boxShadow: `0 0 8px ${CATEGORY_COLORS[c]}` }}
                />
                <span className={`text-sm ${checked ? 'text-ink' : 'text-dim'}`}>{c}</span>
              </label>
            );
          })}
        </div>

        <p className="mb-2 mt-6 font-mono text-[10px] uppercase tracking-widest text-faint">Date range</p>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[10px] text-faint">From (negative = BCE)</span>
            <input
              type="number"
              value={filters.from ?? ''}
              placeholder="-3000"
              onChange={(e) => onChange({ ...filters, from: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-abyss px-3 py-2 font-mono text-sm text-ink outline-none focus:border-cyan-glow/60"
            />
          </label>
          <span aria-hidden className="mt-4 text-faint">—</span>
          <label className="flex-1">
            <span className="mb-1 block text-[10px] text-faint">To</span>
            <input
              type="number"
              value={filters.to ?? ''}
              placeholder="2030"
              onChange={(e) => onChange({ ...filters, to: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-abyss px-3 py-2 font-mono text-sm text-ink outline-none focus:border-cyan-glow/60"
            />
          </label>
        </div>

        <p className="mb-2 mt-6 font-mono text-[10px] uppercase tracking-widest text-faint">Era presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ ...filters, from: p.from, to: p.to })}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-dim transition hover:border-cyan-glow/50 hover:text-cyan-glow"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.07] px-4 py-3">
        <p className="mb-2 font-mono text-[11px] text-cyan-glow">
          {shown} of {total} events
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="w-full rounded-lg border border-white/10 py-1.5 text-xs text-dim transition hover:border-white/25 hover:text-ink"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-void/50 backdrop-blur-[2px] lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: 40, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="complementary"
            aria-label="Timeline filters"
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl border-t border-white/10 bg-panel/95 backdrop-blur-xl'
                : 'fixed right-4 top-[76px] z-40 w-72 overflow-hidden rounded-2xl border border-white/10 bg-panel/90 shadow-panel backdrop-blur-xl'
            }
          >
            {body}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
