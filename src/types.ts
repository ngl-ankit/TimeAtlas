/** Core domain models for TimeAtlas. */

export const ERAS = [
  'Ancient',
  'Medieval',
  'Renaissance',
  'Industrial',
  'Modern',
  'Digital',
] as const;
export type Era = (typeof ERAS)[number];

export const CATEGORIES = [
  'Science',
  'Technology',
  'Space',
  'Computing',
  'World History',
  'Culture',
  'Gaming',
  'Discoveries',
  'Inventions',
  'Major Events',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** A historical event. `year` uses astronomical numbering: negative = BCE. */
export interface HistoricalEvent {
  id: string;
  title: string;
  year: number;
  category: Category;
  era: Era;
  summary: string;
  /** Wikipedia article title used for summaries / links. */
  wiki: string;
  /** Wikidata Q-id when known, e.g. 'Q12466'. */
  qid?: string;
  lat?: number;
  lon?: number;
}

export interface EventDetail extends HistoricalEvent {
  description: string;
  image?: string | null;
  wikiUrl: string;
  relatedEvents: string[];
  relatedEntities: { label: string; qid?: string; wiki?: string }[];
}

export interface EraInfo {
  name: Era;
  range: [number, number];
  color: string;
  blurb: string;
  icon: string;
}

export interface YearRange {
  from: number;
  to: number;
}
