import type { FurnitureInstance } from "@/types/room";
import type { Point } from "./points";
import { pointInsidePolygon } from "./polygon";

export function furnitureCorners(furniture: FurnitureInstance): Point[] {
  const halfWidth = furniture.width / 2;
  const halfDepth = furniture.depth / 2;
  const angle = furniture.rotation;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localCorners = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth }
  ];

  return localCorners.map((corner) => ({
    x: furniture.x + corner.x * cos - corner.z * sin,
    z: furniture.z + corner.x * sin + corner.z * cos
  }));
}

function projectPolygon(axis: Point, points: Point[]) {
  const projections = points.map((point) => point.x * axis.x + point.z * axis.z);

  return {
    min: Math.min(...projections),
    max: Math.max(...projections)
  };
}

function edgeNormal(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) || 1;

  return {
    x: -dz / length,
    z: dx / length
  };
}

export function rectanglesIntersect(a: Point[], b: Point[]) {
  const axes = [
    edgeNormal(a[0], a[1]),
    edgeNormal(a[1], a[2]),
    edgeNormal(b[0], b[1]),
    edgeNormal(b[1], b[2])
  ];

  return axes.every((axis) => {
    const projectionA = projectPolygon(axis, a);
    const projectionB = projectPolygon(axis, b);

    return (
      projectionA.max >= projectionB.min && projectionB.max >= projectionA.min
    );
  });
}

export function furnitureInsideRoom(
  furniture: FurnitureInstance,
  roomPolygon: Point[]
) {
  return furnitureCorners(furniture).every((corner) =>
    pointInsidePolygon(corner, roomPolygon)
  );
}
