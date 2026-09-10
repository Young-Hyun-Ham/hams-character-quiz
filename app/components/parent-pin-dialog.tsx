"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  isAdminAuthorized,
  readStore,
  refreshStore,
  unlock,
} from "../stickers/storage";
import "./parent-pin-dialog.css";

export function ParentPinDialog({
  open,
  onCancel,
  onUnlocked,
}: {
  open: boolean;
  onCancel: () => void;
  onUnlocked: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onUnlockedRef = useRef(onUnlocked);
  const [mode, setMode] = useState<"loading" | "login" | "setup" | "blocked">(
    "loading",
  );
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setPin("");
      setMessage("");
      setMode("loading");
      try {
        await refreshStore();
        if (cancelled) return;
        const admin = readStore().admin;
        if (!admin) setMode("setup");
        else if (admin.failures >= 5) router.replace("/password");
        else if (isAdminAuthorized()) onUnlockedRef.current();
        else {
          setMode("login");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      } catch {
        if (cancelled) return;
        setMode("login");
        setMessage("암호 정보를 불러오지 못했어요. 다시 시도해 주세요.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || pin.length !== 6) return;
    setBusy(true);
    setMessage("");
    try {
      await unlock(pin);
      onUnlockedRef.current();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "암호를 확인하지 못했어요.",
      );
      if ((readStore().admin?.failures ?? 0) >= 5) {
        setMode("blocked");
        router.replace("/password");
      }
    } finally {
      setPin("");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="parent-pin-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <button
        className="parent-pin-close"
        type="button"
        onClick={onCancel}
        aria-label="닫기"
      >
        ×
      </button>
      <span>🔒 PARENT ACCESS</span>
      <h2>부모님 확인</h2>
      {mode === "loading" ? (
        <p>암호 정보를 확인하고 있어요…</p>
      ) : mode === "setup" ? (
        <>
          <p>부모 기능을 사용하려면 먼저 관리자 암호를 설정해 주세요.</p>
          <Link href="/password" onClick={onCancel}>
            암호 설정하기
          </Link>
        </>
      ) : mode === "blocked" ? (
        <p role="alert">암호를 5회 잘못 입력했어요. 관리자에게 문의 하세요.</p>
      ) : (
        <form onSubmit={submit}>
          <p>숫자 6자리 관리자 암호를 입력해 주세요.</p>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={pin}
            aria-label="관리자 암호"
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />
          {message && (
            <p className="parent-pin-error" role="alert">
              {message}
            </p>
          )}
          <button type="submit" disabled={busy || pin.length !== 6}>
            {busy ? "확인 중…" : "확인"}
          </button>
        </form>
      )}
    </dialog>
  );
}
