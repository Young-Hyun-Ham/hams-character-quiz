"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Character } from "../../../data";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import { isAuthenticated, LoginPromptModal } from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import "../../../games/pokeball.css";
import "../../../games/pokeball-arithmetic.css";
import "../../../games/pokeball-capture.css";
import "../../../games/pokeball-name.css";
import "../../../games/pokeball-header.css";

type Point = { x: number; y: number };
export type ArithmeticProblem = {
  kind:
    "addition" | "subtraction" | "complement" | "multiplication" | "division";
  left: number;
  right: number;
  answer: number;
};

function randomInteger(min: number, maxExclusive: number) {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
  return Math.floor(value * (maxExclusive - min)) + min;
}

function createArithmeticProblem(): ArithmeticProblem {
  const kind = (
    [
      "addition",
      "subtraction",
      "complement",
      "multiplication",
      "division",
    ] as const
  )[randomInteger(0, 5)];
  if (kind === "addition") {
    const left = randomInteger(2, 7);
    const right = randomInteger(2, 11 - left);
    return { kind, left, right, answer: left + right };
  }
  if (kind === "subtraction") {
    const left = randomInteger(6, 11);
    const right = randomInteger(1, left);
    return { kind, left, right, answer: left - right };
  }
  if (kind === "multiplication") {
    const left = randomInteger(2, 6);
    const right = randomInteger(2, 6);
    return { kind, left, right, answer: left * right };
  }
  if (kind === "division") {
    const right = randomInteger(2, 6);
    const answer = randomInteger(2, 6);
    return { kind, left: right * answer, right, answer };
  }
  const left = randomInteger(2, 10);
  return { kind, left, right: 10 - left, answer: 10 - left };
}

export default function PokeballGame({
  character,
  target,
  problem: initialProblem,
}: {
  character: Character;
  target: number;
  problem: ArithmeticProblem;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [problem, setProblem] = useState(initialProblem);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [thrown, setThrown] = useState(0);
  const [drag, setDrag] = useState<Point | null>(null);
  const [message, setMessage] = useState(
    "몬스터볼을 끌어서 포켓몬에게 던져 주세요!",
  );
  const choices = useMemo(() => {
    const values = new Set([problem.answer]);
    for (let offset = 1; values.size < 3; offset++) {
      values.add(Math.max(0, problem.answer - offset));
      if (values.size < 3) values.add(problem.answer + offset);
    }
    return [...values].sort(
      (a, b) => ((a * 7 + problem.left) % 5) - ((b * 7 + problem.left) % 5),
    );
  }, [problem]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) =>
      setDrag({ x: event.clientX, y: event.clientY });
    const end = (event: PointerEvent) => {
      const dropZone = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-pokemon-drop]");
      setDrag(null);
      if (!dropZone) {
        setMessage("포켓몬 쪽으로 던져 볼까요?");
        return;
      }
      setThrown((value) => {
        const next = Math.min(target, value + 1);
        if (next === target) {
          setMessage(`${target}개를 모두 던졌어요! 이제 문제를 풀어 볼까요?`);
          window.setTimeout(() => setStage(2), 650);
        } else setMessage(`${next}개! ${target - next}개 더 필요해요.`);
        return next;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, [drag, target]);

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDrag({ x: event.clientX, y: event.clientY });
  }

  async function choose(amount: number) {
    if (amount !== problem.answer) {
      if (wrongAttempts + 1 >= 2) {
        let nextProblem = createArithmeticProblem();
        while (
          nextProblem.kind === problem.kind &&
          nextProblem.left === problem.left &&
          nextProblem.right === problem.right
        )
          nextProblem = createArithmeticProblem();
        setProblem(nextProblem);
        setWrongAttempts(0);
        setMessage("두 번 틀려서 새로운 문제로 바꿨어요. 다시 도전해 봐요!");
      } else {
        setWrongAttempts((value) => value + 1);
        setMessage("조금 달라요. 그림의 몬스터볼을 천천히 다시 세어 보세요!");
      }
      return;
    }
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const captureChance = Math.min(
      1,
      target * gameRewardConfig.pokemonCapture.chance,
    );
    const captured = random[0] / 0x100000000 < captureChance;
    if (!captured) {
      setMessage(`${character.name}이 몬스터볼에서 빠져나와 도망갔어요!`);
      setStage(4);
      return;
    }
    if (!(await isAuthenticated())) {
      setMessage("로그인해야 잡은 포켓몬을 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    try {
      collectCard("pokemon", character.image);
    } catch {
      /* The game still completes without storage. */
    }
    setMessage("몬스터볼로 포켓몬 잡기 성공!");
    setStage(3);
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push("/catalog?world=pokemon");
    else setLoginPromptOpen(true);
  }

  return (
    <main className={`pokeball-shell stage-${stage}`}>
      <header className="pokeball-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>포켓몬 게임 센터</strong>
        <button type="button" className="pokeball-catalog-button" onClick={() => void openCatalog()}>내 도감</button>
      </header>
      <section className="pokeball-panel">
        <span className="pokeball-kicker">GAME 02 · 몬스터볼 던지기</span>
        {stage === 1 && (
          <>
            <h1>몬스터볼 {target}개가 필요해!</h1>
            <p className="speech">
              야생의{" "}
              <strong className="pokemon-name-highlight">
                {character.name}
              </strong>
              을 잡으려면 몬스터볼이 <b>{target}개</b> 필요해!
            </p>
            <div className="pokemon-field" data-pokemon-drop>
              <div className="target-count">
                <b>{thrown}</b>
                <span>/ {target}</span>
              </div>
              <Image
                src={character.image}
                alt={character.name}
                width={260}
                height={260}
                unoptimized
                priority
              />
              <div
                className="landed-balls"
                aria-label={`던진 몬스터볼 ${thrown}개`}
              >
                {Array.from({ length: thrown }, (_, index) => (
                  <span className="mini-ball" key={index} />
                ))}
              </div>
            </div>
            <div className="ball-basket">
              <span>몬스터볼 바구니</span>
              <button
                type="button"
                className="pokeball"
                aria-label="몬스터볼을 포켓몬에게 던지기"
                onPointerDown={startDrag}
              >
                <i />
              </button>
              <small>꾹 누르고 포켓몬에게 끌어다 놓아요</small>
            </div>
          </>
        )}
        {stage === 2 && (
          <>
            <h1>
              {problem.kind === "addition"
                ? "몬스터볼 모으기"
                : problem.kind === "subtraction"
                  ? "몬스터볼 사용하기"
                  : problem.kind === "complement"
                    ? "몬스터볼 10개 채우기"
                    : problem.kind === "multiplication"
                      ? "몬스터볼 묶음 세기"
                      : "몬스터볼 똑같이 나누기"}
            </h1>
            <p className="speech">
              {problem.kind === "addition"
                ? `몬스터볼 ${problem.left}개가 있었는데 지우가 ${problem.right}개를 더 줬어. 모두 몇 개일까?`
                : problem.kind === "subtraction"
                  ? `몬스터볼 ${problem.left}개 중 ${problem.right}개를 던졌어. 몇 개가 남았을까?`
                  : problem.kind === "complement"
                    ? `가방을 10개로 채우고 싶어. 지금 ${problem.left}개가 있다면 몇 개가 더 필요할까?`
                    : problem.kind === "multiplication"
                      ? `몬스터볼이 ${problem.right}개씩 든 상자가 ${problem.left}개 있어. 모두 몇 개일까?`
                      : `몬스터볼 ${problem.left}개를 ${problem.right}명에게 똑같이 나누면 한 명당 몇 개일까?`}
            </p>
            <div
              className={`arithmetic-visual ${problem.kind}`}
              aria-label="문제 그림"
            >
              {problem.kind === "addition" && (
                <>
                  <BallGroup count={problem.left} label="내 몬스터볼" />
                  <b>＋</b>
                  <BallGroup count={problem.right} label="지우가 준 몬스터볼" />
                </>
              )}
              {problem.kind === "subtraction" && (
                <BallGroup
                  count={problem.left}
                  crossed={problem.right}
                  label={`${problem.right}개 사용`}
                />
              )}
              {problem.kind === "complement" && (
                <div className="ten-frame">
                  {Array.from({ length: 10 }, (_, index) => (
                    <span
                      key={index}
                      className={index < problem.left ? "filled" : "empty"}
                    >
                      {index < problem.left && <i />}
                    </span>
                  ))}
                </div>
              )}
              {problem.kind === "multiplication" &&
                Array.from({ length: problem.left }, (_, index) => (
                  <BallGroup
                    key={index}
                    count={problem.right}
                    label={`${index + 1}번 상자`}
                  />
                ))}
              {problem.kind === "division" &&
                Array.from({ length: problem.right }, (_, index) => (
                  <BallGroup
                    key={index}
                    count={problem.answer}
                    label={`${index + 1}번째 친구`}
                  />
                ))}
            </div>
            <div className="equation">
              {problem.kind === "complement"
                ? `${problem.left} + ? = 10`
                : `${problem.left} ${problem.kind === "addition" ? "+" : problem.kind === "subtraction" ? "−" : problem.kind === "multiplication" ? "×" : "÷"} ${problem.right} = ?`}
            </div>
            <div className="number-choices">
              {choices.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  onClick={() => void choose(amount)}
                >
                  <strong>{amount}</strong>
                  <span>개 상자</span>
                </button>
              ))}
            </div>
          </>
        )}
        {stage === 3 && (
          <section className="capture-success">
            <StickerReward kind="pokeball" total={1} correct={1} />
            <div className="capture-rays" aria-hidden="true">
              ✦
            </div>
            <span className="success-ball">
              <i />
            </span>
            <h1>몬스터볼로 포켓몬 잡기 성공!</h1>
            <div className="reward-card">
              <small>NEW POKÉMON CARD</small>
              <Image
                src={character.image}
                alt={character.name}
                width={240}
                height={240}
                unoptimized
                priority
              />
              <strong>{character.name}</strong>
              <span>도감 카드 획득!</span>
            </div>
            <div className="success-actions">
              <button type="button" onClick={() => window.location.reload()}>
                다른 포켓몬 잡기
              </button>
              <Link href="/catalog?world=pokemon">도감에서 확인하기</Link>
            </div>
          </section>
        )}
        {stage === 4 && (
          <section className="capture-failed">
            <StickerReward kind="pokeball" total={1} correct={1} />
            <div className="escape-cloud" aria-hidden="true">
              💨
            </div>
            <Image
              src={character.image}
              alt={character.name}
              width={240}
              height={240}
              unoptimized
              priority
            />
            <h1>앗, 포켓몬이 도망갔어요!</h1>
            <p>
              계산은 정확했지만 이번에는 몬스터볼에서 빠져나왔어요.
              <br />
              다시 도전하면 잡을 수 있어요!
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              다시 도전하기
            </button>
          </section>
        )}
        <p className="pokeball-message" role="status">
          {message}
        </p>
      </section>
      {drag && (
        <span
          className="pokeball drag-ball"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          <i />
        </span>
      )}
      <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
    </main>
  );
}

function BallGroup({
  count,
  crossed = 0,
  label,
}: {
  count: number;
  crossed?: number;
  label: string;
}) {
  return (
    <div className="ball-group">
      <small>{label}</small>
      <div>
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className={`counting-ball${index >= count - crossed ? " crossed" : ""}`}
          >
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
