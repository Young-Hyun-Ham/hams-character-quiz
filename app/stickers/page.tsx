"use client";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "../components/site-header";
import {
  balance,
  LABELS,
  lockAdmin,
  readStore,
  RULES,
  saveRules,
  unlock,
  type RewardKind,
} from "./storage";
import "./stickers.css";

export default function StickersPage() {
  const [mode, setMode] = useState<
    "loading" | "setup" | "login" | "manage" | "blocked" | "error"
  >("loading");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [rules, setRules] = useState(RULES);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function load() {
      lockAdmin();
      try {
        const data = readStore();
        setRules(data.rules);
        setCount(balance(data));
        setMode(
          !data.admin
            ? "setup"
            : data.admin.failures >= 5
              ? "blocked"
              : "login",
        );
        if (data.admin && data.admin.failures >= 5)
          setMessage("관리자에게 문의 하세요.");
      } catch {
        setMode("error");
        setMessage(
          "저장 데이터를 읽지 못했어요. 브라우저 저장 공간을 확인해 주세요.",
        );
      }
    }
    load();
    window.addEventListener("storage", load);
    return () => {
      lockAdmin();
      window.removeEventListener("storage", load);
    };
  }, []);
  useEffect(() => {
    if (message) dialog.current?.showModal();
  }, [message]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (mode === "setup" && !first) {
      setFirst(pin);
      setPin("");
      input.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await unlock(
        mode === "setup" ? first : pin,
        mode === "setup" ? pin : undefined,
      );
      const data = readStore();
      setRules(data.rules);
      setCount(balance(data));
      setMode("manage");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "암호를 확인하지 못했어요.",
      );
      if (mode === "setup") setFirst("");
      try {
        if ((readStore().admin?.failures ?? 0) >= 5) setMode("blocked");
      } catch {}
    } finally {
      setPin("");
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveRules(rules);
      setMessage("스티커 지급 수량을 저장했어요. 다음 획득부터 적용돼요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="stickers-shell">
      <SiteHeader />
      <section className="stickers-card">
        <span>⭐ STICKERS</span>
        <h1>스티커관리</h1>
        <p>이 브라우저에서 모은 스티커와 지급 수량을 관리해요.</p>
        {mode === "loading" ? (
          <p>저장 정보를 확인하고 있어요…</p>
        ) : mode === "error" ? (
          <p>저장 공간을 확인한 뒤 새로고침해 주세요.</p>
        ) : mode === "blocked" ? (
          <p role="alert">
            암호를 5회 잘못 입력했어요. 관리자에게 문의 하세요.
          </p>
        ) : mode === "manage" ? (
          <>
            <h2>모은 스티커 {count}개</h2>
            <form onSubmit={save}>
              {(Object.keys(RULES) as RewardKind[]).map((kind) => (
                <label className="sticker-rule" key={kind}>
                  <span>{LABELS[kind]}</span>
                  <input
                    aria-label={`${LABELS[kind]} 스티커 수량`}
                    type="number"
                    min="0"
                    max="999"
                    step="1"
                    required
                    value={Number.isNaN(rules[kind]) ? "" : rules[kind]}
                    onChange={(event) =>
                      setRules({
                        ...rules,
                        [kind]:
                          event.target.value === ""
                            ? NaN
                            : Number(event.target.value),
                      })
                    }
                  />
                  <span>개</span>
                </label>
              ))}
              <button disabled={busy}>지급 수량 저장</button>
            </form>
            <button
              className="sticker-secondary"
              onClick={() => {
                lockAdmin();
                setMode("login");
              }}
            >
              관리 화면 잠그기
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>
              {mode === "setup"
                ? first
                  ? "암호를 한 번 더 입력해 주세요"
                  : "관리자 암호를 만들어 주세요"
                : "관리자 암호를 입력해 주세요"}
            </h2>
            <p>
              숫자 6자리
              {mode === "login"
                ? " · 5회 틀리면 관리 화면이 잠겨요."
                : "로 설정해 주세요."}
            </p>
            <input
              ref={input}
              className="sticker-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label={first ? "관리자 암호 확인" : "관리자 암호"}
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
              {busy ? "확인 중…" : mode === "setup" && !first ? "다음" : "확인"}
            </button>
          </form>
        )}
        <small>
          현재 스티커와 암호는 이 브라우저에만 저장돼요. 저장 데이터를 삭제하면
          초기화되며 다른 기기와 공유되지 않아요.
        </small>
      </section>
      <dialog
        ref={dialog}
        className="sticker-dialog"
        onCancel={() => setMessage("")}
      >
        <h2>알림</h2>
        <p>{message}</p>
        <button
          onClick={() => {
            dialog.current?.close();
            setMessage("");
            input.current?.focus();
          }}
        >
          확인
        </button>
      </dialog>
    </main>
  );
}
