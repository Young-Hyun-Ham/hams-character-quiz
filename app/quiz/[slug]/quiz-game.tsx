"use client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Character, QuizWorld } from "../../data";

type Answer = { character: Character; correct: boolean };
type HandwritingPoint = { x: number; y: number };
const QUESTION_COUNT = 10;
const PASSING_SCORE = 95;
const OUTSIDE_GUIDE_PENALTY = 100;
const INSIDE_GUIDE_PENALTY = 50;

function subscribeToQuizViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getResponsiveLayoutClass() {
  if (window.innerWidth > 1180) return "";
  const isUsableLandscape = window.innerWidth > window.innerHeight && window.innerWidth >= 600;
  return isUsableLandscape ? "layout-tablet" : "layout-mobile";
}

function pickRandomQuestions(characters: Character[]) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, QUESTION_COUNT);
}

export default function QuizGame({ world, initialQuestions }: { world: QuizWorld; initialQuestions: Character[] }) {
  const searchParams = useSearchParams();
  const selectedLayout = searchParams.get("layout");
  const responsiveLayoutClass = useSyncExternalStore(subscribeToQuizViewport, getResponsiveLayoutClass, () => "");
  const selectedLayoutClass = selectedLayout === "tablet" ? "layout-tablet" : selectedLayout === "mobile" ? "layout-mobile" : "";
  const layoutClass = responsiveLayoutClass || selectedLayoutClass;
  const [questions, setQuestions] = useState(() => initialQuestions.slice(0, QUESTION_COUNT));
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finished, setFinished] = useState(false);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [recognizedCorrect, setRecognizedCorrect] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const answerGuideRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const strokesRef = useRef<HandwritingPoint[][]>([]);
  const activeStrokeRef = useRef<HandwritingPoint[]>([]);
  const current = questions[index];
  const guideCharacterWidth = Math.max(Array.from(current.name).length, 2) * 1.08;
  const answerGuideStyle = {
    "--guide-font-size": `${92 / guideCharacterWidth}cqw`,
  } as React.CSSProperties;

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    activeStrokeRef.current = [];
    setStrokes(0);
    setSimilarityScore(0);
    setRecognizedCorrect(null);
  }, []);
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * ratio); canvas.height = Math.round(box.height * ratio);
    strokesRef.current = []; activeStrokeRef.current = []; setStrokes(0);
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.scale(ratio, ratio); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#334155"; ctx.lineWidth = 9; }
  }, []);
  useEffect(() => {
    if (!finished) sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    return () => window.removeEventListener("resize", sizeCanvas);
  }, [finished, sizeCanvas]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const ctx = event.currentTarget.getContext("2d"); const p = point(event); activeStrokeRef.current = [p]; ctx?.beginPath(); ctx?.moveTo(p.x, p.y); };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = event.currentTarget.getContext("2d"); const p = point(event); activeStrokeRef.current.push(p); ctx?.lineTo(p.x, p.y); ctx?.stroke(); };
  const stopDrawing = () => { if (!drawing.current) return; drawing.current = false; if (activeStrokeRef.current.length) strokesRef.current.push(activeStrokeRef.current); activeStrokeRef.current = []; setStrokes((value) => value + 1); };
  const speak = () => { if ("speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(current.name)); } };
  const grade = (correct: boolean) => {
    const nextAnswers = [...answers, { character: current, correct }];
    setAnswers(nextAnswers);
    if (index === questions.length - 1) { setFinished(true); return; }
    setIndex((value) => value + 1); setShowAnswer(false); clearCanvas();
  };
  const retryWrong = () => {
    const wrong = answers.filter((answer) => !answer.correct).map((answer) => answer.character).sort(() => Math.random() - 0.5);
    strokesRef.current = []; activeStrokeRef.current = [];
    setQuestions(wrong); setAnswers([]); setIndex(0); setShowAnswer(false); setFinished(false); setStrokes(0);
    setSimilarityScore(0); setRecognizedCorrect(null);
  };
  const restart = () => {
    strokesRef.current = []; activeStrokeRef.current = [];
    setQuestions(pickRandomQuestions(world.characters)); setAnswers([]); setIndex(0); setShowAnswer(false); setFinished(false); setStrokes(0);
    setSimilarityScore(0); setRecognizedCorrect(null);
  };
  const checkHandwriting = () => {
    const canvas = canvasRef.current;
    const guide = answerGuideRef.current;
    if (!canvas || !guide) return;

    const ratio = window.devicePixelRatio || 1;
    const guideStyle = window.getComputedStyle(guide);
    const makeLayer = () => { const layer = document.createElement("canvas"); layer.width = canvas.width; layer.height = canvas.height; return layer; };
    const targetLine = makeLayer();
    const targetArea = makeLayer();
    const targetFill = makeLayer();
    const writtenArea = makeLayer();
    const drawTarget = (layer: HTMLCanvasElement, lineWidth: number) => {
      const context = layer.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.font = `${guideStyle.fontWeight} ${guideStyle.fontSize} ${guideStyle.fontFamily}`;
      context.textAlign = "center"; context.textBaseline = "middle";
      context.strokeStyle = "#000"; context.lineJoin = "round"; context.lineWidth = lineWidth;
      context.strokeText(current.name, canvas.width / ratio / 2, canvas.height / ratio / 2);
    };
    drawTarget(targetLine, 3);
    drawTarget(targetArea, 32);
    const targetFillContext = targetFill.getContext("2d");
    if (!targetFillContext) return;
    targetFillContext.scale(ratio, ratio);
    targetFillContext.font = `${guideStyle.fontWeight} ${guideStyle.fontSize} ${guideStyle.fontFamily}`;
    targetFillContext.textAlign = "center"; targetFillContext.textBaseline = "middle";
    targetFillContext.fillStyle = "#000";
    targetFillContext.fillText(current.name, canvas.width / ratio / 2, canvas.height / ratio / 2);

    const writtenContext = writtenArea.getContext("2d");
    if (!writtenContext) return;
    writtenContext.scale(ratio, ratio); writtenContext.strokeStyle = "#000"; writtenContext.lineWidth = 32; writtenContext.lineCap = "round"; writtenContext.lineJoin = "round";
    for (const points of strokesRef.current) {
      if (!points.length) continue;
      writtenContext.beginPath(); writtenContext.moveTo(points[0].x, points[0].y);
      for (const writtenPoint of points.slice(1)) writtenContext.lineTo(writtenPoint.x, writtenPoint.y);
      writtenContext.stroke();
    }

    const writtenPixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetLinePixels = targetLine.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetAreaPixels = targetArea.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetFillPixels = targetFill.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    const writtenAreaPixels = writtenArea.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!writtenPixels || !targetLinePixels || !targetAreaPixels || !targetFillPixels || !writtenAreaPixels) return;

    let writtenCount = 0; let writtenNearTarget = 0; let writtenInsideTarget = 0; let writtenOutsideTarget = 0; let targetCount = 0; let targetNearWriting = 0;
    for (let pixel = 3; pixel < writtenPixels.length; pixel += 4) {
      if (writtenPixels[pixel] > 20) {
        writtenCount += 1;
        if (targetAreaPixels[pixel] > 0) writtenNearTarget += 1;
        else if (targetFillPixels[pixel] > 0) writtenInsideTarget += 1;
        else writtenOutsideTarget += 1;
      }
      if (targetLinePixels[pixel] > 0) { targetCount += 1; if (writtenAreaPixels[pixel] > 0) targetNearWriting += 1; }
    }
    const precision = writtenNearTarget / Math.max(writtenCount, 1);
    const coverage = targetNearWriting / Math.max(targetCount, 1);
    const insideGuideRatio = writtenInsideTarget / Math.max(writtenCount, 1);
    const outsideGuideRatio = writtenOutsideTarget / Math.max(writtenCount, 1);
    const shapeScore = (precision * 0.55 + coverage * 0.45) * 100;
    const deviationPenalty = insideGuideRatio * INSIDE_GUIDE_PENALTY + outsideGuideRatio * OUTSIDE_GUIDE_PENALTY;
    const score = Math.max(0, Math.round(shapeScore - deviationPenalty));
    const correct = score >= PASSING_SCORE && precision >= 0.45 && coverage >= 0.35;
    setSimilarityScore(score); setRecognizedCorrect(correct); setShowAnswer(true);
  };

  if (finished) {
    const correctCount = answers.filter((answer) => answer.correct).length;
    const wrongCount = answers.length - correctCount;
    return (
      <main className="result-shell" style={{ "--theme": world.color, "--soft": world.softColor } as React.CSSProperties}>
        <section className="result-card">
          <div className="result-confetti">✦　★　✧</div><span className="result-badge">학습 완료!</span>
          <h1>{correctCount === answers.length ? "모두 맞혔어요!" : "오늘도 멋지게 해냈어요!"}</h1>
          <p>{world.title} 친구들의 이름을 끝까지 써보았어요.</p>
          <div className="score-circle"><strong>{correctCount}</strong><span>/ {answers.length}</span><small>맞힌 문제</small></div>
          <div className="score-summary"><span className="correct-dot">✓ 맞았어요 <b>{correctCount}</b></span><span className="wrong-dot">× 다시 볼래요 <b>{wrongCount}</b></span></div>
          <div className="answer-list">
            {answers.map(({ character, correct }, answerIndex) => <div className={correct ? "answer-item correct" : "answer-item wrong"} key={`${character.name}-${answerIndex}`}><Image src={character.image} alt="" width={54} height={54} unoptimized /><span>{character.name}</span><b>{correct ? "✓" : "다시"}</b></div>)}
          </div>
          <div className="result-actions">{wrongCount > 0 && <button className="retry-button" type="button" onClick={retryWrong}>틀린 문제만 다시 하기</button>}<button className="new-quiz-button" type="button" onClick={restart}>새로운 10문제</button><Link href="/">처음으로 돌아가기</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className={`quiz-shell ${layoutClass}`} style={{ "--theme": world.color, "--soft": world.softColor } as React.CSSProperties}>
      <header className="quiz-header"><Link href="/" className="round-icon" aria-label="처음으로">‹</Link><div className="progress-wrap"><div className="progress-label"><strong>{world.title} 퀴즈</strong><span>{index + 1} / {questions.length}</span></div><div className="progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div></div><button className="round-icon sound" type="button" aria-label="이름 듣기" onClick={speak}>♪</button></header>
      <section className="quiz-content">
        <div className="question-title"><span>Q.</span><h1>이 친구의 이름은 뭘까요?</h1></div>
        <div className="character-stage"><span className="stage-star star-a">✦</span><span className="stage-star star-b">✧</span><Image src={current.image} alt={`${world.title} 캐릭터 문제`} width={245} height={225} unoptimized /></div>
        <div className="writing-section">
          <div className="writing-heading"><div><span className="pencil">✎</span><strong>이름을 따라 써보세요</strong><small>손가락이나 마우스로 쓸 수 있어요</small></div><button type="button" onClick={clearCanvas}>↻ 다시 쓰기</button></div>
          <div className="writing-board"><div className="guide-lines" aria-hidden="true" /><div ref={answerGuideRef} className={`answer-guide ${showAnswer ? "visible" : ""}`} style={answerGuideStyle}>{current.name}</div><canvas ref={canvasRef} aria-label="한글 쓰기 영역" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} /></div>
          <p className="hint-text">첫 글자는 <strong>{current.hint}</strong>로 시작해요!</p>
        </div>
        {!showAnswer ? <div className="quiz-actions single"><button className="next-button" type="button" onClick={checkHandwriting} disabled={!strokes}>{strokes ? "자동 채점하기" : "먼저 이름을 써보세요"} <span>→</span></button></div> : <div className={`recognition-result ${recognizedCorrect ? "correct" : "wrong"}`}><p>글자 모양 점수 <b>{similarityScore}점</b></p><strong>{recognizedCorrect ? "정답이에요!" : `조금 더 따라 써봐요. 정답은 ${current.name}!`}</strong><button className="next-button" type="button" onClick={() => grade(Boolean(recognizedCorrect))}>{index === questions.length - 1 ? "채점 결과 보기" : "다음 문제"} <span>→</span></button></div>}
      </section>
    </main>
  );
}
