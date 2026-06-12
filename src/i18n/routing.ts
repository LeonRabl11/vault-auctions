import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  // Unterstützte Sprachen
  locales: ["de", "en"],
  // de ist Default und läuft ohne URL-Prefix
  defaultLocale: "de",
  // "as-needed": Default-Locale (de) ohne Prefix, en unter /en
  localePrefix: "as-needed",
});
