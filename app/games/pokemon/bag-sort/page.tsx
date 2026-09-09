import { randomInt } from "node:crypto";
import { quizWorlds } from "../../../data";
import BagSortGame, { type BagItem, type BagSpecies } from "./bag-sort-game";

export const dynamic = "force-dynamic";

function shuffle<T>(values: T[]) {
  for (let index = values.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

export default function BagSortPage() {
  const world = quizWorlds.find((item) => item.slug === "pokemon")!;
  const selected = shuffle([...world.characters]).slice(0, 3);
  const species: BagSpecies[] = selected.map((pokemon) => ({
    name: pokemon.name,
    image: pokemon.image,
    count: randomInt(2, 5),
  }));
  const items: BagItem[] = shuffle(
    species.flatMap((pokemon) =>
      Array.from({ length: pokemon.count }, (_, index) => ({
        id: `${pokemon.image}:${index}`,
        name: pokemon.name,
        image: pokemon.image,
      })),
    ),
  );
  return (
    <BagSortGame
      species={species}
      items={items}
      questionIndex={randomInt(species.length)}
    />
  );
}
