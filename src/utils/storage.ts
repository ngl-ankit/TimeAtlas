/** localStorage-backed persistence for favorites, recents, and preferences. */

const PREFIX = 'timeatlas:';

export const KEYS = {
  favorites: `${PREFIX}favorites`,
  recents: `${PREFIX}recents`,
  prefs: `${PREFIX}prefs`,
  offline: `${PREFIX}offline-flag`,
} as const;

export interface Prefs {
  reducedMotion: boolean;
  sound: boolean;
  journeySpeed: number;
  showGlobe: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  reducedMotion: false,
  sound: false,
  journeySpeed: 1,
  showGlobe: false,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — non-fatal
  }
}

export const storage = {
  get favorites(): string[] {
    return read<string[]>(KEYS.favorites, []);
  },
  set favorites(ids: string[]) {
    write(KEYS.favorites, ids);
  },
  get recents(): string[] {
    return read<string[]>(KEYS.recents, []);
  },
  set recents(ids: string[]) {
    write(KEYS.recents, ids);
  },
  get prefs(): Prefs {
    return { ...DEFAULT_PREFS, ...read<Partial<Prefs>>(KEYS.prefs, {}) };
  },
  set prefs(p: Prefs) {
    write(KEYS.prefs, p);
  },
};
