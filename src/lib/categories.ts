import {
  BookOpen,
  Car,
  Coins,
  Gem,
  type LucideIcon,
  Package,
  Palette,
  Shirt,
  Smartphone,
  Sofa,
  Sprout,
} from "lucide-react";

// Single Source of Truth für Kategorien. Gespeichert wird der `slug`; das Label
// kommt aus i18n (Namespace "Categories", Key = slug), das Icon aus lucide-react.
// Reihenfolge ist die Anzeige-Reihenfolge (Formular + Kategorie-Leiste).

export const CATEGORY_SLUGS = [
  "autos_motorraeder",
  "muenzen_briefmarken",
  "schmuck",
  "einrichtung",
  "kunst",
  "mode",
  "elektronik",
  "buecher_geschichte",
  "pflanzen",
  "sonstiges",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

// Default + Backfill für bestehende Zeilen (siehe Schema/Migration)
export const DEFAULT_CATEGORY: CategorySlug = "sonstiges";

export type Category = {
  slug: CategorySlug;
  icon: LucideIcon;
  labelKey: string; // i18n-Key im Namespace "Categories"
};

export const CATEGORIES: readonly Category[] = [
  {slug: "autos_motorraeder", icon: Car, labelKey: "autos_motorraeder"},
  {slug: "muenzen_briefmarken", icon: Coins, labelKey: "muenzen_briefmarken"},
  {slug: "schmuck", icon: Gem, labelKey: "schmuck"},
  {slug: "einrichtung", icon: Sofa, labelKey: "einrichtung"},
  {slug: "kunst", icon: Palette, labelKey: "kunst"},
  {slug: "mode", icon: Shirt, labelKey: "mode"},
  {slug: "elektronik", icon: Smartphone, labelKey: "elektronik"},
  {slug: "buecher_geschichte", icon: BookOpen, labelKey: "buecher_geschichte"},
  {slug: "pflanzen", icon: Sprout, labelKey: "pflanzen"},
  {slug: "sonstiges", icon: Package, labelKey: "sonstiges"},
];

// Typ-Guard, um einen rohen Query-/Form-Wert gegen die Slug-Liste zu prüfen.
export function isCategorySlug(value: unknown): value is CategorySlug {
  return (
    typeof value === "string" &&
    (CATEGORY_SLUGS as readonly string[]).includes(value)
  );
}

// Fallback-Icon für unbekannte/fehlende Kategorie (Platzhalter ohne Bild).
export const FALLBACK_CATEGORY_ICON = Package;
