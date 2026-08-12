"use client";

import type React from "react";

/**
 * Figma-style manipulation chrome, shared by every piece of furniture.
 * Everything here is drawn in screen pixels so handles stay the same physical
 * size at any zoom — precise, never chunky.
 */

export const ACCENT = "#1f4f47";
export const ACCENT_SOFT = "#4d8479";
export const DANGER = "#a4562a";

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export const CORNER_HANDLES: ResizeHandle[] = ["nw", "ne", "se", "sw"];
export const EDGE_HANDLES: ResizeHandle[] = ["n", "e", "s", "w"];

const HANDLE_SIZE = 7;
const EDGE_HANDLE_SIZE = 6;
const BOX_PADDING = 0.5;

/** Which way a handle pushes each local axis. */
export function handleSigns(handle: ResizeHandle) {
  return {
    width: handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0,
    depth: handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0
  };
}

const CURSORS = [
  "cursor-nwse-resize",
  "cursor-ns-resize",
  "cursor-nesw-resize",
  "cursor-ew-resize"
];

const HANDLE_ANGLE: Record<ResizeHandle, number> = {
  nw: 0,
  n: 1,
  ne: 2,
  e: 3,
  se: 4,
  s: 5,
  sw: 6,
  w: 7
};

/** Resize cursors have to follow the object as it rotates. */
export function cursorForHandle(handle: ResizeHandle, rotation: number) {
  const steps = Math.round(rotation / 45);
  const index = (HANDLE_ANGLE[handle] + steps + 8) % 8;

  return CURSORS[index % 4];
}

export function FurnitureSelectionBox({
  width,
  depth,
  tone = ACCENT
}: {
  width: number;
  depth: number;
  tone?: string;
}) {
  return (
    <rect
      x={-width / 2 - BOX_PADDING}
      y={-depth / 2 - BOX_PADDING}
      width={width + BOX_PADDING * 2}
      height={depth + BOX_PADDING * 2}
      fill="none"
      pointerEvents="none"
      stroke={tone}
      strokeWidth={1.25}
    />
  );
}

export function ResizeHandles({
  width,
  depth,
  rotation,
  onPointerDown
}: {
  width: number;
  depth: number;
  rotation: number;
  onPointerDown: (
    event: React.PointerEvent<SVGRectElement>,
    handle: ResizeHandle
  ) => void;
}) {
  // Edge handles only appear once there is room for them to be hit reliably.
  const showEdges = width > 44 && depth > 44;
  const handles = showEdges
    ? [...CORNER_HANDLES, ...EDGE_HANDLES]
    : CORNER_HANDLES;

  return (
    <>
      {handles.map((handle) => {
        const signs = handleSigns(handle);
        const isCorner = signs.width !== 0 && signs.depth !== 0;
        const size = isCorner ? HANDLE_SIZE : EDGE_HANDLE_SIZE;
        const x = (signs.width * width) / 2;
        const y = (signs.depth * depth) / 2;

        return (
          <rect
            key={handle}
            className={cursorForHandle(handle, rotation)}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            rx={1.5}
            fill="#ffffff"
            stroke={ACCENT}
            strokeWidth={1.25}
            onPointerDown={(event) => onPointerDown(event, handle)}
          />
        );
      })}
    </>
  );
}

export function RotationHandle({
  depth,
  onPointerDown
}: {
  depth: number;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const top = -depth / 2;
  const handleY = top - 22;

  return (
    <g className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown}>
      <line
        x1={0}
        x2={0}
        y1={top}
        y2={handleY + 5}
        stroke={ACCENT}
        strokeWidth={1.1}
      />
      {/* Generous transparent target around a deliberately small visual dot. */}
      <circle cx={0} cy={handleY} r={11} fill="transparent" />
      <circle
        cx={0}
        cy={handleY}
        r={4.5}
        fill="#ffffff"
        stroke={ACCENT}
        strokeWidth={1.4}
      />
    </g>
  );
}

/**
 * A small readout pinned under the selection. Rendered outside the rotated
 * group so the text never ends up upside down.
 */
export function FurnitureDimensions({
  label,
  y,
  tone = ACCENT
}: {
  label: string;
  y: number;
  tone?: string;
}) {
  const width = label.length * 6.2 + 14;

  return (
    <g pointerEvents="none" transform={`translate(0 ${y})`}>
      <rect
        x={-width / 2}
        y={0}
        width={width}
        height={19}
        rx={4}
        fill={tone}
      />
      <text
        fill="#ffffff"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        y={13.5}
      >
        {label}
      </text>
    </g>
  );
}

/** The live angle badge shown while rotating. */
export function RotationReadout({ angle, y }: { angle: number; y: number }) {
  return <FurnitureDimensions label={`${Math.round(angle)}°`} y={y} />;
}
