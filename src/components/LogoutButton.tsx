"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {authClient} from "@/lib/auth-client";

export default function LogoutButton() {
  const t = useTranslations("Nav");
  const router = useRouter();

  async function onLogout() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn" type="button" onClick={onLogout}>
      {t("logout")}
    </button>
  );
}
