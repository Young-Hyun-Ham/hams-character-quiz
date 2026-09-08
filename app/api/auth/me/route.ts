import { getSsoClientId, getSsoUserFromRequest } from "@hams-fam/sso-client";
import type { HeaderUser } from "../../../types/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    const user = getSsoUserFromRequest(request);
    const membership = user?.serviceMemberships?.find(
      (item) => item.clientId === getSsoClientId(),
    );
    const headerUser: HeaderUser | null = user
      ? {
          id: user.id,
          nickname: user.nickname || user.loginId || "친구",
          email: user.email,
          birthDate: user.birthDate ?? null,
          gender: user.gender ?? null,
          aiEnabled: user.aiEnabled === true,
          membership: membership
            ? { serviceName: membership.serviceName, plan: membership.plan }
            : null,
        }
      : null;
    return Response.json({ user: headerUser }, { headers });
  } catch {
    return Response.json(
      { error: "session_unavailable" },
      { status: 503, headers },
    );
  }
}
