"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  cardKey,
  readCollectedCards,
  refreshCollectedCards,
} from "../../catalog/storage";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function subscribe(callback: () => void) {
  window.addEventListener("catalog-changed", callback);
  return () => window.removeEventListener("catalog-changed", callback);
}
function snapshot() {
  return [...readCollectedCards()].sort().join("\n");
}

export function AbcCatalog() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => "");
  const collected = new Set(saved ? saved.split("\n") : []);
  useEffect(() => {
    void refreshCollectedCards().catch(() => undefined);
  }, []);
  const count = LETTERS.filter((letter) =>
    collected.has(cardKey("abc", `/abc/cards/${letter}`)),
  ).length;
  return (
    <>
      <h2 style={{ textAlign: "center" }}>획득 {count} / 전체 26개</h2>
      <section className="abc-catalog-grid" aria-label="영어 알파벳 카드">
        {LETTERS.map((letter) => {
          const acquired = collected.has(
            cardKey("abc", `/abc/cards/${letter}`),
          );
          return (
            <article
              className={`abc-letter-card${acquired ? "" : " locked"}`}
              key={letter}
            >
              <strong>{acquired ? letter : "?"}</strong>
              <span>
                {acquired ? `${letter.toLowerCase()} sound` : "미획득"}
              </span>
            </article>
          );
        })}
      </section>
    </>
  );
}
