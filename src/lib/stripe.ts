import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt (siehe .env.example).");
}

export const stripe = new Stripe(key, {
  // Feste API-Version (passt zur installierten SDK 22.x)
  apiVersion: "2026-05-27.dahlia",
});
