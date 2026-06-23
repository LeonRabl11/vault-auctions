"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import styles from "./Countdown.module.scss";

type Props = {
  // ISO-String von endsAt (vom Server übergeben)
  endsAt: string;
  // Vom Server vorberechnete Restzeit in ms. Damit rendert schon der erste
  // (Server-)Render einen sinnvollen Wert — kein leerer Strich, keine
  // Hydration-Mismatches (Client startet mit demselben Wert).
  initialRemainingMs: number;
  variant?: "full" | "compact";
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({
  endsAt,
  initialRemainingMs,
  variant = "full",
}: Props) {
  const t = useTranslations("Auctions.countdown");
  const [remaining, setRemaining] = useState(initialRemainingMs);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining <= 0) {
    return <span className={styles.ended}>{t("ended")}</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // ab 1 Tag: "3 Tage 14:22:10" — ab 1 Std: "14:22:10" — sonst: "22:10"
  const clock =
    days > 0 || hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  const text = days > 0 ? `${t("dayCount", {count: days})} ${clock}` : clock;

  return (
    <span
      className={variant === "compact" ? styles.compact : styles.clock}
      role="timer"
    >
      {text}
    </span>
  );
}
