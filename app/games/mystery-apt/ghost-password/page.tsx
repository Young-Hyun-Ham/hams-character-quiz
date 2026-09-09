import { randomInt } from "node:crypto";
import { quizWorlds } from "../../../data";
import GhostPasswordGame, { type TalismanProblem } from "./ghost-password-game";

export const dynamic = "force-dynamic";

function createProblem(): TalismanProblem {
  const kind = randomInt(2) === 0 ? "addition" : "subtraction";
  if (kind === "addition") {
    const left = randomInt(5, 70);
    const right = randomInt(Math.max(5, 10 - left), 100 - left);
    return { kind, left, right, answer: left + right };
  }
  const left = randomInt(20, 100);
  const right = randomInt(1, left - 9);
  return { kind, left, right, answer: left - right };
}

export default function GhostPasswordPage() {
  const world = quizWorlds.find((item) => item.slug === "mystery-apt")!;
  const ghost = world.characters[randomInt(world.characters.length)];
  return <GhostPasswordGame ghost={ghost} initialProblem={createProblem()} />;
}
