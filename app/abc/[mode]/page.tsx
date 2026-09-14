import { notFound } from "next/navigation";
import { AbcGame } from "../abc-game";
import "../abc.css";

export default async function AbcLessonPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (mode !== "name" && mode !== "listen" && mode !== "speak") notFound();
  return <AbcGame mode={mode} />;
}
