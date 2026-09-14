"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { SiteHeader } from "../components/site-header";
import { StickerReward } from "../components/sticker-reward";
import { collectCard } from "../catalog/storage";
import { abcCatalogChance, readStore, refreshStore } from "../stickers/storage";
import { ABC_WORDS, sampleWords, type AbcWord } from "./abc-words";

type Mode = "name" | "listen" | "speak";
type Point = { x: number; y: number };
type RecognitionResult = { 0: { transcript: string } };
type RecognitionEvent = Event & { results: { 0: RecognitionResult } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

const TITLES: Record<Mode, string> = {
  name: "영어 이름찾기",
  listen: "듣고 문제 맞추기",
  speak: "보고 말하기",
};
const HANDWRITING_PASSING_SCORE = 95;
const OUTSIDE_GUIDE_PENALTY = 100;
const INSIDE_GUIDE_PENALTY = 50;

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ");
}

function Picture({ word }: { word: AbcWord }) {
  return (
    <div className="abc-picture" aria-label={`${word.korean} 그림`}>
      <div aria-hidden="true">
        {Array.from({ length: word.count }, (_, index) => (
          <span key={index}>{word.emoji}</span>
        ))}
      </div>
      <small>{word.korean}</small>
    </div>
  );
}

export function AbcGame({ mode }: { mode: Mode }) {
  const [questions, setQuestions] = useState<AbcWord[]>([]);
  const [choices, setChoices] = useState<AbcWord[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [listening, setListening] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [handwritingScore, setHandwritingScore] = useState(0);
  const [seconds, setSeconds] = useState(3);
  const [catalogMessage, setCatalogMessage] =
    useState("도감 선물을 확인하고 있어요…");
  const rewardChecked = useRef(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<SVGTextElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const strokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[]>([]);
  const current = questions[index];
  const done = questions.length === 10 && index >= 10;
  const writingGuideStyle = current
    ? ({
        "--abc-guide-font-size": `${92 / (Math.max(current.display.length, 5) * 0.68)}cqw`,
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuestions(sampleWords(10)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const clearWriting = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    strokesRef.current = [];
    activeStrokeRef.current = [];
    setHandwritingScore(0);
    setAnswer("");
  }, []);

  const sizeWritingCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 9;
    context.strokeStyle = "#334155";
    hasInkRef.current = false;
    strokesRef.current = [];
    activeStrokeRef.current = [];
    setHandwritingScore(0);
    setAnswer("");
  }, []);

  useEffect(() => {
    if (mode !== "name" || done) return;
    sizeWritingCanvas();
    window.addEventListener("resize", sizeWritingCanvas);
    return () => window.removeEventListener("resize", sizeWritingCanvas);
  }, [current?.id, done, mode, sizeWritingCanvas]);

  function writingPoint(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function startWriting(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = writingPoint(event);
    const context = event.currentTarget.getContext("2d");
    activeStrokeRef.current = [point];
    context?.beginPath();
    context?.moveTo(point.x, point.y);
  }

  function write(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const point = writingPoint(event);
    const context = event.currentTarget.getContext("2d");
    activeStrokeRef.current.push(point);
    context?.lineTo(point.x, point.y);
    context?.stroke();
    hasInkRef.current = true;
    setAnswer("written");
  }

  function stopWriting() {
    if (drawingRef.current && activeStrokeRef.current.length)
      strokesRef.current.push(activeStrokeRef.current);
    activeStrokeRef.current = [];
    drawingRef.current = false;
  }

  function checkWriting() {
    const canvas = canvasRef.current;
    const guide = guideRef.current;
    if (!canvas || !guide || !hasInkRef.current || !current) return;
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    const makeLayer = () => {
      const layer = document.createElement("canvas");
      layer.width = canvas.width;
      layer.height = canvas.height;
      return layer;
    };
    const targetLine = makeLayer();
    const targetArea = makeLayer();
    const targetFill = makeLayer();
    const writtenArea = makeLayer();
    const guideStyle = window.getComputedStyle(guide);
    const drawTarget = (layer: HTMLCanvasElement, lineWidth: number) => {
      const context = layer.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.font = `${guideStyle.fontWeight} ${guideStyle.fontSize} ${guideStyle.fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.strokeStyle = "#000";
      context.lineWidth = lineWidth;
      context.lineJoin = "round";
      context.strokeText(current.display, bounds.width / 2, bounds.height / 2);
    };
    drawTarget(targetLine, 3);
    drawTarget(targetArea, 32);
    const fillContext = targetFill.getContext("2d");
    if (!fillContext) return;
    fillContext.scale(ratio, ratio);
    fillContext.font = `${guideStyle.fontWeight} ${guideStyle.fontSize} ${guideStyle.fontFamily}`;
    fillContext.textAlign = "center";
    fillContext.textBaseline = "middle";
    fillContext.fillStyle = "#000";
    fillContext.fillText(current.display, bounds.width / 2, bounds.height / 2);
    const writtenAreaContext = writtenArea.getContext("2d");
    if (!writtenAreaContext) return;
    writtenAreaContext.scale(ratio, ratio);
    writtenAreaContext.strokeStyle = "#000";
    writtenAreaContext.lineWidth = 32;
    writtenAreaContext.lineCap = "round";
    writtenAreaContext.lineJoin = "round";
    for (const points of strokesRef.current) {
      if (!points.length) continue;
      writtenAreaContext.beginPath();
      writtenAreaContext.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1))
        writtenAreaContext.lineTo(point.x, point.y);
      writtenAreaContext.stroke();
    }
    const written = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetLinePixels = targetLine
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetAreaPixels = targetArea
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetFillPixels = targetFill
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data;
    const writtenAreaPixels = writtenArea
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (
      !written ||
      !targetLinePixels ||
      !targetAreaPixels ||
      !targetFillPixels ||
      !writtenAreaPixels
    )
      return;
    let writtenCount = 0;
    let writtenNearTarget = 0;
    let writtenInsideTarget = 0;
    let writtenOutsideTarget = 0;
    let targetCount = 0;
    let targetNearWriting = 0;
    for (let pixel = 3; pixel < written.length; pixel += 4) {
      if (written[pixel] > 20) {
        writtenCount += 1;
        if (targetAreaPixels[pixel] > 0) writtenNearTarget += 1;
        else if (targetFillPixels[pixel] > 0) writtenInsideTarget += 1;
        else writtenOutsideTarget += 1;
      }
      if (targetLinePixels[pixel] > 0) {
        targetCount += 1;
        if (writtenAreaPixels[pixel] > 0) targetNearWriting += 1;
      }
    }
    const precision = writtenNearTarget / Math.max(writtenCount, 1);
    const coverage = targetNearWriting / Math.max(targetCount, 1);
    const insideRatio = writtenInsideTarget / Math.max(writtenCount, 1);
    const outsideRatio = writtenOutsideTarget / Math.max(writtenCount, 1);
    const shapeScore = (precision * 0.55 + coverage * 0.45) * 100;
    const penalty =
      insideRatio * INSIDE_GUIDE_PENALTY + outsideRatio * OUTSIDE_GUIDE_PENALTY;
    const score = Math.max(0, Math.round(shapeScore - penalty));
    const passed =
      score >= HANDWRITING_PASSING_SCORE &&
      precision >= 0.45 &&
      coverage >= 0.35;
    setHandwritingScore(score);
    grade(passed ? current.word : "");
  }

  useEffect(() => {
    if (!current || mode !== "listen") return;
    const timer = window.setTimeout(
      () =>
        setChoices(
          sampleWords(3, [
            current,
            ...sampleWords(
              2,
              ABC_WORDS.filter((word) => word.id !== current.id),
            ),
          ]),
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [current, mode]);

  useEffect(() => {
    if (!done || correct < 9 || rewardChecked.current) return;
    rewardChecked.current = true;
    void (async () => {
      try {
        await refreshStore();
        const chance = abcCatalogChance(readStore());
        if (Math.random() >= chance) {
          setCatalogMessage(
            "이번에는 도감 카드가 나오지 않았어요. 다음에 다시 도전해요!",
          );
          return;
        }
        const letters = [...new Set(questions.map((word) => word.letter))];
        const letter =
          letters[Math.floor(Math.random() * letters.length)] ?? "A";
        const added = await collectCard("abc", `/abc/cards/${letter}`);
        setCatalogMessage(
          added
            ? `🎉 영어 알파벳 ${letter} 카드를 획득했어요!`
            : `${letter} 카드는 이미 도감에 있어요.`,
        );
      } catch {
        setCatalogMessage(
          "로그인하면 영어 알파벳 도감 카드를 저장할 수 있어요.",
        );
      }
    })();
  }, [correct, done, questions]);

  function speak(text = current?.display) {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  }

  function grade(value: string) {
    if (!current || feedback) return;
    const success = normalize(value) === normalize(current.word);
    setFeedback(success ? "correct" : "wrong");
    if (success) setCorrect((score) => score + 1);
    speak(current.display);
  }

  function next() {
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(null);
    setListening(false);
    setHasListened(false);
    setSeconds(3);
    clearWriting();
  }

  function retryWriting() {
    setFeedback(null);
    clearWriting();
  }

  function startSpeaking() {
    if (!current || listening || feedback) return;
    const SpeechRecognition =
      (
        window as typeof window & {
          SpeechRecognition?: RecognitionConstructor;
          webkitSpeechRecognition?: RecognitionConstructor;
        }
      ).SpeechRecognition ??
      (
        window as typeof window & {
          webkitSpeechRecognition?: RecognitionConstructor;
        }
      ).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback("wrong");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    setListening(true);
    setSeconds(3);
    let finished = false;
    const finish = (spoken?: string) => {
      if (finished) return;
      finished = true;
      setListening(false);
      grade(spoken ?? "");
    };
    recognition.onresult = (event) => finish(event.results[0][0].transcript);
    recognition.onerror = () => finish();
    recognition.onend = () => finish();
    recognition.start();
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    window.setTimeout(() => {
      window.clearInterval(timer);
      recognition.stop();
      finish();
    }, 3000);
  }

  function restart() {
    rewardChecked.current = false;
    setQuestions(sampleWords(10));
    setIndex(0);
    setCorrect(0);
    setAnswer("");
    setFeedback(null);
    setHasListened(false);
    setCatalogMessage("도감 선물을 확인하고 있어요…");
    clearWriting();
  }

  if (!questions.length)
    return (
      <main className="abc-game-shell">
        <p>문제를 준비하고 있어요…</p>
      </main>
    );

  if (done)
    return (
      <main className="abc-game-shell">
        <SiteHeader />
        <section className="abc-result">
          <span aria-hidden="true">{correct >= 9 ? "🏆" : "🌱"}</span>
          <h1>10문제 중 {correct}문제를 맞혔어요!</h1>
          <p>
            {correct >= 9
              ? "정말 훌륭해요! 보상을 확인해 볼까요?"
              : "조금만 더 연습하면 보상을 받을 수 있어요."}
          </p>
          <StickerReward
            kind={correct === 10 ? "abc" : "abcNine"}
            total={10}
            correct={correct}
          />
          <div className="abc-catalog-result">
            {correct >= 9
              ? catalogMessage
              : "9문제 이상 맞히면 알파벳 도감 카드에 도전할 수 있어요."}
          </div>
          <div className="abc-result-actions">
            <button type="button" onClick={restart}>
              새로운 10문제
            </button>
            <Link href="/abc">다른 학습 고르기</Link>
            <Link href="/catalog?world=abc">영어 도감 보기</Link>
          </div>
        </section>
      </main>
    );

  return (
    <main className="abc-game-shell">
      <SiteHeader />
      <header className="abc-game-header">
        <Link href="/abc">← 영어교실</Link>
        <div>
          <span>{index + 1} / 10</span>
          <b>점수 {correct}</b>
        </div>
      </header>
      <section className={`abc-question-card abc-mode-${mode}`}>
        <p className="abc-kicker">{TITLES[mode]}</p>
        <h1>
          {mode === "name" && "그림의 영어 이름을 써 보세요"}
          {mode === "listen" && "소리를 듣고 알맞은 답을 골라요"}
          {mode === "speak" && "버튼을 누르고 3초 안에 말해요"}
        </h1>
        {mode !== "listen" && <Picture word={current} />}
        {mode === "listen" && (
          <>
            <button
              className="abc-sound-button"
              type="button"
              onClick={() => {
                speak();
                setHasListened(true);
              }}
            >
              🔊 영어 듣기
            </button>
            {!hasListened && (
              <p className="abc-listen-guide">먼저 영어 듣기를 눌러 주세요.</p>
            )}
            <div className="abc-choices">
              {choices.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  disabled={!!feedback || !hasListened}
                  onClick={() => grade(choice.word)}
                >
                  {choice.display}
                </button>
              ))}
            </div>
          </>
        )}
        {mode === "name" && (
          <div className="abc-writing-area">
            <div className="abc-writing-paper">
              <svg
                className="abc-writing-guide"
                style={writingGuideStyle}
                aria-hidden="true"
              >
                <text
                  ref={guideRef}
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {current.display}
                </text>
              </svg>
              <canvas
                ref={canvasRef}
                aria-label={`${current.display} 따라 쓰기 영역`}
                onPointerDown={startWriting}
                onPointerMove={write}
                onPointerUp={stopWriting}
                onPointerCancel={stopWriting}
                onPointerLeave={stopWriting}
              />
            </div>
            <div className="abc-writing-actions">
              <button
                type="button"
                onClick={retryWriting}
                disabled={feedback === "correct"}
              >
                ↻ 다시 쓰기
              </button>
              <button
                type="button"
                onClick={checkWriting}
                disabled={!answer || !!feedback}
              >
                정답 확인
              </button>
            </div>
          </div>
        )}
        {mode === "speak" && (
          <button
            className="abc-speak-button"
            type="button"
            onClick={startSpeaking}
            disabled={listening || !!feedback}
          >
            {listening ? `🎙️ 듣는 중… ${seconds}` : "🎙️ 말하기 시작"}
          </button>
        )}
        {feedback && (
          <div className={`abc-feedback ${feedback}`} role="status">
            <strong>
              {feedback === "correct"
                ? "정답이에요! 🎉"
                : "아쉬워요. 정답을 같이 읽어봐요."}
            </strong>
            {mode === "name" && (
              <small className="abc-handwriting-score">
                글자 모양 점수 <b>{handwritingScore}점</b>
              </small>
            )}
            <span>{current.display}</span>
            <button type="button" onClick={next}>
              다음 문제 →
            </button>
          </div>
        )}
        {mode === "speak" &&
          typeof window !== "undefined" &&
          !("SpeechRecognition" in window) &&
          !("webkitSpeechRecognition" in window) && (
            <small className="abc-browser-note">
              말하기 채점은 Chrome 또는 Edge 브라우저에서 사용할 수 있어요.
            </small>
          )}
      </section>
    </main>
  );
}
