import { buildServiceLoginUrl, getSsoClientId, getSsoServerUrl, normalizeReturnTo } from "@hams-fam/sso-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const destination = query.get("destination") === "services" ? "/profile/services" : "/profile";
  const profileUrl = new URL(destination, getSsoServerUrl());
  profileUrl.searchParams.set("client_id", getSsoClientId());
  profileUrl.searchParams.set("return_to", buildServiceLoginUrl(normalizeReturnTo(query.get("returnTo"))));
  const response = NextResponse.redirect(profileUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
