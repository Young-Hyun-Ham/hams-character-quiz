import { handleSsoCallback } from "@hams-fam/sso-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleSsoCallback;
