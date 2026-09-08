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
export function readStore(): Data {
  const raw = localStorage.getItem(KEY);
  if (!raw)
    return {
      configVersion: gameRewardConfig.version,
      rules: { ...RULES },
      entries: [],
      purchases: [],
      admin: null,
    };
  const data = JSON.parse(raw) as Data;
  if (!data || !data.rules || !Array.isArray(data.entries))
    throw Error("저장 데이터를 읽지 못했어요.");
  if (data.configVersion !== gameRewardConfig.version) {
    data.configVersion = gameRewardConfig.version;
    data.rules = { ...RULES };
  }
  if (
    !Object.keys(RULES).every(
      (key) =>
        Number.isInteger(data.rules[key as RewardKind]) &&
        data.rules[key as RewardKind] >= 0 &&
        data.rules[key as RewardKind] <= 999,
    )
  )
    throw Error("저장 데이터를 읽지 못했어요.");
  return data;
}
function writeStore(data: Data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("stickers-changed"));
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
  return locked(() => {
    const data = readStore();
    const prior = data.entries.find((entry) => entry.id === id);
    if (prior) return { amount: prior.amount, balance: balance(data) };
    const chance = gameRewardConfig.stickerRewards[kind].chance;
    const chancePassed =
      chance >= 1 ||
      crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 < chance;
    const amount = chancePassed ? data.rules[kind] : 0;
    data.entries.push({ id, kind, amount, at: new Date().toISOString() });
    writeStore(data);
    return { amount, balance: balance(data) };
  });
}
export function purchases(data = readStore()) {
  return data.purchases ?? [];
}
export async function purchaseProduct(
  productId: string,
  name: string,
  cost: number,
) {
  return locked(() => {
    const data = readStore();
    if (!Number.isSafeInteger(cost) || cost <= 0)
      throw Error("상품 가격이 올바르지 않습니다.");
    if (balance(data) < cost) throw Error("스티커가 부족해요.");
    const id = crypto.randomUUID();
    const purchasedAt = new Date().toISOString();
    data.entries.push({
      id: `shop:${id}`,
      kind: "shop",
      amount: -cost,
      at: purchasedAt,
    });
    data.purchases = [
      ...(data.purchases ?? []),
      { id, productId, name, cost, purchasedAt, completedAt: null },
    ];
    writeStore(data);
    window.dispatchEvent(new Event("shop-changed"));
    return { balance: balance(data), id };
  });
}
export async function completePurchase(id: string) {
  return locked(() => {
    const data = readStore();
    const purchase = data.purchases?.find((item) => item.id === id);
    if (!purchase || purchase.completedAt || purchase.canceledAt) return false;
    purchase.completedAt = new Date().toISOString();
    writeStore(data);
    window.dispatchEvent(new Event("shop-changed"));
    return true;
  });
}
export async function cancelPurchase(id: string) {
  return locked(() => {
    const data = readStore();
    const purchase = data.purchases?.find((item) => item.id === id);
    if (!purchase || purchase.completedAt || purchase.canceledAt) return false;
    purchase.canceledAt = new Date().toISOString();
    data.entries.push({
      id: `shop-refund:${id}`,
      kind: "shop",
      amount: purchase.cost,
      at: purchase.canceledAt,
    });
    writeStore(data);
    window.dispatchEvent(new Event("shop-changed"));
    return true;
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
        writeStore(data);
        throw Error(
          data.admin.failures >= 5
            ? "관리자에게 문의 하세요."
            : `암호가 일치하지 않아요. (${data.admin.failures}/5회)`,
        );
      }
      data.admin.failures = 0;
    }
    writeStore(data);
    authorizedHash = data.admin.hash;
  });
}
export function lockAdmin() {
  authorizedHash = null;
}
export async function saveRules(rules: typeof RULES) {
  return locked(() => {
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
    writeStore(data);
  });
}
