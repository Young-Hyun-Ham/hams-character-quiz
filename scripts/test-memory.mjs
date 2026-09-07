import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../app/games/[slug]/memory/memory-state.ts", import.meta.url), "utf8");
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { createMemoryDeck, initialMemoryState, memoryReducer } = context.exports;
const characters = Array.from({ length: 40 }, (_, index) => ({ name: `친구${index}`, image: `/friend-${index}.png`, hint: "친" }));

test("each level creates its own card count with exactly two of every chosen image", () => {
  for (const pairs of [8, 18, 32]) {
    const deck = createMemoryDeck(characters, () => 0.4, pairs);
    assert.equal(deck.length, pairs * 2);
    assert.equal(new Set(deck.map((card) => card.id)).size, pairs * 2);
    const counts = new Map();
    for (const card of deck) counts.set(card.character.image, (counts.get(card.character.image) ?? 0) + 1);
    assert.equal(counts.size, pairs);
    assert.ok([...counts.values()].every((count) => count === 2));
  }
});

test("decks contain 36 unique card IDs and 18 image pairs without changing the catalog", () => {
  const original = JSON.stringify(characters);
  const deck = createMemoryDeck(characters, () => 0.4);
  assert.equal(deck.length, 36);
  assert.equal(new Set(deck.map((card) => card.id)).size, 36);
  const counts = new Map();
  for (const card of deck) counts.set(card.character.image, (counts.get(card.character.image) ?? 0) + 1);
  assert.equal(counts.size, 18);
  assert.ok([...counts.values()].every((count) => count === 2));
  assert.equal(JSON.stringify(characters), original);
  assert.notEqual(JSON.stringify(deck), JSON.stringify(createMemoryDeck(characters, () => 0.8)));
});

test("small catalogs fill every level and every image occurs an even number of times", () => {
  for (const pairs of [8, 18, 32]) {
  for (const count of [1, 11, 18, 19]) {
    const deck = createMemoryDeck(characters.slice(0, count), () => 0.3, pairs);
    assert.equal(deck.length, pairs * 2);
    const counts = new Map();
    for (const card of deck) counts.set(card.character.image, (counts.get(card.character.image) ?? 0) + 1);
    assert.ok([...counts.values()].every((total) => total % 2 === 0));
  }
  }
  assert.equal(createMemoryDeck([]).length, 0);
});

test("an odd pick remains revealed until a second card is selected; duplicate and rapid picks are ignored", () => {
  const deck = createMemoryDeck(characters, () => 0.4);
  let state = initialMemoryState(deck);
  state = memoryReducer(state, { type: "select", id: deck[0].id });
  assert.equal(state.revealed.length, 1);
  assert.equal(memoryReducer(state, { type: "select", id: deck[0].id }), state);
  assert.equal(memoryReducer(state, { type: "resolve", ids: [deck[0].id] }), state);
  assert.equal(state.revealed.length, 1);
  assert.equal(state.selected.length, 1);
  state = memoryReducer(state, { type: "select", id: deck[1].id });
  assert.equal(state.moves, 1);
  assert.equal(state.revealed.length, 2);
  assert.equal(memoryReducer(state, { type: "select", id: deck[2].id }), state);
});

test("every level can be completed and restarted at the same size", () => {
  for (const pairs of [8, 18, 32]) {
    const deck = createMemoryDeck(characters, () => 0.4, pairs);
    let state = initialMemoryState(deck);
    const groups = new Map();
    for (const card of deck) groups.set(card.character.image, [...(groups.get(card.character.image) ?? []), card]);
    for (const pair of groups.values()) {
      for (const card of pair) state = memoryReducer(state, { type: "select", id: card.id });
      state = memoryReducer(state, { type: "resolve", ids: [...state.selected] });
    }
    assert.equal(state.matched.length, pairs * 2);
    assert.equal(state.moves, pairs);
    state = memoryReducer(state, { type: "restart", cards: createMemoryDeck(characters, () => 0.8, pairs) });
    assert.equal(state.cards.length, pairs * 2);
    assert.equal(state.matched.length, 0);
    assert.equal(state.selected.length, 0);
  }
});

test("different images hide, equal images remain matched, and all 18 pairs can be completed", () => {
  const deck = createMemoryDeck(characters, () => 0.4);
  let state = initialMemoryState(deck);
  const first = deck[0];
  const different = deck.find((card) => card.character.image !== first.character.image);
  for (const card of [first, different]) state = memoryReducer(state, { type: "select", id: card.id });
  state = memoryReducer(state, { type: "resolve", ids: [...state.selected] });
  assert.equal(state.matched.length, 0);
  assert.equal(state.revealed.length, 0);
  const groups = new Map();
  for (const card of deck) groups.set(card.character.image, [...(groups.get(card.character.image) ?? []), card]);
  for (const pair of groups.values()) {
    for (const card of pair) state = memoryReducer(state, { type: "select", id: card.id });
    state = memoryReducer(state, { type: "resolve", ids: [...state.selected] });
    assert.equal(memoryReducer(state, { type: "select", id: pair[0].id }), state);
  }
  assert.equal(state.matched.length, 36);
  assert.equal(state.moves, 19);
});

test("identical images from different generated pairs also match; restart clears the board state", () => {
  const deck = createMemoryDeck(characters.slice(0, 11), () => 0.4);
  const group = deck.filter((card) => card.character.image === deck.find((item) => item.id === "0-0").character.image);
  const first = group[0];
  const second = group.find((card) => card.id.split("-")[0] !== first.id.split("-")[0]);
  let state = initialMemoryState(deck);
  for (const card of [first, second]) state = memoryReducer(state, { type: "select", id: card.id });
  const pending = [...state.selected];
  state = memoryReducer(state, { type: "resolve", ids: pending });
  assert.equal(state.matched.length, 2);
  state = memoryReducer(state, { type: "restart", cards: createMemoryDeck(characters, () => 0.8) });
  assert.equal(state.matched.length, 0);
  assert.equal(state.moves, 0);
  assert.equal(state.selected.length, 0);
  assert.equal(memoryReducer(state, { type: "resolve", ids: pending }), state);
});
