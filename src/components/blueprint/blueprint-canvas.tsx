"use client";

import { Minus, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  canvasToWorld,
  snapPointToGrid,
  worldToCanvas
} from "@/lib/geometry/coordinates";
import {
  closestPointOnSegment,
  distanceBetweenPoints,
  formatMeters,
  verticesToPoints,
  wallAngle,
  wallMidpoint
} from "@/lib/geometry/points";
import { polygonArea, polygonSelfIntersects } from "@/lib/geometry/polygon";
import { useEditorStore } from "@/stores/editor-store";
import type { BlueprintViewport, ID, RoomVertex } from "@/types/room";

type DragState =
  | { kind: "none" }
  | { kind: "pan"; x: number; y: number }
  | { kind: "vertex"; id: ID };

export function BlueprintCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const room = useEditorStore((state) => state.room);
  const tool = useEditorStore((state) => state.tool);
  const selection = useEditorStore((state) => state.selection);
  const viewport = useEditorStore((state) => state.viewport);
  const setSelection = useEditorStore((state) => state.setSelection);
  const panViewport = useEditorStore((state) => state.panViewport);
  const zoomViewport = useEditorStore((state) => state.zoomViewport);
  const updateVertex = useEditorStore((state) => state.updateVertex);
  const insertVertexOnWall = useEditorStore((state) => state.insertVertexOnWall);
  const removeVertex = useEditorStore((state) => state.removeVertex);
  const [drag, setDrag] = useState<DragState>({ kind: "none" });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [hoveredWallId, setHoveredWallId] = useState<ID | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 760 });
  const points = useMemo(() => verticesToPoints(room.vertices), [room.vertices]);
  const canvasVertices = room.vertices.map((vertex) => ({
    ...vertex,
    canvas: worldToCanvas(vertex, viewport)
  }));
  const polygonPoints = canvasVertices
    .map((vertex) => `${vertex.canvas.x},${vertex.canvas.y}`)
    .join(" ");
  const roomArea = Math.abs(polygonArea(points));
  const hasInvalidGeometry = polygonSelfIntersects(points);

  useEffect(() => {
    const element = svgRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selection.kind === "vertex" &&
        selection.id &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        removeVertex(selection.id);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsSpaceDown(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpaceDown(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [removeVertex, selection]);

  function getLocalPoint(
    event:
      | React.PointerEvent<SVGElement>
      | React.WheelEvent<SVGSVGElement>
      | React.PointerEvent<SVGGElement>
  ) {
    const bounds = svgRef.current?.getBoundingClientRect();

    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  function updateDraggedVertex(
    event: React.PointerEvent<SVGSVGElement>,
    vertexId: ID
  ) {
    const localPoint = getLocalPoint(event);
    const worldPoint = snapPointToGrid(canvasToWorld(localPoint, viewport), 0.1);

    updateVertex(vertexId, {
      x: Number(worldPoint.x.toFixed(2)),
      z: Number(worldPoint.z.toFixed(2))
    });
  }

  const grid = useMemo(
    () => buildGrid(canvasSize.width, canvasSize.height, viewport),
    [canvasSize.height, canvasSize.width, viewport]
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label="Blueprint editor canvas"
        onPointerDown={(event) => {
          if (tool === "insert-vertex") {
            return;
          }

          if (tool === "pan" || isSpaceDown) {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ kind: "pan", x: event.clientX, y: event.clientY });
            return;
          }

          setSelection({ kind: "room" });
        }}
        onPointerMove={(event) => {
          if (drag.kind === "pan") {
            panViewport(event.clientX - drag.x, event.clientY - drag.y);
            setDrag({ kind: "pan", x: event.clientX, y: event.clientY });
          }

          if (drag.kind === "vertex") {
            updateDraggedVertex(event, drag.id);
          }
        }}
        onPointerUp={() => setDrag({ kind: "none" })}
        onWheel={(event) => {
          event.preventDefault();
          const localPoint = getLocalPoint(event);
          const nextZoom =
            viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.087);

          zoomViewport(nextZoom, localPoint);
        }}
      >
        <defs>
          <filter id="room-plane-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow
              dx="0"
              dy="8"
              floodColor="#8b9188"
              floodOpacity="0.14"
              stdDeviation="10"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="var(--blueprint)" />
        <GridLayer lines={grid} />

        <polygon
          points={polygonPoints}
          fill="#fcfcf8"
          filter="url(#room-plane-shadow)"
          stroke={hasInvalidGeometry ? "#9b5d20" : "#aeb4aa"}
          strokeWidth={1}
        />

        {room.walls.map((wall) => {
          const start = findVertex(room.vertices, wall.startVertexId);
          const end = findVertex(room.vertices, wall.endVertexId);

          if (!start || !end) {
            return null;
          }

          return (
            <WallMeasurement
              key={wall.id}
              active={hoveredWallId === wall.id}
              end={end}
              insertMode={tool === "insert-vertex"}
              start={start}
              viewport={viewport}
              onInsert={(event) => {
                const localPoint = getLocalPoint(event);
                const worldPoint = canvasToWorld(localPoint, viewport);
                const snappedPoint = snapPointToGrid(
                  closestPointOnSegment(worldPoint, start, end),
                  0.1
                );

                insertVertexOnWall(wall.id, snappedPoint);
              }}
              onEnter={() => setHoveredWallId(wall.id)}
              onLeave={() => setHoveredWallId(null)}
            />
          );
        })}

        {canvasVertices.map((vertex) => {
          const selected =
            selection.kind === "vertex" && selection.id === vertex.id;

          return (
            <circle
              key={vertex.id}
              cx={vertex.canvas.x}
              cy={vertex.canvas.y}
              r={selected ? 6 : 5}
              fill={selected ? "#244f47" : "#ffffff"}
              stroke={selected ? "#14322d" : "#6f756c"}
              strokeWidth={1.5}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelection({ kind: "vertex", id: vertex.id });
                setDrag({ kind: "vertex", id: vertex.id });
              }}
            />
          );
        })}
      </svg>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-[#d2d6cf] bg-white/95 px-3 py-2 text-xs text-[#4f534d] shadow-sm">
        <span className="font-semibold">
          {tool === "insert-vertex"
            ? "Add Vertex"
            : tool === "pan" || isSpaceDown
              ? "Pan"
              : "Blueprint"}
        </span>
        <span className="text-[#a2a7a0]">·</span>
        <span>
          {tool === "insert-vertex"
            ? "click a wall"
            : `${Math.round(viewport.zoom * 100)}%`}
        </span>
      </div>

      {hasInvalidGeometry ? (
        <div className="absolute left-4 top-16 flex items-center gap-2 rounded-lg border border-[#d5b18c] bg-[#fff8ef] px-3 py-2 text-xs text-[#7b481b] shadow-sm">
          <TriangleAlert size={14} />
          Room polygon intersects itself
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <span className="metric-chip">{roomArea.toFixed(1)} m²</span>
        <span className="metric-chip">{room.vertices.length} vertices</span>
        <span className="metric-chip">snap 10 cm</span>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-lg border border-[#d2d6cf] bg-white p-1 shadow-sm">
        <button
          aria-label="Zoom out"
          className="flex size-8 items-center justify-center rounded-md hover:bg-[#eef0ec]"
          type="button"
          onClick={() => zoomViewport(viewport.zoom * 0.88)}
        >
          <Minus size={15} />
        </button>
        <div className="min-w-14 text-center text-xs font-medium text-[#4f534d]">
          {Math.round(viewport.zoom * 100)}%
        </div>
        <button
          aria-label="Zoom in"
          className="flex size-8 items-center justify-center rounded-md hover:bg-[#eef0ec]"
          type="button"
          onClick={() => zoomViewport(viewport.zoom * 1.12)}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function GridLayer({
  lines
}: {
  lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }>;
}) {
  return (
    <g>
      {lines.map((line, index) => (
        <line
          key={`${line.x1}-${line.y1}-${index}`}
          x1={line.x1}
          x2={line.x2}
          y1={line.y1}
          y2={line.y2}
          stroke={line.major ? "#d5d9d1" : "#e6e9e2"}
          strokeWidth={line.major ? 1 : 0.65}
        />
      ))}
    </g>
  );
}

function WallMeasurement({
  active,
  start,
  end,
  insertMode,
  viewport,
  onInsert,
  onEnter,
  onLeave
}: {
  active: boolean;
  start: RoomVertex;
  end: RoomVertex;
  insertMode: boolean;
  viewport: BlueprintViewport;
  onInsert: (event: React.PointerEvent<SVGGElement>) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const canvasStart = worldToCanvas(start, viewport);
  const canvasEnd = worldToCanvas(end, viewport);
  const midpoint = worldToCanvas(wallMidpoint(start, end), viewport);
  const angle = wallAngle(start, end);
  const degrees = (angle * 180) / Math.PI;
  const textRotation = degrees > 90 || degrees < -90 ? degrees + 180 : degrees;
  const length = distanceBetweenPoints(start, end);

  return (
    <g
      className={insertMode ? "cursor-copy" : undefined}
      onPointerDown={(event) => {
        if (!insertMode) {
          return;
        }

        event.stopPropagation();
        onInsert(event);
      }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <line
        x1={canvasStart.x}
        y1={canvasStart.y}
        x2={canvasEnd.x}
        y2={canvasEnd.y}
        stroke="transparent"
        strokeLinecap="round"
        strokeWidth={24}
      />
      <line
        x1={canvasStart.x}
        y1={canvasStart.y}
        x2={canvasEnd.x}
        y2={canvasEnd.y}
        stroke={active || insertMode ? "#1f4f47" : "#2f3832"}
        strokeLinecap="round"
        strokeWidth={active || insertMode ? 8 : 6}
      />
      <line
        x1={canvasStart.x}
        y1={canvasStart.y}
        x2={canvasEnd.x}
        y2={canvasEnd.y}
        stroke="#fcfcf8"
        strokeLinecap="round"
        strokeWidth={1.25}
      />
      <text
        x={midpoint.x}
        y={midpoint.y - 10}
        fill={active ? "#1f4f47" : "#4d554f"}
        fontSize={12}
        fontWeight={500}
        paintOrder="stroke"
        pointerEvents="none"
        stroke="#fcfcf8"
        strokeWidth={4}
        textAnchor="middle"
        transform={`rotate(${textRotation} ${midpoint.x} ${midpoint.y - 10})`}
      >
        {formatMeters(length)}
      </text>
      {insertMode && active ? (
        <g pointerEvents="none">
          <circle
            cx={midpoint.x}
            cy={midpoint.y}
            r={8}
            fill="#ffffff"
            stroke="#1f4f47"
            strokeWidth={1.5}
          />
          <path
            d={`M ${midpoint.x - 4} ${midpoint.y} H ${midpoint.x + 4} M ${midpoint.x} ${midpoint.y - 4} V ${midpoint.y + 4}`}
            stroke="#1f4f47"
            strokeLinecap="round"
            strokeWidth={1.5}
          />
        </g>
      ) : null}
    </g>
  );
}

function findVertex(vertices: RoomVertex[], id: ID) {
  return vertices.find((vertex) => vertex.id === id);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function buildGrid(
  width: number,
  height: number,
  viewport: BlueprintViewport
) {
  const minor = 0.5;
  const major = 1;
  const topLeft = canvasToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = canvasToWorld({ x: width, y: height }, viewport);
  const lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }> = [];

  for (
    let x = Math.floor(topLeft.x / minor) * minor;
    x <= bottomRight.x + minor;
    x += minor
  ) {
    const canvas = worldToCanvas({ x, z: 0 }, viewport);
    const isMajor = Math.abs(x / major - Math.round(x / major)) < 0.001;
    lines.push({
      x1: canvas.x,
      y1: 0,
      x2: canvas.x,
      y2: height,
      major: isMajor
    });
  }

  for (
    let z = Math.floor(topLeft.z / minor) * minor;
    z <= bottomRight.z + minor;
    z += minor
  ) {
    const canvas = worldToCanvas({ x: 0, z }, viewport);
    const isMajor = Math.abs(z / major - Math.round(z / major)) < 0.001;
    lines.push({
      x1: 0,
      y1: canvas.y,
      x2: width,
      y2: canvas.y,
      major: isMajor
    });
  }

  return lines;
}
