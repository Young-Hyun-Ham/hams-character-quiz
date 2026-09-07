import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

class ValidationError extends Error {}

function serializeDate(value: unknown) {
  return value instanceof Timestamp
    ? value.toDate().toISOString()
    : new Date().toISOString();
}

function parseInquiry(body: unknown) {
  if (!body || typeof body !== "object")
    throw new ValidationError("문의 내용을 확인해 주세요.");
  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const tags = Array.isArray(input.tags)
    ? [
        ...new Set(
          input.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  if (!title) throw new ValidationError("제목을 입력해 주세요.");
  if (title.length > 80)
    throw new ValidationError("제목은 80자 이하로 입력해 주세요.");
  if (!content) throw new ValidationError("내용을 입력해 주세요.");
  if (content.length > 200)
    throw new ValidationError("내용은 200자 이하로 입력해 주세요.");
  if (tags.length > 5)
    throw new ValidationError("태그는 최대 5개까지 입력할 수 있습니다.");
  if (tags.some((tag) => tag.length > 20))
    throw new ValidationError("태그 하나는 20자 이하로 입력해 주세요.");

  return { title, content, tags };
}

export async function GET() {
  try {
    const snapshot = await getAdminFirestore()
      .collection("inquiries")
      .orderBy("createdAt", "desc")
      .get();
    const inquiries = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title: data.title,
        content: data.content,
        tags: Array.isArray(data.tags) ? data.tags : [],
        commentCount:
          typeof data.commentCount === "number" ? data.commentCount : 0,
        createdAt: serializeDate(data.createdAt),
      };
    });
    return Response.json({ inquiries });
  } catch (error) {
    console.error("Failed to load inquiries", error);
    return Response.json(
      { error: "문의 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = parseInquiry(await request.json());
    const reference = await getAdminFirestore()
      .collection("inquiries")
      .add({
        ...input,
        commentCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    return Response.json({ id: reference.id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "문의를 등록하지 못했습니다.";
    const status =
      error instanceof SyntaxError || error instanceof ValidationError
        ? 400
        : 500;
    if (status === 500) console.error("Failed to create inquiry", error);
    return Response.json(
      { error: status === 400 ? message : "문의를 등록하지 못했습니다." },
      { status },
    );
  }
}
