"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {X} from "lucide-react";
import {useRouter} from "@/i18n/navigation";
import {dismissEntry, type DismissSection} from "@/lib/actions/dismiss";
import styles from "./DismissButton.module.scss";

type Props = {
  auctionId: string;
  section: DismissSection;
};

// Kleines "×" zum Ausblenden eines abgeschlossenen Dashboard-Eintrags.
export default function DismissButton({auctionId, section}: Props) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await dismissEntry({auctionId, section});
    if (result.ok) {
      router.refresh();
    } else {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.dismiss}
      aria-label={t("dismiss")}
      title={t("dismiss")}
      disabled={pending}
      onClick={onClick}
    >
      <X size={16} aria-hidden />
    </button>
  );
}
