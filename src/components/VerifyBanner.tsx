"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {authClient} from "@/lib/auth-client";
import styles from "./VerifyBanner.module.scss";

type Props = {
  email: string;
};

type State = "idle" | "sending" | "sent" | "error";

// Dezenter Hinweis für unverifizierte Nutzer mit "Mail erneut senden"-Button.
export default function VerifyBanner({email}: Props) {
  const t = useTranslations("Verify");
  const [state, setState] = useState<State>("idle");

  async function resend() {
    setState("sending");
    try {
      const {error} = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });
      setState(error ? "error" : "sent");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={styles.bar}>
      <div className={`container ${styles.banner}`}>
        <span className={styles.text}>
          {state === "error" ? t("error") : t("hint")}
        </span>
        <button
          className="btn"
          type="button"
          onClick={resend}
          disabled={state === "sending" || state === "sent"}
        >
          {state === "sent"
            ? t("sent")
            : state === "sending"
              ? t("sending")
              : t("resend")}
        </button>
      </div>
    </div>
  );
}
