"use client";

import { worldToCanvas } from "@/lib/geometry/coordinates";
import {
  furnitureBounds,
  polygonBounds,
  type AlignmentGuide
} from "@/lib/geometry/snapping";
import type { Point } from "@/lib/geometry/points";
import { formatDistance } from "@/lib/units";
import type { BlueprintViewport, FurnitureInstance } from "@/types/room";

const GUIDE_COLOR = "#c2683f";

/** Temporary snap lines. They appear on contact and vanish on release. */
export function AlignmentGuides({
  guides,
  viewport
}: {
  guides: AlignmentGuide[];
  viewport: BlueprintViewport;
}) {
  return (
    <g pointerEvents="none">
      {guides.map((guide, index) => {
        const start =
          guide.axis === "x"
            ? worldToCanvas({ x: guide.position, z: guide.from }, viewport)
            : worldToCanvas({ x: guide.from, z: guide.position }, viewport);
        const end =
          guide.axis === "x"
            ? worldToCanvas({ x: guide.position, z: guide.to }, viewport)
            : worldToCanvas({ x: guide.to, z: guide.position }, viewport);

        return (
          <line
            key={`${guide.axis}-${guide.position}-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={GUIDE_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

/**
 * The "42 cm from the wall" cue shown while a piece is being moved. Only the
 * single closest gap is drawn, so the canvas never fills up with numbers.
 */
export function WallDistanceIndicator({
  item,
  roomPolygon,
  viewport
}: {
  item: FurnitureInstance;
  roomPolygon: Point[];
  viewport: BlueprintViewport;
}) {
  if (roomPolygon.length === 0) {
    return null;
  }

  const bounds = furnitureBounds(item);
  const room = polygonBounds(roomPolygon);
  const gaps = [
    {
      distance: bounds.minX - room.minX,
      from: { x: room.minX, z: item.z },
      to: { x: bounds.minX, z: item.z }
    },
    {
      distance: room.maxX - bounds.maxX,
      from: { x: bounds.maxX, z: item.z },
      to: { x: room.maxX, z: item.z }
    },
    {
      distance: bounds.minZ - room.minZ,
      from: { x: item.x, z: room.minZ },
      to: { x: item.x, z: bounds.minZ }
    },
    {
      distance: room.maxZ - bounds.maxZ,
      from: { x: item.x, z: bounds.maxZ },
      to: { x: item.x, z: room.maxZ }
    }
  ];

  const closest = gaps.reduce((best, gap) =>
    gap.distance < best.distance ? gap : best
  );

  if (closest.distance < 0.02 || closest.distance > 3) {
    return null;
  }

  const start = worldToCanvas(closest.from, viewport);
  const end = worldToCanvas(closest.to, viewport);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const horizontal = Math.abs(end.x - start.x) > Math.abs(end.y - start.y);

  return (
    <g pointerEvents="none">
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={GUIDE_COLOR}
        strokeWidth={1}
      />
      <Tick horizontal={horizontal} x={start.x} y={start.y} />
      <Tick horizontal={horizontal} x={end.x} y={end.y} />
      <text
        fill="#8a4a24"
        fontSize={11}
        fontWeight={600}
        paintOrder="stroke"
        stroke="#fcfcf8"
        strokeWidth={3.5}
        textAnchor="middle"
        x={midpoint.x}
        y={horizontal ? midpoint.y - 5 : midpoint.y - 3}
      >
        {formatDistance(closest.distance)}
      </text>
    </g>
  );
}

function Tick({
  horizontal,
  x,
  y
}: {
  horizontal: boolean;
  x: number;
  y: number;
}) {
  return (
    <line
      x1={horizontal ? x : x - 4}
      y1={horizontal ? y - 4 : y}
      x2={horizontal ? x : x + 4}
      y2={horizontal ? y + 4 : y}
      stroke={GUIDE_COLOR}
      strokeWidth={1}
    />
  );
}
