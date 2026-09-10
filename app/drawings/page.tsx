"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "../components/site-header";
import "./drawings.css";

type SavedDrawing = {
  id: string;
  characterName: string;
  score: number;
  stickers: number;
  imageName: string | null;
  imagePath: string | null;
  imageUrl?: string | null;
  createdAt: string;
};
type SortMode = "date" | "name";
const PAGE_SIZE = 10;

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<SavedDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SavedDrawing | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const sortedDrawings = useMemo(
    () =>
      [...drawings].sort((left, right) =>
        sortMode === "name"
          ? (left.imageName || left.characterName).localeCompare(
              right.imageName || right.characterName,
              "ko",
            )
          : new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
      ),
    [drawings, sortMode],
  );
  const totalPages = Math.max(1, Math.ceil(sortedDrawings.length / PAGE_SIZE));
  const visibleDrawings = sortedDrawings.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    void fetch("/api/drawings", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) throw Error("load_failed");
        const payload = (await response.json()) as { drawings: SavedDrawing[] };
        setDrawings(
          payload.drawings.filter(
            (drawing) => drawing.imageUrl || drawing.imagePath,
          ),
        );
      })
      .catch(() => setError("저장된 이미지를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  function openDrawing(drawing: SavedDrawing) {
    setSelected(drawing);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  async function deleteDrawing(drawing: SavedDrawing) {
    if (
      !window.confirm(
        `‘${drawing.imageName || drawing.characterName}’ 이미지를 삭제할까요?`,
      )
    )
      return;
    setDeletingId(drawing.id);
    try {
      const response = await fetch("/api/drawings", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawingId: drawing.id }),
      });
      if (!response.ok) throw Error("delete_failed");
      const remaining = drawings.filter((item) => item.id !== drawing.id);
      setDrawings(remaining);
      setPage((current) =>
        Math.min(current, Math.max(1, Math.ceil(remaining.length / PAGE_SIZE))),
      );
      if (selected?.id === drawing.id) {
        dialogRef.current?.close();
        setSelected(null);
      }
    } catch {
      setError("이미지를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="saved-drawings-shell">
      <SiteHeader />
      <section className="saved-drawings-panel">
        <span>🎨 MY GALLERY</span>
        <div className="saved-drawings-heading">
          <h1>저장된 이미지</h1>
          <div role="group" aria-label="이미지 정렬">
            <button
              type="button"
              aria-pressed={sortMode === "date"}
              onClick={() => {
                setSortMode("date");
                setPage(1);
              }}
            >
              날짜별
            </button>
            <button
              type="button"
              aria-pressed={sortMode === "name"}
              onClick={() => {
                setSortMode("name");
                setPage(1);
              }}
            >
              이름별
            </button>
          </div>
        </div>
        <p>부모님과 함께 채점하고 저장한 그림을 모아 볼 수 있어요.</p>
        {loading ? (
          <p>그림을 불러오고 있어요…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : drawings.length ? (
          <div className="saved-drawings-grid">
            {visibleDrawings.map((drawing) => (
              <article key={drawing.id}>
                <button
                  type="button"
                  className="saved-drawing-open"
                  onClick={() => openDrawing(drawing)}
                >
                  <Image
                    src={drawing.imageUrl || drawing.imagePath!}
                    alt={drawing.imageName || drawing.characterName}
                    width={360}
                    height={270}
                    unoptimized
                  />
                  <span className="saved-drawing-title">
                    <strong>
                      {drawing.imageName || drawing.characterName}
                    </strong>
                    <time dateTime={drawing.createdAt}>
                      {new Date(drawing.createdAt).toLocaleDateString("ko-KR")}
                    </time>
                  </span>
                  <span>
                    {drawing.score}점 · ⭐ {drawing.stickers}개
                  </span>
                </button>
                <button
                  type="button"
                  className="saved-drawing-delete"
                  disabled={deletingId === drawing.id}
                  onClick={() => void deleteDrawing(drawing)}
                >
                  {deletingId === drawing.id ? "삭제 중" : "삭제"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="saved-drawings-empty">아직 저장된 그림이 없어요.</p>
        )}
        {sortedDrawings.length > PAGE_SIZE && (
          <nav
            className="saved-drawings-pagination"
            aria-label="저장 이미지 페이지"
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  type="button"
                  key={number}
                  aria-current={page === number ? "page" : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              다음
            </button>
          </nav>
        )}
      </section>
      <dialog
        ref={dialogRef}
        className="saved-drawing-dialog"
        onClick={() => {
          dialogRef.current?.close();
          setSelected(null);
        }}
        onCancel={() => setSelected(null)}
      >
        {selected && (
          <>
            <h2>{selected.imageName || selected.characterName}</h2>
            <Image
              src={selected.imageUrl || selected.imagePath!}
              alt={selected.imageName || selected.characterName}
              width={1200}
              height={900}
              unoptimized
              priority
            />
            <p>
              {selected.characterName} · {selected.score}점 · ⭐{" "}
              {selected.stickers}개
            </p>
          </>
        )}
      </dialog>
    </main>
  );
}
