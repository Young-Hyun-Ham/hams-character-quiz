"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Character, QuizWorld } from "../../../data";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import {
  isAuthenticated,
  LoginPromptModal,
} from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import "./dessert-time.css";

type Hand = "hour" | "minute";

export default function DessertTimeGame({
  world,
  host,
  targetHour,
  targetMinute,
}: {
  world: QuizWorld;
  host: Character;
  targetHour: number;
  targetMinute: number;
}) {
  const router = useRouter();
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [activeHand, setActiveHand] = useState<Hand | null>(null);
  const [result, setResult] = useState<"success" | "miss" | null>(null);
  const [message, setMessage] = useState(
    "시침과 분침을 손으로 움직여 약속 시간을 맞춰 줘!",
  );
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const hostName = world.slug === "teenieping" ? "하츄핑" : host.name;
  const timeText =
    targetMinute === 0
      ? `${targetHour}시 정각`
      : targetMinute === 30
        ? `${targetHour}시 반`
        : `${targetHour}시 ${targetMinute}분`;

  function startDrag(event: ReactPointerEvent<SVGLineElement>, hand: Hand) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveHand(hand);
  }

  function moveHand(event: ReactPointerEvent<SVGSVGElement>) {
    if (!activeHand) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
    if (activeHand === "minute") {
      setMinute((Math.round(angle / 30) % 12) * 5);
    } else {
      const adjusted = (angle - minute * 0.5 + 360) % 360;
      const next = Math.round(adjusted / 30) % 12;
      setHour(next === 0 ? 12 : next);
    }
  }

  async function checkTime() {
    if (hour !== targetHour || minute !== targetMinute) {
      setMessage(
        `아직 ${timeText}가 아니야. 짧은 시침과 긴 분침을 다시 움직여 봐!`,
      );
      return;
    }
    const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    if (roll >= gameRewardConfig.dessertTimeCapture.chance) {
      setMessage(
        "약속 시간에 도착했어! 도감 선물은 다음 시간에 다시 도전해 봐.",
      );
      setResult("miss");
      return;
    }
    if (!(await isAuthenticated())) {
      setMessage("로그인해야 파티에 온 친구를 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    try {
      collectCard(world.slug, host.image);
    } catch {
      /* 게임 완료는 유지합니다. */
    }
    setMessage("약속 시간에 딱 맞게 도착했어! 디저트 파티 시작!");
    setResult("success");
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push(`/catalog?world=${world.slug}`);
    else setLoginPromptOpen(true);
  }

  return (
    <main
      className="time-game"
      style={
        {
          "--theme": world.color,
          "--soft": world.softColor,
        } as React.CSSProperties
      }
    >
      <header className="time-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>{world.title} 디저트 타임</strong>
        <button type="button" onClick={() => void openCatalog()}>
          내 도감
        </button>
      </header>
      <section className="time-panel">
        <span className="time-kicker">GAME 03 · 시계 읽기</span>
        {!result ? (
          <>
            <div className="time-guide">
              <Image
                src={host.image}
                alt=""
                width={100}
                height={100}
                unoptimized
              />
              <p>
                <b>{hostName}</b>
                <br />
                {targetMinute === 0
                  ? `${targetHour}시 정각에 시작되는 파티에 갈 거야!`
                  : `${targetHour}시 ${targetMinute}분에 쿠키가 완성돼!`}
                <br />
                <strong>시계를 {timeText}으로 맞춰 줘!</strong>
              </p>
            </div>
            <h1>{timeText}을 만들어 볼까요?</h1>
            <AnalogClock
              hour={hour}
              minute={minute}
              activeHand={activeHand}
              onStart={startDrag}
              onMove={moveHand}
              onEnd={() => setActiveHand(null)}
            />
            <div className="digital-time" aria-live="polite">
              지금 맞춘 시간{" "}
              <b>
                {hour}:{String(minute).padStart(2, "0")}
              </b>
            </div>
            <button
              type="button"
              className="time-check"
              onClick={() => void checkTime()}
            >
              이 시간으로 맞추기
            </button>
            {/* <p className="time-chance">정답을 맞히면 도감 획득 확률은 20%예요.</p> */}
          </>
        ) : (
          <TimeResult
            success={result === "success"}
            world={world}
            host={host}
            timeText={timeText}
          />
        )}
        <p className="time-message" role="status">
          {message}
        </p>
      </section>
      <LoginPromptModal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </main>
  );
}

function AnalogClock({
  hour,
  minute,
  activeHand,
  onStart,
  onMove,
  onEnd,
}: {
  hour: number;
  minute: number;
  activeHand: Hand | null;
  onStart: (event: ReactPointerEvent<SVGLineElement>, hand: Hand) => void;
  onMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onEnd: () => void;
}) {
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  return (
    <svg
      className="analog-clock"
      viewBox="0 0 320 320"
      role="img"
      aria-label={`현재 ${hour}시 ${minute}분. 짧은 시침과 긴 분침을 드래그하세요.`}
      onPointerMove={onMove}
      onPointerUp={onEnd}
    >
      <circle className="clock-face" cx="160" cy="160" r="145" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * Math.PI) / 6;
        const x = (160 + Math.sin(angle) * 119).toFixed(3);
        const y = (166 - Math.cos(angle) * 119).toFixed(3);
        return (
          <text key={index} x={x} y={y} textAnchor="middle">
            {index === 0 ? 12 : index}
          </text>
        );
      })}
      <line
        className="hand-hit minute-hit"
        x1="160"
        y1="82"
        x2="160"
        y2="34"
        transform={`rotate(${minuteAngle} 160 160)`}
        onPointerDown={(event) => onStart(event, "minute")}
      />
      <line
        className={`clock-hand minute-hand${activeHand === "minute" ? " active" : ""}`}
        x1="160"
        y1="160"
        x2="160"
        y2="48"
        transform={`rotate(${minuteAngle} 160 160)`}
      />
      <line
        className="hand-hit hour-hit"
        x1="160"
        y1="160"
        x2="160"
        y2="84"
        transform={`rotate(${hourAngle} 160 160)`}
        onPointerDown={(event) => onStart(event, "hour")}
      />
      <line
        className={`clock-hand hour-hand${activeHand === "hour" ? " active" : ""}`}
        x1="160"
        y1="160"
        x2="160"
        y2="86"
        transform={`rotate(${hourAngle} 160 160)`}
      />
      <circle className="clock-pin" cx="160" cy="160" r="11" />
    </svg>
  );
}

function TimeResult({
  success,
  world,
  host,
  timeText,
}: {
  success: boolean;
  world: QuizWorld;
  host: Character;
  timeText: string;
}) {
  return (
    <section className={`time-result ${success ? "success" : "miss"}`}>
      <StickerReward kind="dessertTime" total={1} correct={1} />
      <div className="time-sparkles" aria-hidden="true">
        ♥ ✦ 🧁 ★ ♥
      </div>
      <h1>{timeText}, 디저트 파티 시작!</h1>
      <Image
        src={host.image}
        alt={host.name}
        width={250}
        height={250}
        unoptimized
        priority
      />
      <h2>
        {success
          ? `${host.name} 도감 카드 획득!`
          : "이번에는 도감 선물이 나오지 않았어요"}
      </h2>
      {/* <p>도감 획득 확률 20%</p> */}
      <div className="time-actions">
        <button type="button" onClick={() => window.location.reload()}>
          다른 시간 맞추기
        </button>
        {success && (
          <Link href={`/catalog?world=${world.slug}`}>도감에서 확인하기</Link>
        )}
      </div>
    </section>
  );
}
