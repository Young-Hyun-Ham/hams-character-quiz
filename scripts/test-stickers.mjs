import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { webcrypto } from "node:crypto";

function fixture() {
  const items = new Map();
  const localStorage = { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
  const context = { exports: {}, localStorage, crypto: webcrypto, TextEncoder, navigator: {}, window: { dispatchEvent() {} }, Event };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../app/stickers/storage.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { ...context.exports, items, localStorage };
}
test("quiz thresholds and memory completion", () => {
  const s = fixture();
  for (const kind of ["quiz", "soundbook"]) {
    assert.equal(s.eligible(kind, 10, 8), true);
    assert.equal(s.eligible(kind, 10, 7), false);
    assert.equal(s.eligible(kind, 8, 8), false);
  }
  assert.equal(s.eligible("memory1", 8, 8), true);
  assert.equal(s.eligible("memory2", 18, 17), false);
});
test("default rewards, duplicate awards, rule changes and persisted balance", async () => {
  const s = fixture();
  for (const kind of Object.keys(s.RULES)) await s.award(kind, kind);
  assert.equal(s.balance(), 10);
  await s.award("quiz", "quiz"); assert.equal(s.balance(), 10);
  await assert.rejects(s.saveRules(s.RULES));
  await s.unlock("123456", "123456");
  await s.saveRules({ ...s.RULES, quiz: 7 });
  assert.equal(s.balance(), 10);
  assert.equal((await s.award("new", "quiz")).balance, 17);
  await assert.rejects(s.saveRules({ ...s.RULES, quiz: -1 }));
  s.lockAdmin(); await assert.rejects(s.saveRules(s.RULES));
});
test("six digits, confirmation, salted secret, success reset and persistent five attempt lock", async () => {
  const s = fixture();
  await assert.rejects(s.unlock("12345", "12345"));
  await assert.rejects(s.unlock("123456", "654321"));
  assert.equal(s.readStore().admin, null);
  await s.unlock("123456", "123456");
  assert.equal(JSON.stringify(s.readStore()).includes("123456"), false);
  await assert.rejects(s.unlock("000000"));
  await s.unlock("123456"); assert.equal(s.readStore().admin.failures, 0);
  for (let i = 0; i < 5; i++) await assert.rejects(s.unlock("000000"));
  assert.equal(s.readStore().admin.failures, 5);
  await assert.rejects(s.unlock("123456"), /관리자에게 문의/);
  await assert.rejects(s.saveRules(s.RULES));
});
test("storage write errors are reported without claiming a reward", async () => {
  const s = fixture(); s.localStorage.setItem = () => { throw Error("quota"); };
  await assert.rejects(s.award("id", "quiz"), /quota/);
  assert.equal(s.balance(), 0);
});
