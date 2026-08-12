import type { FurnitureInstance } from "@/types/room";
import type { Point } from "./points";

/**
 * Snapping and alignment maths. Deliberately free of React and of canvas
 * units: callers pass a world-space tolerance so the felt threshold stays
 * constant in screen pixels at any zoom.
 */

export type GuideKind =
  | "wall"
  | "room-center"
  | "furniture-center"
  | "furniture-edge";

export interface AlignmentGuide {
  /** "x" guides are vertical lines; "z" guides are horizontal lines. */
  axis: "x" | "z";
  position: number;
  kind: GuideKind;
  /** Extent along the other axis, so guides stay bounded rather than infinite. */
  from: number;
  to: number;
}

export interface SnapContext {
  /** Axis-aligned tolerance in metres. */
  tolerance: number;
  roomPolygon: Point[];
  others: FurnitureInstance[];
  gridSize: number;
  enabled: boolean;
}

export interface SnapResult {
  x: number;
  z: number;
  guides: AlignmentGuide[];
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Half-extents of a rotated rectangle's axis-aligned bounding box. */
export function halfExtents(width: number, depth: number, rotationDegrees: number) {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    x: (width * cos + depth * sin) / 2,
    z: (width * sin + depth * cos) / 2
  };
}

export function furnitureBounds(item: FurnitureInstance): Bounds {
  const half = halfExtents(item.width, item.depth, item.rotation);

  return {
    minX: item.x - half.x,
    maxX: item.x + half.x,
    minZ: item.z - half.z,
    maxZ: item.z + half.z
  };
}

export function polygonBounds(polygon: Point[]): Bounds {
  const xs = polygon.map((point) => point.x);
  const zs = polygon.map((point) => point.z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs)
  };
}

interface Target {
  position: number;
  kind: GuideKind;
  from: number;
  to: number;
}

function collectTargets(
  axis: "x" | "z",
  context: SnapContext,
  roomBounds: Bounds
): Target[] {
  const targets: Target[] = [];
  const crossFrom = axis === "x" ? roomBounds.minZ : roomBounds.minX;
  const crossTo = axis === "x" ? roomBounds.maxZ : roomBounds.maxX;
  const min = axis === "x" ? roomBounds.minX : roomBounds.minZ;
  const max = axis === "x" ? roomBounds.maxX : roomBounds.maxZ;

  targets.push({ position: min, kind: "wall", from: crossFrom, to: crossTo });
  targets.push({ position: max, kind: "wall", from: crossFrom, to: crossTo });
  targets.push({
    position: (min + max) / 2,
    kind: "room-center",
    from: crossFrom,
    to: crossTo
  });

  for (const other of context.others) {
    const bounds = furnitureBounds(other);
    const otherFrom = axis === "x" ? bounds.minZ : bounds.minX;
    const otherTo = axis === "x" ? bounds.maxZ : bounds.maxX;
    const center = axis === "x" ? other.x : other.z;
    const low = axis === "x" ? bounds.minX : bounds.minZ;
    const high = axis === "x" ? bounds.maxX : bounds.maxZ;

    targets.push({
      position: center,
      kind: "furniture-center",
      from: otherFrom,
      to: otherTo
    });
    targets.push({
      position: low,
      kind: "furniture-edge",
      from: otherFrom,
      to: otherTo
    });
    targets.push({
      position: high,
      kind: "furniture-edge",
      from: otherFrom,
      to: otherTo
    });
  }

  return targets;
}

/**
 * Aligns one axis. The moving piece offers three reference points (its two
 * edges and its centre); the best match across all of them wins, which is what
 * makes "flush against a wall" and "centred on the sofa" both feel natural.
 */
function snapAxis(
  axis: "x" | "z",
  center: number,
  halfExtent: number,
  context: SnapContext,
  roomBounds: Bounds,
  movingBounds: Bounds
) {
  const references = [
    { offset: -halfExtent, weight: 1 },
    { offset: 0, weight: 0.85 },
    { offset: halfExtent, weight: 1 }
  ];
  const targets = collectTargets(axis, context, roomBounds);

  let best: { delta: number; score: number; target: Target } | null = null;

  for (const reference of references) {
    for (const target of targets) {
      const delta = target.position - (center + reference.offset);
      const distance = Math.abs(delta);

      if (distance > context.tolerance) {
        continue;
      }

      // Walls and centres win ties against incidental furniture edges.
      const priority =
        target.kind === "wall" || target.kind === "room-center" ? 0.85 : 1;
      const score = distance * priority * reference.weight;

      if (!best || score < best.score) {
        best = { delta, score, target };
      }
    }
  }

  if (!best) {
    return { center, guide: null as AlignmentGuide | null };
  }

  const movingFrom = axis === "x" ? movingBounds.minZ : movingBounds.minX;
  const movingTo = axis === "x" ? movingBounds.maxZ : movingBounds.maxX;

  return {
    center: center + best.delta,
    guide: {
      axis,
      position: best.target.position,
      kind: best.target.kind,
      from: Math.min(best.target.from, movingFrom),
      to: Math.max(best.target.to, movingTo)
    } satisfies AlignmentGuide
  };
}

function snapToGrid(value: number, gridSize: number) {
  if (gridSize <= 0) {
    return value;
  }

  return Math.round(value / gridSize) * gridSize;
}

/**
 * Resolves a dragged position into a snapped one plus the guides to draw.
 * With snapping disabled it still returns the raw position, so a modifier key
 * gives the user full freedom.
 */
export function snapFurniturePosition(
  item: FurnitureInstance,
  candidate: Point,
  context: SnapContext
): SnapResult {
  if (!context.enabled) {
    return { x: candidate.x, z: candidate.z, guides: [] };
  }

  const half = halfExtents(item.width, item.depth, item.rotation);
  const roomBounds = polygonBounds(context.roomPolygon);
  const movingBounds: Bounds = {
    minX: candidate.x - half.x,
    maxX: candidate.x + half.x,
    minZ: candidate.z - half.z,
    maxZ: candidate.z + half.z
  };

  const x = snapAxis("x", candidate.x, half.x, context, roomBounds, movingBounds);
  const z = snapAxis("z", candidate.z, half.z, context, roomBounds, movingBounds);
  const guides: AlignmentGuide[] = [];

  if (x.guide) {
    guides.push(x.guide);
  }

  if (z.guide) {
    guides.push(z.guide);
  }

  return {
    // Grid is the fallback only where nothing better was found.
    x: x.guide ? x.center : snapToGrid(candidate.x, context.gridSize),
    z: z.guide ? z.center : snapToGrid(candidate.z, context.gridSize),
    guides
  };
}

const STRONG_ANGLES = [0, 90, 180, 270];
const WEAK_ANGLES = [45, 135, 225, 315];
const STRONG_TOLERANCE = 7;
const WEAK_TOLERANCE = 4;

/**
 * Strong pull to the quarter turns, a lighter one to the diagonals, and free
 * rotation when snapping is switched off.
 */
export function snapRotation(rawDegrees: number, enabled = true) {
  const normalized = ((rawDegrees % 360) + 360) % 360;

  if (!enabled) {
    return Math.round(normalized);
  }

  for (const angle of STRONG_ANGLES) {
    if (angularDistance(normalized, angle) <= STRONG_TOLERANCE) {
      return angle;
    }
  }

  for (const angle of WEAK_ANGLES) {
    if (angularDistance(normalized, angle) <= WEAK_TOLERANCE) {
      return angle;
    }
  }

  return Math.round(normalized);
}

function angularDistance(a: number, b: number) {
  const difference = Math.abs(a - b) % 360;

  return difference > 180 ? 360 - difference : difference;
}

/**
 * Shortest gap between a piece's bounding box and any room wall, used for the
 * "42 cm from wall" readout.
 */
export function distanceToNearestWall(
  item: FurnitureInstance,
  roomPolygon: Point[]
) {
  if (roomPolygon.length === 0) {
    return null;
  }

  const bounds = furnitureBounds(item);
  const roomBounds = polygonBounds(roomPolygon);
  const gaps = [
    bounds.minX - roomBounds.minX,
    roomBounds.maxX - bounds.maxX,
    bounds.minZ - roomBounds.minZ,
    roomBounds.maxZ - bounds.maxZ
  ];

  return Math.min(...gaps);
}
