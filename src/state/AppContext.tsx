import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useFavorites, usePrefs, useRecents, useReducedMotion } from '../hooks';

interface AppState {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  recents: string[];
  pushRecent: (id: string) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  prefs: ReturnType<typeof usePrefs>[0];
  updatePrefs: ReturnType<typeof usePrefs>[1];
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  globeOpen: boolean;
  setGlobeOpen: (v: boolean) => void;
  journeyActive: boolean;
  setJourneyActive: (v: boolean) => void;
  networkOffline: boolean;
  setNetworkOffline: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const fav = useFavorites();
  const rec = useRecents();
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const [prefs, updatePrefs] = usePrefs();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [journeyActive, setJourneyActive] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(false);

  useEffect(() => {
    const on = () => setNetworkOffline(!navigator.onLine);
    on();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  const value: AppState = {
    ...fav,
    ...rec,
    reducedMotion,
    setReducedMotion,
    prefs,
    updatePrefs,
    filtersOpen,
    setFiltersOpen,
    globeOpen,
    setGlobeOpen,
    journeyActive,
    setJourneyActive,
    networkOffline,
    setNetworkOffline,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
