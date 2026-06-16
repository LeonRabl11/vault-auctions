import {routing} from "@/i18n/routing";

// Basis-URL der App für absolute Links (z. B. in E-Mails). Fällt im Dev auf
// localhost zurück; in Produktion BETTER_AUTH_URL setzen (siehe .env.example).
export function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

// Absolute URL zur Auktions-Detailseite. de (Default) ohne Prefix, en unter /en.
export function auctionUrl(
  id: string,
  locale: string = routing.defaultLocale,
): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${baseUrl()}${prefix}/auctions/${id}`;
}
