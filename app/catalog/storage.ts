const KEY = "hams-character-quiz:catalog:v1";

export function cardKey(world: string, image: string) {
  return `${world}:${image}`;
}

export function readCollectedCards() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return new Set<string>();
  const parsed = JSON.parse(raw) as unknown;
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  )
    throw new Error("도감 저장 정보를 읽을 수 없습니다.");
  return new Set(parsed);
}

export function collectCard(world: string, image: string) {
  const cards = readCollectedCards();
  const key = cardKey(world, image);
  if (cards.has(key)) return false;
  cards.add(key);
  localStorage.setItem(KEY, JSON.stringify([...cards]));
  window.dispatchEvent(new Event("catalog-changed"));
  return true;
}
