import "server-only";
import {auctionUrl} from "./urls";

// E-Mail-Versand über die Brevo-API (kein SDK, reiner fetch).
//
// WICHTIG: sendEmail wirft bei Fehlern. Aufrufer aus Geschäfts-Flows (Gebot,
// Finalisierung, Zahlung) MÜSSEN in try/catch kapseln und Fehler nur loggen —
// ein fehlgeschlagener Mailversand darf den Flow nie abbrechen.

type SendEmailArgs = {to: string; subject: string; html: string};

export async function sendEmail({to, subject, html}: SendEmailArgs): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Auction Platform";

  // Ohne Konfiguration (z. B. lokal/CI) wird nicht versendet, statt zu crashen.
  if (!apiKey || !senderEmail) {
    console.warn(
      "[email] BREVO_API_KEY/BREVO_SENDER_EMAIL fehlt — Mail wird übersprungen.",
    );
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {email: senderEmail, name: senderName},
      to: [{email: to}],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${detail}`);
  }
}

// === HTML-Templates ===
// Inline-Styles sind in E-Mails Pflicht (kein externes CSS/SCSS). Die Hex-Werte
// hier sind bewusst die einzige Ausnahme von der "keine rohen Hex"-Regel und
// spiegeln die Tokens aus styles/_variables.scss wider.
const C = {
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  primary: "#2563eb",
};

function layout(
  heading: string,
  bodyHtml: string,
  cta?: {href: string; label: string},
): string {
  const button = cta
    ? `<p style="margin:24px 0">
         <a href="${cta.href}" style="display:inline-block;background:${C.primary};color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a>
       </p>`
    : "";
  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text}">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="background:#ffffff;border:1px solid ${C.border};border-radius:8px;padding:24px">
        <h1 style="margin:0 0 16px;font-size:20px">${heading}</h1>
        ${bodyHtml}
        ${button}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:${C.muted}">Auction Platform</p>
    </div>
  </body>
</html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;line-height:1.5">${text}</p>`;
}

function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

// === Mail-Typen ===

// Better-Auth-Verifizierung (url kommt vom Auth-Server, bereits absolut).
export async function sendVerificationEmail(args: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: args.to,
    subject: "Bitte bestätige deine E-Mail-Adresse",
    html: layout(
      "E-Mail bestätigen",
      p(`Hallo ${args.name},`) +
        p(
          "bitte bestätige deine E-Mail-Adresse, um dein Konto vollständig zu aktivieren.",
        ),
      {href: args.url, label: "E-Mail bestätigen"},
    ),
  });
}

// Überboten: bisheriger Höchstbieter wurde übertroffen.
export async function sendOutbidEmail(args: {
  to: string;
  name: string;
  auctionTitle: string;
  newPrice: number;
  auctionId: string;
}): Promise<void> {
  const url = auctionUrl(args.auctionId);
  await sendEmail({
    to: args.to,
    subject: `Du wurdest überboten: ${args.auctionTitle}`,
    html: layout(
      "Du wurdest überboten",
      p(`Hallo ${args.name},`) +
        p(
          `bei der Auktion „${args.auctionTitle}“ liegt jetzt ein höheres Gebot vor. Aktuelles Höchstgebot: <strong>${euro(args.newPrice)}</strong>.`,
        ) +
        p("Du kannst jederzeit erneut mitbieten."),
      {href: url, label: "Zur Auktion"},
    ),
  });
}

// Gewonnen: Gewinner soll jetzt bezahlen.
export async function sendWonEmail(args: {
  to: string;
  name: string;
  auctionTitle: string;
  auctionId: string;
}): Promise<void> {
  const url = auctionUrl(args.auctionId);
  await sendEmail({
    to: args.to,
    subject: `Glückwunsch! Du hast „${args.auctionTitle}“ gewonnen`,
    html: layout(
      "Du hast gewonnen! 🎉",
      p(`Hallo ${args.name},`) +
        p(
          `du bist Höchstbietender der Auktion „${args.auctionTitle}“. Bitte schließe die Zahlung ab, um den Kauf abzuschließen.`,
        ),
      {href: url, label: "Jetzt bezahlen"},
    ),
  });
}

// Bezahlt: Zahlung erfolgreich eingegangen.
export async function sendPaidEmail(args: {
  to: string;
  name: string;
  auctionTitle: string;
  amount: number;
  auctionId: string;
}): Promise<void> {
  const url = auctionUrl(args.auctionId);
  await sendEmail({
    to: args.to,
    subject: `Zahlung bestätigt: ${args.auctionTitle}`,
    html: layout(
      "Zahlung erfolgreich",
      p(`Hallo ${args.name},`) +
        p(
          `wir haben deine Zahlung über <strong>${euro(args.amount)}</strong> für „${args.auctionTitle}“ erhalten. Vielen Dank für deinen Einkauf!`,
        ),
      {href: url, label: "Zur Auktion"},
    ),
  });
}
