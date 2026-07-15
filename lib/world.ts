export const WORLD_OBJECT_TYPES = [
  "house",
  "tree",
  "road",
  "river",
  "cafe",
  "person",
] as const;

export type WorldObjectType = (typeof WORLD_OBJECT_TYPES)[number];

/** An object living in the world. Coordinates are percentages (0–100) of the world viewport. */
export interface WorldObject {
  id: string;
  type: WorldObjectType;
  x: number;
  y: number;
  /** Flavor text shown in the hover tooltip, generated once at spawn. */
  meta: string;
}

export interface RecognizeResponse {
  objects?: Array<{ type: string; x: number; y: number }>;
  /** True when no vision API key is configured — the client falls back to local guessing. */
  fallback?: boolean;
  error?: string;
}

/** Bounding box of a drawn stroke, normalized to 0–100 of the snapshot. Used for keyless demo mode. */
export interface SketchStroke {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export function isWorldObjectType(value: string): value is WorldObjectType {
  return (WORLD_OBJECT_TYPES as readonly string[]).includes(value);
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)];

const TOOLTIP_META: Record<WorldObjectType, () => string> = {
  house: () => `${1 + rand(4)} residents`,
  tree: () => `${1 + rand(5)} birds`,
  road: () => pick(["Well traveled", "Freshly paved", "Scenic route"]),
  river: () => pick(["Fish jumping", "Crystal clear", "Gently flowing"]),
  cafe: () => pick(["Busy", "Smells amazing", "Fresh croissants"]),
  person: () => pick(["New in town", "Local legend", "Loves coffee"]),
};

export const TOOLTIP_ICON: Record<WorldObjectType, string> = {
  house: "🏠",
  tree: "🌳",
  road: "🛤️",
  river: "🌊",
  cafe: "☕",
  person: "🙂",
};

export const TOOLTIP_LABEL: Record<WorldObjectType, string> = {
  house: "Home",
  tree: "Tree",
  road: "Road",
  river: "River",
  cafe: "Cafe",
  person: "Villager",
};

let nextId = 0;

/**
 * Sketch coordinates (0–100 of the drawing) are remapped into the world's
 * ground band so nothing floats in the sky: x → 6–94, y → 46–90.
 */
export function makeWorldObject(type: WorldObjectType, x: number, y: number): WorldObject {
  return {
    id: `obj-${Date.now()}-${nextId++}`,
    type,
    x: 6 + clamp(x, 0, 100) * 0.88,
    y: 46 + clamp(y, 0, 100) * 0.44,
    meta: TOOLTIP_META[type](),
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** A hand-tuned sample village for the "show me an example" path. */
export function sampleWorld(): WorldObject[] {
  const spots: Array<[WorldObjectType, number, number]> = [
    ["road", 50, 55],
    ["river", 60, 92],
    ["house", 22, 24],
    ["house", 78, 20],
    ["cafe", 50, 18],
    ["tree", 8, 40],
    ["tree", 36, 6],
    ["tree", 92, 48],
    ["person", 40, 60],
  ];
  return spots.map(([type, x, y]) => makeWorldObject(type, x, y));
}

/** A focused prototype: turn the sketch as a whole into one cozy house scene. */
export function houseWorldFromSketch(strokes: SketchStroke[]): WorldObject[] {
  if (strokes.length === 0) {
    return [makeWorldObject("house", 50, 44), makeWorldObject("road", 50, 75), makeWorldObject("person", 42, 82)];
  }

  const minX = Math.min(...strokes.map((s) => s.cx - s.w / 2));
  const maxX = Math.max(...strokes.map((s) => s.cx + s.w / 2));
  const minY = Math.min(...strokes.map((s) => s.cy - s.h / 2));
  const maxY = Math.max(...strokes.map((s) => s.cy + s.h / 2));
  const x = clamp((minX + maxX) / 2, 8, 92);
  const y = clamp((minY + maxY) / 2, 8, 80);

  return [
    makeWorldObject("house", x, y),
    makeWorldObject("road", x, clamp(y + 34, 55, 92)),
    makeWorldObject("tree", clamp(x + 26, 12, 88), clamp(y + 8, 18, 78)),
    makeWorldObject("person", clamp(x - 14, 10, 90), clamp(y + 38, 60, 94)),
  ];
}

/**
 * Keyless demo mode: guess an object type for each drawn stroke from its
 * shape, so the world still reflects what (and where) the user drew.
 */
export function guessObjectsFromStrokes(strokes: SketchStroke[]): WorldObject[] {
  const cycle: WorldObjectType[] = ["house", "tree", "cafe", "person"];
  let cycleIdx = 0;
  let flatCount = 0;

  return strokes.map((s) => {
    const aspect = s.w / Math.max(s.h, 0.01);
    let type: WorldObjectType;
    if (aspect > 3) {
      // Wide flat scribbles alternate between road and river.
      type = flatCount++ % 2 === 0 ? "road" : "river";
    } else if (aspect < 0.5) {
      type = "tree";
    } else if (s.w < 10 && s.h < 10) {
      type = "person";
    } else {
      type = cycle[cycleIdx++ % cycle.length];
    }
    return makeWorldObject(type, s.cx, s.cy);
  });
}
