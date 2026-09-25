/** Wikidata SPARQL layer: search + event enrichment. */
import type { Category, HistoricalEvent } from '../types';
import { apiGet, sparqlQuery, wikiSummary, wikiPageUrl } from './client';
import { FALLBACK_EVENTS } from '../data/fallback';
import { deriveEra } from '../utils/date';

/* ─────────────────── search ─────────────────── */

export interface SearchHit {
  id: string;
  label: string;
  description: string;
  qid: string;
  year?: number;
  category?: Category;
  kind: 'local' | 'entity';
  wiki?: string;
}

interface WikidataSearchResponse {
  search: { id: string; label: string; description?: string }[];
}

async function wikidataEntitySearch(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*` +
    `&language=en&uselang=en&limit=8&search=${encodeURIComponent(query)}`;
  const data = await apiGet<WikidataSearchResponse>(
    `wd-search:${query.toLowerCase()}`,
    url,
    signal,
  );
  if (!data?.search) return [];
  return data.search.map((s) => ({
    id: `wd-${s.id}`,
    label: s.label,
    description: s.description ?? '',
    qid: s.id,
    kind: 'entity' as const,
  }));
}

/** Hybrid search: instant local results + Wikidata entities. */
export async function search(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const lower = q.toLowerCase();
  const local: SearchHit[] = FALLBACK_EVENTS.filter(
    (e) =>
      e.title.toLowerCase().includes(lower) ||
      e.summary.toLowerCase().includes(lower) ||
      e.category.toLowerCase().includes(lower),
  )
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      label: e.title,
      description: e.summary.slice(0, 120),
      qid: e.qid ?? '',
      year: e.year,
      category: e.category,
      kind: 'local' as const,
      wiki: e.wiki,
    }));

  try {
    const remote = await wikidataEntitySearch(q, signal);
    const seen = new Set(local.map((l) => l.qid));
    return [...local, ...remote.filter((r) => !seen.has(r.qid))];
  } catch {
    return local;
  }
}

/* ─────────────── timeline range loading ─────────────── */

interface SparqlEventRow {
  item?: { value: string };
  itemLabel?: { value: string };
  label?: { value: string };
  date?: { value: string };
  desc?: { value: string };
  coord?: { value: string };
}

const OCCURRENCE_QUERY = `
SELECT ?item ?itemLabel ?date ?desc ?coord WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1190554 .
  ?item wdt:P582 ?date .
  FILTER(?date >= "%FROM%"^^xsd:dateTime && ?date < "%TO%"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc)="en") }
}
LIMIT 120
`;

function wikidataId(item: string): string {
  return item.split('/').pop() ?? '';
}

function wikidataYear(dateStr: string): number {
  const y = parseInt(dateStr.slice(0, dateStr.startsWith('-') ? 5 : 4), 10);
  return Number.isFinite(y) ? y : 0;
}

function parseCoord(wkt?: string): [number | undefined, number | undefined] {
  if (!wkt) return [undefined, undefined];
  const m = /Point\((-?[\d.]+) (-?[\d.]+)\)/.exec(wkt);
  if (!m) return [undefined, undefined];
  return [parseFloat(m[2] as string), parseFloat(m[1] as string)];
}

/** Load notable events for a year range. Falls back silently to local data. */
export async function loadEventsForRange(
  from: number,
  to: number,
  signal?: AbortSignal,
): Promise<HistoricalEvent[]> {
  try {
    const sparql = OCCURRENCE_QUERY.replace('%FROM%', `${from}-01-01`).replace(
      '%TO%',
      `${to + 1}-01-01`,
    );
    const rows = (await sparqlQuery(sparql, signal)) as unknown as SparqlEventRow[];
    const seen = new Set<string>();
    const events: HistoricalEvent[] = [];
    for (const row of rows) {
      if (!row.item?.value) continue;
      const qid = wikidataId(row.item.value);
      if (!qid || seen.has(qid)) continue;
      seen.add(qid);
      if (!row.date?.value) continue;
      const year = wikidataYear(row.date.value);
      if (year < from || year > to) continue;
      const [lat, lon] = parseCoord(row.coord?.value);
      const title = row.itemLabel?.value ?? qid;
      events.push({
        id: `wd-${qid}`,
        title,
        year,
        category: 'Major Events',
        era: deriveEra(year, 'Major Events'),
        summary: row.desc?.value ?? '',
        wiki: title,
        qid,
        lat,
        lon,
      });
    }
    if (events.length === 0) throw new Error('empty');
    return events.sort((a, b) => a.year - b.year);
  } catch (err) {
    if (signal?.aborted && err instanceof Error && err.name === 'AbortError') throw err;
    return FALLBACK_EVENTS.filter((e) => e.year >= from && e.year <= to);
  }
}

/* ─────────────── detail enrichment ─────────────── */

export async function enrichEvent(event: HistoricalEvent, signal?: AbortSignal) {
  const title = event.wiki || event.title;
  const summary = title ? await wikiSummary(title, signal) : null;
  return {
    description:
      summary?.extract && summary.extract.length > event.summary.length
        ? summary.extract
        : event.summary,
    image: summary?.thumbnail?.source ?? null,
    wikiUrl: wikiPageUrl(title || 'Wikipedia'),
  };
}

/** Resolve a Wikidata entity (from search) into a timeline-ready event. */
export async function entityToEvent(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoricalEvent | null> {
  try {
    const rows = (await sparqlQuery(
      `SELECT ?label ?desc ?date ?coord WHERE {
  OPTIONAL { wd:${qid} rdfs:label ?label. FILTER(LANG(?label)="en") }
  OPTIONAL { wd:${qid} schema:description ?desc. FILTER(LANG(?desc)="en") }
  OPTIONAL { wd:${qid} wdt:P582 ?date. }
  OPTIONAL { wd:${qid} wdt:P625 ?coord. }
}`,
      signal,
    )) as unknown as SparqlEventRow[];
    const row = rows[0];
    if (!row?.date?.value) return null;
    const year = wikidataYear(row.date.value);
    if (!year) return null;
    const [lat, lon] = parseCoord(row.coord?.value);
    const label = row.label?.value ?? row.desc?.value ?? qid;
    return {
      id: `wd-${qid}`,
      title: label,
      year,
      category: 'Major Events',
      era: deriveEra(year, 'Major Events'),
      summary: row.desc?.value ?? '',
      wiki: label,
      qid,
      lat,
      lon,
    };
  } catch {
    return null;
  }
}
