import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { quizWorlds } from "../../../data";
import type { CharacterType } from "../../../types";
import DessertTimeGame from "./dessert-time-game";

export const dynamic = "force-dynamic";

const supportedSlugs: CharacterType[] = [
  "teenieping",
  "wishcat",
  "cinnamoroll",
];

export default async function DessertTimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!supportedSlugs.includes(slug as CharacterType)) notFound();
  const world = quizWorlds.find((item) => item.slug === slug);
  if (!world) notFound();
  const host =
    slug === "teenieping"
      ? (world.characters.find((character) => character.name === "하츄핑") ??
        world.characters[0])
      : world.characters[randomInt(world.characters.length)];
  return (
    <DessertTimeGame
      world={world}
      host={host}
      targetHour={randomInt(1, 13)}
      targetMinute={randomInt(12) * 5}
    />
  );
}
