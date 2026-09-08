import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const close = (server) => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("SSO routes validate state, exchange codes, protect session cookies, restore returnTo and log out", { timeout: 90000 }, async () => {
  // Test-only secrets and authority; this never signs into a real HAMS account.
  const clientSecret = randomBytes(32).toString("hex");
  const sessionSecret = randomBytes(32).toString("hex");
  let exchangeCount = 0;
  const authority = createServer(async (request, response) => {
    if (request.url !== "/api/sso/exchange" || request.method !== "POST") { response.writeHead(404).end(); return; }
    exchangeCount++;
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    response.setHeader("Content-Type", "application/json");
    if (input.client_id !== "character-quiz-test" || input.client_secret !== clientSecret || input.code !== "test-code") {
      response.writeHead(401).end(JSON.stringify({ ok: false, error: "test_exchange_rejected" })); return;
    }
    response.end(JSON.stringify({ ok: true, user: { id: "sso-test-user", email: "test@example.invalid", nickname: "테스트친구", birthDate: "1984-01-04", gender: "male", aiEnabled: true, serviceMemberships: [{ clientId: "character-quiz-test", serviceName: "hams-character-quiz", plan: "basic" }] }, access_token: "synthetic-test-access-token", token_type: "Bearer", expires_in: 3600 }));
  });
  await listen(authority);
  const portProbe = createServer();
  await listen(portProbe);
  const servicePort = portProbe.address().port;
  await close(portProbe);
  const appUrl = `http://127.0.0.1:${servicePort}`;
  const ssoUrl = `http://127.0.0.1:${authority.address().port}`;
  const service = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(servicePort)], {
    windowsHide: true, stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_APP_URL: appUrl, HAMS_OAUTH_SERVER_URL: ssoUrl, HAMS_OAUTH_CLIENT_ID: "character-quiz-test", HAMS_OAUTH_CLIENT_SECRET: clientSecret, HAMS_SESSION_SECRET: sessionSecret, HAMS_COOKIE_PREFIX: "character_quiz_test", NEXT_PUBLIC_DEV_MOCK_LOGIN: "false" },
  });
  const jar = new Map();
  function saveCookies(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (/max-age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, pair.slice(separator + 1));
    }
  }
  const request = (path, cookies = jar) => fetch(`${appUrl}${path}`, { redirect: "manual", headers: { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") } });
  async function begin(returnTo) {
    const response = await request(`/api/sso/login?returnTo=${encodeURIComponent(returnTo)}`);
    assert.equal(response.status, 307);
    const redirect = new URL(response.headers.get("location"));
    assert.equal(redirect.origin, ssoUrl);
    assert.equal(redirect.pathname, "/sso/start");
    assert.equal(redirect.searchParams.get("client_id"), "character-quiz-test");
    assert.equal(redirect.searchParams.get("redirect_uri"), `${appUrl}/api/sso/callback`);
    assert.ok(redirect.searchParams.get("state"));
    saveCookies(response);
    return redirect.searchParams.get("state");
  }
  try {
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      try { if ((await request("/api/auth/me")).status === 200) { ready = true; break; } } catch {}
      await delay(200);
    }
    assert.ok(ready, "Test service did not start; run pnpm build before this test.");
    const anonymous = await request("/api/auth/me");
    assert.deepEqual(await anonymous.json(), { user: null });
    assert.match(anonymous.headers.get("cache-control"), /no-store/);

    const returnTo = "/inquiries?from=header#reply";
    const state = await begin(returnTo);
    const invalid = await request(`/api/sso/callback?code=test-code&state=${state}-invalid`);
    assert.equal(new URL(invalid.headers.get("location")).searchParams.get("error"), "sso_state");
    assert.equal(exchangeCount, 0);

    const callback = await request(`/api/sso/callback?code=test-code&state=${state}`);
    assert.equal(callback.headers.get("location"), `${appUrl}${returnTo}`);
    assert.equal(exchangeCount, 1);
    const cookies = callback.headers.getSetCookie();
    assert.ok(cookies.some((cookie) => cookie.startsWith("character_quiz_test_session=") && /httponly/i.test(cookie)));
    assert.ok(cookies.some((cookie) => cookie.startsWith("character_quiz_test_sso_access_token=") && /httponly/i.test(cookie)));
    assert.ok(cookies.every((cookie) => !cookie.includes("synthetic-test-access-token")));
    saveCookies(callback);
    assert.equal(jar.has("character_quiz_test_sso_state"), false);
    assert.equal(jar.has("character_quiz_test_sso_return_to"), false);
    const me = await request("/api/auth/me");
    assert.deepEqual(await me.json(), { user: { id: "sso-test-user", nickname: "테스트친구", email: "test@example.invalid", birthDate: "1984-01-04", gender: "male", aiEnabled: true, membership: { serviceName: "hams-character-quiz", plan: "basic" } } });
    assert.match(me.headers.get("cache-control"), /no-store/);

    for (const destination of ["profile", "services"]) {
      const profile = await request(`/api/auth/profile?destination=${destination}&returnTo=${encodeURIComponent(returnTo)}`);
      const target = new URL(profile.headers.get("location"));
      assert.equal(target.origin, ssoUrl);
      assert.equal(target.pathname, destination === "services" ? "/profile/services" : "/profile");
      assert.equal(target.searchParams.get("client_id"), "character-quiz-test");
      const back = new URL(target.searchParams.get("return_to"));
      assert.equal(back.origin, appUrl);
      assert.equal(back.pathname, "/api/sso/login");
      assert.equal(back.searchParams.get("returnTo"), returnTo);
    }
    const unsafeProfile = await request("/api/auth/profile?returnTo=https://example.invalid");
    const safeBack = new URL(new URL(unsafeProfile.headers.get("location")).searchParams.get("return_to"));
    assert.equal(safeBack.searchParams.get("returnTo"), "/");

    const tampered = new Map(jar);
    const session = tampered.get("character_quiz_test_session");
    tampered.set("character_quiz_test_session", session.slice(0, -1) + (session.endsWith("a") ? "b" : "a"));
    assert.deepEqual(await (await request("/api/auth/me", tampered)).json(), { user: null });

    const logout = await request("/api/auth/logout?returnTo=%2F");
    const logoutUrl = new URL(logout.headers.get("location"));
    assert.equal(logoutUrl.origin, ssoUrl);
    assert.equal(logoutUrl.pathname, "/sso/logout");
    assert.equal(logoutUrl.searchParams.get("redirect_to_service"), "true");
    saveCookies(logout);
    assert.equal(jar.size, 0);
    assert.deepEqual(await (await request("/api/auth/me")).json(), { user: null });

    const safeState = await begin("https://example.invalid/external");
    const safeCallback = await request(`/api/sso/callback?code=test-code&state=${safeState}`);
    assert.equal(safeCallback.headers.get("location"), `${appUrl}/`);

    jar.clear();
    const rejectedState = await begin("/inquiries");
    const rejected = await request(`/api/sso/callback?code=exchange-fails&state=${rejectedState}`);
    const errorUrl = new URL(rejected.headers.get("location"));
    assert.equal(errorUrl.pathname, "/login");
    assert.equal(errorUrl.searchParams.get("error"), "sso_exchange");
    assert.equal(errorUrl.searchParams.get("returnTo"), "/inquiries");
    const errorPage = await request(errorUrl.pathname + errorUrl.search);
    assert.equal(errorPage.status, 200);
    assert.match(await errorPage.text(), /HAMS 계정으로 로그인/);
  } finally {
    service.kill();
    await close(authority);
  }
});
