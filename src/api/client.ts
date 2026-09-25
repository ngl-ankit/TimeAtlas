/**
 * Centralized API client for Wikidata SPARQL + Wikipedia REST.
 *
 * Features: in-memory + localStorage caching with TTL, request
 * deduplication by key, controlled concurrency, AbortController timeouts,
 * one silent retry for idempotent GETs on network hiccup, graceful
 * degradation (empty results — never throws to UI).
 */
const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql?format=json&origin=*';
const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1';
const UA = 'TimeAtlas/1.0 (educational timeline explorer; no backend)';

const MEMORY_TTL = 30 * 60 * 1000; // 30 min
const DISK_TTL = 6 * 60 * 60 * 1000; // 6 h
const MAX_DISK_ENTRIES = 150;
const CONCURRENCY = 3;
const TIMEOUT_MS = 9000;

/* ───────────────────────── cache ───────────────────────── */

interface CacheEntry<T> {
  t: number;
  v: T;
}

const memory = new Map<string, CacheEntry<unknown>>();

function memGet<T>(key: string): T | undefined {
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.t < MEMORY_TTL) return hit.v;
  if (hit) memory.delete(key);
  return undefined;
}

function memSet<T>(key: string, value: T): void {
  memory.set(key, { t: Date.now(), v: value });
}

function diskKey(key: string): string {
  return `timeatlas:cache:${key}`;
}

function diskGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(diskKey(key));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.t > DISK_TTL) {
      localStorage.removeItem(diskKey(key));
      return undefined;
    }
    return entry.v;
  } catch {
    return undefined;
  }
}

function diskSet<T>(key: string, value: T): void {
  try {
    // occasional pruning to respect storage quota
    if (Math.random() < 0.05) {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('timeatlas:cache:')) keys.push(k);
      }
      if (keys.length > MAX_DISK_ENTRIES) {
        keys.slice(0, keys.length - MAX_DISK_ENTRIES).forEach((k) => localStorage.removeItem(k));
      }
    }
    localStorage.setItem(diskKey(key), JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // quota exceeded — ignore
  }
}

export function cacheGet<T>(key: string): T | undefined {
  return memGet<T>(key) ?? diskGet<T>(key);
}

export function cacheSet<T>(key: string, value: T, persist = true): void {
  memSet(key, value);
  if (persist) diskSet(key, value);
}

/* ─────────────────────── deduplication ─────────────────────── */

const inflight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = factory().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* ───────────────────── concurrency queue ───────────────────── */

let active = 0;
const queue: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (active < CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  active++;
}

function release(): void {
  active--;
  const next = queue.shift();
  if (next) next();
}

/* ─────────────────────── fetch core ─────────────────────── */

export class ApiUnavailableError extends Error {
  constructor(message = 'External data source unavailable') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), TIMEOUT_MS);
  const onOuterAbort = () => timer.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Api-User-Agent': UA },
      signal: timer.signal,
    });
    if (res.status === 429 || res.status >= 500) throw new ApiUnavailableError();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/** Fetch with caching + dedupe + one silent retry on transient failure. */
export async function apiGet<T>(key: string, url: string, signal?: AbortSignal, persist = true): Promise<T> {
  return dedupe(key, async () => {
    const cached = cacheGet<T>(key);
    if (cached !== undefined) return cached;

    await acquire();
    try {
      try {
        const data = await fetchJson<T>(url, signal);
        cacheSet(key, data, persist);
        return data;
      } catch (err) {
        if (signal?.aborted) throw err;
        // single retry for transient failures
        await new Promise((r) => setTimeout(r, 700));
        const data = await fetchJson<T>(url, signal);
        cacheSet(key, data, persist);
        return data;
      }
    } finally {
      release();
    }
  });
}

/* ───────────────────── SPARQL helpers ───────────────────── */

interface SparqlResponse {
  results: {
    bindings: Record<string, { value: string } | undefined>[];
  };
}

export async function sparqlQuery(sparql: string, signal?: AbortSignal): Promise<SparqlResponse['results']['bindings']> {
  const key = `sparql:${hash(sparql)}`;
  const url = `${WIKIDATA_ENDPOINT}&query=${encodeURIComponent(sparql)}`;
  const data = await apiGet<SparqlResponse>(key, url, signal);
  return data?.results?.bindings ?? [];
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ─────────────────── Wikipedia helpers ─────────────────── */

export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

export async function wikiSummary(title: string, signal?: AbortSignal): Promise<WikiSummary | null> {
  const key = `wiki:sum:${title}`;
  const url = `${WIKIPEDIA_API}/page/summary/${encodeURIComponent(title)}?redirect=true`;
  try {
    return (await apiGet<WikiSummary | null>(key, url, signal)) ?? null;
  } catch {
    return null;
  }
}

export function wikiPageUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/** Availability probe with TTL — flips the app into fallback mode when Wikidata is down. */
export async function probeWikidata(signal?: AbortSignal): Promise<boolean> {
  try {
    await sparqlQuery('SELECT ?x WHERE { ?x wdt:P31 wd:Q5 } LIMIT 1', signal);
    return true;
  } catch {
    return false;
  }
}
