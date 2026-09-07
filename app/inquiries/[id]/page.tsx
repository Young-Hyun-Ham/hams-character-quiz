"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "../../components/site-header";
import type { Inquiry, InquiryComment } from "../inquiry-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchInquiry(
  id: string,
): Promise<{ inquiry: Inquiry; comments: InquiryComment[] }> {
  const response = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "문의글을 불러오지 못했습니다.");
  return data;
}

function CommentEditor({
  label,
  onCancel,
  onSubmit,
}: {
  label: string;
  onCancel?: () => void;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(content);
      setContent("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "댓글을 등록하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="comment-editor" onSubmit={submit}>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder="댓글을 입력해 주세요"
        required
      />
      <div>
        <span>{content.length} / 500</span>
        {error && <strong role="alert">{error}</strong>}
        {onCancel && (
          <button type="button" className="comment-cancel" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "등록 중…" : label}
        </button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  childrenByParent,
  replyingTo,
  onReply,
  onSubmitReply,
}: {
  comment: InquiryComment;
  childrenByParent: Map<string | null, InquiryComment[]>;
  replyingTo: string | null;
  onReply: (id: string | null) => void;
  onSubmitReply: (content: string, parentId: string | null) => Promise<void>;
}) {
  const children = childrenByParent.get(comment.id) ?? [];
  return (
    <div className="comment-branch">
      <article className="comment-card">
        <div className="comment-info">
          <strong>익명</strong>
          <time>{formatDate(comment.createdAt)}</time>
        </div>
        <p>{comment.content}</p>
        <button
          type="button"
          onClick={() => onReply(replyingTo === comment.id ? null : comment.id)}
        >
          답글
        </button>
      </article>
      {replyingTo === comment.id && (
        <CommentEditor
          label="답글 등록"
          onCancel={() => onReply(null)}
          onSubmit={(content) => onSubmitReply(content, comment.id)}
        />
      )}
      {children.length > 0 && (
        <div className="comment-children">
          {children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              childrenByParent={childrenByParent}
              replyingTo={replyingTo}
              onReply={onReply}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [comments, setComments] = useState<InquiryComment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchInquiry(id)
      .then((data) => {
        if (!active) return;
        setInquiry(data.inquiry);
        setComments(data.comments);
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const childrenByParent = useMemo(() => {
    const result = new Map<string | null, InquiryComment[]>();
    const ids = new Set(comments.map((comment) => comment.id));
    for (const comment of comments) {
      const parentId =
        comment.parentId && ids.has(comment.parentId) ? comment.parentId : null;
      result.set(parentId, [...(result.get(parentId) ?? []), comment]);
    }
    return result;
  }, [comments]);

  async function submitComment(content: string, parentId: string | null) {
    const response = await fetch(
      `/api/inquiries/${encodeURIComponent(id)}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "댓글을 등록하지 못했습니다.");
    const refreshed = await fetchInquiry(id);
    setInquiry(refreshed.inquiry);
    setComments(refreshed.comments);
    setReplyingTo(null);
  }

  return (
    <main className="board-shell">
      <SiteHeader inquiryActive />
      <section className="board-container narrow">
        <div className="form-heading">
          <div>
            <span className="board-kicker">QUESTION</span>
            <h1>문의 내용</h1>
          </div>
          <Link href="/inquiries">목록으로</Link>
        </div>
        {loading && (
          <div className="board-state">문의글을 불러오는 중이에요…</div>
        )}
        {error && <div className="board-state error">{error}</div>}
        {!loading && !error && inquiry && (
          <>
            <article className="inquiry-detail">
              <h2>{inquiry.title}</h2>
              <div className="inquiry-detail-meta">
                <span>익명</span>
                <time>{formatDate(inquiry.createdAt)}</time>
              </div>
              {inquiry.tags.length > 0 && (
                <div className="tag-list">
                  {inquiry.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
              <p>{inquiry.content}</p>
            </article>
            <section className="comments-section">
              <h2>
                댓글 <span>{comments.length}</span>
              </h2>
              <CommentEditor
                label="댓글 등록"
                onSubmit={(content) => submitComment(content, null)}
              />
              <div className="comment-list">
                {(childrenByParent.get(null) ?? []).map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    childrenByParent={childrenByParent}
                    replyingTo={replyingTo}
                    onReply={setReplyingTo}
                    onSubmitReply={submitComment}
                  />
                ))}
                {comments.length === 0 && (
                  <p className="no-comments">첫 댓글을 남겨 주세요.</p>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
