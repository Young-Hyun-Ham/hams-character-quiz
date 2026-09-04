"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { SiteHeader } from "../../components/site-header";

export default function NewInquiryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tags = useMemo(() => [...new Set(tagInput.split(",").map((tag) => tag.trim()).filter(Boolean))], [tagInput]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (tags.length > 5) {
      setError("태그는 최대 5개까지 입력할 수 있습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "문의를 등록하지 못했습니다.");
      router.push(`/inquiries/${data.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "문의를 등록하지 못했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <main className="board-shell">
      <SiteHeader inquiryActive />
      <section className="board-container narrow">
        <div className="form-heading"><div><span className="board-kicker">NEW QUESTION</span><h1>문의 작성</h1></div><Link href="/inquiries">목록으로</Link></div>
        <form className="inquiry-form" onSubmit={submit}>
          <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="문의 제목을 입력해 주세요" required /></label>
          <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={200} rows={7} placeholder="문의 내용을 입력해 주세요" required /><span className="character-counter">{content.length} / 200</span></label>
          <label>태그<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="예: 퀴즈, 캐릭터, 오류" /><span className={`field-help${tags.length > 5 ? " error" : ""}`}>콤마(,)로 구분 · {tags.length} / 5개</span></label>
          {tags.length > 0 && <div className="tag-list form-tags">{tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><Link href="/inquiries">취소</Link><button type="submit" disabled={submitting || tags.length > 5}>{submitting ? "등록 중…" : "문의 등록"}</button></div>
        </form>
      </section>
    </main>
  );
}
