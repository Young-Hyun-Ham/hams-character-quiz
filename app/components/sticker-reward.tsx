"use client";
import { useEffect, useRef, useState } from "react";
import { award, eligible, LABELS, type RewardKind } from "../stickers/storage";

export function StickerReward({
  kind,
  total,
  correct,
}: {
  kind: RewardKind;
  total: number;
  correct: number;
}) {
  const id = useRef<string | null>(null);
  const [message, setMessage] = useState("스티커를 저장하고 있어요…");
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  const qualifies = eligible(kind, total, correct);
  useEffect(() => {
    if (!qualifies) return;
    id.current ??= crypto.randomUUID();
    let active = true;
    award(id.current, kind)
      .then((result) => {
        if (active) {
          setFailed(false);
          setMessage(
            result.amount > 0
              ? `⭐ 스티커 ${result.amount}개 획득! · 모은 스티커 ${result.balance}개`
              : "이번에는 스티커가 나오지 않았어요. 다음에 다시 도전해요!",
          );
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setMessage(
            "스티커를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [kind, qualifies, retry]);
  return (
    <div
      role="status"
      style={{
        margin: "16px 0",
        padding: 16,
        borderRadius: 18,
        background: "#fff2c6",
        color: "#694a18",
        fontWeight: 800,
      }}
    >
      {qualifies
        ? message
        : `${LABELS[kind]} 조건을 달성하면 스티커를 받을 수 있어요!`}
      {failed && (
        <button type="button" onClick={() => setRetry((value) => value + 1)}>
          저장 다시 시도
        </button>
      )}
    </div>
  );
}
