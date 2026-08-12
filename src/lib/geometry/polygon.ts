import type { Point } from "./points";

export function polygonArea(points: Point[]) {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.z - next.x * current.z;
  }

  return area / 2;
}

export function ensureClockwise(points: Point[]) {
  return polygonArea(points) > 0 ? [...points].reverse() : points;
}

export function pointInsidePolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesZ =
      current.z > point.z !== previous.z > point.z &&
      point.x <
        ((previous.x - current.x) * (point.z - current.z)) /
          (previous.z - current.z) +
          current.x;

    if (crossesZ) {
      inside = !inside;
    }
  }

  return inside;
}

export function polygonBounds(points: Point[]) {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...zs) - Math.min(...zs)
  };
}

function orientation(a: Point, b: Point, c: Point) {
  return Math.sign((b.z - a.z) * (c.x - b.x) - (b.x - a.x) * (c.z - b.z));
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  return o1 !== o2 && o3 !== o4;
}

export function polygonSelfIntersects(points: Point[]) {
  for (let first = 0; first < points.length; first += 1) {
    const a = points[first];
    const b = points[(first + 1) % points.length];

    for (let second = first + 1; second < points.length; second += 1) {
      const adjacent =
        Math.abs(first - second) <= 1 ||
        (first === 0 && second === points.length - 1);

      if (adjacent) {
        continue;
      }

      const c = points[second];
      const d = points[(second + 1) % points.length];

      if (segmentsIntersect(a, b, c, d)) {
        return true;
      }
    }
  }

  return false;
}
