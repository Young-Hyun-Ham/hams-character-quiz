"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "../components/site-header";
import type { Inquiry } from "./inquiry-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function InquiryListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/inquiries", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "문의 목록을 불러오지 못했습니다.");
        if (active) setInquiries(data.inquiries);
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <main className="board-shell">
      <SiteHeader inquiryActive />
      <section className="board-container">
        <div className="board-heading">
          <div><span className="board-kicker">QUESTION BOARD</span><h1>문의하기</h1><p>궁금한 점이나 전하고 싶은 이야기를 남겨 주세요.</p></div>
          <Link className="primary-board-button" href="/inquiries/new">문의 작성</Link>
        </div>

        {loading && <div className="board-state">문의글을 불러오는 중이에요…</div>}
        {error && <div className="board-state error">{error}</div>}
        {!loading && !error && inquiries.length === 0 && (
          <div className="board-state"><span>✎</span><strong>아직 등록된 문의가 없어요.</strong><p>첫 문의를 남겨 보세요!</p></div>
        )}
        {!loading && !error && inquiries.length > 0 && (
          <div className="inquiry-list">
            {inquiries.map((inquiry) => (
              <Link className="inquiry-row" href={`/inquiries/${inquiry.id}`} key={inquiry.id}>
                <div className="inquiry-row-main">
                  <h2>{inquiry.title}</h2>
                  <p>{inquiry.content}</p>
                  {inquiry.tags.length > 0 && <div className="tag-list">{inquiry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                </div>
                <div className="inquiry-meta"><time>{formatDate(inquiry.createdAt)}</time><span>댓글 {inquiry.commentCount}</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
