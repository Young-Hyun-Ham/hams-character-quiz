import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { getQuizWorld } from "../../../data";
import MemoryGame from "./memory-game";
import { createMemoryDeck } from "./memory-state";
import { getMemoryLevel } from "../../memory-levels";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ level?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const world = getQuizWorld(slug);
  if (!world || !world.characters.length) notFound();
  const level = getMemoryLevel(query.level);
  return (
    <MemoryGame
      key={`${world.slug}-${level.id}`}
      world={world}
      level={level}
      initialCards={createMemoryDeck(
        world.characters,
        () => randomInt(0x100000000) / 0x100000000,
        level.pairs,
      )}
    />
  );
}
