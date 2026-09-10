import { createHash, randomUUID } from "node:crypto";
import { getSsoClientId, getSsoUserFromRequest } from "@hams-fam/sso-client";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getAdminStorage,
} from "../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = { hash?: string; failures?: number } | null;
type StickerEntry = { id: string; kind: string; amount: number; at: string };

function userId(request: Request) {
  return getSsoUserFromRequest(request)?.id ?? null;
}

function authorized(
  document: FirebaseFirestore.DocumentData | undefined,
  hash: unknown,
) {
  const legacy = document?.stickers?.admin as Admin;
  const admin = (document?.admin as Admin) ?? legacy;
  return (
    !!admin?.hash &&
    admin.failures !== undefined &&
    admin.failures < 5 &&
    hash === admin.hash
  );
}

export async function GET(request: Request) {
  const user = getSsoUserFromRequest(request);
  if (!user) return Response.json({ error: "login_required" }, { status: 401 });
  const collection = getAdminFirestore()
    .collection("hamsCharacterQuizUsers")
    .doc(user.id)
    .collection("drawings");
  const [snapshot, countSnapshot] = await Promise.all([
    collection.orderBy("createdAt", "desc").limit(100).get(),
    collection.where("imagePath", "!=", null).count().get(),
  ]);
  return Response.json({
    drawings: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    savedCount: countSnapshot.data().count,
    hampoBalance: user.hampoBalance,
  });
}

export async function DELETE(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "login_required" }, { status: 401 });
  const body = (await request.json()) as { drawingId?: unknown };
  const drawingId = typeof body.drawingId === "string" ? body.drawingId : "";
  if (!drawingId)
    return Response.json({ error: "invalid_drawing" }, { status: 400 });
  const firestore = getAdminFirestore();
  const drawingReference = firestore
    .collection("hamsCharacterQuizUsers")
    .doc(id)
    .collection("drawings")
    .doc(drawingId);
  const snapshot = await drawingReference.get();
  if (!snapshot.exists)
    return Response.json({ error: "drawing_not_found" }, { status: 404 });
  const imagePath = snapshot.data()?.imagePath;
  const userDirectory = createHash("sha256")
    .update(id)
    .digest("hex")
    .slice(0, 24);
  if (
    typeof imagePath === "string" &&
    imagePath.startsWith(`drawings/${userDirectory}/`)
  )
    await getAdminStorage().file(imagePath).delete({ ignoreNotFound: true });
  await drawingReference.delete();
  return Response.json({ deleted: true });
}

export async function POST(request: Request) {
  const sessionUser = getSsoUserFromRequest(request);
  if (!sessionUser)
    return Response.json({ error: "login_required" }, { status: 401 });
  const id = sessionUser.id;
  const body = (await request.json()) as Record<string, unknown>;
  const firestore = getAdminFirestore();
  const userReference = firestore.collection("hamsCharacterQuizUsers").doc(id);

  if (body.action === "grade") {
    const score = Number(body.score);
    const stickerAmount = Number(body.stickers);
    if (!Number.isInteger(score) || score < 0 || score > 100)
      return Response.json({ error: "invalid_score" }, { status: 400 });
    if (
      !Number.isInteger(stickerAmount) ||
      stickerAmount < 0 ||
      stickerAmount > 999
    )
      return Response.json({ error: "invalid_stickers" }, { status: 400 });
    const drawingId = randomUUID();
    const createdAt = new Date().toISOString();
    const result = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userReference);
      const document = snapshot.data();
      if (!authorized(document, body.adminHash))
        throw new Error("admin_required");
      const stickers =
        document?.stickers && typeof document.stickers === "object"
          ? document.stickers
          : { entries: [], purchases: [] };
      const entries = Array.isArray(stickers.entries)
        ? ([...stickers.entries] as StickerEntry[])
        : [];
      entries.push({
        id: `drawing:${drawingId}`,
        kind: "drawing",
        amount: stickerAmount,
        at: createdAt,
      });
      const balance = entries.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0,
      );
      transaction.set(
        userReference,
        {
          stickers: { ...stickers, admin: FieldValue.delete(), entries },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(userReference.collection("drawings").doc(drawingId), {
        characterName: String(body.characterName ?? "그림").slice(0, 100),
        worldSlug: String(body.worldSlug ?? "").slice(0, 80),
        score,
        stickers: stickerAmount,
        imageName: null,
        imagePath: null,
        createdAt,
      });
      return { drawingId, balance };
    });
    return Response.json(result);
  }

  if (body.action === "saveImage") {
    const drawingId = typeof body.drawingId === "string" ? body.drawingId : "";
    const requestedName =
      typeof body.imageName === "string" ? body.imageName.trim() : "";
    const dataUrl = typeof body.imageData === "string" ? body.imageData : "";
    const safeName = requestedName
      .normalize("NFKC")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 60);
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!drawingId || !safeName || !match)
      return Response.json({ error: "invalid_image" }, { status: 400 });
    const bytes = Buffer.from(match[1], "base64");
    if (!bytes.length || bytes.length > 8 * 1024 * 1024)
      return Response.json({ error: "image_too_large" }, { status: 413 });
    const userSnapshot = await userReference.get();
    if (!authorized(userSnapshot.data(), body.adminHash))
      return Response.json({ error: "admin_required" }, { status: 403 });
    const drawingReference = userReference
      .collection("drawings")
      .doc(drawingId);
    if (!(await drawingReference.get()).exists)
      return Response.json({ error: "drawing_not_found" }, { status: 404 });
    const savedCount = (
      await userReference
        .collection("drawings")
        .where("imagePath", "!=", null)
        .count()
        .get()
    ).data().count;
    const chargeRequired = savedCount >= 10;
    if (chargeRequired && body.confirmHampoCharge !== true)
      return Response.json(
        { error: "hampo_required", hampoBalance: sessionUser.hampoBalance },
        { status: 402 },
      );
    if (chargeRequired && sessionUser.hampoBalance < 1)
      return Response.json(
        { error: "insufficient_hampo", hampoBalance: 0 },
        { status: 402 },
      );
    const fileName = `${randomUUID()}-${safeName}.png`;
    const userDirectory = createHash("sha256")
      .update(id)
      .digest("hex")
      .slice(0, 24);
    const dateDirectory = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const storagePath = `drawings/${userDirectory}/${dateDirectory}/${drawingId}/${fileName}`;
    const downloadToken = randomUUID();
    const bucket = getAdminStorage();
    await bucket.file(storagePath).save(bytes, {
      resumable: false,
      metadata: {
        contentType: "image/png",
        cacheControl: "private, max-age=3600",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
    const savedAt = new Date().toISOString();
    try {
      await firestore.runTransaction(async (transaction) => {
        const currentDrawingSnapshot = await transaction.get(drawingReference);
        if (
          !currentDrawingSnapshot.exists ||
          currentDrawingSnapshot.data()?.imagePath
        )
          throw new Error("drawing_already_saved");
        if (chargeRequired) {
          const hampoUserReference = firestore.collection("users").doc(id);
          const hampoUserSnapshot = await transaction.get(hampoUserReference);
          const currentBalance = Number(
            hampoUserSnapshot.data()?.hampoBalance ?? 0,
          );
          if (
            !hampoUserSnapshot.exists ||
            !Number.isSafeInteger(currentBalance) ||
            currentBalance < 1
          )
            throw new Error("insufficient_hampo");
          const balanceAfter = currentBalance - 1;
          const historyReference = firestore
            .collection("hampo_usage_histories")
            .doc(randomUUID());
          const clientId = getSsoClientId();
          const membership = sessionUser.serviceMemberships.find(
            (item) => item.clientId === clientId,
          );
          transaction.update(hampoUserReference, {
            hampoBalance: balanceAfter,
            updatedAt: savedAt,
          });
          transaction.set(historyReference, {
            id: historyReference.id,
            originalTransactionId: historyReference.id,
            userId: id,
            email: String(hampoUserSnapshot.data()?.email ?? ""),
            serviceSiteId: membership?.serviceSiteId ?? "hams-character-quiz",
            clientId,
            serviceName: membership?.serviceName ?? "한글 몬스터",
            amount: 1,
            refundableAmount: 0,
            previousBalance: currentBalance,
            balanceAfter,
            unitPrice: 100,
            paymentAmount: 100,
            source: "drawing_image",
            status: "completed",
            refundStatus: "none",
            createdAt: savedAt,
            updatedAt: savedAt,
          });
        }
        transaction.update(drawingReference, {
          imageName: safeName,
          imagePath: storagePath,
          imageUrl,
          savedAt,
          hampoCost: chargeRequired ? 1 : 0,
        });
      });
    } catch (error) {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
      if (error instanceof Error && error.message === "insufficient_hampo")
        return Response.json(
          { error: "insufficient_hampo", hampoBalance: 0 },
          { status: 402 },
        );
      throw error;
    }
    return Response.json({
      imageName: safeName,
      imagePath: storagePath,
      imageUrl,
      hampoCharged: chargeRequired ? 1 : 0,
    });
  }

  return Response.json({ error: "invalid_action" }, { status: 400 });
}
