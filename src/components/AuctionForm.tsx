"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {createAuction} from "@/lib/actions/auction";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  auctionInputSchema,
} from "@/lib/validation/auction";
import styles from "./AuctionForm.module.scss";

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export default function AuctionForm() {
  const t = useTranslations("Auctions");
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      startPriceEur: String(form.get("startPrice") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
    };

    // 1. Felder validieren (gleiche Zod-Schemas wie auf dem Server)
    const parsed = auctionInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "generic");
      return;
    }

    // 2. Bild prüfen
    const file = (form.get("image") as File) ?? null;
    if (!file || file.size === 0) {
      setError("imageRequired");
      return;
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("imageType");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("imageTooLarge");
      return;
    }

    setPending(true);
    try {
      // 3. Presigned PUT-URL holen
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({contentType: file.type, size: file.size}),
      });
      if (!presignRes.ok) {
        setError(presignRes.status === 401 ? "unauthorized" : "uploadFailed");
        return;
      }
      const {uploadUrl, publicUrl} = await presignRes.json();

      // 4. Bild direkt zu S3 hochladen
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {"Content-Type": file.type},
        body: file,
      });
      if (!putRes.ok) {
        setError("uploadFailed");
        return;
      }

      // 5. Auktion serverseitig anlegen
      const result = await createAuction({...parsed.data, imageUrl: publicUrl});
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/auctions");
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        {t("fields.title")}
        <input className="input" type="text" name="title" required />
      </label>

      <label className={styles.field}>
        {t("fields.description")}
        <textarea
          className="input"
          name="description"
          rows={4}
          required
        />
      </label>

      <label className={styles.field}>
        {t("fields.startPrice")}
        <input
          className="input"
          type="number"
          name="startPrice"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
        />
      </label>

      <label className={styles.field}>
        {t("fields.endsAt")}
        <input
          className="input"
          type="datetime-local"
          name="endsAt"
          required
        />
      </label>

      <label className={styles.field}>
        {t("fields.image")}
        <input
          className="input"
          type="file"
          name="image"
          accept={ACCEPT}
          onChange={onFileChange}
          required
        />
        <span className={styles.hint}>{t("hints.image")}</span>
      </label>

      {preview && (
        // Lokale Vorschau (Blob-URL) — kein next/image nötig
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.preview} src={preview} alt="" />
      )}

      {error && <p className={styles.error}>{t(`errors.${error}`)}</p>}

      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? t("new.uploading") : t("new.submit")}
      </button>
    </form>
  );
}
