"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../components/site-header";
import {
  changeAdminPin,
  lockAdmin,
  readStore,
  refreshStore,
  unlock,
} from "../stickers/storage";
import "../stickers/stickers.css";
import "./password.css";

type Mode = "loading" | "setup" | "login" | "change" | "blocked" | "error";

export default function PasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const successDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    lockAdmin();
    void refreshStore()
      .then(() => {
        const admin = readStore().admin;
        setMode(!admin ? "setup" : admin.failures >= 5 ? "blocked" : "login");
      })
      .catch(() => setMode("error"));
    return lockAdmin;
  }, []);

  function resetEntry() {
    setPin("");
    setFirst("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if ((mode === "setup" || mode === "change") && !first) {
      setFirst(pin);
      setPin("");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "setup") {
        await unlock(first, pin);
        setMode("change");
        setMessage("관리자 암호를 설정했어요.");
      } else if (mode === "login") {
        await unlock(pin);
        setMode("change");
        setMessage("확인됐어요. 이제 새 암호를 설정할 수 있어요.");
      } else if (mode === "change") {
        await changeAdminPin(first, pin);
        setPin("");
        setFirst("");
        successDialogRef.current?.showModal();
        return;
      }
      resetEntry();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "암호를 처리하지 못했어요.",
      );
      resetEntry();
      if ((readStore().admin?.failures ?? 0) >= 5) setMode("blocked");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "setup"
      ? first
        ? "암호를 한 번 더 입력해 주세요"
        : "관리자 암호를 만들어 주세요"
      : mode === "login"
        ? "현재 관리자 암호를 입력해 주세요"
        : first
          ? "새 암호를 한 번 더 입력해 주세요"
          : "새 관리자 암호를 입력해 주세요";

  return (
    <main className="stickers-shell password-shell">
      <SiteHeader />
      <section className="stickers-card password-card">
        <span>🔐 PARENT PASSWORD</span>
        <h1>암호 관리</h1>
        <p>부모 기능을 보호하는 숫자 6자리 관리자 암호를 관리해요.</p>
        {mode === "loading" ? (
          <p>암호 정보를 확인하고 있어요…</p>
        ) : mode === "error" ? (
          <p role="alert">암호 정보를 불러오지 못했어요. 새로고침해 주세요.</p>
        ) : mode === "blocked" ? (
          <p role="alert">
            암호를 5회 잘못 입력했어요. 관리자에게 문의 하세요.
          </p>
        ) : (
          <form onSubmit={submit}>
            <h2>{title}</h2>
            <p>
              {mode === "login"
                ? "암호 확인 후 변경 화면으로 이동해요."
                : "숫자 6자리로 입력해 주세요."}
            </p>
            <input
              ref={inputRef}
              className="sticker-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label={
                mode === "login"
                  ? "현재 관리자 암호"
                  : first
                    ? "새 관리자 암호 확인"
                    : "새 관리자 암호"
              }
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              autoFocus
            />
            <button disabled={busy || pin.length !== 6}>
              {busy
                ? "처리 중…"
                : (mode === "setup" || mode === "change") && !first
                  ? "다음"
                  : mode === "login"
                    ? "암호 확인"
                    : mode === "setup"
                      ? "암호 설정"
                      : "암호 변경"}
            </button>
          </form>
        )}
        {message && (
          <p className="password-message" role="status">
            {message}
          </p>
        )}
        <small>
          이 암호는 스티커 관리, 부모용 회원 정보, 구매 확인과 취소에 공통으로
          사용돼요.
        </small>
      </section>
      <dialog
        ref={successDialogRef}
        className="sticker-dialog password-success-dialog"
        onCancel={(event) => event.preventDefault()}
      >
        <span aria-hidden="true">✅</span>
        <h2>암호 변경 완료</h2>
        <p>관리자 암호가 변경되었습니다.</p>
        <button
          type="button"
          onClick={() => {
            successDialogRef.current?.close();
            router.replace("/");
          }}
        >
          확인
        </button>
      </dialog>
    </main>
  );
}
