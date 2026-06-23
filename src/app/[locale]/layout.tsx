import type {Metadata} from "next";
import {Suspense} from "react";
import {Inter} from "next/font/google";
import {notFound} from "next/navigation";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {routing} from "@/i18n/routing";
import Header from "@/components/Header";
import CategoryBar from "@/components/CategoryBar";
import Footer from "@/components/Footer";
import "@/styles/globals.scss";

// Selbst gehostet über next/font (kein externer Request, DSGVO-konform).
// Stellt --font-sans bereit; _variables.scss referenziert die Variable.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

// Basis-URL für absolute OG-/Canonical-Links (Fallback = Vercel-Deployment)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vault-auctions-app.vercel.app";

// TODO: Eigenes OG-Bild (1200×630, Logo auf dunklem Hintergrund) unter
// public/og-default.png hinterlegen und hier auf "/og-default.png" umstellen.
// Bis dahin dient das Hintergrundbild als Platzhalter.
const OG_IMAGE = "/background.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Metadata"});
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(SITE_URL),
    title: {default: title, template: "%s | Vault"},
    description,
    openGraph: {
      type: "website",
      siteName: "Vault",
      locale: locale === "en" ? "en_US" : "de_DE",
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Aktiviert statisches Rendering für dieses Locale
  setRequestLocale(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider>
          <Header />
          <Suspense>
            <CategoryBar />
          </Suspense>
          <main className="container">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
