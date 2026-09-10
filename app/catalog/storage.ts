let collectedCards = new Set<string>();

export function cardKey(world: string, image: string) {
  return `${world}:${image}`;
}

export function readCollectedCards() {
  return new Set(collectedCards);
}

export async function refreshCollectedCards() {
  const response = await fetch("/api/catalog", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 401) collectedCards = new Set();
    else throw new Error("도감 정보를 불러오지 못했어요.");
  } else {
    const payload = (await response.json()) as { cards: string[] };
    collectedCards = new Set(payload.cards);
  }
  window.dispatchEvent(new Event("catalog-changed"));
  return readCollectedCards();
}

export async function collectCard(world: string, image: string) {
  const response = await fetch("/api/catalog", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ world, image }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "로그인이 필요합니다."
        : "도감을 저장하지 못했어요.",
    );
  const key = cardKey(world, image);
  const added = !collectedCards.has(key);
  collectedCards.add(key);
  window.dispatchEvent(new Event("catalog-changed"));
  return added;
}
