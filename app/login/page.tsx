import Link from "next/link";
import { normalizeReturnTo } from "@hams-fam/sso-client";
import { SiteHeader } from "../components/site-header";
import "../components/site-auth.css";

const errors: Record<string, string> = {
  sso_state:
    "로그인 요청이 만료되었거나 확인되지 않았어요. 다시 로그인해 주세요.",
  sso_exchange: "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const returnTo = normalizeReturnTo(
    typeof query.returnTo === "string" ? query.returnTo : undefined,
  );
  const message =
    typeof query.error === "string"
      ? (errors[query.error] ??
        "로그인을 완료하지 못했어요. 다시 시도해 주세요.")
      : "HAMS 계정으로 로그인해 주세요.";
  return (
    <main className="sso-login-shell">
      <SiteHeader />
      <section className="sso-login-card" aria-labelledby="sso-login-title">
        <span>HAMS SSO</span>
        <h1 id="sso-login-title">한글 몬스터 로그인</h1>
        <p role={query.error ? "alert" : undefined}>{message}</p>
        <a
          className="auth-button"
          href={`/api/sso/login?returnTo=${encodeURIComponent(returnTo)}`}
        >
          HAMS 계정으로 로그인
        </a>
        <Link className="sso-login-back" href={returnTo}>
          놀이로 돌아가기
        </Link>
      </section>
    </main>
  );
}
