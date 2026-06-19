"use client";

import {useState} from "react";
import {useFormatter, useLocale, useTranslations} from "next-intl";
import {buyNow} from "@/lib/actions/buy-now";
import styles from "./BuyNowButton.module.scss";

type Props = {
  auctionId: string;
  price: number; // Festpreis in Cent
};

export default function BuyNowButton({auctionId, price}: Props) {
  const t = useTranslations("Auctions.buyNow");
  const format = useFormatter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    const result = await buyNow({auctionId, locale});
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Weiterleitung zu Stripe Checkout
    window.location.href = result.url;
  }

  const amount = format.number(price / 100, {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className={styles.wrap}>
      <button
        className="btn btn--primary"
        type="button"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? t("pending") : t("label", {amount})}
      </button>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
    </div>
  );
}
