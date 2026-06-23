import type Stripe from "stripe";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {
  processCheckoutCompleted,
  type BuyerInfo,
  type CheckoutCompletedDeps,
  type PaidOrder,
} from "./stripe-checkout";

// Minimaler checkout.session.completed-Payload: nur die orderId-Metadaten zählen.
function sessionWith(orderId?: string): Stripe.Checkout.Session {
  return {metadata: orderId ? {orderId} : {}} as Stripe.Checkout.Session;
}

// In-Memory-Order-Store, der den DB-Vertrag nachbildet: markOrderPaidIfPending
// wechselt nur einmal pending -> paid und liefert die Order NUR bei diesem
// echten Wechsel (wie das bedingte UPDATE ... WHERE status='pending' + returning).
function makeDeps(opts?: {status?: "pending" | "paid"}) {
  const ORDER_ID = "order-1";
  const order: PaidOrder = {
    buyerId: "buyer-1",
    auctionId: "auction-1",
    amount: 145000,
  };
  const info: BuyerInfo = {
    email: "buyer@example.com",
    name: "Buyer",
    title: "Vintage Rolex",
  };

  const store = new Map<string, {status: "pending" | "paid"; order: PaidOrder}>();
  store.set(ORDER_ID, {status: opts?.status ?? "pending", order});

  const sendPaidEmail = vi.fn<CheckoutCompletedDeps["sendPaidEmail"]>(
    async () => {},
  );
  const loadBuyerInfo = vi.fn<CheckoutCompletedDeps["loadBuyerInfo"]>(
    async () => info,
  );
  const markOrderPaidIfPending = vi.fn<
    CheckoutCompletedDeps["markOrderPaidIfPending"]
  >(async (orderId) => {
    const rec = store.get(orderId);
    if (!rec || rec.status !== "pending") return null;
    rec.status = "paid";
    return rec.order;
  });

  const deps: CheckoutCompletedDeps = {
    markOrderPaidIfPending,
    loadBuyerInfo,
    sendPaidEmail,
  };

  return {deps, store, sendPaidEmail, loadBuyerInfo, ORDER_ID};
}

describe("processCheckoutCompleted", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verarbeitet dasselbe Event bei doppelter Zustellung nur einmal", async () => {
    const {deps, store, sendPaidEmail, ORDER_ID} = makeDeps();
    const event = sessionWith(ORDER_ID);

    await processCheckoutCompleted(event, deps);
    await processCheckoutCompleted(event, deps);

    // Order genau einmal auf paid, Bestätigungsmail genau einmal
    expect(store.get(ORDER_ID)?.status).toBe("paid");
    expect(sendPaidEmail).toHaveBeenCalledTimes(1);
    expect(sendPaidEmail).toHaveBeenCalledWith(
      expect.objectContaining({to: "buyer@example.com", amount: 145000}),
    );
  });

  it("löst für eine bereits bezahlte Order keine erneute Verarbeitung aus", async () => {
    const {deps, sendPaidEmail, loadBuyerInfo, ORDER_ID} = makeDeps({
      status: "paid",
    });

    await processCheckoutCompleted(sessionWith(ORDER_ID), deps);

    expect(sendPaidEmail).not.toHaveBeenCalled();
    expect(loadBuyerInfo).not.toHaveBeenCalled();
  });

  it("ist ein sauberer No-Op bei unbekannter Order-ID", async () => {
    const {deps, sendPaidEmail} = makeDeps();

    await expect(
      processCheckoutCompleted(sessionWith("does-not-exist"), deps),
    ).resolves.toBeUndefined();
    expect(sendPaidEmail).not.toHaveBeenCalled();
  });

  it("ist ein sauberer No-Op ohne orderId-Metadaten", async () => {
    const {deps, sendPaidEmail} = makeDeps();
    const markSpy = deps.markOrderPaidIfPending;

    await processCheckoutCompleted(sessionWith(undefined), deps);

    expect(markSpy).not.toHaveBeenCalled();
    expect(sendPaidEmail).not.toHaveBeenCalled();
  });

  it("schluckt Mail-Fehler — Order bleibt paid, kein Throw", async () => {
    const {deps, store, sendPaidEmail, ORDER_ID} = makeDeps();
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendPaidEmail.mockRejectedValueOnce(new Error("Brevo down"));

    await expect(
      processCheckoutCompleted(sessionWith(ORDER_ID), deps),
    ).resolves.toBeUndefined();

    expect(store.get(ORDER_ID)?.status).toBe("paid");
    expect(sendPaidEmail).toHaveBeenCalledTimes(1);
  });
});
