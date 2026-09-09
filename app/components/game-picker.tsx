"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { QuizWorld } from "../data";
import { memoryLevels, type MemoryLevelId } from "../games/memory-levels";
import "../games/game-picker.css";
import { CharacterType } from "../types";

const TitleIcons = ["🃏", "🌟", "🎈", "🧩", "🎯", "🚀", "🎵", "🌈", "🎁"];
const gameKinds: {
  id: string;
  label: string;
  order: number;
  title: string;
  description: string;
  icon: string;
  status: string;
  slugs: CharacterType[];
  href?: string;
  actionLabel: string;
}[] = [
  {
    id: "memory",
    label: "GAME 01",
    order: 1,
    title: "같은 그림 찾기",
    description: "카드 속 같은 친구를 찾아보세요",
    icon: TitleIcons[0],
    status: "available",
    slugs: ["pokemon", "teenieping", "wishcat", "mystery-apt", "cinnamoroll"],
    actionLabel: "레벨 선택 →",
  },
  {
    id: "pokeball",
    label: "GAME 02",
    order: 2,
    title: "몬스터볼 던지기",
    description: "몬스터볼 수를 맞추고\n10을 만들어 포켓몬을 잡아요",
    icon: "🔴",
    status: "available",
    slugs: ["pokemon"],
    href: "/games/pokemon/pokeball",
    actionLabel: "게임 시작 →",
  },
  {
    id: "ghost-password",
    label: "GAME 02",
    order: 2,
    title: "귀신 퇴치 비밀번호",
    description: "부적 계산과 수의 크기 비교로\n결계를 풀고 귀신을 정화해요",
    icon: "🔮",
    status: "available",
    slugs: ["mystery-apt"],
    href: "/games/mystery-apt/ghost-password",
    actionLabel: "게임 시작 →",
  },
  {
    id: "magic-dessert",
    label: "GAME 02",
    order: 2,
    title: "마법 디저트 파티",
    description: "10의 짝과 수 패턴을 찾아\n마법의 파티를 완성해요",
    icon: "🍰",
    status: "available",
    slugs: ["teenieping", "wishcat", "cinnamoroll"],
    href: "/games/[slug]/magic-dessert",
    actionLabel: "게임 시작 →",
  },
  {
    id: "pokemon-bag-sort",
    label: "GAME 03",
    order: 3,
    title: "포켓몬 박사님의 가방 정리",
    description: "포켓몬을 종류별로 나누고\n모두 몇 마리인지 세어 봐요",
    icon: "🎒",
    status: "available",
    slugs: ["pokemon"],
    href: "/games/pokemon/bag-sort",
    actionLabel: "게임 시작 →",
  },
  {
    id: "secret-map",
    label: "GAME 03",
    order: 3,
    title: "마법의 비밀 지도",
    description: "흩어진 도형 조각을 맞춰\n귀신이 숨은 장소를 찾아요",
    icon: "🗺️",
    status: "available",
    slugs: ["mystery-apt"],
    href: "/games/mystery-apt/secret-map",
    actionLabel: "게임 시작 →",
  },
  {
    id: "dessert-time",
    label: "GAME 03",
    order: 3,
    title: "디저트 타임",
    description: "시계 바늘을 움직여\n파티 약속 시간을 맞춰요",
    icon: "🕒",
    status: "available",
    slugs: ["teenieping", "wishcat", "cinnamoroll"],
    href: "/games/[slug]/dessert-time",
    actionLabel: "게임 시작 →",
  },
];

export function GamePicker({
  world,
  onClose,
  onBack,
  onPlayMemory,
}: {
  world: QuizWorld;
  onClose: () => void;
  onBack?: () => void;
  onPlayMemory?: (level: MemoryLevelId) => void;
}) {
  const [showLevels, setShowLevels] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const memoryButtonRef = useRef<HTMLButtonElement>(null);
  const firstLevelRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (showLevels) firstLevelRef.current?.focus();
    else memoryButtonRef.current?.focus();
  }, [showLevels]);

  return (
    <dialog
      ref={dialogRef}
      className="game-picker"
      aria-labelledby="game-picker-title"
      style={
        { "--theme": world.color, "--soft": world.softColor } as CSSProperties
      }
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="game-picker-toolbar">
        {showLevels ? (
          <button type="button" onClick={() => setShowLevels(false)}>
            ← 게임 선택
          </button>
        ) : (
          onBack && (
            <button type="button" onClick={onBack}>
              ← 놀이 선택
            </button>
          )
        )}
        <button
          type="button"
          className="game-picker-close"
          onClick={onClose}
          aria-label="게임 선택 닫기"
        >
          ×
        </button>
      </div>
      <span className="game-picker-kicker">
        {world.slug}:{world.title} 게임 놀이터
      </span>
      <h2 id="game-picker-title">
        {showLevels ? "같은 그림 찾기 · 레벨 선택" : "어떤 게임을 해볼까요?"}
      </h2>
      <p>
        {showLevels
          ? "도전하고 싶은 단계를 골라주세요!"
          : "좋아하는 놀이를 골라 시작해요!"}
      </p>
      {showLevels ? (
        <div
          className="game-picker-grid memory-level-grid"
          aria-label="같은 그림 찾기 3단계"
        >
          {memoryLevels.map((level) => (
            <Link
              key={level.id}
              ref={level.id === 1 ? firstLevelRef : undefined}
              className="game-picker-card available memory-level-card"
              href={`/games/${world.slug}/memory?level=${level.id}`}
              onClick={() => onPlayMemory?.(level.id)}
            >
              <small>LEVEL {level.id}</small>
              <span className="game-picker-icon" aria-hidden="true">
                {level.icon}
              </span>
              <strong>{level.id}단계</strong>
              <span className="game-picker-description">
                {level.columns} × {level.columns}
                <br />
                {level.description}
              </span>
              <b>
                {level.pairs}쌍 · {level.pairs * 2}장
              </b>
            </Link>
          ))}
        </div>
      ) : (
        <div className="game-picker-grid" aria-label="9개의 게임">
          {gameKinds
            .filter((game) => game.slugs.includes(world.slug))
            .sort((left, right) => left.order - right.order)
            .map((game) =>
              game.status === "available" ? (
                game.href ? (
                  <Link
                    key={game.id}
                    className="game-picker-card available"
                    href={game.href.replace("[slug]", world.slug)}
                  >
                    <GameCardContent game={game} />
                  </Link>
                ) : (
                  <button
                    ref={memoryButtonRef}
                    key={game.id}
                    type="button"
                    className="game-picker-card available"
                    onClick={() => setShowLevels(true)}
                  >
                    <GameCardContent game={game} />
                  </button>
                )
              ) : (
                <section
                  className="game-picker-card upcoming"
                  key={game.id}
                  aria-label={`${game.label}, 준비 중`}
                >
                  <GameCardContent game={game} />
                </section>
              ),
            )}
        </div>
      )}
    </dialog>
  );
}

function GameCardContent({ game }: { game: (typeof gameKinds)[number] }) {
  const descriptionLines = game.description.split("\n");
  return (
    <>
      <small>{game.label}</small>
      <span className="game-picker-icon" aria-hidden="true">
        {game.icon}
      </span>
      <strong>{game.title}</strong>
      <span className="game-picker-description">
        {descriptionLines.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </span>
      <b>{game.actionLabel}</b>
    </>
  );
}
