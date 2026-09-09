"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { collectCard } from "../../../catalog/storage";
import { StickerReward } from "../../../components/sticker-reward";
import {
  isAuthenticated,
  LoginPromptModal,
} from "../../../components/login-prompt-modal";
import { gameRewardConfig } from "../../../../lib/game-rewards";
import "./bag-sort.css";

export type BagSpecies = { name: string; image: string; count: number };
export type BagItem = { id: string; name: string; image: string };
type Point = { x: number; y: number };

export default function BagSortGame({
  species,
  items,
  questionIndex,
}: {
  species: BagSpecies[];
  items: BagItem[];
  questionIndex: number;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [captured, setCaptured] = useState(false);
  const [message, setMessage] = useState(
    "흩어진 포켓몬을 이름이 같은 바구니에 넣어 주세요!",
  );
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const question = species[questionIndex];
  const choices = useMemo(() => {
    const values = [2, 3, 4];
    const offset = question.name.length % 3;
    return [...values.slice(offset), ...values.slice(0, offset)];
  }, [question.name]);
  const draggedItem = items.find((item) => item.id === draggedId);
  const dropItem = useEffectEvent((itemId: string, basketName: string) =>
    placeItem(itemId, basketName),
  );

  useEffect(() => {
    if (!draggedId) return;
    const move = (event: PointerEvent) =>
      setDragPoint({ x: event.clientX, y: event.clientY });
    const end = (event: PointerEvent) => {
      const basket = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-basket-name]");
      if (basket?.dataset.basketName)
        dropItem(draggedId, basket.dataset.basketName);
      else setMessage("포켓몬을 이름이 적힌 바구니 안에 놓아 주세요!");
      setDraggedId(null);
      setDragPoint(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, [draggedId]);

  function startDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: BagItem,
  ) {
    event.preventDefault();
    setSelectedId(item.id);
    setDraggedId(item.id);
    setDragPoint({ x: event.clientX, y: event.clientY });
  }

  function placeItem(itemId: string, basketName: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || sorted[itemId]) return;
    if (item.name !== basketName) {
      setMessage(
        `${item.name}은 ${basketName} 바구니가 아니에요. 다시 살펴봐요!`,
      );
      return;
    }
    const next = { ...sorted, [itemId]: basketName };
    setSorted(next);
    setSelectedId(null);
    const remaining = items.length - Object.keys(next).length;
    if (remaining)
      setMessage(`${item.name} 분류 성공! ${remaining}마리 남았어요.`);
    else {
      setMessage("모든 포켓몬을 정리했어요! 이제 개수를 세어 봐요.");
      window.setTimeout(() => setStage(2), 500);
    }
  }

  function chooseBasket(name: string) {
    if (!selectedId)
      return setMessage("먼저 위에서 옮길 포켓몬을 선택해 주세요!");
    placeItem(selectedId, name);
  }

  async function chooseCount(value: number) {
    if (value !== question.count)
      return setMessage(`${question.name}을 한 마리씩 다시 세어 봐요!`);
    const wonCard =
      crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 <
      gameRewardConfig.pokemonBagCapture.chance;
    if (wonCard && !(await isAuthenticated())) {
      setMessage("로그인해야 정리한 포켓몬을 도감에 저장할 수 있어요.");
      setLoginPromptOpen(true);
      return;
    }
    if (wonCard) {
      try {
        collectCard("pokemon", question.image);
      } catch {
        /* 게임 완료는 유지합니다. */
      }
    }
    setCaptured(wonCard);
    setMessage(
      wonCard
        ? "정답! 가방 정리와 도감 등록까지 성공!"
        : "정답! 가방 정리를 멋지게 끝냈어요.",
    );
    setStage(3);
  }

  async function openCatalog() {
    if (await isAuthenticated()) router.push("/catalog?world=pokemon");
    else setLoginPromptOpen(true);
  }

  return (
    <main className="bag-sort-game">
      <header className="bag-header">
        <Link href="/">← 캐릭터 선택</Link>
        <strong>포켓몬 연구소</strong>
        <button type="button" onClick={() => void openCatalog()}>
          내 도감
        </button>
      </header>
      <section className="bag-panel">
        <span className="bag-kicker">GAME 03 · 분류와 개수 세기</span>
        {stage === 1 && (
          <SortStage
            species={species}
            items={items}
            sorted={sorted}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDrag={startDrag}
            onBasket={chooseBasket}
          />
        )}
        {stage === 2 && (
          <CountStage
            question={question}
            choices={choices}
            onChoose={chooseCount}
          />
        )}
        {stage === 3 && <BagResult captured={captured} pokemon={question} />}
        <p className="bag-message" role="status">
          {message}
        </p>
      </section>
      {draggedItem && dragPoint && (
        <span
          className="dragging-pokemon"
          style={{ left: dragPoint.x, top: dragPoint.y }}
          aria-hidden="true"
        >
          <Image
            src={draggedItem.image}
            alt=""
            width={90}
            height={90}
            unoptimized
          />
        </span>
      )}
      <LoginPromptModal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </main>
  );
}

function SortStage({
  species,
  items,
  sorted,
  selectedId,
  onSelect,
  onDrag,
  onBasket,
}: {
  species: BagSpecies[];
  items: BagItem[];
  sorted: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrag: (event: ReactPointerEvent<HTMLButtonElement>, item: BagItem) => void;
  onBasket: (name: string) => void;
}) {
  return (
    <>
      <div className="professor-guide">
        <span aria-hidden="true">🥼</span>
        <p>
          <b>오박사</b>
          <br />
          가방에 포켓몬들이 뒤섞였구나! 같은 종류끼리 정리해 주겠니?
        </p>
      </div>
      <h1>포켓몬 박사님의 가방 정리</h1>
      <div className="mixed-pokemon">
        {items
          .filter((item) => !sorted[item.id])
          .map((item) => (
            <button
              type="button"
              key={item.id}
              className={selectedId === item.id ? "selected" : ""}
              aria-label={`${item.name} 옮기기`}
              onClick={() => onSelect(item.id)}
              onPointerDown={(event) => onDrag(event, item)}
            >
              <Image
                src={item.image}
                alt={item.name}
                width={90}
                height={90}
                unoptimized
              />
            </button>
          ))}
      </div>
      <p className="bag-instruction">
        끌어다 놓거나 포켓몬과 바구니를 차례로 눌러도 돼요.
      </p>
      <div className="pokemon-baskets">
        {species.map((pokemon) => {
          const sortedItems = items.filter(
            (item) => sorted[item.id] === pokemon.name,
          );
          return (
            <button
              type="button"
              key={pokemon.name}
              data-basket-name={pokemon.name}
              onClick={() => onBasket(pokemon.name)}
            >
              <strong>{pokemon.name}</strong>
              <div>
                {sortedItems.map((item) => (
                  <Image
                    key={item.id}
                    src={item.image}
                    alt=""
                    width={52}
                    height={52}
                    unoptimized
                  />
                ))}
              </div>
              <span>{sortedItems.length}마리</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function CountStage({
  question,
  choices,
  onChoose,
}: {
  question: BagSpecies;
  choices: number[];
  onChoose: (value: number) => Promise<void>;
}) {
  return (
    <>
      <div className="professor-guide">
        <span aria-hidden="true">🥼</span>
        <p>
          <b>오박사</b>
          <br />
          훌륭하구나! 이제 바구니에 몇 마리가 있는지 세어 보자.
        </p>
      </div>
      <h1>{question.name}은 모두 몇 마리일까?</h1>
      <div className="count-basket">
        <strong>{question.name}</strong>
        <div>
          {Array.from({ length: question.count }, (_, index) => (
            <Image
              key={index}
              src={question.image}
              alt={question.name}
              width={105}
              height={105}
              unoptimized
            />
          ))}
        </div>
      </div>
      <div className="count-choices">
        {choices.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => void onChoose(value)}
          >
            {value}
            <small>마리</small>
          </button>
        ))}
      </div>
      <p className="bag-chance">
        정답 후 도감 1% · 스티커{" "}
        {gameRewardConfig.pokemonBagCapture.stickerChance * 100}% 확률
      </p>
    </>
  );
}

function BagResult({
  captured,
  pokemon,
}: {
  captured: boolean;
  pokemon: BagSpecies;
}) {
  return (
    <section className="bag-result">
      <StickerReward kind="pokemonBag" total={1} correct={1} />
      <div className="lab-sparkles" aria-hidden="true">
        ✦ 🎒 ✦
      </div>
      <h1>가방 정리 완료!</h1>
      <Image
        src={pokemon.image}
        alt={pokemon.name}
        width={250}
        height={250}
        unoptimized
        priority
      />
      <h2>
        {captured
          ? `${pokemon.name} 도감 카드 획득!`
          : "분류와 개수 세기 성공!"}
      </h2>
      {/* <p>도감 획득 확률 1% · 스티커 획득 확률 20%</p> */}
      <div className="bag-actions">
        <button type="button" onClick={() => window.location.reload()}>
          다른 가방 정리하기
        </button>
        {captured && (
          <Link href="/catalog?world=pokemon">도감에서 확인하기</Link>
        )}
      </div>
    </section>
  );
}
