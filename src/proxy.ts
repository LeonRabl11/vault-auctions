import createMiddleware from "next-intl/middleware";
import {routing} from "./i18n/routing";

// Next.js 16: "proxy" ersetzt die frühere "middleware"-Dateikonvention.
// next-intl liefert die Routing-Logik weiterhin über next-intl/middleware.
export default createMiddleware(routing);

export const config = {
  // Alle Pfade außer API, Next-Internals und Dateien mit Endung (z. B. .png)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
