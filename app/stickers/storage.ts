export const RULES = { quiz: 3, soundbook: 1, memory1: 1, memory2: 2, memory3: 3 };
export type RewardKind = keyof typeof RULES;
export const LABELS: Record<RewardKind, string> = { quiz: "이름퀴즈 · 10문제 중 8개 이상", soundbook: "사운드북 · 10문제 중 8개 이상", memory1: "같은 그림 찾기 · 1단계 완료", memory2: "같은 그림 찾기 · 2단계 완료", memory3: "같은 그림 찾기 · 3단계 완료" };
const KEY = "hams-character-quiz:stickers:v1";
type Entry = { id: string; kind: RewardKind; amount: number; at: string };
type Data = { rules: typeof RULES; entries: Entry[]; admin: { salt: string; hash: string; failures: number } | null };
export function readStore(): Data {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { rules: { ...RULES }, entries: [], admin: null };
  const data = JSON.parse(raw) as Data;
  if (!data || !data.rules || !Array.isArray(data.entries) || !Object.keys(RULES).every(key => Number.isInteger(data.rules[key as RewardKind]) && data.rules[key as RewardKind] >= 0 && data.rules[key as RewardKind] <= 999)) throw Error("저장 데이터를 읽지 못했어요.");
  return data;
}
function writeStore(data: Data) { localStorage.setItem(KEY, JSON.stringify(data)); window.dispatchEvent(new Event("stickers-changed")); }
export function balance(data = readStore()) { return data.entries.reduce((total, entry) => total + entry.amount, 0); }
export function eligible(kind: RewardKind, total: number, correct: number) { return kind.startsWith("memory") ? total > 0 && total === correct : total === 10 && correct >= 8; }
async function locked<T>(action: () => Promise<T> | T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(KEY, action);
  return action();
}
export async function award(id: string, kind: RewardKind) {
  return locked(() => {
    const data = readStore();
    const prior = data.entries.find(entry => entry.id === id);
    if (prior) return { amount: prior.amount, balance: balance(data) };
    const amount = data.rules[kind];
    data.entries.push({ id, kind, amount, at: new Date().toISOString() });
    writeStore(data);
    return { amount, balance: balance(data) };
  });
}
async function digest(pin: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations: 100000, salt: new TextEncoder().encode(salt) }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}
let authorizedHash: string | null = null;
export async function unlock(pin: string, confirmation?: string) {
  if (!/^\d{6}$/.test(pin)) throw Error("숫자 6자리를 입력해 주세요.");
  return locked(async () => {
    const data = readStore();
    if (!data.admin) {
      if (confirmation !== pin) throw Error("두 암호가 일치하지 않아요. 다시 입력해 주세요.");
      const salt = crypto.randomUUID();
      data.admin = { salt, hash: await digest(pin, salt), failures: 0 };
    } else {
      if (data.admin.failures >= 5) throw Error("관리자에게 문의 하세요.");
      if (await digest(pin, data.admin.salt) !== data.admin.hash) {
        data.admin.failures += 1; writeStore(data);
        throw Error(data.admin.failures >= 5 ? "관리자에게 문의 하세요." : `암호가 일치하지 않아요. (${data.admin.failures}/5회)`);
      }
      data.admin.failures = 0;
    }
    writeStore(data); authorizedHash = data.admin.hash;
  });
}
export function lockAdmin() { authorizedHash = null; }
export async function saveRules(rules: typeof RULES) {
  return locked(() => {
    const data = readStore();
    if (!authorizedHash || data.admin?.hash !== authorizedHash || data.admin.failures >= 5) throw Error("관리자 암호를 다시 확인해 주세요.");
    if (!Object.values(rules).every(value => Number.isInteger(value) && value >= 0 && value <= 999)) throw Error("스티커 수량은 0~999의 정수로 입력해 주세요.");
    data.rules = { ...rules }; writeStore(data);
  });
}
