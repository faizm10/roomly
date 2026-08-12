"use client";

import type React from "react";
import {
  FurnitureBlueprint,
  detailForSize
} from "@/components/furniture/blueprint-symbols";
import {
  ACCENT,
  DANGER,
  FurnitureDimensions,
  FurnitureSelectionBox,
  ResizeHandles,
  RotationHandle,
  type ResizeHandle as ResizeHandleName
} from "@/components/blueprint/selection-chrome";
import { halfExtents } from "@/lib/geometry/snapping";
import { formatFootprint } from "@/lib/units";
import type { FurnitureDefinition } from "@/types/furniture";
import type { FurnitureInstance } from "@/types/room";

export type FurnitureActivity = "idle" | "move" | "resize" | "rotate";

/** Screen size below which a piece is drawn as a plain silhouette. */
export function furnitureScreenSize(item: FurnitureInstance, scale: number) {
  return {
    // A 12 px floor keeps tiny pieces clickable when zoomed far out.
    width: Math.max(item.width * scale, 12),
    depth: Math.max(item.depth * scale, 12)
  };
}

/**
 * The drawing itself. Rendered in layer order, so a rug always sits under the
 * bed standing on it.
 */
export function FurnitureSymbolNode({
  item,
  definition,
  center,
  scale,
  selected,
  hovered,
  invalid,
  dragging,
  onPointerDown,
  onPointerEnter,
  onPointerLeave
}: {
  item: FurnitureInstance;
  definition?: FurnitureDefinition;
  center: { x: number; y: number };
  scale: number;
  selected: boolean;
  hovered: boolean;
  invalid: boolean;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<SVGRectElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const { width, depth } = furnitureScreenSize(item, scale);
  const detail = detailForSize(width, depth);
  const tint = item.color ?? definition?.color ?? "#9ca39d";
  const name = definition?.name ?? "Furniture";
  const half = halfExtents(width, depth, item.rotation);
  const tone = invalid ? DANGER : ACCENT;
  // Labels only earn their place when the drawing alone cannot carry the read.
  const showLabel = (hovered && !selected) || (detail === 0 && width > 40);

  return (
    <g
      className={`furniture-enter ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      opacity={dragging ? 0.9 : 1}
      transform={`translate(${center.x} ${center.y})`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <g transform={`rotate(${item.rotation})`}>
        <g pointerEvents="none">
          <FurnitureBlueprint
            depth={depth}
            detail={detail}
            options={definition?.symbolOptions}
            symbol={definition?.symbol ?? "table"}
            tint={tint}
            width={width}
          />
        </g>

        {invalid ? (
          <rect
            x={-width / 2}
            y={-depth / 2}
            width={width}
            height={depth}
            fill={DANGER}
            fillOpacity={0.12}
            pointerEvents="none"
          />
        ) : null}

        {hovered && !selected ? (
          <rect
            x={-width / 2 - 1.5}
            y={-depth / 2 - 1.5}
            width={width + 3}
            height={depth + 3}
            fill="none"
            pointerEvents="none"
            stroke={tone}
            strokeOpacity={0.5}
            strokeWidth={1.25}
          />
        ) : null}

        {/* Transparent hit area on top so thin pieces stay easy to grab. */}
        <rect
          x={-width / 2}
          y={-depth / 2}
          width={width}
          height={depth}
          fill="transparent"
          onPointerDown={onPointerDown}
        />
      </g>

      {showLabel ? <FurnitureLabel name={name} y={-half.z - 9} /> : null}
    </g>
  );
}

/**
 * Selection affordances, drawn in a pass above every symbol so handles are
 * never buried under a neighbouring piece.
 */
export function FurnitureChrome({
  item,
  definition,
  center,
  scale,
  invalid,
  activity,
  onRotatePointerDown,
  onResizePointerDown,
  onDuplicate,
  onRotateQuarter
}: {
  item: FurnitureInstance;
  definition?: FurnitureDefinition;
  center: { x: number; y: number };
  scale: number;
  invalid: boolean;
  activity: FurnitureActivity;
  onRotatePointerDown: (event: React.PointerEvent<SVGGElement>) => void;
  onResizePointerDown: (
    event: React.PointerEvent<SVGRectElement>,
    handle: ResizeHandleName
  ) => void;
  onDuplicate: () => void;
  onRotateQuarter: () => void;
}) {
  const { width, depth } = furnitureScreenSize(item, scale);
  const resizable = definition?.resizable ?? true;
  const half = halfExtents(width, depth, item.rotation);
  const tone = invalid ? DANGER : ACCENT;

  return (
    <g className="chrome-enter" transform={`translate(${center.x} ${center.y})`}>
      <g transform={`rotate(${item.rotation})`}>
        <FurnitureSelectionBox depth={depth} tone={tone} width={width} />
        {resizable ? (
          <ResizeHandles
            depth={depth}
            rotation={item.rotation}
            width={width}
            onPointerDown={onResizePointerDown}
          />
        ) : null}
      </g>

      {/* Unrotated: the rotation grip stays above the object on screen and
          text never ends up upside down. */}
      <RotationHandle depth={half.z * 2} onPointerDown={onRotatePointerDown} />

      {activity === "idle" ? (
        <QuickActions
          y={half.z + 9}
          onDuplicate={onDuplicate}
          onRotate={onRotateQuarter}
        />
      ) : (
        <FurnitureDimensions
          label={
            activity === "rotate"
              ? `${Math.round(item.rotation)}°`
              : formatFootprint(item.width, item.depth)
          }
          tone={tone}
          y={half.z + 9}
        />
      )}
    </g>
  );
}

function FurnitureLabel({ name, y }: { name: string; y: number }) {
  return (
    <text
      fill="#3f463f"
      fontSize={11}
      fontWeight={550}
      paintOrder="stroke"
      pointerEvents="none"
      stroke="#fcfcf8"
      strokeWidth={3.5}
      textAnchor="middle"
      y={y}
    >
      {name}
    </text>
  );
}

/** Deliberately two actions only — the panel is where real editing happens. */
function QuickActions({
  y,
  onDuplicate,
  onRotate
}: {
  y: number;
  onDuplicate: () => void;
  onRotate: () => void;
}) {
  return (
    <g transform={`translate(0 ${y})`}>
      <rect
        x={-27}
        y={0}
        width={54}
        height={22}
        rx={6}
        fill="#ffffff"
        stroke="#d2d6cf"
        strokeWidth={1}
      />
      <line x1={0} x2={0} y1={4} y2={18} stroke="#e2e5df" strokeWidth={1} />
      <QuickAction label="Rotate 90 degrees" x={-13.5} onClick={onRotate}>
        <path
          d="M -3.6 1.2 A 4 4 0 1 0 -1.6 -2.4 M -1.6 -5.2 V -2 H -4.8"
          fill="none"
          stroke="#4a504a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.3}
        />
      </QuickAction>
      <QuickAction label="Duplicate" x={13.5} onClick={onDuplicate}>
        <g fill="none" stroke="#4a504a" strokeWidth={1.2}>
          <rect x={-4.5} y={-4.5} width={6} height={6} rx={1.2} />
          <rect x={-1.5} y={-1.5} width={6} height={6} rx={1.2} fill="#ffffff" />
        </g>
      </QuickAction>
    </g>
  );
}

function QuickAction({
  children,
  label,
  x,
  onClick
}: {
  children: React.ReactNode;
  label: string;
  x: number;
  onClick: () => void;
}) {
  return (
    <g
      aria-label={label}
      className="cursor-pointer"
      role="button"
      transform={`translate(${x} 11)`}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
    >
      <rect x={-11} y={-11} width={22} height={22} fill="transparent" />
      {children}
    </g>
  );
}

/**
 * The translucent footprint shown while dragging a piece in from the library,
 * with a plain-language reason when it will not fit.
 */
export function FurnitureDragPreview({
  definition,
  center,
  scale,
  valid,
  reason
}: {
  definition: FurnitureDefinition;
  center: { x: number; y: number };
  scale: number;
  valid: boolean;
  reason?: string;
}) {
  const width = Math.max(definition.defaultWidth * scale, 12);
  const depth = Math.max(definition.defaultDepth * scale, 12);
  const tone = valid ? ACCENT : DANGER;

  return (
    <g pointerEvents="none" transform={`translate(${center.x} ${center.y})`}>
      <g opacity={0.72}>
        <FurnitureBlueprint
          depth={depth}
          detail={detailForSize(width, depth)}
          options={definition.symbolOptions}
          symbol={definition.symbol}
          tint={definition.color}
          width={width}
        />
      </g>
      <rect
        x={-width / 2 - 1}
        y={-depth / 2 - 1}
        width={width + 2}
        height={depth + 2}
        fill={valid ? "none" : DANGER}
        fillOpacity={valid ? 0 : 0.12}
        stroke={tone}
        strokeDasharray="5 3"
        strokeWidth={1.25}
      />
      <FurnitureDimensions
        label={
          valid
            ? formatFootprint(definition.defaultWidth, definition.defaultDepth)
            : (reason ?? "Does not fit")
        }
        tone={tone}
        y={depth / 2 + 9}
      />
    </g>
  );
}
