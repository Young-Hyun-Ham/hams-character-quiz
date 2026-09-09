"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Character } from "../../../data";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import {
  isAuthenticated,
  LoginPromptModal,
} from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import { mapShapes, type MapShape } from "./secret-map-shapes";
import "./secret-map.css";

type Shape = MapShape;
type Point = { x: number; y: number };
const shapeNames: Record<Shape, string> = {
  triangle: "삼각형",
  square: "사각형",
  circle: "동그라미",
  hexagon: "육각형",
  diamond: "마름모",
  star: "별",
  pentagon: "오각형",
  trapezoid: "사다리꼴",
};

export default function SecretMapGame({
  ghost,
  slotOrder,
}: {
  ghost: Character;
  slotOrder: Shape[];
}) {
  const router = useRouter();
  const [placed, setPlaced] = useState<Shape[]>([]);
  const [selected, setSelected] = useState<Shape | null>(null);
  const [dragged, setDragged] = useState<Shape | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [result, setResult] = useState<"success" | "miss" | null>(null);
  const [message, setMessage] = useState(
    "지도 아래의 도형 조각을 같은 모양의 점선 빈칸에 끼워 줘!",
  );
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const dropShape = useEffectEvent((shape: Shape, slot: Shape) => {
    void placeShape(shape, slot);
  });

  useEffect(() => {
    if (!dragged) return;
    const move = (event: PointerEvent) =>
      setDragPoint({ x: event.clientX, y: event.clientY });
    const end = (event: PointerEvent) => {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-map-slot]");
      if (target) dropShape(dragged, target.dataset.mapSlot as Shape);
      else setMessage("조각을 같은 모양의 점선 안에 놓아 줘!");
      setDragged(null);
      setDragPoint(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, [dragged]);

  function startDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    shape: Shape,
  ) {
    event.preventDefault();
    setSelected(shape);
    setDragged(shape);
    setDragPoint({ x: event.clientX, y: event.clientY });
  }

  async function placeShape(shape: Shape, slot: Shape) {
    if (shape !== slot) {
      setMessage(
        `${shapeNames[shape]} 조각은 ${shapeNames[slot]} 빈칸에 맞지 않아. 모양을 다시 살펴봐!`,
      );
      return;
    }
    if (placed.includes(shape)) return;
    const next = [...placed, shape];
    setPlaced(next);
    setSelected(null);
    if (next.length < mapShapes.length) {
      setMessage(
        `${shapeNames[shape]} 완성! ${mapShapes.length - next.length}조각 남았어.`,
      );
      return;
    }
    setMessage("부서진 지도가 모두 이어졌어! 숨은 귀신의 장소를 찾았어!");
    const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    if (roll >= gameRewardConfig.secretMapCapture.chance) {
      setResult("miss");
      return;
    }
    if (!(await isAuthenticated())) {
      setMessage("로그인해야 지도에서 찾은 귀신을 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    try {
      collectCard("mystery-apt", ghost.image);
    } catch {
      /* 게임 완료는 유지합니다. */
    }
    setResult("success");
  }

  function chooseSlot(slot: Shape) {
    if (!selected) {
      setMessage("먼저 아래에서 옮길 도형 조각을 골라 줘!");
      return;
    }
    void placeShape(selected, slot);
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push("/catalog?world=mystery-apt");
    else setLoginPromptOpen(true);
  }

  return (
    <main className="secret-map-game">
      <header className="secret-map-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>신비아파트 마법 지도</strong>
        <button type="button" onClick={() => void openCatalog()}>
          내 도감
        </button>
      </header>
      <section className="secret-map-panel">
        <span className="secret-map-kicker">GAME 03 · 도형과 공간</span>
        {!result ? (
          <>
            <div className="map-guide">
              <span aria-hidden="true">🟢</span>
              <p>
                <b>신비</b>
                <br />
                귀신이 숨어 있는 장소로 가려면 부서진 지도 조각을 완성해야 해!
              </p>
            </div>
            <h1>마법의 비밀 지도</h1>
            <div
              className="ancient-map"
              aria-label={`지도 완성 ${placed.length}/${mapShapes.length}`}
            >
              <div className="map-path" aria-hidden="true">
                · · · ✕
              </div>
              <div className="map-slots">
                {slotOrder.map((shape) => (
                  <button
                    type="button"
                    key={shape}
                    data-map-slot={shape}
                    className={`map-slot${placed.includes(shape) ? " filled" : ""}`}
                    aria-label={`${shapeNames[shape]} 빈칸${placed.includes(shape) ? " 완성" : ""}`}
                    onClick={() => chooseSlot(shape)}
                  >
                    <ShapePiece
                      shape={shape}
                      outline={!placed.includes(shape)}
                    />
                    {!placed.includes(shape) && (
                      <small>{shapeNames[shape]}</small>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="map-instruction">
              조각을 끌어다 놓거나, 조각과 빈칸을 차례로 눌러도 돼요.
            </p>
            <div className="shape-tray" aria-label="지도 조각">
              {mapShapes
                .filter((shape) => !placed.includes(shape))
                .map((shape) => (
                  <button
                    type="button"
                    key={shape}
                    className={selected === shape ? "selected" : ""}
                    aria-pressed={selected === shape}
                    onClick={() => setSelected(shape)}
                    onPointerDown={(event) => startDrag(event, shape)}
                  >
                    <ShapePiece shape={shape} />
                    <small>{shapeNames[shape]}</small>
                  </button>
                ))}
            </div>
            <p className="map-chance">
              지도를 완성하면 도감은 1%, 스티커는{" "}
              {gameRewardConfig.secretMapCapture.stickerChance * 100}% 확률로
              얻어요.
            </p>
          </>
        ) : (
          <MapResult success={result === "success"} ghost={ghost} />
        )}
        <p className="secret-map-message" role="status">
          {message}
        </p>
      </section>
      {dragged && dragPoint && (
        <span
          className="dragging-shape"
          style={{ left: dragPoint.x, top: dragPoint.y }}
          aria-hidden="true"
        >
          <ShapePiece shape={dragged} />
        </span>
      )}
      <LoginPromptModal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </main>
  );
}

function MapResult({ success, ghost }: { success: boolean; ghost: Character }) {
  return (
    <section className={`map-result ${success ? "success" : "miss"}`}>
      <StickerReward
        kind="secretMap"
        total={mapShapes.length}
        correct={mapShapes.length}
      />
      <div className="map-magic" aria-hidden="true">
        △　◇　○　⬡　★　⬟
      </div>
      <h1>마법의 비밀 지도 완성!</h1>
      <Image
        src={ghost.image}
        alt={ghost.name}
        width={250}
        height={250}
        unoptimized
        priority
      />
      <h2>
        {success
          ? `${ghost.name} 도감 카드 획득!`
          : `${ghost.name}의 장소를 찾았어요!`}
      </h2>
      <p>
        {success
          ? "지도 속 귀신을 찾아 도감에 저장했어요."
          : "이번에는 도감 선물이 나오지 않았어요."}
      </p>
      <div className="map-actions">
        <button type="button" onClick={() => window.location.reload()}>
          다른 지도 맞추기
        </button>
        {success && (
          <Link href="/catalog?world=mystery-apt">도감에서 확인하기</Link>
        )}
      </div>
    </section>
  );
}

const shapePaths: Record<Shape, string> = {
  triangle: "M50 5 L95 94 L5 94 Z",
  square: "M8 8 H92 V92 H8 Z",
  circle: "M50 5 A45 45 0 1 1 49.99 5 Z",
  hexagon: "M25 7 H75 L97 50 L75 93 H25 L3 50 Z",
  diamond: "M50 4 L96 50 L50 96 L4 50 Z",
  star: "M50 3 L61 36 L96 36 L68 57 L79 92 L50 71 L21 92 L32 57 L4 36 L39 36 Z",
  pentagon: "M50 4 L96 38 L79 94 H21 L4 38 Z",
  trapezoid: "M23 10 H77 L96 90 H4 Z",
};

function ShapePiece({
  shape,
  outline = false,
}: {
  shape: Shape;
  outline?: boolean;
}) {
  return (
    <svg
      className={`shape shape-${shape}${outline ? " outline" : ""}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path d={shapePaths[shape]} />
    </svg>
  );
}
