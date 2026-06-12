"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {authClient} from "@/lib/auth-client";
import styles from "./AuthForm.module.scss";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const {error: signInError} = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);

    if (signInError) {
      setError("invalidCredentials");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.label}>
        {t("fields.email")}
        <input
          className={styles.input}
          type="email"
          name="email"
          required
          autoComplete="email"
        />
      </label>
      <label className={styles.label}>
        {t("fields.password")}
        <input
          className={styles.input}
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
      <button className={styles.button} type="submit" disabled={pending}>
        {t("login.submit")}
      </button>
    </form>
  );
}
