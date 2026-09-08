"use client";

import { useEffect, useRef } from "react";
import "./login-prompt-modal.css";

export async function isAuthenticated() {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return false;
    const payload = await response.json() as { user?: unknown };
    return Boolean(payload.user);
  } catch { return false; }
}

export function LoginPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  function login() {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    const destination = new URL("/api/sso/login", window.location.origin);
    destination.searchParams.set("returnTo", returnTo);
    window.location.assign(destination.href);
  }
  return <dialog ref={dialogRef} className="login-prompt-modal" aria-labelledby="login-prompt-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><h2 id="login-prompt-title">로그인이 필요해요</h2><p>도감 카드는 로그인한 뒤 획득할 수 있어요.</p><div><button type="button" className="login-prompt-primary" onClick={login}>로그인 하러 가기</button><button type="button" onClick={onClose}>닫기</button></div></dialog>;
}
