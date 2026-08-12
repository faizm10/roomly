"use client";

import { Minus, Plus, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignmentGuides,
  WallDistanceIndicator
} from "@/components/blueprint/alignment-guides";
import {
  FurnitureChrome,
  FurnitureDragPreview,
  FurnitureSymbolNode,
  type FurnitureActivity
} from "@/components/blueprint/furniture-node";
import {
  handleSigns,
  type ResizeHandle
} from "@/components/blueprint/selection-chrome";
import {
  BASE_PIXELS_PER_METER,
  canvasToWorld,
  snapPointToGrid,
  worldToCanvas
} from "@/lib/geometry/coordinates";
import { furnitureInsideRoom } from "@/lib/geometry/collisions";
import {
  closestPointOnSegment,
  distanceBetweenPoints,
  formatMeters,
  verticesToPoints,
  wallAngle,
  wallMidpoint
} from "@/lib/geometry/points";
import { polygonArea, polygonSelfIntersects } from "@/lib/geometry/polygon";
import {
  snapFurniturePosition,
  snapRotation,
  type AlignmentGuide
} from "@/lib/geometry/snapping";
import { clamp, roundMeters } from "@/lib/units";
import { getFurnitureDefinition } from "@/features/furniture/catalog";
import {
  FURNITURE_DRAG_MIME,
  useFurnitureDragStore
} from "@/features/furniture/drag-state";
import { useEditorStore } from "@/stores/editor-store";
import {
  FURNITURE_LAYER_ORDER,
  furnitureSizeBounds
} from "@/types/furniture";
import type {
  BlueprintViewport,
  FurnitureInstance,
  ID,
  RoomVertex
} from "@/types/room";

type DragState =
  | { kind: "none" }
  | { kind: "pan"; x: number; y: number }
  | { kind: "vertex"; id: ID }
  | { kind: "furniture"; id: ID; offsetX: number; offsetZ: number }
  | { kind: "rotate-furniture"; id: ID }
  | {
      kind: "resize-furniture";
      id: ID;
      handle: ResizeHandle;
      startWidth: number;
      startDepth: number;
      startCenterX: number;
      startCenterZ: number;
      startPointerX: number;
      startPointerZ: number;
    };

/** Snap feels the same at every zoom because the tolerance is set in pixels. */
const SNAP_PIXELS = 8;

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
  const updateFurniture = useEditorStore((state) => state.updateFurniture);
  const removeFurniture = useEditorStore((state) => state.removeFurniture);
  const duplicateFurniture = useEditorStore((state) => state.duplicateFurniture);
  const addFurnitureAt = useEditorStore((state) => state.addFurnitureAt);
  const beginInteraction = useEditorStore((state) => state.beginInteraction);
  const endInteraction = useEditorStore((state) => state.endInteraction);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const draggedDefinitionId = useFurnitureDragStore(
    (state) => state.definitionId
  );
  const endLibraryDrag = useFurnitureDragStore((state) => state.endDrag);

  const [drag, setDrag] = useState<DragState>({ kind: "none" });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [hoveredWallId, setHoveredWallId] = useState<ID | null>(null);
  const [hoveredFurnitureId, setHoveredFurnitureId] = useState<ID | null>(null);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [dropPoint, setDropPoint] = useState<{ x: number; z: number } | null>(
    null
  );
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 760 });

  const points = useMemo(() => verticesToPoints(room.vertices), [room.vertices]);
  const scale = BASE_PIXELS_PER_METER * viewport.zoom;
  const canvasVertices = room.vertices.map((vertex) => ({
    ...vertex,
    canvas: worldToCanvas(vertex, viewport)
  }));
  const polygonPoints = canvasVertices
    .map((vertex) => `${vertex.canvas.x},${vertex.canvas.y}`)
    .join(" ");
  const roomArea = Math.abs(polygonArea(points));
  const hasInvalidGeometry = polygonSelfIntersects(points);

  const selectedFurnitureId =
    selection.kind === "furniture" ? (selection.id ?? null) : null;

  /** Paint order comes from the layer, not from creation order. */
  const layeredFurniture = useMemo(() => {
    return room.furniture
      .map((item, index) => ({
        item,
        definition: getFurnitureDefinition(item.definitionId),
        index
      }))
      .sort((a, b) => {
        const left = FURNITURE_LAYER_ORDER[a.definition?.layer ?? "base"];
        const right = FURNITURE_LAYER_ORDER[b.definition?.layer ?? "base"];

        return left - right || a.index - b.index;
      });
  }, [room.furniture]);

  const outOfBounds = useMemo(() => {
    const flagged = new Set<ID>();

    for (const item of room.furniture) {
      if (!furnitureInsideRoom(item, points)) {
        flagged.add(item.id);
      }
    }

    return flagged;
  }, [points, room.furniture]);

  const activity: FurnitureActivity =
    drag.kind === "furniture"
      ? "move"
      : drag.kind === "resize-furniture"
        ? "resize"
        : drag.kind === "rotate-furniture"
          ? "rotate"
          : "idle";

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

  const nudgeSelected = useCallback(
    (dx: number, dz: number) => {
      if (!selectedFurnitureId) {
        return;
      }

      const item = room.furniture.find(
        (furniture) => furniture.id === selectedFurnitureId
      );

      if (!item) {
        return;
      }

      beginInteraction();
      updateFurniture(item.id, {
        x: roundMeters(item.x + dx),
        z: roundMeters(item.z + dz)
      });
    },
    [beginInteraction, room.furniture, selectedFurnitureId, updateFurniture]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();

        if (selectedFurnitureId) {
          duplicateFurniture(selectedFurnitureId);
        }

        return;
      }

      if (event.key === "Escape") {
        setSelection({ kind: "room" });
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.kind === "vertex" && selection.id) {
          event.preventDefault();
          removeVertex(selection.id);
          return;
        }

        if (selectedFurnitureId) {
          event.preventDefault();
          removeFurniture(selectedFurnitureId);
          return;
        }
      }

      if (selectedFurnitureId && event.key.startsWith("Arrow")) {
        const step = event.shiftKey ? 0.1 : 0.01;
        event.preventDefault();

        if (event.key === "ArrowLeft") {
          nudgeSelected(-step, 0);
        } else if (event.key === "ArrowRight") {
          nudgeSelected(step, 0);
        } else if (event.key === "ArrowUp") {
          nudgeSelected(0, -step);
        } else if (event.key === "ArrowDown") {
          nudgeSelected(0, step);
        }

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
  }, [
    duplicateFurniture,
    nudgeSelected,
    redo,
    removeFurniture,
    removeVertex,
    selectedFurnitureId,
    selection,
    setSelection,
    undo
  ]);

  function getLocalPoint(event: {
    clientX: number;
    clientY: number;
  }) {
    const bounds = svgRef.current?.getBoundingClientRect();

    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  function findFurniture(id: ID) {
    return room.furniture.find((item) => item.id === id);
  }

  function updateDraggedVertex(
    event: React.PointerEvent<SVGSVGElement>,
    vertexId: ID
  ) {
    const worldPoint = snapPointToGrid(
      canvasToWorld(getLocalPoint(event), viewport),
      0.1
    );

    updateVertex(vertexId, {
      x: Number(worldPoint.x.toFixed(2)),
      z: Number(worldPoint.z.toFixed(2))
    });
  }

  function updateDraggedFurniture(
    event: React.PointerEvent<SVGSVGElement>,
    furnitureDrag: Extract<DragState, { kind: "furniture" }>
  ) {
    const item = findFurniture(furnitureDrag.id);

    if (!item) {
      return;
    }

    const worldPoint = canvasToWorld(getLocalPoint(event), viewport);
    const candidate = {
      x: worldPoint.x - furnitureDrag.offsetX,
      z: worldPoint.z - furnitureDrag.offsetZ
    };
    // Alt gives full freedom, matching the convention in design tools.
    const result = snapFurniturePosition(item, candidate, {
      tolerance: SNAP_PIXELS / scale,
      roomPolygon: points,
      others: room.furniture.filter((other) => other.id !== item.id),
      gridSize: 0.05,
      enabled: !event.altKey
    });

    setGuides(result.guides);
    updateFurniture(item.id, {
      x: roundMeters(result.x),
      z: roundMeters(result.z)
    });
  }

  function updateRotatedFurniture(
    event: { clientX: number; clientY: number; altKey: boolean },
    furnitureId: ID
  ) {
    const item = findFurniture(furnitureId);

    if (!item) {
      return;
    }

    const localPoint = getLocalPoint(event);
    const center = worldToCanvas(item, viewport);
    const pointerAngle =
      (Math.atan2(localPoint.y - center.y, localPoint.x - center.x) * 180) /
      Math.PI;

    updateFurniture(furnitureId, {
      rotation: snapRotation(pointerAngle + 90, !event.altKey)
    });
  }

  /**
   * Anchored resize: the corner opposite the handle stays put, so the piece
   * grows the way it does in a design tool rather than from its centre.
   */
  function updateResizedFurniture(
    event: React.PointerEvent<SVGSVGElement>,
    furnitureDrag: Extract<DragState, { kind: "resize-furniture" }>
  ) {
    const item = findFurniture(furnitureDrag.id);

    if (!item) {
      return;
    }

    const definition = getFurnitureDefinition(item.definitionId);
    const bounds = furnitureSizeBounds(definition);
    const worldPoint = canvasToWorld(getLocalPoint(event), viewport);
    const radians = (item.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = worldPoint.x - furnitureDrag.startPointerX;
    const dz = worldPoint.z - furnitureDrag.startPointerZ;
    const localDx = dx * cos + dz * sin;
    const localDz = -dx * sin + dz * cos;
    const signs = handleSigns(furnitureDrag.handle);

    const width = clamp(
      roundToCentimetres(furnitureDrag.startWidth + localDx * signs.width),
      bounds.minWidth,
      bounds.maxWidth
    );
    const depth = clamp(
      roundToCentimetres(furnitureDrag.startDepth + localDz * signs.depth),
      bounds.minDepth,
      bounds.maxDepth
    );

    // Shift the centre by half of the growth, in the piece's own frame.
    const localShiftX = ((width - furnitureDrag.startWidth) / 2) * signs.width;
    const localShiftZ = ((depth - furnitureDrag.startDepth) / 2) * signs.depth;

    updateFurniture(item.id, {
      width,
      depth,
      x: roundMeters(
        furnitureDrag.startCenterX + localShiftX * cos - localShiftZ * sin
      ),
      z: roundMeters(
        furnitureDrag.startCenterZ + localShiftX * sin + localShiftZ * cos
      )
    });
  }

  function finishDrag() {
    setDrag({ kind: "none" });
    setGuides([]);
    endInteraction();
  }

  const draggedDefinition = draggedDefinitionId
    ? getFurnitureDefinition(draggedDefinitionId)
    : undefined;
  const dropPreviewValid =
    draggedDefinition && dropPoint
      ? furnitureInsideRoom(
          {
            id: "preview",
            definitionId: draggedDefinition.id,
            x: dropPoint.x,
            z: dropPoint.z,
            width: draggedDefinition.defaultWidth,
            depth: draggedDefinition.defaultDepth,
            height: draggedDefinition.defaultHeight,
            rotation: 0
          },
          points
        )
      : false;

  const grid = useMemo(
    () => buildGrid(canvasSize.width, canvasSize.height, viewport),
    [canvasSize.height, canvasSize.width, viewport]
  );

  const movingItem =
    drag.kind === "furniture" ? findFurniture(drag.id) : undefined;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setDropPoint(null);
      }}
      onDragOver={(event) => {
        // Read the payload type rather than the store: `dragstart` and the
        // first `dragover` can land in the same tick, before React re-renders.
        if (
          !draggedDefinitionId &&
          !event.dataTransfer.types.includes(FURNITURE_DRAG_MIME)
        ) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropPoint(
          snapPointToGrid(canvasToWorld(getLocalPoint(event), viewport), 0.05)
        );
      }}
      onDrop={(event) => {
        event.preventDefault();

        const definitionId =
          event.dataTransfer.getData(FURNITURE_DRAG_MIME) || draggedDefinitionId;

        if (definitionId) {
          const worldPoint = snapPointToGrid(
            canvasToWorld(getLocalPoint(event), viewport),
            0.05
          );

          addFurnitureAt(definitionId, worldPoint);
        }

        setDropPoint(null);
        endLibraryDrag();
      }}
    >
      <svg
        ref={svgRef}
        aria-label="Blueprint editor canvas"
        className={`h-full w-full touch-none select-none ${
          drag.kind === "pan"
            ? "cursor-grabbing"
            : tool === "pan" || isSpaceDown
              ? "cursor-grab"
              : "cursor-default"
        }`}
        role="img"
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

          if (drag.kind === "furniture") {
            updateDraggedFurniture(event, drag);
          }

          if (drag.kind === "rotate-furniture") {
            updateRotatedFurniture(event, drag.id);
          }

          if (drag.kind === "resize-furniture") {
            updateResizedFurniture(event, drag);
          }
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={(event) => {
          event.preventDefault();
          const localPoint = getLocalPoint(event);
          const nextZoom = viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.087);

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
              onEnter={() => setHoveredWallId(wall.id)}
              onInsert={(event) => {
                const worldPoint = canvasToWorld(getLocalPoint(event), viewport);
                const snappedPoint = snapPointToGrid(
                  closestPointOnSegment(worldPoint, start, end),
                  0.1
                );

                insertVertexOnWall(wall.id, snappedPoint);
              }}
              onLeave={() => setHoveredWallId(null)}
            />
          );
        })}

        {/* Symbols first, in layer order. */}
        {layeredFurniture.map(({ item, definition }) => (
          <FurnitureSymbolNode
            key={item.id}
            center={worldToCanvas(item, viewport)}
            definition={definition}
            dragging={drag.kind === "furniture" && drag.id === item.id}
            hovered={hoveredFurnitureId === item.id}
            invalid={outOfBounds.has(item.id)}
            item={item}
            scale={scale}
            selected={selectedFurnitureId === item.id}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              const worldPoint = canvasToWorld(getLocalPoint(event), viewport);

              beginInteraction();
              setSelection({ kind: "furniture", id: item.id });
              setDrag({
                kind: "furniture",
                id: item.id,
                offsetX: worldPoint.x - item.x,
                offsetZ: worldPoint.z - item.z
              });
            }}
            onPointerEnter={() => setHoveredFurnitureId(item.id)}
            onPointerLeave={() =>
              setHoveredFurnitureId((current) =>
                current === item.id ? null : current
              )
            }
          />
        ))}

        <AlignmentGuides guides={guides} viewport={viewport} />

        {movingItem ? (
          <WallDistanceIndicator
            item={movingItem}
            roomPolygon={points}
            viewport={viewport}
          />
        ) : null}

        {/* Chrome above every symbol, so handles are never buried. */}
        {layeredFurniture
          .filter(({ item }) => item.id === selectedFurnitureId)
          .map(({ item, definition }) => (
            <FurnitureChrome
              key={item.id}
              activity={activity}
              center={worldToCanvas(item, viewport)}
              definition={definition}
              invalid={outOfBounds.has(item.id)}
              item={item}
              scale={scale}
              onDuplicate={() => duplicateFurniture(item.id)}
              onResizePointerDown={(event, handle) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                const worldPoint = canvasToWorld(getLocalPoint(event), viewport);

                beginInteraction();
                setDrag({
                  kind: "resize-furniture",
                  id: item.id,
                  handle,
                  startWidth: item.width,
                  startDepth: item.depth,
                  startCenterX: item.x,
                  startCenterZ: item.z,
                  startPointerX: worldPoint.x,
                  startPointerZ: worldPoint.z
                });
              }}
              onRotatePointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                beginInteraction();
                setDrag({ kind: "rotate-furniture", id: item.id });
                updateRotatedFurniture(event, item.id);
              }}
              onRotateQuarter={() => {
                beginInteraction();
                updateFurniture(item.id, {
                  rotation: (item.rotation + 90) % 360
                });
              }}
            />
          ))}

        {draggedDefinition && dropPoint ? (
          <FurnitureDragPreview
            center={worldToCanvas(dropPoint, viewport)}
            definition={draggedDefinition}
            reason="Does not fit inside the room"
            scale={scale}
            valid={dropPreviewValid}
          />
        ) : null}

        {canvasVertices.map((vertex) => {
          const selected =
            selection.kind === "vertex" && selection.id === vertex.id;

          return (
            <circle
              key={vertex.id}
              className="cursor-move"
              cx={vertex.canvas.x}
              cy={vertex.canvas.y}
              r={selected ? 6 : 5}
              fill={selected ? "#244f47" : "#ffffff"}
              stroke={selected ? "#14322d" : "#6f756c"}
              strokeWidth={1.5}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                beginInteraction();
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
            : tool === "furniture"
              ? "Furniture"
              : tool === "pan" || isSpaceDown
                ? "Pan"
                : "Blueprint"}
        </span>
        <span className="text-[#a2a7a0]">·</span>
        <span>
          {tool === "insert-vertex"
            ? "click a wall"
            : tool === "furniture"
              ? "drag onto the room"
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
        <span className="metric-chip">{room.furniture.length} furniture</span>
        <span className="metric-chip">
          {drag.kind === "rotate-furniture" ? "hold ⌥ free rotate" : "snap on"}
        </span>
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

function roundToCentimetres(value: number) {
  return Math.round(value * 100) / 100;
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
