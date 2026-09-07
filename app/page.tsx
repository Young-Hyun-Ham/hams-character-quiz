"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { quizWorlds, type QuizWorld } from "./data";
import { SiteHeader } from "./components/site-header";
import { GamePicker } from "./components/game-picker";

type LayoutMode = "web" | "tablet" | "mobile";

function detectLayoutMode(): LayoutMode {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shortSide = Math.min(width, height);

  if (width <= 760 || shortSide < 600) return "mobile";
  if (width <= 1180) return width > height ? "tablet" : "mobile";
  return "web";
}

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export default function Home() {
  const detectedLayout = useSyncExternalStore(
    subscribeToViewport,
    detectLayoutMode,
    () => "web",
  );
  const [selectedLayout, setSelectedLayout] = useState<LayoutMode | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<QuizWorld | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const layoutMode = selectedLayout ?? detectedLayout;
  const quizHref =
    selectedWorld &&
    (layoutMode === "web"
      ? `/quiz/${selectedWorld.slug}`
      : `/quiz/${selectedWorld.slug}?layout=${layoutMode}`);

  useEffect(() => {
    if (!selectedWorld || gamesOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedWorld(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [selectedWorld, gamesOpen]);

  return (
    <main className="home-shell">
      <div className="sky-decoration cloud-one" />
      <div className="sky-decoration cloud-two" />
      <SiteHeader />
      <section className="hero">
        <span className="hero-badge">한글 · 그리기 놀이</span>
        <h1>
          어떤 친구와
          <br />
          <em>오늘 놀아볼까?</em>
        </h1>
        <p>좋아하는 친구를 골라 퀴즈를 풀거나 그림을 그려봐요!</p>
        <div
          className="layout-picker"
          role="group"
          aria-label="퀴즈 화면 배치 선택"
        >
          <button
            type="button"
            className={layoutMode === "web" ? "active" : ""}
            aria-pressed={layoutMode === "web"}
            onClick={() => setSelectedLayout("web")}
          >
            <strong>웹형</strong>
            <small>기본</small>
          </button>
          <button
            type="button"
            className={layoutMode === "tablet" ? "active" : ""}
            aria-pressed={layoutMode === "tablet"}
            onClick={() => setSelectedLayout("tablet")}
          >
            <strong>가로형</strong>
            <small>태블릿</small>
          </button>
          <button
            type="button"
            className={layoutMode === "mobile" ? "active" : ""}
            aria-pressed={layoutMode === "mobile"}
            onClick={() => setSelectedLayout("mobile")}
          >
            <strong>세로형</strong>
            <small>모바일</small>
          </button>
        </div>
      </section>
      <section className="world-grid" aria-label="캐릭터 세계 선택">
        {quizWorlds.map((world, index) => (
          <button
            className="world-card"
            type="button"
            key={world.slug}
            style={
              {
                "--card": world.color,
                "--soft": world.softColor,
                "--delay": `${index * 90}ms`,
              } as React.CSSProperties
            }
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setSelectedWorld(world);
            }}
            aria-haspopup="dialog"
          >
            <div className="card-sparkles" aria-hidden="true">
              ✦　·　✧
            </div>
            <div className="character-bubble">
              <Image
                src={world.cover}
                alt=""
                width={190}
                height={190}
                unoptimized
              />
            </div>
            <div className="world-copy">
              <span>{world.english}</span>
              <h2>{world.title}</h2>
              <p>{world.description}</p>
            </div>
            <span className="go-button" aria-hidden="true">
              →
            </span>
          </button>
        ))}
        <button
          className="coming-card"
          type="button"
          aria-label="새로운 친구 준비 중"
        >
          <span>＋</span>
          <strong>새로운 친구</strong>
          <small>곧 만나요!</small>
        </button>
      </section>
      <footer className="home-footer">
        <span>♥</span> 매일 10분, 즐거운 한글 습관
        <Link
          className={`inquiry-link`}
          href="/inquiries"
        >
          문의하기
        </Link>
      </footer>
      {selectedWorld && !gamesOpen && (
        <div
          className="activity-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWorld(null);
          }}
        >
          <section
            className="activity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
            style={
              {
                "--theme": selectedWorld.color,
                "--soft": selectedWorld.softColor,
              } as React.CSSProperties
            }
          >
            <button
              ref={closeButtonRef}
              className="activity-close"
              type="button"
              onClick={() => setSelectedWorld(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <div className="activity-character">
              <Image
                src={selectedWorld.cover}
                alt=""
                width={112}
                height={112}
                unoptimized
              />
            </div>
            <span className="activity-kicker">{selectedWorld.english}</span>
            <h2 id="activity-title">{selectedWorld.title}와 무엇을 할까요?</h2>
            <p>하고 싶은 놀이를 하나 골라주세요.</p>
            <div className="activity-options">
              <Link
                className="activity-option quiz-option"
                href={quizHref || "#"}
              >
                <span aria-hidden="true">✎</span>
                <div>
                  <strong>이름 퀴즈</strong>
                  <small>이름을 따라 쓰고 맞혀봐요</small>
                </div>
                <b aria-hidden="true">›</b>
              </Link>
              <Link
                className="activity-option draw-option"
                href={`/draw/${selectedWorld.slug}`}
              >
                <span aria-hidden="true">🎨</span>
                <div>
                  <strong>캐릭터 그리기</strong>
                  <small>도감 가이드를 따라 그려봐요</small>
                </div>
                <b aria-hidden="true">›</b>
              </Link>
              <Link
                className="activity-option sound-option"
                href={`/soundbook/${selectedWorld.slug}`}
              >
                <span aria-hidden="true">🎙️</span>
                <div>
                  <strong>목소리 사운드북</strong>
                  <small>친구의 이름을 말해 맞혀봐요</small>
                </div>
                <b aria-hidden="true">›</b>
              </Link>
              <button
                className="activity-option games-option"
                type="button"
                onClick={() => setGamesOpen(true)}
                aria-haspopup="dialog"
              >
                <span aria-hidden="true">🎮</span>
                <div>
                  <strong>게임하기</strong>
                  <small>친구들과 즐거운 게임을 해봐요</small>
                </div>
                <b aria-hidden="true">›</b>
              </button>
            </div>
          </section>
        </div>
      )}
      {selectedWorld && gamesOpen && (
        <GamePicker
          world={selectedWorld}
          onBack={() => setGamesOpen(false)}
          onClose={() => {
            setGamesOpen(false);
            setSelectedWorld(null);
            triggerRef.current?.focus();
          }}
        />
      )}
    </main>
  );
}
