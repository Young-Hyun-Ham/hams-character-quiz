import { gameRewardConfig } from "../../lib/game-rewards";

export type RewardKind = keyof typeof gameRewardConfig.stickerRewards;
export const RULES = Object.fromEntries(
  Object.entries(gameRewardConfig.stickerRewards).map(([kind, rule]) => [
    kind,
    rule.amount,
  ]),
) as Record<RewardKind, number>;
export const LABELS: Record<RewardKind, string> = {
  quiz: "이름찾기 · 10문제 중 9개 이상",
  soundbook: "사운드북 · 10문제 중 7개 이상",
  memory1: "같은 그림 찾기 · 1단계 완료",
  memory2: "같은 그림 찾기 · 2단계 완료",
  memory3: "같은 그림 찾기 · 3단계 완료",
  pokeball: "몬스터볼 게임 · 완료 시 50% 확률",
  ghostChip: "귀신 퇴치 비밀번호 · 완료 시 50% 확률",
  magicDessert: "마법 디저트 파티 · 완료 시 50% 확률",
  dessertTime: "티니핑 디저트 타임 · 완료 시 50% 확률",
  secretMap: "마법의 비밀 지도 · 완료 시 20% 확률",
  pokemonBag: "포켓몬 박사님의 가방 정리 · 완료 시 20% 확률",
};
const KEY = "hams-character-quiz:stickers:v1";
type Entry = {
  id: string;
  kind: RewardKind | "shop";
  amount: number;
  at: string;
};
export type ShopPurchase = {
  id: string;
  productId: string;
  name: string;
  quantity?: number;
  cost: number;
  purchasedAt: string;
  completedAt: string | null;
  canceledAt?: string | null;
};
type Data = {
  configVersion?: number;
  rules: typeof RULES;
  entries: Entry[];
  purchases?: ShopPurchase[];
  admin: { salt: string; hash: string; failures: number } | null;
};
let cachedData: Data = {
  configVersion: gameRewardConfig.version,
  rules: { ...RULES },
  entries: [],
  purchases: [],
  admin: null,
};
export function readStore(): Data {
  return cachedData;
}
function applyState(data: Data) {
  cachedData = data;
  window.dispatchEvent(new Event("stickers-changed"));
}
async function request(action: Record<string, unknown>) {
  const response = await fetch("/api/stickers", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
  const payload = await response.json();
  if (!response.ok) throw Error(payload.error === "login_required" ? "로그인이 필요합니다." : payload.error === "not_enough_stickers" ? "스티커가 부족해요." : "스티커 정보를 저장하지 못했어요.");
  if (payload.state) applyState(payload.state as Data);
  return payload;
}
export async function refreshStore() {
  const response = await fetch("/api/stickers", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401) applyState({ configVersion: gameRewardConfig.version, rules: { ...RULES }, entries: [], purchases: [], admin: null });
    else throw Error("스티커 정보를 불러오지 못했어요.");
  } else {
    const payload = await response.json() as { state: Data };
    applyState(payload.state);
  }
  return cachedData;
}
export function balance(data = readStore()) {
  return data.entries.reduce((total, entry) => total + entry.amount, 0);
}
export function eligible(kind: RewardKind, total: number, correct: number) {
  const rule = gameRewardConfig.stickerRewards[kind];
  return (
    total > 0 &&
    (rule.requiredTotal === null || total === rule.requiredTotal) &&
    (!rule.requirePerfect || total === correct) &&
    correct >= rule.minimumCorrect
  );
}
async function locked<T>(action: () => Promise<T> | T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(KEY, action);
  return action();
}
export async function award(id: string, kind: RewardKind) {
  return locked(async () => {
    const payload = await request({ action: "award", id, kind });
    return { amount: payload.amount as number, balance: payload.balance as number };
  });
}
export function purchases(data = readStore()) {
  return data.purchases ?? [];
}
export async function purchaseProduct(
  productId: string,
  name: string,
  unitPrice: number,
  quantity = 1,
) {
  return locked(async () => {
    if (
      !Number.isSafeInteger(unitPrice) ||
      unitPrice <= 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    )
      throw Error("상품 가격이나 수량이 올바르지 않습니다.");
    void name; void unitPrice;
    const payload = await request({ action: "purchase", productId, quantity });
    window.dispatchEvent(new Event("shop-changed"));
    return { balance: payload.balance as number, id: payload.id as string };
  });
}
export async function completePurchase(id: string) {
  return locked(async () => {
    const payload = await request({ action: "complete", id });
    window.dispatchEvent(new Event("shop-changed"));
    return payload.changed as boolean;
  });
}
export async function cancelPurchase(id: string) {
  return locked(async () => {
    const payload = await request({ action: "cancel", id });
    window.dispatchEvent(new Event("shop-changed"));
    return payload.changed as boolean;
  });
}
async function digest(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 100000,
      salt: new TextEncoder().encode(salt),
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
let authorizedHash: string | null = null;
export async function unlock(pin: string, confirmation?: string) {
  if (!/^\d{6}$/.test(pin)) throw Error("숫자 6자리를 입력해 주세요.");
  return locked(async () => {
    const data = readStore();
    if (!data.admin) {
      if (confirmation !== pin)
        throw Error("두 암호가 일치하지 않아요. 다시 입력해 주세요.");
      const salt = crypto.randomUUID();
      data.admin = { salt, hash: await digest(pin, salt), failures: 0 };
    } else {
      if (data.admin.failures >= 5) throw Error("관리자에게 문의 하세요.");
      if ((await digest(pin, data.admin.salt)) !== data.admin.hash) {
        data.admin.failures += 1;
        await request({ action: "replace", state: data });
        throw Error(
          data.admin.failures >= 5
            ? "관리자에게 문의 하세요."
            : `암호가 일치하지 않아요. (${data.admin.failures}/5회)`,
        );
      }
      data.admin.failures = 0;
    }
    await request({ action: "replace", state: data });
    authorizedHash = data.admin.hash;
  });
}
export function lockAdmin() {
  authorizedHash = null;
}
export async function saveRules(rules: typeof RULES) {
  return locked(async () => {
    const data = readStore();
    if (
      !authorizedHash ||
      data.admin?.hash !== authorizedHash ||
      data.admin.failures >= 5
    )
      throw Error("관리자 암호를 다시 확인해 주세요.");
    if (
      !Object.values(rules).every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 999,
      )
    )
      throw Error("스티커 수량은 0~999의 정수로 입력해 주세요.");
    data.rules = { ...rules };
    await request({ action: "replace", state: data });
  });
}
