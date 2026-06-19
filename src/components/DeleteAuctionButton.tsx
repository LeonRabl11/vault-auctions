"use client";

import {useId, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {deleteAuction} from "@/lib/actions/auction";
import styles from "./DeleteAuctionButton.module.scss";

type Props = {
  auctionId: string;
};

// Sichtbar nur für den Verkäufer einer Anzeige ohne Gebote (serverseitig
// nochmals geprüft). Klick öffnet ein Bestätigungs-Modal vor dem Löschen.
export default function DeleteAuctionButton({auctionId}: Props) {
  const t = useTranslations("Auctions.delete");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function openModal() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    if (pending) return; // während des Löschens nicht schließen
    dialogRef.current?.close();
  }

  async function confirmDelete() {
    setError(null);
    setPending(true);
    const result = await deleteAuction(auctionId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Erfolg: weg von der (nun gelöschten) Detailseite
    router.push("/dashboard");
    router.refresh();
  }

  // Klick auf den Backdrop (Dialog-Element selbst, nicht der Inhalt) schließt.
  function onDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeModal();
  }

  return (
    <div className={styles.wrap}>
      <button
        className={`btn ${styles.delete}`}
        type="button"
        onClick={openModal}
      >
        {t("submit")}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={onDialogClick}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className={styles.modal}>
          <h2 id={titleId} className={styles.modalTitle}>
            {t("title")}
          </h2>
          <p className={styles.modalText}>{t("confirm")}</p>

          {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn"
              onClick={closeModal}
              disabled={pending}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className={`btn ${styles.delete}`}
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? t("pending") : t("submit")}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
