"use client";
import { StickerReward } from "../../components/sticker-reward";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Character, QuizWorld } from "../../data";
import "../soundbook.css";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: (() => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Phase =
  "ready" | "starting" | "listening" | "checking" | "result" | "error";
type Answer = { character: Character; correct: boolean };

const nameColors = [
  "#e53935",
  "#ef6c00",
  "#fdd835",
  "#249447",
  "#1976d2",
  "#303f9f",
  "#8e24aa",
];

function splitNameLines(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .flatMap((word) => {
      const letters = Array.from(word);
      const lines = [];
      for (let offset = 0; offset < letters.length; offset += 6) {
        lines.push(letters.slice(offset, offset + 6));
      }
      return lines;
    });
}

// Ignore spacing and punctuation, but never accept partial names or substring matches.
function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}♀♂]/gu, "");
}

export default function SoundbookGame({
  world,
  initialQuestions,
  initialNameColorSeed = 0,
}: {
  world: QuizWorld;
  initialQuestions: Character[];
  initialNameColorSeed?: number;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [nameColorSeed, setNameColorSeed] = useState(initialNameColorSeed);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [seconds, setSeconds] = useState(3);
  const [transcript, setTranscript] = useState("");
  const [correct, setCorrect] = useState(false);
  const [error, setError] = useState("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const characterRef = useRef<HTMLButtonElement>(null);
  const character = questions[index];
  const finished = index >= questions.length;
  const modalOpen = phase !== "ready";

  useEffect(() => () => cleanupRef.current?.(), []);
  useEffect(() => {
    if (modalOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modalOpen]);

  function closeModal() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPhase("ready");
    characterRef.current?.focus();
  }

  function startListening() {
    cleanupRef.current?.();
    setTranscript("");
    setSeconds(3);
    setError("");
    const speechWindow = window as SpeechWindow;
    const Constructor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor || !window.isSecureContext) {
      setError(
        !window.isSecureContext
          ? "마이크를 사용하려면 HTTPS 주소로 접속해 주세요."
          : "이 브라우저는 음성 인식을 지원하지 않아요. 음성 인식을 지원하는 브라우저에서 다시 열어주세요.",
      );
      setPhase("error");
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let active = true;
    let heard = "";
    let audioStarted = false;
    let listeningComplete = false;
    let endReceived = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let countdown: ReturnType<typeof setInterval> | undefined;
    const dispose = () => {
      active = false;
      timers.forEach(clearTimeout);
      clearInterval(countdown);
      recognition.onaudiostart =
        recognition.onresult =
        recognition.onerror =
        recognition.onend =
          null;
      recognition.abort();
    };
    cleanupRef.current = dispose;
    const fail = (message: string) => {
      if (!active) return;
      dispose();
      setError(message);
      setPhase("error");
    };
    const finish = () => {
      if (!active) return;
      if (!heard.trim()) {
        fail("목소리를 듣지 못했어요. 마이크 가까이에서 다시 말해볼까요?");
        return;
      }
      dispose();
      setTranscript(heard);
      setCorrect(normalizeName(heard) === normalizeName(character.name));
      setPhase("result");
    };
    setPhase("starting");
    timers.push(
      setTimeout(
        () =>
          fail(
            "마이크를 켜지 못했어요. 마이크 권한을 확인하고 다시 시도해 주세요.",
          ),
        20000,
      ),
    );
    recognition.onaudiostart = () => {
      if (!active || audioStarted) return;
      audioStarted = true;
      clearTimeout(timers[0]);
      setPhase("listening");
      const deadline = Date.now() + 3000;
      countdown = setInterval(
        () =>
          setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
        100,
      );
      timers.push(
        setTimeout(() => {
          if (!active) return;
          clearInterval(countdown);
          setSeconds(0);
          listeningComplete = true;
          setPhase("checking");
          if (endReceived) {
            finish();
            return;
          }
          recognition.stop();
          timers.push(
            setTimeout(
              () =>
                fail(
                  "음성 확인이 늦어지고 있어요. 연결을 확인하고 다시 시도해 주세요.",
                ),
              8000,
            ),
          );
        }, 3000),
      );
    };
    recognition.onresult = (event) => {
      if (!active) return;
      heard = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      setTranscript(heard);
    };
    recognition.onerror = ({ error: code }) => {
      const messages: Record<string, string> = {
        "not-allowed":
          "마이크 사용이 허용되지 않았어요. 브라우저 설정에서 마이크를 허용해 주세요.",
        "service-not-allowed":
          "음성 인식 서비스를 사용할 수 없어요. 브라우저 설정을 확인해 주세요.",
        "audio-capture":
          "마이크를 찾지 못했어요. 마이크가 연결되어 있는지 확인해 주세요.",
        "no-speech": "목소리를 듣지 못했어요. 다시 또박또박 말해볼까요?",
        network:
          "음성 인식 연결이 끊겼어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
      };
      fail(messages[code] ?? "음성을 인식하지 못했어요. 다시 시도해 주세요.");
    };
    recognition.onend = () => {
      if (!active) return;
      endReceived = true;
      if (!audioStarted) {
        fail("마이크가 시작되지 않았어요. 다시 시도해 주세요.");
        return;
      }
      if (listeningComplete) finish();
    };
    try {
      recognition.start();
    } catch {
      fail("마이크를 시작하지 못했어요. 다시 시도해 주세요.");
    }
  }

  function nextQuestion() {
    setAnswers((previous) => [...previous, { character, correct }]);
    closeModal();
    setIndex((previous) => previous + 1);
    setNameColorSeed(Math.floor(Math.random() * 0x100000000));
  }

  function restart(items: Character[]) {
    closeModal();
    const shuffled = [...items];
    for (let position = shuffled.length - 1; position > 0; position--) {
      const swap = Math.floor(Math.random() * (position + 1));
      [shuffled[position], shuffled[swap]] = [
        shuffled[swap],
        shuffled[position],
      ];
    }
    setQuestions(shuffled.slice(0, 10));
    setIndex(0);
    setAnswers([]);
    setNameColorSeed(Math.floor(Math.random() * 0x100000000));
  }

  const wrongAnswers = answers.filter((answer) => !answer.correct);
  return (
    <main
      className="soundbook-shell"
      style={
        { "--theme": world.color, "--soft": world.softColor } as CSSProperties
      }
    >
      <header className="soundbook-header">
        <Link href="/">← 놀이 고르기</Link>
        <strong>🎙️ 목소리 사운드북</strong>
        <span>{world.title}</span>
      </header>
      {finished ? (
        <section className="soundbook-card soundbook-summary">
          <StickerReward kind="soundbook" total={answers.length} correct={answers.filter(answer => answer.correct).length} />
          <span className="soundbook-eyebrow">오늘의 목소리 놀이 끝!</span>
          <h1>참 잘했어요! 🎉</h1>
          <p>
            {questions.length}문제 중{" "}
            <strong>
              {answers.filter((answer) => answer.correct).length}문제
            </strong>
            를 맞혔어요.
          </p>
          <ul>
            {answers.map((answer, position) => (
              <li key={`${answer.character.image}-${position}`}>
                <Image
                  src={answer.character.image}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <span>{answer.character.name}</span>
                <strong>{answer.correct ? "정답 ✓" : "다시 배워요"}</strong>
              </li>
            ))}
          </ul>
          <div className="soundbook-actions">
            <button onClick={() => restart(world.characters)}>
              새로운 10문제
            </button>
            {wrongAnswers.length > 0 && (
              <button
                className="secondary"
                onClick={() =>
                  restart(wrongAnswers.map((answer) => answer.character))
                }
              >
                틀린 문제 다시 풀기
              </button>
            )}
            <Link href="/">다른 친구 고르기</Link>
          </div>
        </section>
      ) : (
        <section className="soundbook-card">
          <div className="soundbook-progress">
            <span>
              {index + 1} / {questions.length} 문제
            </span>
            <span>
              정답 {answers.filter((answer) => answer.correct).length}개
            </span>
          </div>
          <progress
            value={index}
            max={questions.length}
            aria-label="퀴즈 진행률"
          />
          <h1>이 친구의 이름은 뭘까요?</h1>
          <p>친구를 누르고, 3초 동안 이름을 말해봐요!</p>
          <div className="soundbook-stage">
            <strong
              className="soundbook-name"
              aria-label={character.name}
              style={{ color: nameColors[nameColorSeed % nameColors.length] }}
            >
              {splitNameLines(character.name).map((line, lineIndex) => (
                <span
                  className="soundbook-name-line"
                  key={lineIndex}
                  aria-hidden="true"
                >
                  {line.map((letter, letterIndex) => (
                    <span key={letterIndex}>{letter}</span>
                  ))}
                </span>
              ))}
            </strong>
            <button
              ref={characterRef}
              className="soundbook-character"
              onClick={startListening}
              aria-label="캐릭터 이름 말하기"
              aria-haspopup="dialog"
            >
              <Image
                src={character.image}
                alt="이름을 맞힐 캐릭터"
                width={360}
                height={360}
                unoptimized
              />
              <span>🎙️ 눌러서 말하기</span>
            </button>
            <dialog
              ref={dialogRef}
              className="soundbook-dialog"
              aria-labelledby="soundbook-dialog-title"
              onCancel={(event) => {
                event.preventDefault();
                if (phase !== "result") closeModal();
              }}
            >
              <div className="soundbook-dialog-content" aria-live="polite">
                <span className="soundbook-status-icon" aria-hidden="true">
                  {phase === "result"
                    ? correct
                      ? "🎉"
                      : "💪"
                    : phase === "error"
                      ? "🎤"
                      : "🎙️"}
                </span>
                <h2 id="soundbook-dialog-title">
                  {phase === "starting"
                    ? "마이크를 켜고 있어요"
                    : phase === "listening"
                      ? "지금 이름을 말해주세요!"
                      : phase === "checking"
                        ? "목소리를 확인하고 있어요"
                        : phase === "error"
                          ? "다시 말해볼까요?"
                          : correct
                            ? "정답이에요!"
                            : "아쉬워요, 다시 도전해요!"}
                </h2>
                {phase === "listening" && (
                  <strong className="soundbook-countdown">
                    {seconds}
                    <small>초</small>
                  </strong>
                )}
                {phase === "starting" && (
                  <p>
                    마이크 사용을 허용해 주세요.
                    <br />
                    준비되면 3초 동안 들을게요.
                  </p>
                )}
                {phase === "error" && <p>{error}</p>}
                {phase === "result" && (
                  <>
                    <p>
                      내가 말한 이름: <strong>{transcript}</strong>
                    </p>
                    {correct && (
                      <p className="soundbook-answer">{character.name}</p>
                    )}
                  </>
                )}
                <div className="soundbook-actions">
                  {phase === "result" ? (
                    <>
                      {!correct && (
                        <button className="secondary" onClick={startListening}>
                          다시풀기
                        </button>
                      )}
                      <button onClick={nextQuestion}>다음문제</button>
                    </>
                  ) : phase === "error" ? (
                    <>
                      <button onClick={startListening}>다시 말하기</button>
                      <button className="secondary" onClick={closeModal}>
                        닫기
                      </button>
                    </>
                  ) : (
                    <button className="secondary" onClick={closeModal}>
                      취소
                    </button>
                  )}
                </div>
              </div>
            </dialog>
          </div>
          <p className="soundbook-note">
            마이크 권한과 음성 인식을 지원하는 브라우저가 필요해요.
            <br />
            음성은 브라우저의 음성 인식 서비스로 전송될 수 있어요. 이 사이트는
            음성을 저장하지 않아요.
          </p>
        </section>
      )}
    </main>
  );
}
