"use client";
import { StickerReward } from "../../../components/sticker-reward";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useState, type CSSProperties } from "react";
import type { QuizWorld } from "../../../data";
import { GamePicker } from "../../../components/game-picker";
import {
  createMemoryDeck,
  initialMemoryState,
  memoryReducer,
  type MemoryCard,
} from "./memory-state";
import type { MemoryLevel } from "../../memory-levels";
import "../../memory.css";

export default function MemoryGame({
  world,
  initialCards,
  level,
}: {
  world: QuizWorld;
  initialCards: MemoryCard[];
  level: MemoryLevel;
}) {
  const [state, dispatch] = useReducer(
    memoryReducer,
    initialCards,
    initialMemoryState,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const complete =
    state.cards.length > 0 && state.matched.length === state.cards.length;
  const pairs = state.matched.length / 2;

  useEffect(() => {
    if (state.selected.length !== 2) return;
    const selected = state.selected;
    const timer = setTimeout(
      () => dispatch({ type: "resolve", ids: selected }),
      1200,
    );
    return () => clearTimeout(timer);
  }, [state.selected]);

  function restart() {
    dispatch({
      type: "restart",
      cards: createMemoryDeck(world.characters, Math.random, level.pairs),
    });
  }

  return (
    <main
      className="memory-shell"
      style={
        {
          "--theme": world.color,
          "--soft": world.softColor,
          "--memory-columns": level.columns,
        } as CSSProperties
      }
    >
      <header className="memory-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>{world.title} 게임 놀이터</strong>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
        >
          게임 고르기
        </button>
      </header>
      <section className="memory-panel" aria-labelledby="memory-title">
        <span className="memory-kicker">
          GAME 01 · MEMORY MATCH · {level.id}단계
        </span>
        <h1 id="memory-title">같은 그림 찾기</h1>
        <p className="memory-instructions">
          두 장씩 골라 같은 친구를 찾아요!
          <br />
          다른 그림을 고르면 두 장이 다시 숨겨져요.
        </p>
        <div className="memory-stats">
          <span>
            찾은 짝{" "}
            <strong>
              {pairs} / {level.pairs}
            </strong>
          </span>
          <span>
            도전 <strong>{state.moves}번</strong>
          </span>
          <button type="button" onClick={restart}>
            처음부터
          </button>
        </div>
        <progress value={pairs} max={level.pairs} aria-label="찾은 카드 쌍" />
        <p className="memory-message" role="status">
          {complete
            ? "모든 친구를 찾았어요! 정말 잘했어요! 🎉"
            : state.selected.length === 2
              ? "두 그림을 확인해요!"
              : state.selected.length === 1
                ? "첫 그림을 기억했나요? 한 장 더 골라주세요!"
                : state.moves
                  ? "다음 짝을 찾아볼까요?"
                  : "카드 한 장을 눌러 시작해요!"}
        </p>
        <div className="memory-board-scroll">
          <div
            className="memory-board"
            role="group"
            aria-label={`${level.columns}행 ${level.columns}열, 총 ${state.cards.length}장의 같은 그림 찾기 카드`}
          >
            {state.cards.map((card, index) => {
              const matched = state.matched.includes(card.id);
              const faceUp = matched || state.revealed.includes(card.id);
              const selected = state.selected.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-card${faceUp ? " is-flipped" : ""}${matched ? " is-matched" : ""}${selected ? " is-selected" : ""}`}
                  aria-label={`${index + 1}번 카드, ${matched ? `${card.character.name}, 찾은 짝` : faceUp ? card.character.name : selected ? "첫 번째로 고른 카드" : "뒤집어서 확인하기"}`}
                  aria-pressed={selected || matched}
                  aria-disabled={
                    matched || selected || state.selected.length === 2
                  }
                  onClick={() => dispatch({ type: "select", id: card.id })}
                >
                  <span className="memory-card-inner" aria-hidden="true">
                    <span className="memory-card-back">
                      <span className="memory-card-mark">✦</span>
                      <small>{String(index + 1).padStart(2, "0")}</small>
                    </span>
                    <span className="memory-card-front">
                      <Image
                        src={card.character.image}
                        alt=""
                        width={120}
                        height={120}
                        unoptimized
                        loading="eager"
                      />
                      {matched && <span className="memory-match-check">✓</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {complete && (
          <section className="memory-complete" aria-label="게임 완료 결과">
            <StickerReward
              kind={
                level.id === 1
                  ? "memory1"
                  : level.id === 2
                    ? "memory2"
                    : "memory3"
              }
              total={level.pairs}
              correct={pairs}
            />
            <span aria-hidden="true">🏆</span>
            <h2>{level.pairs}쌍 모두 찾았어요!</h2>
            <p>{state.moves}번 도전해서 성공했어요.</p>
            <div>
              <button type="button" onClick={restart}>
                다시 게임하기
              </button>
              <button type="button" onClick={() => setPickerOpen(true)}>
                게임 고르기
              </button>
            </div>
          </section>
        )}
      </section>
      {pickerOpen && (
        <GamePicker
          world={world}
          onClose={() => setPickerOpen(false)}
          onPlayMemory={(nextLevel) => {
            setPickerOpen(false);
            if (nextLevel === level.id) restart();
          }}
        />
      )}
    </main>
  );
}
