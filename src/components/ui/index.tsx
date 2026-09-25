import { type ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function CategoryDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-dim">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-dim">
      {children}
    </kbd>
  );
}

export function IconButton({
  label,
  onClick,
  active,
  children,
  shortcut,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
        active
          ? 'border-cyan-glow/60 bg-cyan-glow/10 text-cyan-glow shadow-glowCyan'
          : 'border-white/10 bg-panel/60 text-dim hover:border-white/25 hover:text-ink'
      }`}
    >
      {children}
      {shortcut && (
        <span className="pointer-events-none absolute -bottom-1 -right-1 hidden rounded bg-abyss px-1 font-mono text-[9px] text-faint group-hover:block">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: color ? `${color}55` : 'rgba(255,255,255,0.1)',
        color: color ?? 'var(--tw-prose-invert, #9aa3b8)',
        background: color ? `${color}14` : 'rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </span>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="status"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-amber-glow/20 bg-amber-glow/5 p-6 text-center"
    >
      <span aria-hidden className="text-2xl">📡</span>
      <p className="text-sm text-dim">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-cyan-glow/40 px-4 py-1.5 text-sm text-cyan-glow transition hover:bg-cyan-glow/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}
