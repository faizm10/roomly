import type { RoomVertex } from "@/types/room";

export interface Point {
  x: number;
  z: number;
}

export function distanceBetweenPoints(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function wallMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2
  };
}

export function wallAngle(a: Point, b: Point) {
  return Math.atan2(b.z - a.z, b.x - a.x);
}

export function closestPointOnSegment(point: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;

  if (lengthSquared === 0) {
    return a;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared)
  );

  return {
    x: a.x + dx * t,
    z: a.z + dz * t
  };
}

export function formatMeters(value: number) {
  if (value < 1) {
    return `${Math.round(value * 100)} cm`;
  }

  return `${value.toFixed(2)} m`;
}

export function verticesToPoints(vertices: RoomVertex[]): Point[] {
  return vertices.map(({ x, z }) => ({ x, z }));
}
