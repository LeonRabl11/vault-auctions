import {describe, expect, it} from "vitest";
import {formatEur, fromCents, toCents} from "./money";

describe("toCents", () => {
  it("wandelt typische Beträge in Cent um", () => {
    expect(toCents(14.5)).toBe(1450);
    expect(toCents(1)).toBe(100);
    expect(toCents(0.99)).toBe(99);
    expect(toCents(1234.56)).toBe(123456);
  });

  it("behandelt 0", () => {
    expect(toCents(0)).toBe(0);
  });

  it("rundet kaufmännisch (halbe Cent auf)", () => {
    // 0.005 € = 0,5 Cent -> 1 Cent (Math.round rundet .5 auf)
    expect(toCents(0.005)).toBe(1);
    expect(toCents(0.004)).toBe(0);
    expect(toCents(2.675)).toBe(268);
  });

  it("fängt Float-Ungenauigkeiten ab", () => {
    // 19,99 * 100 ist in Float 1998.9999... -> gerundet 1999
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(35.35)).toBe(3535);
  });
});

describe("fromCents", () => {
  it("wandelt Cent zurück in Euro", () => {
    expect(fromCents(1450)).toBe(14.5);
    expect(fromCents(0)).toBe(0);
    expect(fromCents(99)).toBe(0.99);
  });

  it("ist invers zu toCents", () => {
    for (const eur of [0, 1, 14.5, 19.99, 1234.56]) {
      expect(fromCents(toCents(eur))).toBeCloseTo(eur, 2);
    }
  });
});

describe("formatEur", () => {
  it("formatiert auf Deutsch (de)", () => {
    // Non-breaking space vor dem €-Zeichen -> Whitespace normalisieren.
    expect(formatEur(145000, "de").replace(/\s/g, " ")).toBe("1.450,00 €");
    expect(formatEur(99, "de").replace(/\s/g, " ")).toBe("0,99 €");
    expect(formatEur(0, "de").replace(/\s/g, " ")).toBe("0,00 €");
  });

  it("formatiert auf Englisch (en)", () => {
    expect(formatEur(145000, "en").replace(/\s/g, " ")).toBe("€1,450.00");
    expect(formatEur(0, "en").replace(/\s/g, " ")).toBe("€0.00");
  });

  it("zeigt immer zwei Nachkommastellen", () => {
    expect(formatEur(100, "de").replace(/\s/g, " ")).toBe("1,00 €");
    expect(formatEur(150000, "de").replace(/\s/g, " ")).toBe("1.500,00 €");
  });
});
