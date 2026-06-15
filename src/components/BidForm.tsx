"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {placeBid} from "@/lib/actions/bid";
import styles from "./BidForm.module.scss";

type Props = {
  auctionId: string;
  currentPrice: number; // in Cent
};

export default function BidForm({auctionId, currentPrice}: Props) {
  const t = useTranslations("Auctions.bid");
  const format = useFormatter();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Kleinstes zulässiges Gebot (1 Cent über dem aktuellen Höchstgebot)
  const minBid = (currentPrice + 1) / 100;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formEl = event.currentTarget;
    const amountEur = Number(new FormData(formEl).get("amount"));

    // Client-Vorabprüfung (Server validiert ohnehin nochmal)
    if (
      !Number.isFinite(amountEur) ||
      Math.round(amountEur * 100) <= currentPrice
    ) {
      setError("tooLow");
      return;
    }

    setPending(true);
    const result = await placeBid({auctionId, amountEur});
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    formEl.reset();
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h2>{t("title")}</h2>
      <p className={styles.hint}>
        {t("min", {
          amount: format.number(currentPrice / 100, {
            style: "currency",
            currency: "EUR",
          }),
        })}
      </p>
      <div className={styles.row}>
        <input
          className="input"
          type="number"
          name="amount"
          min={minBid.toFixed(2)}
          step="0.01"
          inputMode="decimal"
          required
        />
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {t("submit")}
        </button>
      </div>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
    </form>
  );
}
