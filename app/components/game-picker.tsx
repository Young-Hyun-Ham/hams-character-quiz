"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { QuizWorld } from "../data";
import { memoryLevels, type MemoryLevelId } from "../games/memory-levels";
import "../games/game-picker.css";
import { CharacterType } from "../types";

const TitleIcons = [ "🃏", "🌟", "🎈", "🧩", "🎯", "🚀", "🎵", "🌈", "🎁" ];
const gameKinds: { id: string; label: string; order: number; title: string; description: string; icon: string; status: string; slugs: CharacterType[] }[] = [
  {
    id: "memory",
    label: "GAME 01",
    order: 1,
    title: "같은 그림 찾기",
    description: "카드 속 같은 친구를 찾아보세요",
    icon: TitleIcons[0],
    status: "available",
    slugs: ["pokemon", "teenieping", "wishcat", "mystery-apt", "cinnamoroll"],
  },
  {
    id: "xxx",
    label: "GAME 02",
    order: 2,
    title: "새로운 게임",
    description: "곧 만나요!",
    icon: TitleIcons[1],
    status: "upcoming",
    slugs: ["pokemon", "teenieping", "wishcat", "mystery-apt", "cinnamoroll"],
  },
  {
    id: "xxx2",
    label: "GAME 03",
    order: 3,
    title: "새로운 게임3",
    description: "곧 만나요!",
    icon: TitleIcons[2],
    status: "upcoming",
    slugs: ["pokemon", "teenieping", "wishcat", "mystery-apt", "cinnamoroll"],
  },
]

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
      <span className="game-picker-kicker">{world.slug}:{world.title} 게임 놀이터</span>
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
          {gameKinds.map((game, index) => 
            game.status === "available" ? (
              game.slugs.includes(world.slug) ? (
                <button
                  ref={memoryButtonRef}
                  type="button"
                  className="game-picker-card available"
                  onClick={() => setShowLevels(true)}
                >
                  <small>GAME {String(index + 1).padStart(2, "0")}</small>
                  <span className="game-picker-icon" aria-hidden="true">
                    {game.icon}
                  </span>
                  <strong>{game.title}</strong>
                  <span className="game-picker-description">{game.description}</span>
                  <b>레벨 선택 →</b>
                </button>
              ) : null)
            : 
              game.slugs.includes(world.slug) ? (
                <section
                  className="game-picker-card upcoming"
                  key={index}
                  aria-label={`게임 ${index + 1}, 준비 중`}
                >
                  <small>GAME {String(index + 1).padStart(2, "0")}</small>
                  <span className="game-picker-icon" aria-hidden="true">
                    {game.icon}
                  </span>
                  <strong>{game.title}</strong>
                  <span className="game-picker-description">{game.description}</span>
                  <b>준비 중</b>
                </section>
              )
            : null)
          }
        </div>
      )}
    </dialog>
  );
}
