import { randomInt, randomUUID } from "node:crypto";
import { getSsoUserFromRequest } from "@hams-fam/sso-client";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../../lib/firebase-admin";
import { gameRewardConfig } from "../../../lib/game-rewards";
import { SHOP_PRODUCTS } from "../../shop/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RewardKind = keyof typeof gameRewardConfig.stickerRewards;
type Entry = { id: string; kind: RewardKind | "shop"; amount: number; at: string };
type Purchase = { id: string; productId: string; name: string; quantity: number; cost: number; purchasedAt: string; completedAt: string | null; canceledAt?: string | null };
const defaultRules = Object.fromEntries(Object.entries(gameRewardConfig.stickerRewards).map(([kind, rule]) => [kind, rule.amount])) as Record<RewardKind, number>;
const emptyState = () => ({ configVersion: gameRewardConfig.version, rules: { ...defaultRules }, entries: [] as Entry[], purchases: [] as Purchase[], admin: null });
const total = (entries: Entry[]) => entries.reduce((sum, entry) => sum + entry.amount, 0);

function getUserId(request: Request) { return getSsoUserFromRequest(request)?.id ?? null; }

export async function GET(request: Request) {
  const id = getUserId(request);
  if (!id) return Response.json({ error: "login_required" }, { status: 401 });
  const snapshot = await getAdminFirestore().collection("hamsCharacterQuizUsers").doc(id).get();
  return Response.json({ state: snapshot.data()?.stickers ?? emptyState() });
}

export async function POST(request: Request) {
  const id = getUserId(request);
  if (!id) return Response.json({ error: "login_required" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const reference = getAdminFirestore().collection("hamsCharacterQuizUsers").doc(id);
  const result = await getAdminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const stored = snapshot.data()?.stickers;
    const state = stored && typeof stored === "object" ? stored as ReturnType<typeof emptyState> : emptyState();
    if (state.configVersion !== gameRewardConfig.version) { state.configVersion = gameRewardConfig.version; state.rules = { ...defaultRules }; }
    state.entries ??= [];
    state.purchases ??= [];
    if (body.action === "award") {
      const rewardId = typeof body.id === "string" ? body.id : "";
      const kind = body.kind as RewardKind;
      if (!rewardId || !(kind in gameRewardConfig.stickerRewards)) throw new Error("invalid_reward");
      const prior = state.entries.find((entry) => entry.id === rewardId);
      if (prior) return { state, amount: prior.amount, balance: total(state.entries) };
      const chance = gameRewardConfig.stickerRewards[kind].chance;
      const amount = chance >= 1 || randomInt(1_000_000) < chance * 1_000_000 ? state.rules[kind] : 0;
      state.entries.push({ id: rewardId, kind, amount, at: new Date().toISOString() });
      transaction.set(reference, { stickers: state, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { state, amount, balance: total(state.entries) };
    }
    if (body.action === "purchase") {
      const product = SHOP_PRODUCTS.find((item) => item.id === body.productId);
      const quantity = Number(body.quantity);
      if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("invalid_purchase");
      const cost = product.price * quantity;
      if (total(state.entries) < cost) throw new Error("not_enough_stickers");
      const purchaseId = randomUUID(); const at = new Date().toISOString();
      state.entries.push({ id: `shop:${purchaseId}`, kind: "shop", amount: -cost, at });
      state.purchases.push({ id: purchaseId, productId: product.id, name: product.name, quantity, cost, purchasedAt: at, completedAt: null });
      const balanceAfter = total(state.entries);
      transaction.set(reference, { stickers: state, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(reference.collection("stickerUsageHistory").doc(`purchase:${purchaseId}`), {
        eventType: "purchase",
        purchaseId,
        productId: product.id,
        productName: product.name,
        quantity,
        stickerDelta: -cost,
        stickersUsed: cost,
        balanceAfter,
        occurredAt: at,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { state, balance: balanceAfter, id: purchaseId };
    }
    if (body.action === "complete" || body.action === "cancel") {
      const purchase = state.purchases.find((item) => item.id === body.id);
      if (!purchase || purchase.completedAt || purchase.canceledAt) return { state, changed: false };
      const at = new Date().toISOString();
      if (body.action === "complete") purchase.completedAt = at;
      else {
        purchase.canceledAt = at;
        state.entries.push({ id: `shop-refund:${purchase.id}`, kind: "shop", amount: purchase.cost, at });
        transaction.set(reference.collection("stickerUsageHistory").doc(`refund:${purchase.id}`), {
          eventType: "refund",
          purchaseId: purchase.id,
          productId: purchase.productId,
          productName: purchase.name,
          quantity: purchase.quantity,
          stickerDelta: purchase.cost,
          stickersReturned: purchase.cost,
          balanceAfter: total(state.entries),
          occurredAt: at,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.set(reference, { stickers: state, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { state, changed: true };
    }
    if (body.action === "replace") {
      const next = body.state as { rules?: unknown; admin?: unknown } | null;
      if (!next || typeof next !== "object" || !next.rules || typeof next.rules !== "object") throw new Error("invalid_state");
      const rules = next.rules as Record<string, unknown>;
      if (!Object.keys(defaultRules).every((key) => Number.isInteger(rules[key]) && Number(rules[key]) >= 0 && Number(rules[key]) <= 999)) throw new Error("invalid_rules");
      state.rules = rules as Record<RewardKind, number>;
      state.admin = next.admin as null;
      transaction.set(reference, { stickers: state, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { state };
    }
    throw new Error("invalid_action");
  });
  return Response.json(result);
}
