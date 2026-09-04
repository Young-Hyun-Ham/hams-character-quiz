import { notFound } from "next/navigation";
import { randomInt } from "node:crypto";
import { getQuizWorld, quizWorlds } from "../../data";
import QuizGame from "./quiz-game";

export const dynamic = "force-dynamic";
export function generateStaticParams() { return quizWorlds.map(({ slug }) => ({ slug })); }

function randomQuestions<T>(items: T[], count: number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result.slice(0, count);
}

export default async function QuizPage({ params }: PageProps<"/quiz/[slug]">) {
  const { slug } = await params;
  const world = getQuizWorld(slug);
  if (!world) notFound();
  const initialQuestions = randomQuestions(world.characters, 10);
  return <QuizGame world={world} initialQuestions={initialQuestions} />;
}
