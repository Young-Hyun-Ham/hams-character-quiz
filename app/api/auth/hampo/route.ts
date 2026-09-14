import {
  getSsoClientId,
  getSsoAccessTokenFromRequest,
  getSsoServerUrl,
  getSsoUserFromRequest,
} from "@hams-fam/sso-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionUser = getSsoUserFromRequest(request);
  if (!sessionUser) {
    return Response.json({ error: "login_required" }, { status: 401 });
  }
  try {
    const endpoint = new URL("/api/sso/hampo/balance", getSsoServerUrl());
    const accessToken = getSsoAccessTokenFromRequest(request);
    let response = accessToken
      ? await fetch(endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        })
      : null;
    if (!response?.ok) {
      const clientSecret = process.env.HAMS_OAUTH_CLIENT_SECRET?.trim();
      if (!clientSecret) {
        return Response.json(
          { error: "sso_client_secret_unavailable" },
          { status: 503 },
        );
      }
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hams-Client-Id": getSsoClientId(),
          "X-Hams-Client-Secret": clientSecret,
        },
        body: JSON.stringify({ userId: sessionUser.id }),
        cache: "no-store",
      });
    }
    const payload = await response.json();
    return Response.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  } catch (error) {
    console.error("Failed to load live hampo balance", error);
    return Response.json({ error: "hampo_service_unavailable" }, { status: 502 });
  }
}
