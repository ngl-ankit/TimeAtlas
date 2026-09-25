import { useEffect } from 'react';

export interface ShortcutHandlers {
  onSearch: () => void;
  onJourneyToggle: () => void;
  onEscape: () => void;
  onArrow: (direction: -1 | 1) => void;
  onEnter: () => void;
  onFilters: () => void;
  onGlobe: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Global keyboard shortcut system for the explorer. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlers.onEscape();
        return;
      }
      if (isTyping(e.target)) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          handlers.onSearch();
          break;
        case ' ':
          e.preventDefault();
          handlers.onJourneyToggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onArrow(1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onArrow(-1);
          break;
        case 'Enter':
          handlers.onEnter();
          break;
        case 'f':
        case 'F':
          handlers.onFilters();
          break;
        case 'g':
        case 'G':
          handlers.onGlobe();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, enabled]);
}
