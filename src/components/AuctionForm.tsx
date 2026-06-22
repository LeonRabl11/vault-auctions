"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {createAuction, updateAuction} from "@/lib/actions/auction";
import {CATEGORIES} from "@/lib/categories";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  auctionInputSchema,
} from "@/lib/validation/auction";
import styles from "./AuctionForm.module.scss";

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

// Vorbefüllte Werte für den Edit-Modus (Preise als Euro-Strings, endsAt als ISO).
export type AuctionFormInitial = {
  title: string;
  description: string;
  category: string;
  startPriceEur: string;
  endsAtIso: string | null;
  buyNowPriceEur: string;
  imageUrl: string | null;
};

type Props = {
  mode?: "create" | "edit";
  auctionId?: string;
  initial?: AuctionFormInitial;
  // Bei Auktionen mit Geboten: Preis/Laufzeit/Festpreis sperren (UI-Hinweis;
  // serverseitig zusätzlich erzwungen).
  pricingLocked?: boolean;
  // Zusätzliche Aktionen direkt unter dem Submit-Button (z. B. Löschen im Edit).
  children?: React.ReactNode;
};

// ISO-Zeit -> Wert für <input type="datetime-local"> in lokaler Zeit (YYYY-MM-DDTHH:mm).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

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

export default function AuctionForm({
  mode = "create",
  auctionId,
  initial,
  pricingLocked = false,
  children,
}: Props) {
  const t = useTranslations("Auctions");
  const tc = useTranslations("Categories");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Bereits gespeichertes Bild (Edit). null = (noch) kein Bild bzw. entfernt.
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEdit = mode === "edit";
  const hasImage = Boolean(file || existingImageUrl);
  const previewSrc = preview ?? existingImageUrl ?? "";

  // Datei übernehmen + lokale Vorschau (Blob-URL) erzeugen; alte URL freigeben.
  function selectFile(f: File) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setFile(f);
    setError(null);
  }

  // Bild komplett entfernen (Datei + Vorschau + ggf. vorhandenes Bild).
  function removeFile() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    setExistingImageUrl(null);
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
      category: String(form.get("category") ?? ""),
      startPriceEur: String(form.get("startPrice") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
      buyNowPriceEur: String(form.get("buyNowPrice") ?? ""),
    };

    // 1. Felder validieren (gleiches Zod-Schema wie auf dem Server)
    const parsed = auctionInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "generic");
      return;
    }

    // 2. Bild ist optional. Nur wenn eine NEUE Datei gewählt wurde, Typ/Größe prüfen.
    if (file) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setError("imageType");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError("imageTooLarge");
        return;
      }
    }

    setPending(true);
    try {
      // 3. Neues Bild (falls gewählt) hochladen; sonst vorhandenes behalten/entfernen.
      let imageUrl: string | null = existingImageUrl;
      if (file) {
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

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {"Content-Type": file.type},
          body: file,
        });
        if (!putRes.ok) {
          setError("uploadFailed");
          return;
        }
        imageUrl = publicUrl;
      }

      // 4. Anlegen oder aktualisieren (gleiche serverseitige Validierung).
      const result = isEdit
        ? await updateAuction({...parsed.data, id: auctionId, imageUrl})
        : await createAuction({...parsed.data, imageUrl});
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(isEdit ? `/marktplatz/${auctionId}` : "/marktplatz");
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
        <input
          className="input"
          type="text"
          name="title"
          defaultValue={initial?.title ?? ""}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("fields.description")}</span>
        <textarea
          className="input"
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ""}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("fields.category")}</span>
        <select
          className={`input ${styles.select}`}
          name="category"
          defaultValue={initial?.category ?? ""}
          required
        >
          <option value="" disabled>
            {t("fields.categoryPlaceholder")}
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {tc(c.labelKey)}
            </option>
          ))}
        </select>
      </label>

      {pricingLocked && (
        <p className={styles.lockHint}>{t("edit.pricingLocked")}</p>
      )}

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
            defaultValue={initial?.startPriceEur ?? ""}
            readOnly={pricingLocked}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.endsAt")}</span>
          <input
            className="input"
            type="datetime-local"
            name="endsAt"
            defaultValue={toLocalInput(initial?.endsAtIso)}
            readOnly={pricingLocked}
          />
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
            defaultValue={initial?.buyNowPriceEur ?? ""}
            readOnly={pricingLocked}
          />
        </label>
      </fieldset>

      {/* === Bild-Upload als Dropzone (optional) === */}
      <div className={styles.field}>
        <span className={styles.label}>{t("fields.image")}</span>
        <span className={styles.hint}>{t("upload.optional")}</span>

        {hasImage ? (
          <div className={styles.preview}>
            <div className={styles.previewMedia}>
              {/* Lokale Vorschau (Blob-URL) oder vorhandene S3-URL — kein next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.previewImg} src={previewSrc} alt="" />
            </div>
            <div className={styles.previewBar}>
              <span className={styles.fileName}>
                {file ? file.name : t("upload.current")}
              </span>
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
        {pending
          ? isEdit
            ? t("edit.pending")
            : t("new.uploading")
          : isEdit
            ? t("edit.submit")
            : t("new.submit")}
      </button>

      {/* Zusätzliche Aktionen (z. B. Löschen) direkt unter dem Submit-Button. */}
      {children}
    </form>
  );
}
