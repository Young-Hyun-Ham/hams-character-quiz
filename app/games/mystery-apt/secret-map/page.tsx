import { randomInt } from "node:crypto";
import { quizWorlds } from "../../../data";
import SecretMapGame from "./secret-map-game";
import { mapShapes } from "./secret-map-shapes";

export const dynamic = "force-dynamic";

export default function SecretMapPage() {
  const world = quizWorlds.find((item) => item.slug === "mystery-apt")!;
  const ghost = world.characters[randomInt(world.characters.length)];
  const slotOrder = [...mapShapes];
  for (let index = slotOrder.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [slotOrder[index], slotOrder[swapIndex]] = [
      slotOrder[swapIndex],
      slotOrder[index],
    ];
  }
  return <SecretMapGame ghost={ghost} slotOrder={slotOrder} />;
}
