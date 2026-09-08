"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Character } from "../data";
import { cardKey, readCollectedCards } from "./storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("catalog-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("catalog-changed", callback);
  };
}
function snapshot() {
  try {
    return [...readCollectedCards()].sort().join("\n");
  } catch {
    return "";
  }
}

export function CatalogGrid({
  world,
  title,
  allCharacters,
  page,
  pageSize = 60,
}: {
  world: string;
  title: string;
  allCharacters: Character[];
  page: number;
  pageSize?: number;
}) {
  const saved = useSyncExternalStore(subscribe, snapshot, () => "");
  const [selected, setSelected] = useState<Character | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const collected = new Set(saved ? saved.split("\n") : []);
  const acquiredCount = allCharacters.filter((character) =>
    collected.has(cardKey(world, character.image)),
  ).length;
  const characters = allCharacters
    .map((character, index) => ({
      character,
      index,
      acquired: collected.has(cardKey(world, character.image)),
      rare: character.rarity === "rare",
    }))
    .sort(
      (left, right) =>
        Number(right.acquired) - Number(left.acquired) ||
        Number(right.rare) - Number(left.rare) ||
        left.index - right.index,
    )
    .slice((page - 1) * pageSize, page * pageSize)
    .map((item) => item.character);
  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [selected]);
  return (
    <>
      <h2>
        {title} · 획득 {acquiredCount} / 전체 {allCharacters.length}장
      </h2>
      <div className="catalog-grid">
        {characters.map((character, index) => {
          const acquired = collected.has(cardKey(world, character.image));
          const number = character.id ?? allCharacters.indexOf(character) + 1;
          const cardContent = (
            <>
              <span
                className="catalog-card-number"
                aria-label={`도감 번호 ${number}`}
              >
                #{String(number).padStart(3, "0")}
              </span>
              {character.rarity === "rare" && (
                <span className="catalog-rare-badge">RARE</span>
              )}
              <Image
                src={character.image}
                alt={character.name}
                width={160}
                height={160}
                unoptimized
              />
              <strong>{character.name}</strong>
              <span className="catalog-card-status">
                {acquired ? "획득" : "미획득"}
              </span>
            </>
          );
          return (
            <article
              className={`${acquired ? "is-acquired" : "is-locked"}${character.rarity === "rare" ? " is-rare" : ""}`}
              key={`${character.image}-${index}`}
              aria-label={`${character.name} ${acquired ? "획득" : "미획득"}`}
            >
              {acquired ? (
                <button
                  type="button"
                  className="catalog-card-open"
                  onClick={() => setSelected(character)}
                  aria-label={`${character.name} 카드 크게 보기`}
                >
                  {cardContent}
                </button>
              ) : (
                cardContent
              )}
            </article>
          );
        })}
      </div>
      <dialog
        ref={dialogRef}
        className="catalog-card-dialog"
        aria-label={selected ? `${selected.name} 도감 카드` : "도감 카드"}
        onCancel={() => setSelected(null)}
        onClick={() => setSelected(null)}
      >
        {selected && (
          <div className="catalog-card-detail">
            <small>
              #
              {String(
                selected.id ?? allCharacters.indexOf(selected) + 1,
              ).padStart(3, "0")}
            </small>
            <Image
              src={selected.image}
              alt={selected.name}
              width={440}
              height={440}
              unoptimized
              priority
            />
            <strong>{selected.name}</strong>
            <span>화면을 누르면 닫혀요</span>
          </div>
        )}
      </dialog>
    </>
  );
}
