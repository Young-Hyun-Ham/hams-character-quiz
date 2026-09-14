import { relayHampoPayment } from "../../../../../lib/sso-hampo-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return relayHampoPayment(request, "/api/sso/hampo/orders");
}
