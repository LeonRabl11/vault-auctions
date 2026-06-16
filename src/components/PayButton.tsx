"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {startCheckout} from "@/lib/actions/checkout";
import styles from "./PayButton.module.scss";

type Props = {
  orderId: string;
};

export default function PayButton({orderId}: Props) {
  const t = useTranslations("Auctions.result");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    const result = await startCheckout({orderId, locale});
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Weiterleitung zu Stripe Checkout
    window.location.href = result.url;
  }

  return (
    <div className={styles.wrap}>
      <button
        className="btn btn--primary"
        type="button"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? t("payPending") : t("pay")}
      </button>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
    </div>
  );
}
