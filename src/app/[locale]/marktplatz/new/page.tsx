import type {Metadata} from "next";
import {headers} from "next/headers";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auth} from "@/lib/auth";
import {redirect} from "@/i18n/navigation";
import AuctionForm from "@/components/AuctionForm";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Auctions"});
  return {title: t("new.title")};
}

export default async function NewAuctionPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  // Echte, serverseitige Session-Prüfung (proxy.ts ist nur optimistisch)
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    redirect({href: "/login", locale});
    return null;
  }

  const t = await getTranslations("Auctions");

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{t("new.title")}</h1>
        <p className={styles.subline}>{t("new.subline")}</p>
      </header>
      <div className="card">
        <AuctionForm />
      </div>
    </div>
  );
}
