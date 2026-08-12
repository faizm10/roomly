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
    const first = furnitureCorners(furniture({ rotation: Math.PI / 4 }));
    const second = furnitureCorners(furniture({ x: 1.2, z: 1.1 }));
    const third = furnitureCorners(furniture({ x: 3.5, z: 2.6 }));

    expect(rectanglesIntersect(first, second)).toBe(true);
    expect(rectanglesIntersect(first, third)).toBe(false);
  });

  it("detects when a furniture footprint leaves the room polygon", () => {
    expect(furnitureInsideRoom(furniture({ x: 1.5, z: 1.5 }), room)).toBe(true);
    expect(furnitureInsideRoom(furniture({ x: 0.1, z: 0.1 }), room)).toBe(false);
  });
});
