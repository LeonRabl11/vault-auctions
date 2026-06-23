// Geldbeträge werden intern immer als Integer in Cent geführt (siehe CLAUDE.md).
// Diese reinen Helfer sind die einzige Stelle für Cent<->Euro-Umrechnung und die
// lokalisierte Formatierung — keine I/O, damit gut unit-testbar.

// Euro (Dezimalzahl aus Eingaben) -> Cent. Kaufmännisch gerundet, damit
// z. B. 14,50 € exakt zu 1450 wird und Float-Ungenauigkeiten nicht durchschlagen.
export function toCents(eur: number): number {
  return Math.round(eur * 100);
}

// Cent -> Euro (Dezimalzahl) für Formatter/Eingabe-Defaults.
export function fromCents(cents: number): number {
  return cents / 100;
}

// Cent -> lokalisierter Währungsstring, z. B. de: "1.450,00 €", en: "€1,450.00".
export function formatEur(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(fromCents(cents));
}
