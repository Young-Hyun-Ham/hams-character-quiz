import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function serializeDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date().toISOString();
}

export async function GET(_request: Request, context: RouteContext<"/api/inquiries/[id]">) {
  try {
    const { id } = await context.params;
    const database = getAdminFirestore();
    const inquiryReference = database.collection("inquiries").doc(id);
    const [inquirySnapshot, commentSnapshot] = await Promise.all([
      inquiryReference.get(),
      inquiryReference.collection("comments").orderBy("createdAt", "asc").get(),
    ]);

    if (!inquirySnapshot.exists) {
      return Response.json({ error: "문의글을 찾을 수 없습니다." }, { status: 404 });
    }

    const data = inquirySnapshot.data()!;
    const inquiry = {
      id: inquirySnapshot.id,
      title: data.title,
      content: data.content,
      tags: Array.isArray(data.tags) ? data.tags : [],
      commentCount: typeof data.commentCount === "number" ? data.commentCount : commentSnapshot.size,
      createdAt: serializeDate(data.createdAt),
    };
    const comments = commentSnapshot.docs.map((document) => {
      const comment = document.data();
      return {
        id: document.id,
        content: comment.content,
        parentId: typeof comment.parentId === "string" ? comment.parentId : null,
        createdAt: serializeDate(comment.createdAt),
      };
    });

    return Response.json({ inquiry, comments });
  } catch (error) {
    console.error("Failed to load inquiry", error);
    return Response.json({ error: "문의글을 불러오지 못했습니다." }, { status: 500 });
  }
}
