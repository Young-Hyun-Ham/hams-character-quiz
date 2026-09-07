import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/inquiries/[id]/comments">,
) {
  try {
    const { id } = await context.params;
    const rawBody: unknown = await request.json();
    const body =
      rawBody && typeof rawBody === "object"
        ? (rawBody as Record<string, unknown>)
        : {};
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const parentId =
      typeof body.parentId === "string" && body.parentId ? body.parentId : null;

    if (!content)
      return Response.json(
        { error: "댓글 내용을 입력해 주세요." },
        { status: 400 },
      );
    if (content.length > 500)
      return Response.json(
        { error: "댓글은 500자 이하로 입력해 주세요." },
        { status: 400 },
      );

    const database = getAdminFirestore();
    const inquiryReference = database.collection("inquiries").doc(id);
    const commentReference = inquiryReference.collection("comments").doc();

    await database.runTransaction(async (transaction) => {
      const inquirySnapshot = await transaction.get(inquiryReference);
      if (!inquirySnapshot.exists)
        throw new Error("문의글을 찾을 수 없습니다.");
      if (parentId) {
        const parentSnapshot = await transaction.get(
          inquiryReference.collection("comments").doc(parentId),
        );
        if (!parentSnapshot.exists)
          throw new Error("답글을 작성할 댓글을 찾을 수 없습니다.");
      }
      transaction.set(commentReference, {
        content,
        parentId,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(inquiryReference, {
        commentCount: FieldValue.increment(1),
      });
    });

    return Response.json({ id: commentReference.id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "댓글을 등록하지 못했습니다.";
    const status = message.includes("찾을 수 없습니다")
      ? 404
      : error instanceof SyntaxError
        ? 400
        : 500;
    if (status === 500) console.error("Failed to create comment", error);
    return Response.json(
      { error: status === 500 ? "댓글을 등록하지 못했습니다." : message },
      { status },
    );
  }
}
