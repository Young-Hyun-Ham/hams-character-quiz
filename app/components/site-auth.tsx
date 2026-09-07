"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { HeaderUser } from "../types/auth";
import { balance } from "../stickers/storage";
import "./site-auth.css";

type AuthState = { status: "loading" | "ready" | "error"; user: HeaderUser | null };
const genderLabels = { male: "남", female: "여", other: "기타", prefer_not_to_say: "미공개" };
function subscribeStickers(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("stickers-changed", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("stickers-changed", callback); };
}
function stickerSnapshot() { try { return balance(); } catch { return null; } }

export function SiteAuth() {
  const pathname = usePathname();
  const [retry, setRetry] = useState(0);
  const [auth, setAuth] = useState<AuthState>({ status: "loading", user: null });
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [parentFor, setParentFor] = useState<string | null>(null);
  const stickerCount = useSyncExternalStore(subscribeStickers, stickerSnapshot, () => null);
  const isParent = !!auth.user && parentFor === auth.user.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const accountKey = auth.user ? `${pathname}:${auth.user.id}` : null;
  const isOpen = accountKey !== null && openFor === accountKey && auth.status === "ready";

  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenFor(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpenFor(null); toggleRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen]);

  useEffect(() => {
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: current.signal });
        if (!response.ok) throw new Error("session_unavailable");
        const payload = await response.json() as { user: HeaderUser | null };
        if (!current.signal.aborted) setAuth({ status: "ready", user: payload.user });
      } catch {
        if (!current.signal.aborted) setAuth({ status: "error", user: null });
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, retry]);

  function navigate(endpoint: "sso/login" | "auth/logout" | "auth/profile", services = false) {
    const returnTo = window.location.pathname === "/login"
      ? new URLSearchParams(window.location.search).get("returnTo") || "/"
      : window.location.pathname + window.location.search + window.location.hash;
    const destination = new URL(`/api/${endpoint}`, window.location.origin);
    destination.searchParams.set("returnTo", returnTo);
    if (services) destination.searchParams.set("destination", "services");
    setOpenFor(null);
    // Auth endpoints set cookies and redirect across origins, so navigate the document.
    window.location.assign(destination.href);
  }

  return <div ref={containerRef} className="site-auth" aria-label="HAMS 계정" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenFor(null);
  }}>
    {auth.status === "loading" ? <button className="auth-button" type="button" disabled aria-label="로그인 상태 확인 중">확인 중…</button>
      : auth.status === "error" ? <button className="auth-button" type="button" onClick={() => setRetry((value) => value + 1)} title="로그인 상태를 확인하지 못했어요. 눌러서 다시 확인해 주세요.">로그인 재확인</button>
      : auth.user ? <>
        <button ref={toggleRef} className="account-toggle" type="button" aria-label={isOpen ? "회원 정보 닫기" : "회원 정보 열기"}
          aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={() => setOpenFor(isOpen ? null : accountKey)}>
          <span className="account-avatar" aria-hidden="true">{Array.from(auth.user.nickname.trim())[0]?.toUpperCase() || "나"}</span>
          <span className="account-caret" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && <section id={panelId} className="account-popover" aria-labelledby={`${panelId}-name`}>
          <div className="account-identity"><div className="account-person"><strong id={`${panelId}-name`}>{auth.user.nickname}</strong><span>{auth.user.email || "이메일 미등록"}</span></div><div className="account-mode" role="group" aria-label="회원 메뉴 모드"><button type="button" aria-pressed={!isParent} onClick={() => setParentFor(null)}>자녀</button><button type="button" aria-pressed={isParent} onClick={() => setParentFor(auth.user!.id)}>부모</button></div></div>
          {isParent ? <>
          <dl className="account-details">
            <div><dt>생년월일</dt><dd>{auth.user.birthDate || "미등록"}</dd></div>
            <div><dt>성별</dt><dd>{auth.user.gender ? genderLabels[auth.user.gender] ?? "미등록" : "미등록"}</dd></div>
            <div><dt>서비스사이트</dt><dd>{auth.user.membership?.serviceName || "가입정보 없음"}</dd></div>
            <div><dt>요금제</dt><dd>{auth.user.membership?.plan || "-"}</dd></div>
            <div><dt>AI 사용</dt><dd><span className={`account-ai${auth.user.aiEnabled ? " enabled" : ""}`}>{auth.user.aiEnabled ? "AI ON" : "AI OFF"}</span></dd></div>
          </dl>
          <div className="account-actions">
            <Link href="/stickers" onClick={() => setOpenFor(null)} style={{ display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, color: "#4f6380" }}>스티커관리</Link>
            {/* <button type="button" onClick={() => navigate("auth/profile", true)}>사이트변경</button> */}
            <button type="button" onClick={() => navigate("auth/logout")}>로그아웃</button>
          </div>
          </> : <div className="account-details account-child-details"><div className="account-stickers" role="status"><span>⭐ 모은 스티커</span><strong>{stickerCount === null ? "확인할 수 없어요" : `${stickerCount}개`}</strong></div><Link className="account-catalog" href="/catalog" onClick={() => setOpenFor(null)}>📖 캐릭터 도감 보기</Link></div>}
        </section>}
      </>
      : <button className="auth-button" type="button" onClick={() => navigate("sso/login")}>로그인</button>}
  </div>;
}
