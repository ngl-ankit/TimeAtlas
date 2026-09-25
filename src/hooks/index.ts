import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, type Prefs } from '../utils/storage';

/** Global reduced-motion preference (user setting OR system setting). */
export function useReducedMotion(): [boolean, (v: boolean) => void] {
  const [userPref, setUserPref] = useState<boolean>(() => storage.prefs.reducedMotion);
  const [system, setSystem] = useState<boolean>(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const fn = (e: MediaQueryListEvent) => setSystem(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const set = useCallback((v: boolean) => {
    setUserPref(v);
    storage.prefs = { ...storage.prefs, reducedMotion: v };
  }, []);

  const active = userPref || system;
  useEffect(() => {
    document.documentElement.dataset.motion = active ? 'off' : 'on';
  }, [active]);

  return [active, set];
}

/** Debounce any fast-changing value. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Persisted string-list collection (favorites / recents). */
function usePersistedList(key: 'favorites' | 'recents') {
  const [list, setList] = useState<string[]>(() => storage[key]);

  const mutate = useCallback(
    (fn: (prev: string[]) => string[]) => {
      setList((prev) => {
        const next = fn(prev);
        if (key === 'favorites') storage.favorites = next;
        else storage.recents = next;
        return next;
      });
    },
    [key],
  );

  return [list, mutate] as const;
}

export function useFavorites() {
  const [favorites, mutate] = usePersistedList('favorites');
  return {
    favorites,
    isFavorite: (id: string) => favorites.includes(id),
    toggleFavorite: (id: string) =>
      mutate((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
  };
}

export function useRecents() {
  const [recents, mutate] = usePersistedList('recents');
  return {
    recents,
    pushRecent: (id: string) =>
      mutate((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12)),
  };
}

export function usePrefs(): [Prefs, (p: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(() => storage.prefs);
  const update = useCallback((p: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      storage.prefs = next;
      return next;
    });
  }, []);
  return [prefs, update];
}

/** Interval that self-clears and respects unmount. */
export function useInterval(callback: () => void, delay: number | null): void {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => ref.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/** Boolean state with timeout-based auto-reset (toasts, flashes). */
export function useFlash(duration = 1600): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const trigger = useCallback(() => {
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), duration);
  }, [duration]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [on, trigger];
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = matchMedia(query);
    const fn = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
