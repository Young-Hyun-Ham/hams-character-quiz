"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { quizWorlds } from "./data";

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
  const detectedLayout = useSyncExternalStore(subscribeToViewport, detectLayoutMode, () => "web");
  const [selectedLayout, setSelectedLayout] = useState<LayoutMode | null>(null);
  const layoutMode = selectedLayout ?? detectedLayout;

  return (
    <main className="home-shell">
      <div className="sky-decoration cloud-one" /><div className="sky-decoration cloud-two" />
      <header className="home-header">
        <div className="brand" aria-label="한글 몬스터 홈"><span className="brand-mark">ㅎ</span><span>한글 몬스터</span></div>
        <div className="parent-link"><span>☆</span> 오늘도 즐겁게!</div>
      </header>
      <section className="hero"><span className="hero-badge">한글 놀이 학습</span><h1>어떤 친구와<br /><em>한글을 배워볼까?</em></h1><p>좋아하는 친구를 골라 이름을 따라 써봐요!</p>
        <div className="layout-picker" role="group" aria-label="퀴즈 화면 배치 선택">
          <button type="button" className={layoutMode === "web" ? "active" : ""} aria-pressed={layoutMode === "web"} onClick={() => setSelectedLayout("web")}><strong>웹형</strong><small>기본</small></button>
          <button type="button" className={layoutMode === "tablet" ? "active" : ""} aria-pressed={layoutMode === "tablet"} onClick={() => setSelectedLayout("tablet")}><strong>가로형</strong><small>태블릿</small></button>
          <button type="button" className={layoutMode === "mobile" ? "active" : ""} aria-pressed={layoutMode === "mobile"} onClick={() => setSelectedLayout("mobile")}><strong>세로형</strong><small>모바일</small></button>
        </div>
      </section>
      <section className="world-grid" aria-label="퀴즈 선택">
        {quizWorlds.map((world, index) => (
          <Link className="world-card" href={layoutMode === "web" ? `/quiz/${world.slug}` : `/quiz/${world.slug}?layout=${layoutMode}`} key={world.slug} style={{ "--card": world.color, "--soft": world.softColor, "--delay": `${index * 90}ms` } as React.CSSProperties}>
            <div className="card-sparkles" aria-hidden="true">✦　·　✧</div>
            <div className="character-bubble"><Image src={world.cover} alt="" width={190} height={190} unoptimized /></div>
            <div className="world-copy"><span>{world.english}</span><h2>{world.title}</h2><p>{world.description}</p></div><span className="go-button" aria-hidden="true">→</span>
          </Link>
        ))}
        <button className="coming-card" type="button" aria-label="새로운 친구 준비 중"><span>＋</span><strong>새로운 친구</strong><small>곧 만나요!</small></button>
      </section>
      <footer className="home-footer"><span>♥</span> 매일 10분, 즐거운 한글 습관</footer>
    </main>
  );
}
