import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { quizWorlds } from "../../../data";
import type { CharacterType } from "../../../types";
import MagicDessertGame, { type PatternProblem } from "./magic-dessert-game";

export const dynamic = "force-dynamic";

const supportedSlugs: CharacterType[] = [
  "teenieping",
  "wishcat",
  "cinnamoroll",
];

function createPattern(): PatternProblem {
  const step = randomInt(1, 4);
  const start = randomInt(1, 11 - step * 3);
  const missingIndex = randomInt(4);
  const values = Array.from({ length: 4 }, (_, index) => start + step * index);
  return { values, missingIndex, answer: values[missingIndex] };
}

export default async function MagicDessertPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!supportedSlugs.includes(slug as CharacterType)) notFound();
  const world = quizWorlds.find((item) => item.slug === slug);
  if (!world) notFound();
  const host = world.characters[randomInt(world.characters.length)];
  const leftCount = randomInt(1, 10);
  return (
    <MagicDessertGame
      world={world}
      host={host}
      leftCount={leftCount}
      pattern={createPattern()}
    />
  );
}
