import { getSsoUserFromRequest } from "@hams-fam/sso-client";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userId(request: Request) {
  return getSsoUserFromRequest(request)?.id ?? null;
}

function isAllowedImage(value: string) {
  if (value.startsWith("/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "login_required" }, { status: 401 });
  const snapshot = await getAdminFirestore()
    .collection("hamsCharacterQuizUsers")
    .doc(id)
    .get();
  const cards = snapshot.data()?.catalogCards;
  return Response.json({
    cards: Array.isArray(cards)
      ? cards.filter((card): card is string => typeof card === "string")
      : [],
  });
}

export async function POST(request: Request) {
  try {
    const id = userId(request);
    if (!id) return Response.json({ error: "login_required" }, { status: 401 });
    const body = (await request.json()) as { world?: unknown; image?: unknown };
    if (
      typeof body.world !== "string" ||
      typeof body.image !== "string" ||
      !isAllowedImage(body.image) ||
      body.world.length > 40 ||
      body.image.length > 500
    )
      return Response.json({ error: "invalid_card" }, { status: 400 });
    const key = `${body.world}:${body.image}`;
    await getAdminFirestore()
      .collection("hamsCharacterQuizUsers")
      .doc(id)
      .set(
        {
          catalogCards: FieldValue.arrayUnion(key),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return Response.json({ collected: true, key });
  } catch (error) {
    console.error("Failed to collect catalog card", error);
    return Response.json({ error: "catalog_save_failed" }, { status: 500 });
  }
}
