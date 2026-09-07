import { notFound } from "next/navigation";
import { randomInt } from "node:crypto";
import { getQuizWorld, quizWorlds } from "../../data";
import DrawingStudio from "./drawing-studio";

export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return quizWorlds.map(({ slug }) => ({ slug }));
}

export default async function DrawPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const world = getQuizWorld(slug);
  if (!world) notFound();
  const initialCharacterIndex = randomInt(world.characters.length);
  return (
    <DrawingStudio
      world={world}
      initialCharacterIndex={initialCharacterIndex}
    />
  );
}
