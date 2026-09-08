import { randomInt } from "node:crypto";
import { quizWorlds } from "../../../data";
import PokeballGame, { type ArithmeticProblem } from "./pokeball-game";

export const dynamic = "force-dynamic";

export default function PokeballPage() {
  const pokemon = quizWorlds.find((world) => world.slug === "pokemon")!;
  const character = pokemon.characters[randomInt(pokemon.characters.length)];
  const target = randomInt(1, 6);
  const kind = [
    "addition",
    "subtraction",
    "complement",
    "multiplication",
    "division",
  ][randomInt(5)] as ArithmeticProblem["kind"];
  let problem: ArithmeticProblem;
  if (kind === "addition") {
    const left = randomInt(2, 7);
    const right = randomInt(2, 11 - left);
    problem = { kind, left, right, answer: left + right };
  } else if (kind === "subtraction") {
    const left = randomInt(6, 11);
    const right = randomInt(1, left);
    problem = { kind, left, right, answer: left - right };
  } else if (kind === "multiplication") {
    const left = randomInt(2, 6);
    const right = randomInt(2, 6);
    problem = { kind, left, right, answer: left * right };
  } else if (kind === "division") {
    const right = randomInt(2, 6);
    const answer = randomInt(2, 6);
    problem = { kind, left: right * answer, right, answer };
  } else {
    const left = randomInt(2, 10);
    problem = { kind, left, right: 10 - left, answer: 10 - left };
  }
  return (
    <PokeballGame character={character} target={target} problem={problem} />
  );
}
