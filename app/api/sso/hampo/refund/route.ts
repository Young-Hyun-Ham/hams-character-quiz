import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getAdminFirestore, getAdminStorage } from "../../../../../lib/firebase-admin";

export const runtime = "nodejs";

function validSignature(raw: string, timestamp: string, signature: string) {
  const secret = process.env.HAMS_OAUTH_CLIENT_SECRET?.trim();
  const time = Number(timestamp);
  if (!secret || !Number.isFinite(time) || Math.abs(Date.now() - time) > 300_000)
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (
    !validSignature(
      raw,
      request.headers.get("x-hams-timestamp") ?? "",
      request.headers.get("x-hams-signature") ?? "",
    )
  ) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as {
    userId?: unknown;
    items?: Array<{ transactionId?: unknown; referenceId?: unknown }>;
  };
  const userId = typeof body.userId === "string" ? body.userId : "";
  const items = Array.isArray(body.items) ? body.items : [];
  if (!userId || items.length > 100) {
    return Response.json({ ok: false, error: "invalid_refund" }, { status: 400 });
  }

  const firestore = getAdminFirestore();
  const collection = firestore
    .collection("hamsCharacterQuizUsers")
    .doc(userId)
    .collection("drawings");
  const userDirectory = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  let deleted = 0;
  for (const item of items) {
    const drawingId = typeof item.referenceId === "string" ? item.referenceId : "";
    const transactionId =
      typeof item.transactionId === "string" ? item.transactionId : "";
    if (!drawingId || !transactionId) continue;
    const reference = collection.doc(drawingId);
    const snapshot = await reference.get();
    if (!snapshot.exists) continue;
    const data = snapshot.data() ?? {};
    if (data.hampoTransactionId !== transactionId) {
      return Response.json(
        { ok: false, error: "refund_transaction_mismatch" },
        { status: 409 },
      );
    }
    const imagePath = data.imagePath;
    if (
      typeof imagePath === "string" &&
      imagePath.startsWith(`drawings/${userDirectory}/`)
    ) {
      await getAdminStorage().file(imagePath).delete({ ignoreNotFound: true });
    }
    await reference.delete();
    deleted += 1;
  }
  return Response.json({ ok: true, deleted });
}
