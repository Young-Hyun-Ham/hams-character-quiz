import {
  getSsoClientId,
  getSsoServerUrl,
  getSsoUserFromRequest,
} from "@hams-fam/sso-client";

export async function relayHampoPayment(
  request: Request,
  endpoint: string,
) {
  const user = getSsoUserFromRequest(request);
  if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const clientSecret = process.env.HAMS_OAUTH_CLIENT_SECRET?.trim();
  if (!clientSecret) {
    return Response.json({ message: "SSO Client Secret 설정이 필요합니다." }, { status: 503 });
  }
  try {
    const response = await fetch(new URL(endpoint, getSsoServerUrl()), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hams-Client-Id": getSsoClientId(),
        "X-Hams-Client-Secret": clientSecret,
        "X-Hams-User-Id": user.id,
      },
      body: await request.text(),
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to relay hampo payment", error);
    return Response.json({ message: "함포 결제 서버에 연결하지 못했습니다." }, { status: 502 });
  }
}
