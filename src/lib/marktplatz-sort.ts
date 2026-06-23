// Sortier-Optionen für den Marktplatz — Single Source of Truth (wie lib/categories).
// URL-Werte sind sprachneutral; die Labels kommen aus i18n (Namespace Auctions.sort).
export const SORT_OPTIONS = [
  "newest", // createdAt absteigend (Standard)
  "ending-soon", // endsAt aufsteigend, reine Festpreis-Anzeigen ans Ende
  "price-asc", // effektiver Preis aufsteigend
  "price-desc", // effektiver Preis absteigend
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortKey = "newest";

export function isSortKey(value: string | null | undefined): value is SortKey {
  return value != null && (SORT_OPTIONS as readonly string[]).includes(value);
}
