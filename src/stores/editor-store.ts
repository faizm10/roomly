"use client";

import { create } from "zustand";
import { furnitureCatalog, getFurnitureDefinition } from "@/features/furniture/catalog";
import {
  createPolygonRoom,
  createRectangularRoom,
  wallsFromVertices
} from "@/lib/geometry/rooms";
import type {
  BlueprintViewport,
  EditorMode,
  EditorTool,
  FurnitureInstance,
  ID,
  Room,
  RoomVertex
} from "@/types/room";

interface Selection {
  kind: "room" | "vertex" | "furniture";
  id?: ID;
}

interface EditorState {
  room: Room;
  mode: EditorMode;
  tool: EditorTool;
  selection: Selection;
  viewport: BlueprintViewport;
  savedState: "idle" | "saving" | "saved";
  setMode: (mode: EditorMode) => void;
  setTool: (tool: EditorTool) => void;
  setSelection: (selection: Selection) => void;
  createSimpleRoom: (width: number, depth: number, height: number) => void;
  createLShapedRoom: () => void;
  updateRoomName: (name: string) => void;
  updateWallHeight: (height: number) => void;
  updateVertex: (id: ID, updates: Partial<Pick<RoomVertex, "x" | "z">>) => void;
  insertVertexOnWall: (
    wallId: ID,
    point: Pick<RoomVertex, "x" | "z">
  ) => void;
  removeVertex: (id: ID) => void;
  setViewport: (viewport: BlueprintViewport) => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (nextZoom: number, anchor?: { x: number; y: number }) => void;
  addFurniture: (definitionId: string) => void;
  updateFurniture: (
    id: ID,
    updates: Partial<Omit<FurnitureInstance, "id" | "definitionId">>
  ) => void;
  markSaving: () => void;
  markSaved: () => void;
}

const initialRoom = createRectangularRoom(4.2, 3.4, 2.6, "Bedroom study");

function touch(room: Room): Room {
  return {
    ...room,
    updatedAt: new Date().toISOString()
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  room: initialRoom,
  mode: "blueprint",
  tool: "select",
  selection: { kind: "room" },
  viewport: {
    zoom: 1,
    panX: 124,
    panY: 104
  },
  savedState: "idle",
  setMode: (mode) =>
    set({
      mode,
      selection: { kind: "room" },
      tool: mode === "setup" ? "select" : get().tool
    }),
  setTool: (tool) => set({ tool }),
  setSelection: (selection) => set({ selection }),
  createSimpleRoom: (width, depth, height) =>
    set({
      room: createRectangularRoom(width, depth, height, "New room"),
      mode: "blueprint",
      selection: { kind: "room" },
      viewport: { zoom: 1, panX: 124, panY: 104 }
    }),
  createLShapedRoom: () =>
    set({
      room: createPolygonRoom(
        [
          { x: 0, z: 0 },
          { x: 5.2, z: 0 },
          { x: 5.2, z: 2 },
          { x: 3.2, z: 2 },
          { x: 3.2, z: 4.2 },
          { x: 0, z: 4.2 }
        ],
        2.7,
        "L-shaped room"
      ),
      mode: "blueprint",
      selection: { kind: "room" },
      viewport: { zoom: 0.92, panX: 124, panY: 96 }
    }),
  updateRoomName: (name) =>
    set(({ room }) => ({
      room: touch({ ...room, name })
    })),
  updateWallHeight: (height) =>
    set(({ room }) => ({
      room: touch({ ...room, wallHeight: height })
    })),
  updateVertex: (id, updates) =>
    set(({ room }) => {
      const vertices = room.vertices.map((vertex) =>
        vertex.id === id ? { ...vertex, ...updates } : vertex
      );

      return {
        room: touch({
          ...room,
          vertices,
          walls: wallsFromVertices(vertices)
        })
      };
    }),
  insertVertexOnWall: (wallId, point) =>
    set(({ room }) => {
      const wall = room.walls.find((item) => item.id === wallId);

      if (!wall) {
        return {};
      }

      const startIndex = room.vertices.findIndex(
        (vertex) => vertex.id === wall.startVertexId
      );

      if (startIndex === -1) {
        return {};
      }

      const vertex: RoomVertex = {
        id: `v-${Math.random().toString(36).slice(2, 9)}`,
        x: Number(point.x.toFixed(2)),
        z: Number(point.z.toFixed(2))
      };
      const insertAt = startIndex + 1;
      const vertices = [
        ...room.vertices.slice(0, insertAt),
        vertex,
        ...room.vertices.slice(insertAt)
      ];

      return {
        room: touch({
          ...room,
          vertices,
          walls: wallsFromVertices(vertices)
        }),
        selection: { kind: "vertex", id: vertex.id },
        tool: "vertex"
      };
    }),
  removeVertex: (id) =>
    set(({ room, selection }) => {
      if (room.vertices.length <= 3 || !room.vertices.some((vertex) => vertex.id === id)) {
        return {};
      }

      const vertices = room.vertices.filter((vertex) => vertex.id !== id);
      const selectedRemoved = selection.kind === "vertex" && selection.id === id;

      return {
        room: touch({
          ...room,
          vertices,
          walls: wallsFromVertices(vertices),
          openings: []
        }),
        selection: selectedRemoved ? { kind: "room" } : selection
      };
    }),
  setViewport: (viewport) => set({ viewport }),
  panViewport: (dx, dy) =>
    set(({ viewport }) => ({
      viewport: {
        ...viewport,
        panX: viewport.panX + dx,
        panY: viewport.panY + dy
      }
    })),
  zoomViewport: (nextZoom, anchor) => {
    const { viewport } = get();
    const zoom = Math.min(2.8, Math.max(0.35, nextZoom));

    if (!anchor) {
      set({ viewport: { ...viewport, zoom } });
      return;
    }

    const ratio = zoom / viewport.zoom;

    set({
      viewport: {
        zoom,
        panX: anchor.x - (anchor.x - viewport.panX) * ratio,
        panY: anchor.y - (anchor.y - viewport.panY) * ratio
      }
    });
  },
  addFurniture: (definitionId) => {
    const definition = getFurnitureDefinition(definitionId);

    if (!definition) {
      return;
    }

    const furniture: FurnitureInstance = {
      id: `furniture-${Math.random().toString(36).slice(2, 9)}`,
      definitionId,
      x: 1.1,
      z: 1.1,
      width: definition.defaultWidth,
      depth: definition.defaultDepth,
      height: definition.defaultHeight,
      rotation: 0,
      color: definition.color
    };

    set(({ room }) => ({
      room: touch({ ...room, furniture: [...room.furniture, furniture] }),
      selection: { kind: "furniture", id: furniture.id }
    }));
  },
  updateFurniture: (id, updates) =>
    set(({ room }) => ({
      room: touch({
        ...room,
        furniture: room.furniture.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      })
    })),
  markSaving: () => set({ savedState: "saving" }),
  markSaved: () => set({ savedState: "saved" })
}));

export const defaultFurniture = furnitureCatalog;
