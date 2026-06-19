"use client";

import {useRef, useState} from "react";
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

// Upload-Icon (Pfeil in Ablage) — inline, kein Icon-Paket.
const UPLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 16V4m0 0L7 9m5-5l5 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AuctionForm() {
  const t = useTranslations("Auctions");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Datei übernehmen + lokale Vorschau (Blob-URL) erzeugen; alte URL freigeben.
  function selectFile(f: File) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setFile(f);
    setError(null);
  }

  function removeFile() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const f = event.target.files?.[0];
    if (f) selectFile(f);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (pending) return;
    const f = event.dataTransfer.files?.[0];
    if (f) selectFile(f);
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
      buyNowPriceEur: String(form.get("buyNowPrice") ?? ""),
    };

    // 1. Felder validieren (gleiche Zod-Schemas wie auf dem Server)
    const parsed = auctionInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "generic");
      return;
    }

    // 2. Bild prüfen (Datei aus dem State der Dropzone)
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

      router.push("/marktplatz");
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
        <span className={styles.label}>{t("fields.title")}</span>
        <input className="input" type="text" name="title" required />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("fields.description")}</span>
        <textarea className="input" name="description" rows={4} required />
      </label>

      {/* === Auktion (optional) === */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>{t("sections.auction")}</legend>
        <p className={styles.sectionHint}>{t("sections.auctionHint")}</p>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.startPrice")}</span>
          <input
            className="input"
            type="number"
            name="startPrice"
            min="0.01"
            step="0.01"
            inputMode="decimal"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.endsAt")}</span>
          <input className="input" type="datetime-local" name="endsAt" />
        </label>
      </fieldset>

      {/* === Festpreis / Sofort-Kauf (optional) === */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>{t("sections.buyNow")}</legend>
        <p className={styles.sectionHint}>{t("sections.buyNowHint")}</p>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.buyNowPrice")}</span>
          <input
            className="input"
            type="number"
            name="buyNowPrice"
            min="0.01"
            step="0.01"
            inputMode="decimal"
          />
        </label>
      </fieldset>

      {/* === Bild-Upload als Dropzone === */}
      <div className={styles.field}>
        <span className={styles.label}>{t("fields.image")}</span>

        {file ? (
          <div className={styles.preview}>
            <div className={styles.previewMedia}>
              {/* Lokale Vorschau (Blob-URL) — kein next/image nötig */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.previewImg} src={preview ?? ""} alt="" />
            </div>
            <div className={styles.previewBar}>
              <span className={styles.fileName}>{file.name}</span>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className="btn"
                  onClick={openPicker}
                  disabled={pending}
                >
                  {t("upload.change")}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={removeFile}
                  disabled={pending}
                >
                  {t("upload.remove")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`${styles.dropzone} ${
              dragActive ? styles.dropzoneActive : ""
            }`}
            role="button"
            tabIndex={0}
            aria-label={t("upload.cta")}
            aria-disabled={pending}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!pending) setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={onDrop}
          >
            <span className={styles.dropIcon}>{UPLOAD_ICON}</span>
            <span className={styles.dropTitle}>{t("upload.cta")}</span>
            <span className={styles.hint}>{t("hints.image")}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          className={styles.visuallyHidden}
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          <svg
            className={styles.errorIcon}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 7.5v5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <span>{t(`errors.${error}`)}</span>
        </p>
      )}

      <button
        className={`btn btn--primary ${styles.submit}`}
        type="submit"
        disabled={pending}
      >
        {pending ? t("new.uploading") : t("new.submit")}
      </button>
    </form>
  );
}
