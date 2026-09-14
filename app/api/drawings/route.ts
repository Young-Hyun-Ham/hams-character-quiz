import { createHash, randomUUID } from "node:crypto";
import {
  getSsoAccessTokenFromRequest,
  getSsoClientId,
  getSsoServerUrl,
  getSsoUserFromRequest,
} from "@hams-fam/sso-client";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  getAdminStorage,
} from "../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function consumeDrawingHampo(request: Request, drawingId: string) {
  const sessionUser = getSsoUserFromRequest(request);
  if (!sessionUser)
    return { ok: false as const, error: "login_required", status: 401 };
  const accessToken = getSsoAccessTokenFromRequest(request);
  const clientSecret = process.env.HAMS_OAUTH_CLIENT_SECRET?.trim();
  if (!accessToken && !clientSecret)
    return {
      ok: false as const,
      error: "sso_reauthentication_required",
      status: 401,
    };

  const response = await fetch(
    new URL("/api/sso/hampo/consume", getSsoServerUrl()),
    {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(clientSecret
          ? {
              "X-Hams-Client-Id": getSsoClientId(),
              "X-Hams-Client-Secret": clientSecret,
              "X-Hams-User-Id": sessionUser.id,
            }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 1,
        source: "drawing_image",
        referenceId: drawingId,
        description: "캐릭터 퀴즈 그림 이미지 추가 저장",
      }),
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
    balance?: number;
    transactionId?: string;
  };
  return response.ok && payload.ok
    ? {
        ok: true as const,
        balance: Number(payload.balance ?? 0),
        transactionId: String(payload.transactionId ?? ""),
      }
    : {
        ok: false as const,
        error: payload.error ?? "hampo_consume_failed",
        status: response.status,
      };
}

type Admin = { hash?: string; failures?: number } | null;
type StickerEntry = { id: string; kind: string; amount: number; at: string };

async function getFreeSavedDrawingCount(
  collection: FirebaseFirestore.CollectionReference,
) {
  const snapshot = await collection.where("imagePath", "!=", null).get();
  return snapshot.docs.filter((item) => Number(item.data().hampoCost ?? 0) < 1)
    .length;
}

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
  const [snapshot, freeSavedCount] = await Promise.all([
    collection.orderBy("createdAt", "desc").limit(100).get(),
    getFreeSavedDrawingCount(collection),
  ]);
  return Response.json({
    drawings: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    savedCount: freeSavedCount,
    freeSavedCount,
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
    const freeSavedCount = await getFreeSavedDrawingCount(
      userReference.collection("drawings"),
    );
    const chargeRequired = freeSavedCount >= 10;
    if (chargeRequired && body.confirmHampoCharge !== true)
      return Response.json(
        { error: "hampo_required", hampoBalance: sessionUser.hampoBalance },
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
    let hampoBalance = sessionUser.hampoBalance;
    let hampoTransactionId: string | null = null;
    if (chargeRequired) {
      let consumption: Awaited<ReturnType<typeof consumeDrawingHampo>>;
      try {
        consumption = await consumeDrawingHampo(request, drawingId);
      } catch (error) {
        console.error("Failed to contact SSO hampo API", error);
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
        return Response.json(
          { error: "hampo_service_unavailable" },
          { status: 502 },
        );
      }
      if (!consumption.ok) {
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
        if (consumption.error === "insufficient_hampo") {
          return Response.json(
            { error: "insufficient_hampo", hampoBalance: 0 },
            { status: 402 },
          );
        }
        console.error("SSO hampo consumption rejected", consumption);
        const rejectionStatus = consumption.status ?? 401;
        return Response.json(
          { error: consumption.error },
          { status: rejectionStatus >= 400 ? rejectionStatus : 502 },
        );
      }
      hampoBalance = consumption.balance;
      hampoTransactionId = consumption.transactionId;
    }
    try {
      await firestore.runTransaction(async (transaction) => {
        const currentDrawingSnapshot = await transaction.get(drawingReference);
        if (
          !currentDrawingSnapshot.exists ||
          currentDrawingSnapshot.data()?.imagePath
        )
          throw new Error("drawing_already_saved");
        transaction.update(drawingReference, {
          imageName: safeName,
          imagePath: storagePath,
          imageUrl,
          savedAt,
          hampoCost: chargeRequired ? 1 : 0,
          hampoTransactionId,
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
      hampoBalance,
    });
  }

  return Response.json({ error: "invalid_action" }, { status: 400 });
}
