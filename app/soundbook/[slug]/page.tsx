import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { getQuizWorld } from "../../data";
import SoundbookGame from "./soundbook-game";

export const dynamic = "force-dynamic";

export default async function SoundbookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const world = getQuizWorld(slug);
  if (!world) notFound();
  const questions = [...world.characters];
  for (let index = questions.length - 1; index > 0; index--) {
    const swap = randomInt(index + 1);
    [questions[index], questions[swap]] = [questions[swap], questions[index]];
  }
  return (
    <SoundbookGame
      world={world}
      initialQuestions={questions.slice(0, 10)}
      initialNameColorSeed={randomInt(0x100000000)}
    />
  );
}
