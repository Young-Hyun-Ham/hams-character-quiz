export const mapShapes = [
  "triangle",
  "square",
  "circle",
  "hexagon",
  "diamond",
  "star",
  "pentagon",
  "trapezoid",
] as const;

export type MapShape = (typeof mapShapes)[number];
