import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ParticleField } from '../components/background/ParticleField';
import { ERAS, type EraInfo } from '../types';
import { ERA_COLORS, ERA_RANGES, formatYear } from '../utils/date';
import { Kbd } from '../components/ui';

const ERA_META: Record<string, string> = {
  Ancient: 'Pyramids, philosophy, empires of the classical world',
  Medieval: 'Cathedrals, caliphates, mongols and plagues',
  Renaissance: 'Rebirth of art, science and exploration',
  Industrial: 'Steam, steel and the machine age',
  Modern: 'World wars, flight, relativity and radio',
  Digital: 'Computers, networks and the space renaissance',
};

const ERA_ICONS: Record<string, string> = {
  Ancient: '🏛',
  Medieval: '🏰',
  Renaissance: '🎨',
  Industrial: '⚙️',
  Modern: '🚀',
  Digital: '💾',
};

function useEraInfos(): EraInfo[] {
  return ERAS.map((name) => ({
    name,
    range: ERA_RANGES[name],
    color: ERA_COLORS[name],
    blurb: ERA_META[name] ?? '',
    icon: ERA_ICONS[name] ?? '◆',
  }));
}

/** Mini animated strip of glowing nodes — a teaser of the explorer timeline. */
function TimelinePreview() {
  const marks = [
    { label: '2560 BCE', x: 6, color: ERA_COLORS.Ancient },
    { label: '776 BCE', x: 14, color: ERA_COLORS.Ancient },
    { label: '476', x: 24, color: ERA_COLORS.Ancient },
    { label: '1066', x: 34, color: ERA_COLORS.Medieval },
    { label: '1453', x: 46, color: ERA_COLORS.Renaissance },
    { label: '1687', x: 56, color: ERA_COLORS.Renaissance },
    { label: '1789', x: 66, color: ERA_COLORS.Industrial },
    { label: '1903', x: 76, color: ERA_COLORS.Modern },
    { label: '1969', x: 86, color: ERA_COLORS.Modern },
    { label: '2020', x: 95, color: ERA_COLORS.Digital },
  ];
  return (
    <div aria-hidden className="relative mt-14 h-24 w-full max-w-3xl">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-glow/50 to-transparent" />
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {marks.map((m, i) => (
        <motion.div
          key={m.label}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${m.x}%` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.14, type: 'spring', stiffness: 200, damping: 16 }}
        >
          <motion.div
            className="rounded-full"
            style={{
              width: 10,
              height: 10,
              background: m.color,
              boxShadow: `0 0 12px ${m.color}, 0 0 30px ${m.color}66`,
            }}
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.3 }}
          />
          <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-faint">
            {m.label}
          </span>
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 10, height: 10, background: m.color }}
            animate={{ scale: [1, 3], opacity: [0.7, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function EraCard({ era, index }: { era: EraInfo; index: number }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => {
        window.location.href = `/explore?era=${encodeURIComponent(era.name)}`;
      }}
      aria-label={`Explore the ${era.name} era, ${formatYear(era.range[0])} to ${formatYear(era.range[1])}`}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/60 p-6 text-left backdrop-blur-sm transition-colors hover:border-white/20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-50"
        style={{ background: era.color }}
      />
      <div className="flex items-baseline justify-between">
        <span className="text-3xl" aria-hidden>
          {era.icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: era.color }}>
          {formatYear(era.range[0])} → {formatYear(era.range[1])}
        </span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-ink">{era.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-dim">{era.blurb}</p>
      <span
        aria-hidden
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: era.color }}
      >
        Enter era →
      </span>
    </motion.button>
  );
}

const FEATURES = [
  {
    icon: '⌖',
    title: 'Cinematic Timeline',
    text: 'Zoom from five millennia to a single decade. Drag through time on a glowing, density-mapped rail.',
  },
  {
    icon: '🎥',
    title: 'Journey Mode',
    text: 'An auto-piloted voyage through the events that defined civilization — with narration and cinematic pacing.',
  },
  {
    icon: '🌐',
    title: 'World View',
    text: 'Rotate a live globe and see where history happened. Every marker is a doorway into an event.',
  },
  {
    icon: '🔎',
    title: 'Deep Search',
    text: 'Search people, events, places and topics across the Wikidata knowledge graph — instantly, offline-aware.',
  },
] as const;

export function LandingPage() {
  const eras = useEraInfos();

  return (
    <main className="relative min-h-screen overflow-x-clip bg-void">
      {/* atmospheric background layers */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-aurora" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <ParticleField />

      {/* ─── hero ─── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="glass rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-glow"
        >
          5,000 years · one rail of time
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 font-display text-6xl font-bold tracking-tight text-ink sm:text-8xl"
        >
          Time<span className="text-gradient">Atlas</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.8 }}
          className="mt-5 max-w-xl text-balance text-base text-dim sm:text-lg"
        >
          History is not a list of dates. It is a navigable space.
          Explore the events that built our world on a cinematic, living timeline —
          powered by Wikidata &amp; Wikipedia.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/explore"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-glow to-violet-glow px-7 py-3.5 font-display text-sm font-semibold text-void shadow-glowCyan transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-500 group-hover:translate-x-full"
            />
            Explore History
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#eras"
            className="rounded-xl border border-white/15 px-6 py-3.5 font-display text-sm font-medium text-dim transition hover:border-white/30 hover:text-ink"
          >
            Browse eras
          </a>
        </motion.div>

        <TimelinePreview />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.4] }}
          transition={{ delay: 2.4, duration: 2 }}
          className="absolute bottom-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-faint"
        >
          <Kbd>/</Kbd> search <Kbd>space</Kbd> journey <Kbd>G</Kbd> globe
        </motion.p>
      </section>

      {/* ─── eras ─── */}
      <section id="eras" className="relative mx-auto max-w-6xl scroll-mt-10 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-glow">Six worlds</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-ink">Choose your era</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-dim">
            Each era is a fully rendered world on the timeline. Jump straight in — the explorer will fly you there.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eras.map((era, i) => (
            <EraCard key={era.name} era={era} index={i} />
          ))}
        </div>
      </section>

      {/* ─── features ─── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-2xl border border-white/[0.06] bg-panel/40 p-6"
            >
              <span aria-hidden className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── footer ─── */}
      <footer className="relative border-t border-white/[0.06] px-6 py-10 text-center">
        <p className="text-xs text-faint">
          Data from{' '}
          <a
            className="text-cyan-glow/80 underline-offset-4 hover:underline"
            href="https://www.wikidata.org"
            target="_blank"
            rel="noreferrer"
          >
            Wikidata
          </a>{' '}
          and{' '}
          <a
            className="text-cyan-glow/80 underline-offset-4 hover:underline"
            href="https://en.wikipedia.org"
            target="_blank"
            rel="noreferrer"
          >
            Wikipedia
          </a>{' '}
          (CC0 / CC BY-SA). TimeAtlas is an open-source visual explorer and is not affiliated with the Wikimedia Foundation.
        </p>
        <p className="mt-2 font-mono text-[10px] text-faint/60">MIT · built for the curious</p>
      </footer>
    </main>
  );
}
