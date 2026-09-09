"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Character, QuizWorld } from "../../../data";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import {
  isAuthenticated,
  LoginPromptModal,
} from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import "./magic-dessert.css";

export type PatternProblem = {
  values: number[];
  missingIndex: number;
  answer: number;
};

function choicesFor(answer: number, seed: number) {
  const values = [
    answer,
    answer === 1 ? 3 : answer - 1,
    answer === 9 ? 7 : answer + 1,
  ];
  const offset = seed % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

export default function MagicDessertGame({
  world,
  host,
  leftCount,
  pattern,
}: {
  world: QuizWorld;
  host: Character;
  leftCount: number;
  pattern: PatternProblem;
}) {
  const router = useRouter();
  const answer = 10 - leftCount;
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [rightCount, setRightCount] = useState(0);
  const [message, setMessage] = useState(
    "오른쪽 접시에 디저트를 놓아 모두 10개로 만들어 줘!",
  );
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const patternChoices = useMemo(
    () => choicesFor(pattern.answer, leftCount),
    [leftCount, pattern.answer],
  );
  const capturePercent =
    answer * gameRewardConfig.magicDessertCapture.chancePerDessert * 100;

  function addDessert() {
    if (rightCount < 10) setRightCount((count) => count + 1);
  }

  function removeDessert() {
    if (rightCount > 0) setRightCount((count) => count - 1);
  }

  function checkTen() {
    if (rightCount !== answer) {
      setMessage(
        rightCount + leftCount < 10
          ? "조금 더 필요해! 두 접시의 디저트를 세어 봐."
          : "디저트가 너무 많아! 하나씩 빼 볼까?",
      );
      return;
    }
    setMessage(
      `${leftCount}과 ${answer}을 모아 10 완성! 이제 마법의 수 패턴을 맞혀 줘.`,
    );
    setStage(2);
  }

  async function choosePattern(value: number) {
    if (value !== pattern.answer) {
      setMessage("패턴을 다시 살펴봐. 숫자가 얼마씩 커지고 있을까?");
      return;
    }
    const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    if (
      roll >=
      answer * gameRewardConfig.magicDessertCapture.chancePerDessert
    ) {
      setMessage("마법 파티는 완성했지만 이번 도감 선물은 다음 기회에!");
      setStage(4);
      return;
    }
    if (!(await isAuthenticated())) {
      setMessage("로그인해야 파티에서 만난 친구를 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    try {
      collectCard(world.slug, host.image);
    } catch {
      /* 게임 완료는 유지합니다. */
    }
    setMessage("뾰로롱! 하트와 별이 반짝이는 마법 파티 완성!");
    setStage(3);
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push(`/catalog?world=${world.slug}`);
    else setLoginPromptOpen(true);
  }

  return (
    <main
      className={`dessert-game stage-${stage}`}
      style={
        {
          "--theme": world.color,
          "--soft": world.softColor,
        } as React.CSSProperties
      }
    >
      <header className="dessert-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>{world.title} 마법 파티</strong>
        <button type="button" onClick={() => void openCatalog()}>
          내 도감
        </button>
      </header>
      <section className="dessert-panel">
        <span className="dessert-kicker">GAME 02 · 마법 디저트 파티</span>
        {stage <= 2 && (
          <div className="dessert-guide">
            <Image src={host.image} alt="" width={92} height={92} unoptimized />
            <p>
              <b>{world.slug === "teenieping" ? "하츄핑" : host.name}</b>
              <br />
              {stage === 1
                ? "친구들과 파티를 하려는데 딸기를 모두 10개로 만들어 줄래?"
                : "마법의 비밀번호를 맞춰줘!"}
            </p>
          </div>
        )}
        {stage === 1 && (
          <>
            <h1>티니핑 10 만들기</h1>
            <div className="dessert-table">
              <DessertPlate label="왼쪽 접시" count={leftCount} />
              <b className="dessert-plus">＋</b>
              <button
                type="button"
                className="dessert-drop"
                onClick={addDessert}
                aria-label="오른쪽 접시에 딸기 하나 놓기"
              >
                <DessertPlate label="오른쪽 접시" count={rightCount} />
                <span>눌러서 딸기 놓기</span>
              </button>
              <b className="dessert-total">= 10</b>
            </div>
            <div className="dessert-controls">
              <button
                type="button"
                onClick={removeDessert}
                disabled={rightCount === 0}
              >
                하나 빼기
              </button>
              <button type="button" onClick={checkTen}>
                10개 완성!
              </button>
            </div>
            {/* <p className="dessert-rate">오른쪽에 놓은 정답 수 × 5%가 도감 확률이 돼요.</p> */}
          </>
        )}
        {stage === 2 && (
          <>
            <h1>티니핑 수 패턴</h1>
            <div className="pattern-row">
              {pattern.values.map((value, index) => (
                <span
                  key={index}
                  className={index === pattern.missingIndex ? "missing" : ""}
                >
                  {index === pattern.missingIndex ? (
                    <Image
                      src={host.image}
                      alt={`${host.name} 자리`}
                      width={90}
                      height={90}
                      unoptimized
                    />
                  ) : (
                    value
                  )}
                </span>
              ))}
            </div>
            <div className="pattern-choices">
              {patternChoices.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => void choosePattern(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="dessert-rate">
              첫 게임 정답 {answer} × 5% = 도감 획득 확률{" "}
              <b>{capturePercent}%</b>
            </p>
          </>
        )}
        {stage === 3 && <DessertResult success world={world} host={host} />}
        {stage === 4 && (
          <DessertResult success={false} world={world} host={host} />
        )}
        <p className="dessert-message" role="status">
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

function DessertPlate({ label, count }: { label: string; count: number }) {
  return (
    <div className="dessert-plate">
      <small>{label}</small>
      <div>
        {Array.from({ length: count }, (_, index) => (
          <span key={index}>🍓</span>
        ))}
      </div>
      <strong>{count}개</strong>
    </div>
  );
}

function DessertResult({
  success,
  world,
  host,
}: {
  success: boolean;
  world: QuizWorld;
  host: Character;
}) {
  return (
    <section className={`dessert-result ${success ? "success" : "failed"}`}>
      <StickerReward kind="magicDessert" total={2} correct={2} />
      <div className="magic-effects" aria-hidden="true">
        ♥ ✦ ★ ♥ ✧
      </div>
      <div className="magic-wand" aria-hidden="true">
        🪄
      </div>
      <h1>
        {success ? "뾰로롱! 마법 파티 완성!" : "파티 완성! 다시 도전해 봐요"}
      </h1>
      <Image
        src={host.image}
        alt={host.name}
        width={240}
        height={240}
        unoptimized
        priority
      />
      <h2>
        {success
          ? `${host.name} 도감 카드 획득!`
          : "이번에는 도감 선물이 나오지 않았어요"}
      </h2>
      {/* <p>도감 획득 확률 {chance}%</p> */}
      <div className="dessert-actions">
        <button type="button" onClick={() => window.location.reload()}>
          다른 파티 열기
        </button>
        {success && (
          <Link href={`/catalog?world=${world.slug}`}>도감에서 확인하기</Link>
        )}
      </div>
    </section>
  );
}
