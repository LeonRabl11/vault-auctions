import {NextResponse, type NextRequest} from "next/server";
import {getSessionCookie} from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import {routing} from "./i18n/routing";

// Next.js 16: "proxy" ersetzt die frühere "middleware"-Dateikonvention.
const handleI18nRouting = createMiddleware(routing);

// Pfade (ohne Locale-Prefix), die eine Session erfordern
const protectedPathnames = ["/dashboard"];

export default function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // Locale bestimmen (de = Default ohne Prefix)
  const localeMatch = pathname.match(/^\/(de|en)(?=\/|$)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
  const pathnameWithoutLocale = localeMatch
    ? pathname.slice(localeMatch[0].length) || "/"
    : pathname;

  const isProtected = protectedPathnames.some(
    (p) =>
      pathnameWithoutLocale === p ||
      pathnameWithoutLocale.startsWith(`${p}/`),
  );

  if (isProtected) {
    // Optimistischer, edge-sicherer Cookie-Check.
    // Die echte Session-Prüfung passiert serverseitig auf der Seite selbst.
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
      return NextResponse.redirect(new URL(`${prefix}/login`, request.url));
    }
  }

  // next-intl übernimmt das Locale-Routing
  return handleI18nRouting(request);
}

export const config = {
  // Alle Pfade außer API, Next-Internals und Dateien mit Endung (z. B. .png)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
