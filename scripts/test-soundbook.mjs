import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the component's speech lifecycle with deterministic microphone events.
// Physical microphone and browser rendering still require device verification.
function gameHarness() {
  const slots = [];
  let cursor = 0;
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const recognitions = [];
  const jsx = (type, props) => ({ type, props });
  class Recognition {
    constructor() { recognitions.push(this); }
    start() {}
    stop() { this.stopped = true; }
    abort() { this.aborted = true; }
  }
  const context = {
    exports: {},
    window: { SpeechRecognition: Recognition, isSecureContext: true },
    Date: { now: () => now },
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => ++nextTimer,
    clearInterval: () => {},
    require: (name) => {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name === "react") return {
        useState: (initial) => { const slot = cursor++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], (value) => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; },
        useRef: (initial) => { const slot = cursor++; return slots[slot] ??= { current: initial }; },
        useEffect: () => {},
      };
      return { default: name };
    },
  };
  const source = fs.readFileSync(new URL("../app/soundbook/[slug]/soundbook-game.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const characters = Array.from({ length: 10 }, (_, index) => ({ name: index === 0 ? "하츄핑" : `친구${index}`, image: `/test-${index}.png`, hint: "하" }));
  const world = { title: "티니핑", color: "pink", softColor: "white", characters };
  const render = () => { cursor = 0; return context.exports.default({ world, initialQuestions: characters }); };
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  const label = (node) => Array.isArray(node) ? node.map(label).join("") : typeof node === "object" && node ? label(node.props?.children) : String(node ?? "");
  const click = (text) => {
    const button = nodes(render()).find((node) => node.type === "button" && (node.props["aria-label"] === text || label(node) === text));
    assert.ok(button, `Missing button: ${text}`);
    button.props.onClick();
  };
  return {
    click, context, recognitions,
    text: () => label(render()),
    hasButton: (text) => nodes(render()).some((node) => node.type === "button" && label(node) === text),
    start: () => { click("캐릭터 이름 말하기"); const recognition = recognitions.at(-1); recognition.onaudiostart(); return recognition; },
    heard: (recognition, transcript) => recognition.onresult({ results: [[{ transcript }]] }),
    advance: (duration) => {
      const end = now + duration;
      while (true) {
        const pending = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!pending) break;
        now = pending[1].at; timers.delete(pending[0]); pending[1].callback();
      }
      now = end;
    },
  };
}

test("waits for microphone readiness, captures three seconds and waits for final recognition", () => {
  const game = gameHarness();
  game.click("캐릭터 이름 말하기");
  const recognition = game.recognitions[0];
  game.advance(5000);
  assert.match(game.text(), /마이크를 켜고 있어요/);
  recognition.onaudiostart();
  game.heard(recognition, "하 츄 핑!");
  game.advance(2999);
  assert.equal(recognition.stopped, undefined);
  game.advance(1);
  assert.equal(recognition.stopped, true);
  assert.match(game.text(), /목소리를 확인하고 있어요/);
  recognition.onend();
  assert.match(game.text(), /정답이에요!/);
  assert.equal(game.hasButton("다시풀기"), false);
  game.click("다음문제");
  assert.match(game.text(), /2 \/ 10 문제/);
});

test("wrong names offer retry and next, retry can correct the same question", () => {
  const game = gameHarness();
  let recognition = game.start();
  game.heard(recognition, "하츄핑 피카츄");
  game.advance(3000); recognition.onend();
  assert.equal(game.hasButton("다시풀기"), true);
  assert.equal(game.hasButton("다음문제"), true);
  game.click("다시풀기");
  recognition = game.recognitions.at(-1); recognition.onaudiostart();
  game.heard(recognition, "하츄핑"); game.advance(3000); recognition.onend();
  game.click("다음문제");
  assert.match(game.text(), /정답 1개/);
});

test("permission errors, silence and recognition timeouts never grade an answer", () => {
  for (const scenario of ["permission", "silence", "timeout"]) {
    const game = gameHarness();
    const recognition = game.start();
    if (scenario === "permission") recognition.onerror({ error: "not-allowed" });
    if (scenario === "silence") { game.advance(3000); recognition.onend(); }
    if (scenario === "timeout") game.advance(11000);
    assert.equal(game.hasButton("다시 말하기"), true, scenario);
    assert.equal(game.hasButton("다음문제"), false, scenario);
    assert.equal(recognition.aborted, true, scenario);
  }
});

test("cancel aborts recognition and ignores delayed events; unsupported browsers explain why", () => {
  const game = gameHarness();
  const recognition = game.start();
  const delayedEnd = recognition.onend;
  game.click("취소"); delayedEnd(); game.advance(30000);
  assert.equal(recognition.aborted, true);
  assert.equal(game.hasButton("다음문제"), false);
  delete game.context.window.SpeechRecognition;
  game.click("캐릭터 이름 말하기");
  assert.match(game.text(), /음성 인식을 지원하지 않아요/);
});

test("completes ten questions and restarts with only incorrect answers", () => {
  const game = gameHarness();
  for (let index = 0; index < 10; index++) {
    const recognition = game.start();
    game.heard(recognition, index === 0 ? "피카츄" : `친구${index}`);
    game.advance(3000); recognition.onend(); game.click("다음문제");
  }
  assert.match(game.text(), /10문제 중 9문제/);
  game.click("틀린 문제 다시 풀기");
  assert.match(game.text(), /1 \/ 1 문제/);
});
