import type { Category, Era } from '../types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Science: '#38bdf8',
  Technology: '#22d3ee',
  Space: '#8b5cf6',
  Computing: '#e879f9',
  'World History': '#fbbf24',
  Culture: '#f472b6',
  Gaming: '#4ade80',
  Discoveries: '#2dd4bf',
  Inventions: '#fb923c',
  'Major Events': '#f87171',
};

export const ERA_COLORS: Record<Era, string> = {
  Ancient: '#d4a24e',
  Medieval: '#c0563e',
  Renaissance: '#38bdf8',
  Industrial: '#a3a3a3',
  Modern: '#4ade80',
  Digital: '#22d3ee',
};

export const ERA_RANGES: Record<Era, [number, number]> = {
  Ancient: [-3000, 499],
  Medieval: [500, 1399],
  Renaissance: [1400, 1699],
  Industrial: [1700, 1899],
  Modern: [1900, 1979],
  Digital: [1980, 2030],
};

/** Format a (possibly negative = BCE) astronomical year for display. */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year}`;
}

export function formatYearShort(year: number): string {
  return year < 0 ? `${Math.abs(year)}B` : `${year}`;
}

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

export function centuryOf(year: number): number {
  return year < 0
    ? Math.ceil(year / 100) * 100
    : (Math.floor((year - 1) / 100) + 1) * 100;
}

/** Rough clamps so far-out pan/zoom never displays absurd labels. */
export const MIN_YEAR = -3000;
export const MAX_YEAR = 2030;

export function clampYear(y: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));
}

/**
 * Era derivation used by API results that lack era metadata.
 * WWI/WWII (and their direct battles/aftermath) are categorized as Major
 * Events, but remain inside the Modern era: override only clear anachronisms.
 */
export function deriveEra(year: number, _category?: Category): Era {
  for (const era of Object.keys(ERA_RANGES) as Era[]) {
    const [from, to] = ERA_RANGES[era];
    if (year >= from && year <= to) return era;
  }
  return year < 0 ? 'Ancient' : 'Digital';
}

/** Human-readable span between two years. */
export function spanLabel(from: number, to: number): string {
  const fmt = formatYear;
  return `${fmt(from)} — ${fmt(to)}`;
}
