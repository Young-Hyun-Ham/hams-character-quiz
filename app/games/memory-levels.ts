export const memoryLevels = [
  { id: 1, pairs: 8, columns: 4, description: "차근차근 시작해요", icon: "🌱" },
  {
    id: 2,
    pairs: 18,
    columns: 6,
    description: "기억력을 키워봐요",
    icon: "🌟",
  },
  {
    id: 3,
    pairs: 32,
    columns: 8,
    description: "기억력 왕에 도전!",
    icon: "🏆",
  },
] as const;

export type MemoryLevel = (typeof memoryLevels)[number];
export type MemoryLevelId = MemoryLevel["id"];

export function getMemoryLevel(value?: string | string[]): MemoryLevel {
  return (
    memoryLevels.find((level) => String(level.id) === value) ?? memoryLevels[1]
  );
}
