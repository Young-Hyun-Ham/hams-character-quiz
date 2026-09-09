"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Character } from "../../../data";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import {
  isAuthenticated,
  LoginPromptModal,
} from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import "./ghost-password.css";

export type TalismanProblem = {
  kind: "addition" | "subtraction";
  left: number;
  right: number;
  answer: number;
};

function createChoices(problem: TalismanProblem) {
  const { answer } = problem;
  const values = [
    answer,
    answer <= 97 ? answer + 2 : answer - 2,
    answer <= 98 ? answer + 1 : answer - 1,
  ];
  const offset = (problem.left + problem.right) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function createComparison(problem: TalismanProblem) {
  const left = 10 + ((problem.left * 7 + problem.right * 3) % 90);
  let right = 10 + ((problem.left * 11 + problem.right * 5) % 90);
  if (right === left) right = 10 + ((right - 10 + 17) % 90);
  return { left, right, answer: Math.max(left, right) };
}

export default function GhostPasswordGame({
  ghost,
  initialProblem,
}: {
  ghost: Character;
  initialProblem: TalismanProblem;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [message, setMessage] = useState(
    "부적의 숫자를 계산해 결계 비밀번호를 찾아줘!",
  );
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const choices = useMemo(
    () => createChoices(initialProblem),
    [initialProblem],
  );
  const comparison = useMemo(
    () => createComparison(initialProblem),
    [initialProblem],
  );

  function choosePassword(value: number) {
    if (value !== initialProblem.answer) {
      setMessage("결계가 흔들렸어! 부적의 숫자를 다시 천천히 계산해 봐.");
      return;
    }
    setMessage(`비밀번호 ${value} 확인! 이제 더 강한 귀신의 기운을 찾아줘.`);
    setStage(2);
  }

  async function chooseGreater(value: number) {
    if (value !== comparison.answer) {
      setMessage("이쪽 기운은 더 약해. 더 큰 숫자가 적힌 부적을 눌러줘!");
      return;
    }
    const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    const captured =
      roll <
      initialProblem.answer *
        gameRewardConfig.mysteryAptCapture.chancePerPasswordNumber;
    if (!captured) {
      setMessage("결계는 풀었지만 귀신이 고스트볼을 피해 달아났어!");
      setStage(4);
      return;
    }
    if (!(await isAuthenticated())) {
      setMessage("로그인해야 정화한 귀신을 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    try {
      collectCard("mystery-apt", ghost.image);
    } catch {
      /* 게임 완료는 유지합니다. */
    }
    setMessage("고스트볼이 빛났어! 귀신 정화 성공!");
    setStage(3);
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push("/catalog?world=mystery-apt");
    else setLoginPromptOpen(true);
  }

  return (
    <main className={`ghost-game stage-${stage}`}>
      <header className="ghost-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>신비아파트 고스트 퇴치단</strong>
        <button type="button" onClick={() => void openCatalog()}>
          내 도감
        </button>
      </header>
      <section className="ghost-panel">
        <span className="ghost-kicker">GAME 02 · 귀신 퇴치 비밀번호</span>
        {stage <= 2 && (
          <Guide
            name={stage === 1 ? "신비" : "금비"}
            text={
              stage === 1
                ? "귀신이 결계를 쳤어! 결계를 푸는 주문 숫자를 찾아줘!"
                : "두 귀신의 기운 중 더 큰 숫자를 찾아 터치해 줘!"
            }
          />
        )}
        {stage === 1 && (
          <>
            <h1>고스트 부적 계산</h1>
            <div
              className="talisman-equation"
              aria-label={`${initialProblem.left} ${initialProblem.kind === "addition" ? "더하기" : "빼기"} ${initialProblem.right}`}
            >
              <span>{initialProblem.left}</span>
              <b>{initialProblem.kind === "addition" ? "+" : "−"}</b>
              <span>{initialProblem.right}</span>
              <b>=</b>
              <i>?</i>
            </div>
            <p className="chance-hint">
              찾은 두 자리 비밀번호가 도감 획득 확률이 돼요!
            </p>
            <div className="ghost-choices">
              {choices.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => choosePassword(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        )}
        {stage === 2 && (
          <>
            <h1>더 큰 귀신의 기운은?</h1>
            <div className="ghost-duel">
              {[comparison.left, comparison.right].map((value, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => void chooseGreater(value)}
                >
                  <Image
                    src={ghost.image}
                    alt={index === 0 ? ghost.name : "귀신의 분신"}
                    width={190}
                    height={190}
                    unoptimized
                  />
                  <span className="energy-talisman">{value}</span>
                </button>
              ))}
            </div>
            <p className="password-rate">
              결계 비밀번호 <b>{initialProblem.answer}</b> · 도감 획득 확률{" "}
              <b>{initialProblem.answer}%</b>
            </p>
          </>
        )}
        {stage === 3 && (
          <Result success ghost={ghost} chance={initialProblem.answer} />
        )}
        {stage === 4 && (
          <Result
            success={false}
            ghost={ghost}
            chance={initialProblem.answer}
          />
        )}
        <p className="ghost-message" role="status">
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

function Guide({ name, text }: { name: string; text: string }) {
  return (
    <div className="guide">
      <span aria-hidden="true">🟢</span>
      <p>
        <b>{name}</b>
        <br />
        {text}
      </p>
    </div>
  );
}

function Result({
  success,
  ghost,
  chance,
}: {
  success: boolean;
  ghost: Character;
  chance: number;
}) {
  return (
    <section className={`ghost-result ${success ? "success" : "failed"}`}>
      <StickerReward kind="ghostChip" total={2} correct={2} />
      <div className="ghost-ball" aria-hidden="true">
        ✦
      </div>
      <h1>{success ? "귀신 정화 성공!" : "귀신이 달아났어요!"}</h1>
      <Image
        src={ghost.image}
        alt={ghost.name}
        width={240}
        height={240}
        unoptimized
        priority
      />
      <h2>
        {success
          ? `${ghost.name} 고스트 칩 획득!`
          : `${ghost.name}이 고스트볼을 피했어요`}
      </h2>
      <p>
        비밀번호 {chance} · 도감 획득 확률 {chance}%
      </p>
      <div className="ghost-actions">
        <button type="button" onClick={() => window.location.reload()}>
          다른 귀신 퇴치하기
        </button>
        {success && (
          <Link href="/catalog?world=mystery-apt">도감에서 확인하기</Link>
        )}
      </div>
    </section>
  );
}
