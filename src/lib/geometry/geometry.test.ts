import { describe, expect, it } from "vitest";
import {
  canvasToWorld,
  snapPointToGrid,
  worldToCanvas
} from "@/lib/geometry/coordinates";
import {
  furnitureCorners,
  furnitureInsideRoom,
  rectanglesIntersect
} from "@/lib/geometry/collisions";
import {
  closestPointOnSegment,
  distanceBetweenPoints,
  wallAngle,
  wallMidpoint
} from "@/lib/geometry/points";
import {
  distanceToNearestWall,
  halfExtents,
  snapFurniturePosition,
  snapRotation
} from "@/lib/geometry/snapping";
import {
  pointInsidePolygon,
  polygonArea,
  polygonSelfIntersects
} from "@/lib/geometry/polygon";
import type { FurnitureInstance } from "@/types/room";

describe("point and wall geometry", () => {
  it("calculates wall distance, midpoint, and angle in X/Z space", () => {
    const a = { x: 0, z: 0 };
    const b = { x: 3, z: 4 };

    expect(distanceBetweenPoints(a, b)).toBe(5);
    expect(wallMidpoint(a, b)).toEqual({ x: 1.5, z: 2 });
    expect(wallAngle(a, b)).toBeCloseTo(Math.atan2(4, 3));
  });

  it("projects a point onto a wall segment and clamps to endpoints", () => {
    const a = { x: 0, z: 0 };
    const b = { x: 4, z: 0 };

    expect(closestPointOnSegment({ x: 2.2, z: 1.4 }, a, b)).toEqual({
      x: 2.2,
      z: 0
    });
    expect(closestPointOnSegment({ x: 5, z: 1 }, a, b)).toEqual({
      x: 4,
      z: 0
    });
  });
});

describe("polygon geometry", () => {
  const rectangle = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 }
  ];

  it("calculates signed area and containment", () => {
    expect(polygonArea(rectangle)).toBe(12);
    expect(pointInsidePolygon({ x: 1, z: 1 }, rectangle)).toBe(true);
    expect(pointInsidePolygon({ x: 5, z: 1 }, rectangle)).toBe(false);
  });

  it("detects a self-intersecting polygon", () => {
    const bowtie = [
      { x: 0, z: 0 },
      { x: 2, z: 2 },
      { x: 0, z: 2 },
      { x: 2, z: 0 }
    ];

    expect(polygonSelfIntersects(rectangle)).toBe(false);
    expect(polygonSelfIntersects(bowtie)).toBe(true);
  });
});

describe("coordinate transforms", () => {
  it("round trips world and canvas positions without mutating room units", () => {
    const viewport = { zoom: 1.25, panX: 80, panY: 120 };
    const world = { x: 2.4, z: 1.2 };
    const canvas = worldToCanvas(world, viewport);

    expect(canvasToWorld(canvas, viewport)).toEqual(world);
  });

  it("snaps world points to the requested meter increment", () => {
    expect(snapPointToGrid({ x: 1.24, z: 2.46 }, 0.1)).toEqual({
      x: 1.2,
      z: 2.5
    });
  });
});

describe("furniture collisions", () => {
  const room = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 }
  ];

  function furniture(overrides: Partial<FurnitureInstance>): FurnitureInstance {
    return {
      id: "f-1",
      definitionId: "desk",
      x: 1,
      z: 1,
      width: 1,
      depth: 0.6,
      height: 0.72,
      rotation: 0,
      ...overrides
    };
  }

  it("builds rotated furniture corners and tests SAT intersection", () => {
    const first = furnitureCorners(furniture({ rotation: 45 }));
    const second = furnitureCorners(furniture({ x: 1.2, z: 1.1 }));
    const third = furnitureCorners(furniture({ x: 3.5, z: 2.6 }));

    expect(rectanglesIntersect(first, second)).toBe(true);
    expect(rectanglesIntersect(first, third)).toBe(false);
  });

  it("detects when a furniture footprint leaves the room polygon", () => {
    expect(furnitureInsideRoom(furniture({ x: 1.5, z: 1.5 }), room)).toBe(true);
    expect(furnitureInsideRoom(furniture({ x: 0.1, z: 0.1 }), room)).toBe(false);
  });

  it("treats rotation as degrees, matching the rest of the app", () => {
    const [corner] = furnitureCorners(
      furniture({ x: 0, z: 0, width: 2, depth: 2, rotation: 90 })
    );

    // A quarter turn maps the (-1, -1) corner onto (1, -1).
    expect(corner.x).toBeCloseTo(1, 6);
    expect(corner.z).toBeCloseTo(-1, 6);
  });
});

describe("furniture snapping", () => {
  const room = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 }
  ];

  function furniture(overrides: Partial<FurnitureInstance>): FurnitureInstance {
    return {
      id: "f-1",
      definitionId: "desk",
      x: 1,
      z: 1,
      width: 1,
      depth: 0.6,
      height: 0.72,
      rotation: 0,
      ...overrides
    };
  }

  const context = {
    tolerance: 0.12,
    roomPolygon: room,
    others: [],
    gridSize: 0.1,
    enabled: true
  };

  it("expands the bounding box of a rotated piece", () => {
    const half = halfExtents(2, 1, 90);

    expect(half.x).toBeCloseTo(0.5, 6);
    expect(half.z).toBeCloseTo(1, 6);
  });

  it("pulls a piece flush against a wall and reports the guide", () => {
    const result = snapFurniturePosition(furniture({}), { x: 0.54, z: 1.5 }, context);

    // Half the 1 m width, so the left edge lands exactly on x = 0.
    expect(result.x).toBeCloseTo(0.5, 6);
    expect(result.guides.some((guide) => guide.kind === "wall")).toBe(true);
  });

  it("aligns with another piece's centre", () => {
    // 2.8 avoids the room centre (2.0) so only the neighbour can match.
    const result = snapFurniturePosition(
      furniture({}),
      { x: 2.75, z: 1.5 },
      { ...context, others: [furniture({ id: "f-2", x: 2.8, z: 2.5 })] }
    );

    expect(result.x).toBeCloseTo(2.8, 6);
    expect(
      result.guides.some((guide) => guide.kind === "furniture-center")
    ).toBe(true);
  });

  it("falls back to the grid when nothing is nearby", () => {
    const result = snapFurniturePosition(furniture({}), { x: 1.77, z: 1.03 }, context);

    expect(result.x).toBeCloseTo(1.8, 6);
    expect(result.z).toBeCloseTo(1, 6);
    expect(result.guides).toHaveLength(0);
  });

  it("returns the raw position when snapping is disabled", () => {
    const result = snapFurniturePosition(
      furniture({}),
      { x: 0.54, z: 1.5 },
      { ...context, enabled: false }
    );

    expect(result.x).toBeCloseTo(0.54, 6);
    expect(result.guides).toHaveLength(0);
  });

  it("snaps hard to quarter turns and lightly to diagonals", () => {
    expect(snapRotation(87)).toBe(90);
    expect(snapRotation(43)).toBe(45);
    // 8 degrees off a quarter turn is outside the strong threshold.
    expect(snapRotation(82)).toBe(82);
    expect(snapRotation(87, false)).toBe(87);
  });

  it("measures the gap to the closest wall", () => {
    const distance = distanceToNearestWall(furniture({ x: 1, z: 1 }), room);

    // Bounding box spans z 0.7..1.3, so the nearest wall is 0.7 m away.
    expect(distance).toBeCloseTo(0.5, 6);
  });
});
