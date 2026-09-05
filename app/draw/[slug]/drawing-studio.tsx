"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { QuizWorld } from "../../data";

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };
type GestureStart = { scrollLeft: number; scrollTop: number; midpoint: Point };

const PAGE_SIZE = 48;
const MIN_GUIDE_ZOOM = 60;
const MAX_GUIDE_ZOOM = 300;
const GUIDE_ZOOM_STEP = 20;
const COLORS = ["#334155", "#ff6f61", "#f2aa24", "#45a96d", "#4f83df", "#9666d8"];
const BRUSH_SIZES = [1, 3, 5, 9, 15, 21, 28];
const KOREAN_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("ko").replace(/\s+/g, "");
}

function getKoreanInitials(value: string) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return character;
    return KOREAN_INITIALS[Math.floor((code - 0xac00) / 588)];
  }).join("").replace(/\s+/g, "");
}

export default function DrawingStudio({ world, initialCharacterIndex }: { world: QuizWorld; initialCharacterIndex: number }) {
  const [selected, setSelected] = useState(initialCharacterIndex);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [guideOpacity, setGuideOpacity] = useState(32);
  const [guideVisible, setGuideVisible] = useState(true);
  const [guideZoom, setGuideZoom] = useState(100);
  const [brushColor, setBrushColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[0]);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [referenceOpen, setReferenceOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingPaperRef = useRef<HTMLDivElement>(null);
  const referenceButtonRef = useRef<HTMLButtonElement>(null);
  const referenceCloseRef = useRef<HTMLButtonElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStrokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activeStrokeCommittedRef = useRef(false);
  const drawingRef = useRef(false);
  const touchPointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef(false);
  const gestureStartRef = useRef<GestureStart | null>(null);
  const suppressSingleTouchRef = useRef(false);
  const character = world.characters[selected];

  const filteredCharacters = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    if (!normalizedQuery) return world.characters.map((item, index) => ({ item, index }));
    return world.characters
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => normalizeSearchText(item.name).includes(normalizedQuery) || getKoreanInitials(item.name).includes(normalizedQuery));
  }, [query, world.characters]);

  const drawStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) => {
    if (!stroke.points.length) return;
    context.beginPath();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.size;
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (const point of stroke.points.slice(1)) context.lineTo(point.x * width, point.y * height);
    if (stroke.points.length === 1) context.lineTo(stroke.points[0].x * width + 0.01, stroke.points[0].y * height + 0.01);
    context.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    for (const stroke of strokesRef.current) drawStroke(context, stroke, bounds.width, bounds.height);
  }, [drawStroke]);

  useEffect(() => {
    redrawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(redrawCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redrawCanvas]);

  useEffect(() => {
    const paper = drawingPaperRef.current;
    if (!paper) return;
    const frame = window.requestAnimationFrame(() => {
      paper.scrollLeft = Math.max(0, (paper.scrollWidth - paper.clientWidth) / 2);
      paper.scrollTop = Math.max(0, (paper.scrollHeight - paper.clientHeight) / 2);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guideZoom]);

  useEffect(() => {
    if (!referenceOpen) return;
    const trigger = referenceButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    referenceCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReferenceOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [referenceOpen]);

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    redoStrokesRef.current = [];
    activeStrokeRef.current = null;
    activeStrokeCommittedRef.current = false;
    drawingRef.current = false;
    touchPointersRef.current.clear();
    gestureRef.current = false;
    gestureStartRef.current = null;
    suppressSingleTouchRef.current = false;
    setIsDrawing(false);
    setHasDrawing(false);
    setHistoryState({ undo: 0, redo: 0 });
    redrawCanvas();
  }, [redrawCanvas]);

  const undoStroke = () => {
    const stroke = strokesRef.current.pop();
    if (!stroke) return;
    redoStrokesRef.current.push(stroke);
    setHasDrawing(strokesRef.current.length > 0);
    setHistoryState({ undo: strokesRef.current.length, redo: redoStrokesRef.current.length });
    redrawCanvas();
  };

  const redoStroke = () => {
    const stroke = redoStrokesRef.current.pop();
    if (!stroke) return;
    strokesRef.current.push(stroke);
    setHasDrawing(true);
    setHistoryState({ undo: strokesRef.current.length, redo: redoStrokesRef.current.length });
    redrawCanvas();
  };

  const selectCharacter = (index: number) => {
    if (index === selected) return;
    if (hasDrawing && !window.confirm("지금 그린 그림을 지우고 다른 친구를 그릴까요?")) return;
    setSelected(index);
    clearCanvas();
  };

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  };
  const commitActiveStroke = () => {
    const stroke = activeStrokeRef.current;
    if (!stroke || activeStrokeCommittedRef.current) return;
    redoStrokesRef.current = [];
    strokesRef.current.push(stroke);
    activeStrokeCommittedRef.current = true;
    setHasDrawing(true);
    setHistoryState({ undo: strokesRef.current.length, redo: 0 });
  };
  const startTouchGesture = () => {
    const paper = drawingPaperRef.current;
    const points = Array.from(touchPointersRef.current.values()).slice(0, 2);
    if (!paper || touchPointersRef.current.size !== 2 || points.length < 2) return;
    gestureRef.current = true;
    suppressSingleTouchRef.current = true;
    drawingRef.current = false;
    activeStrokeRef.current = null;
    activeStrokeCommittedRef.current = false;
    setIsDrawing(true);
    gestureStartRef.current = {
      scrollLeft: paper.scrollLeft,
      scrollTop: paper.scrollTop,
      midpoint: {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      },
    };
  };
  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size === 2) {
        startTouchGesture();
        return;
      }
      if (touchPointersRef.current.size >= 3) {
        gestureRef.current = false;
        gestureStartRef.current = null;
        suppressSingleTouchRef.current = true;
        setIsDrawing(false);
        return;
      }
      if (touchPointersRef.current.size > 1 || suppressSingleTouchRef.current) return;
    }
    drawingRef.current = true;
    setIsDrawing(true);
    const stroke = { color: brushColor, size: brushSize, points: [getPoint(event)] };
    activeStrokeRef.current = stroke;
    activeStrokeCommittedRef.current = false;
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch" && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size !== 2) return;
      if (gestureRef.current && gestureStartRef.current) {
        const paper = drawingPaperRef.current;
        const gestureStart = gestureStartRef.current;
        const points = Array.from(touchPointersRef.current.values()).slice(0, 2);
        if (!paper || points.length < 2) return;
        const paperBounds = paper.getBoundingClientRect();
        const startMidpoint = {
          x: gestureStart.midpoint.x - paperBounds.left,
          y: gestureStart.midpoint.y - paperBounds.top,
        };

        const midpoint = {
          x: (points[0].x + points[1].x) / 2 - paperBounds.left,
          y: (points[0].y + points[1].y) / 2 - paperBounds.top,
        };
        paper.scrollLeft = Math.max(0, gestureStart.scrollLeft + startMidpoint.x - midpoint.x);
        paper.scrollTop = Math.max(0, gestureStart.scrollTop + startMidpoint.y - midpoint.y);
        return;
      }
      if (suppressSingleTouchRef.current) return;
    }
    if (!drawingRef.current || !activeStrokeRef.current) return;
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    const point = getPoint(event);
    const stroke = activeStrokeRef.current;
    commitActiveStroke();
    const previous = stroke.points.at(-1) || point;
    stroke.points.push(point);
    if (!context) return;
    context.beginPath();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.size;
    context.moveTo(previous.x * bounds.width, previous.y * bounds.height);
    context.lineTo(point.x * bounds.width, point.y * bounds.height);
    context.stroke();
  };
  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") {
      touchPointersRef.current.delete(event.pointerId);
      if (touchPointersRef.current.size === 2) {
        startTouchGesture();
        return;
      }
      if (gestureRef.current) {
        gestureRef.current = false;
        gestureStartRef.current = null;
        if (touchPointersRef.current.size === 0) suppressSingleTouchRef.current = false;
        setIsDrawing(false);
        return;
      }
      if (suppressSingleTouchRef.current) {
        if (touchPointersRef.current.size === 0) suppressSingleTouchRef.current = false;
        return;
      }
    }
    commitActiveStroke();
    drawingRef.current = false;
    activeStrokeRef.current = null;
    activeStrokeCommittedRef.current = false;
    setIsDrawing(false);
    redrawCanvas();
  };

  const pickRandomCharacter = () => {
    if (world.characters.length < 2) return;
    let next = selected;
    while (next === selected) next = Math.floor(Math.random() * world.characters.length);
    selectCharacter(next);
  };

  const saveDrawing = () => {
    const source = canvasRef.current;
    if (!source) return;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(source, 0, 0);
    const link = document.createElement("a");
    link.download = `${character.name}-그리기.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  };

  const visibleCharacters = filteredCharacters.slice(0, visibleCount);

  return (
    <main className="draw-shell" style={{ "--theme": world.color, "--soft": world.softColor } as React.CSSProperties}>
      <header className="draw-header">
        <Link href="/" className="round-icon" aria-label="처음으로">‹</Link>
        <div><span>{world.english}</span><strong>{world.title} 그리기 놀이터</strong></div>
        <button type="button" onClick={pickRandomCharacter}>↝ 랜덤 친구</button>
      </header>
      <div className="draw-layout">
        <aside className="catalog-panel" aria-label={`${world.title} 캐릭터 도감`}>
          <div className="catalog-heading"><div><span>CHARACTER BOOK</span><h1>캐릭터 도감</h1></div><b>{world.characters.length}명</b></div>
          <label className="catalog-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="이름 또는 초성 찾기 (예: ㅍㅋㅊ)" aria-label="친구 이름 또는 초성 찾기" /></label>
          <div className="catalog-grid">
            {visibleCharacters.map(({ item, index }) => (
              <button className={index === selected ? "selected" : ""} type="button" key={`${item.name}-${index}`} onClick={() => selectCharacter(index)} aria-pressed={index === selected}>
                <Image src={item.image} alt="" width={78} height={78} unoptimized />
                <strong>{item.name}</strong>{item.season && <small>시즌 {item.season}</small>}
              </button>
            ))}
          </div>
          {!visibleCharacters.length && <p className="catalog-empty">찾는 친구가 없어요.</p>}
          {visibleCount < filteredCharacters.length && <button className="catalog-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>더 많은 친구 보기</button>}
        </aside>

        <section className="studio-panel">
          <div className="studio-title"><div><span>오늘의 모델</span><h2>{character.name}</h2></div><p>연한 가이드를 따라 천천히 그려보세요!</p><button ref={referenceButtonRef} className="model-reference" type="button" onClick={() => setReferenceOpen(true)} aria-haspopup="dialog"><small>크게 보기</small><Image src={character.image} alt={`${character.name} 원본 색상 참고 이미지`} width={92} height={92} unoptimized /></button></div>
          <div className={`drawing-frame${isDrawing ? " is-drawing" : ""}`}>
            <div className="drawing-canvas-option drawing-color-options tool-group color-tools"><span>색연필</span><div>{COLORS.map((color) => <button type="button" key={color} className={brushColor === color ? "active" : ""} style={{ background: color }} onClick={() => setBrushColor(color)} aria-label={`${color} 색상`} aria-pressed={brushColor === color} />)}<label className="custom-color" title="다른 색상 선택"><input type="color" value={brushColor} onChange={(event) => setBrushColor(event.target.value)} aria-label="다른 색상 선택" /><i style={{ background: brushColor }} /><b aria-hidden="true">＋</b></label></div></div>
            <div className="drawing-history" aria-label="그리기 편집 기록">
              <button type="button" onClick={undoStroke} disabled={!historyState.undo} aria-label="마지막 획 되돌리기" title="되돌리기">↶</button>
              <button type="button" onClick={redoStroke} disabled={!historyState.redo} aria-label="되돌린 획 다시 실행" title="다시 실행">↷</button>
            </div>
            <div ref={drawingPaperRef} className={`drawing-paper${guideZoom > 100 ? " zoomed" : ""}`}>
              <div className="drawing-surface" style={{ width: `${guideZoom}%`, height: `${guideZoom}%` }}>
                <div className="paper-grid" aria-hidden="true" />
                {guideVisible && <Image className="drawing-guide" src={character.image} alt={`${character.name} 그리기 가이드`} width={560} height={560} unoptimized style={{ opacity: guideOpacity / 100 }} priority />}
                <canvas ref={canvasRef} aria-label={`${character.name} 그리기 영역`} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} />
                {!hasDrawing && <div className="drawing-tip" aria-hidden="true"><span>☝</span> 여기서부터 따라 그려봐요</div>}
              </div>
            </div>
            <div className="guide-zoom" aria-label="가이드 이미지 확대 및 축소">
              <button type="button" onClick={() => setGuideZoom((zoom) => Math.max(MIN_GUIDE_ZOOM, zoom - GUIDE_ZOOM_STEP))} disabled={guideZoom <= MIN_GUIDE_ZOOM} aria-label="가이드 축소">−</button>
              <output aria-live="polite" aria-label={`가이드 배율 ${guideZoom}%`}>{guideZoom}%</output>
              <button type="button" onClick={() => setGuideZoom((zoom) => Math.min(MAX_GUIDE_ZOOM, zoom + GUIDE_ZOOM_STEP))} disabled={guideZoom >= MAX_GUIDE_ZOOM} aria-label="가이드 확대">＋</button>
            </div>
            <div className="drawing-canvas-option drawing-size-options tool-group size-tools"><span>굵기</span><div>{BRUSH_SIZES.map((size) => <button type="button" key={size} className={brushSize === size ? "active" : ""} onClick={() => setBrushSize(size)} aria-label={`${size}px 굵기`} aria-pressed={brushSize === size}><i style={{ width: size, height: size }} /></button>)}</div></div>
          </div>
          <div className="studio-tools">
            <div className="guide-tools"><button type="button" className={guideVisible ? "active" : ""} onClick={() => setGuideVisible((visible) => !visible)}>{guideVisible ? "◉ 가이드 켜짐" : "○ 가이드 꺼짐"}</button><label><span>가이드 진하기</span><input type="range" min="10" max="65" value={guideOpacity} disabled={!guideVisible} onChange={(event) => setGuideOpacity(Number(event.target.value))} /></label></div>
          </div>
          <div className="studio-actions"><button className="clear-drawing" type="button" onClick={clearCanvas} disabled={!hasDrawing}>↻ 모두 지우기</button><button className="save-drawing" type="button" onClick={saveDrawing} disabled={!hasDrawing}>↓ 내 그림 저장하기</button></div>
          <p className="privacy-note">그림은 기기 안에서만 만들어지며 서버에 저장되지 않아요.</p>
        </section>
      </div>
      {referenceOpen && (
        <div className="reference-backdrop" onClick={() => setReferenceOpen(false)}>
          <section className="reference-modal" role="dialog" aria-modal="true" aria-labelledby="reference-modal-title">
            <button ref={referenceCloseRef} className="reference-close" type="button" aria-label="색상 참고 이미지 닫기">×</button>
            <span>COLOR REFERENCE</span>
            <h2 id="reference-modal-title">{character.name}</h2>
            <Image src={character.image} alt={`${character.name} 원본 컬러 이미지 크게 보기`} width={720} height={720} unoptimized priority />
            <p>이미지나 바깥쪽을 누르면 닫혀요.</p>
          </section>
        </div>
      )}
    </main>
  );
}
