import type { Character } from "../../../data";

export type MemoryCard = { id: string; character: Character };
export type MemoryState = {
  cards: MemoryCard[];
  selected: string[];
  revealed: string[];
  matched: string[];
  moves: number;
};
export type MemoryAction =
  | { type: "select"; id: string }
  | { type: "resolve"; ids: string[] }
  | { type: "restart"; cards: MemoryCard[] };

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createMemoryDeck(
  characters: Character[],
  random: () => number = Math.random,
  pairCount = 18,
): MemoryCard[] {
  const unique = shuffle(
    [
      ...new Map(
        characters.map((character) => [character.image, character]),
      ).values(),
    ],
    random,
  );
  if (unique.length === 0) return [];
  const cards = Array.from({ length: pairCount }, (_, pair) => {
    const character = unique[pair % unique.length];
    return [0, 1].map((copy) => ({ id: `${pair}-${copy}`, character }));
  }).flat();
  return shuffle(cards, random);
}

export function initialMemoryState(cards: MemoryCard[]): MemoryState {
  return { cards, selected: [], revealed: [], matched: [], moves: 0 };
}

export function memoryReducer(
  state: MemoryState,
  action: MemoryAction,
): MemoryState {
  if (action.type === "restart") return initialMemoryState(action.cards);
  if (action.type === "select") {
    if (
      state.selected.length >= 2 ||
      state.selected.includes(action.id) ||
      state.matched.includes(action.id) ||
      !state.cards.some((card) => card.id === action.id)
    )
      return state;
    const selected = [...state.selected, action.id];
    return {
      ...state,
      selected,
      revealed: selected,
      moves: state.moves + (selected.length === 2 ? 1 : 0),
    };
  }
  if (
    state.selected.length !== 2 ||
    action.ids.length !== 2 ||
    !action.ids.every((id, index) => id === state.selected[index])
  )
    return state;
  const [first, second] = state.selected.map((id) =>
    state.cards.find((card) => card.id === id)!,
  );
  const matched =
    first.character.image === second.character.image
      ? [...state.matched, ...state.selected]
      : state.matched;
  return { ...state, selected: [], revealed: [], matched };
}
