"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {deleteAuction} from "@/lib/actions/auction";
import styles from "./DeleteAuctionButton.module.scss";

type Props = {
  auctionId: string;
};

// Sichtbar nur für den Verkäufer einer Auktion ohne Gebote (serverseitig
// nochmals geprüft). Bestätigung vor dem Ausführen.
export default function DeleteAuctionButton({auctionId}: Props) {
  const t = useTranslations("Auctions.delete");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(t("confirm"))) return;
    setError(null);
    setPending(true);
    const result = await deleteAuction(auctionId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <button
        className={`btn ${styles.delete}`}
        type="button"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? t("pending") : t("submit")}
      </button>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
    </div>
  );
}
