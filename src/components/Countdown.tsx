"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import styles from "./Countdown.module.scss";

type Props = {
  // ISO-String von endsAt (vom Server übergeben)
  endsAt: string;
  variant?: "full" | "compact";
};

export default function Countdown({endsAt, variant = "full"}: Props) {
  const t = useTranslations("Auctions.countdown");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Vor dem Mount: identisch zu Server-Render -> keine Hydration-Mismatches
  if (remaining === null) {
    return (
      <span className={styles.placeholder} aria-hidden>
        —
      </span>
    );
  }

  if (remaining <= 0) {
    return <span className={styles.ended}>{t("ended")}</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const units = [
    {value: days, label: t("days")},
    {value: hours, label: t("hours")},
    {value: minutes, label: t("minutes")},
    {value: seconds, label: t("seconds")},
  ];

  if (variant === "compact") {
    // Nur die zwei größten relevanten Einheiten zeigen
    const firstNonZero = units.findIndex((u) => u.value > 0);
    const start = firstNonZero === -1 ? units.length - 1 : firstNonZero;
    const shown = units.slice(start, start + 2);
    return (
      <span className={styles.compact}>
        {shown.map((u) => `${u.value} ${u.label}`).join(" ")}
      </span>
    );
  }

  return (
    <div className={styles.full} role="timer">
      {units.map((u) => (
        <div className={styles.unit} key={u.label}>
          <span className={styles.value}>
            {String(u.value).padStart(2, "0")}
          </span>
          <span className={styles.label}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
