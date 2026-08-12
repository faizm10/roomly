import type { BlueprintViewport } from "@/types/room";
import type { Point } from "./points";

export const BASE_PIXELS_PER_METER = 72;

export function worldToCanvas(point: Point, viewport: BlueprintViewport) {
  const scale = BASE_PIXELS_PER_METER * viewport.zoom;

  return {
    x: point.x * scale + viewport.panX,
    y: point.z * scale + viewport.panY
  };
}

export function canvasToWorld(
  point: { x: number; y: number },
  viewport: BlueprintViewport
) {
  const scale = BASE_PIXELS_PER_METER * viewport.zoom;

  return {
    x: (point.x - viewport.panX) / scale,
    z: (point.y - viewport.panY) / scale
  };
}

export function snapPointToGrid(point: Point, gridSize = 0.1): Point {
  const precision = 100000;

  return {
    x:
      Math.round(Math.round(point.x / gridSize) * gridSize * precision) /
      precision,
    z:
      Math.round(Math.round(point.z / gridSize) * gridSize * precision) /
      precision
  };
}
