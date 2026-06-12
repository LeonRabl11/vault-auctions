"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {authClient} from "@/lib/auth-client";
import styles from "./AuthForm.module.scss";

export default function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const {error: signUpError} = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);

    if (signUpError) {
      setError(
        signUpError.code === "USER_ALREADY_EXISTS" ? "emailTaken" : "generic",
      );
      return;
    }

    // Better Auth meldet nach erfolgreicher Registrierung automatisch an
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        {t("fields.name")}
        <input
          className="input"
          type="text"
          name="name"
          required
          autoComplete="name"
        />
      </label>
      <label className={styles.field}>
        {t("fields.email")}
        <input
          className="input"
          type="email"
          name="email"
          required
          autoComplete="email"
        />
      </label>
      <label className={styles.field}>
        {t("fields.password")}
        <input
          className="input"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {t("register.submit")}
      </button>
    </form>
  );
}
