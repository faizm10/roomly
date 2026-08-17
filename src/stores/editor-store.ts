"use client";

import { create } from "zustand";
import { furnitureCatalog, getFurnitureDefinition } from "@/features/furniture/catalog";
import { localRoomRepository } from "@/features/persistence/room-repository";
import {
  createPolygonRoom,
  createRectangularRoom,
  wallsFromVertices
} from "@/lib/geometry/rooms";
import { roundMeters } from "@/lib/units";
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

const HISTORY_LIMIT = 60;

interface EditorState {
  room: Room;
  mode: EditorMode;
  tool: EditorTool;
  selection: Selection;
  viewport: BlueprintViewport;
  savedState: "idle" | "saving" | "saved";
  /** False until localStorage has been read once — blocks autosave from overwriting. */
  hydrated: boolean;
  savedRooms: Room[];
  past: Room[];
  future: Room[];
  /**
   * Snapshot taken when an interaction starts. It is only pushed onto the undo
   * stack once something actually changes, so a click that moves nothing does
   * not leave an empty step behind, and a whole drag collapses into one step.
   */
  pendingSnapshot: Room | null;
  beginInteraction: () => void;
  endInteraction: () => void;
  undo: () => void;
  redo: () => void;
  setMode: (mode: EditorMode) => void;
  setTool: (tool: EditorTool) => void;
  setSelection: (selection: Selection) => void;
  hydrate: () => Promise<void>;
  refreshSavedRooms: () => Promise<void>;
  loadRoom: (id: ID) => Promise<void>;
  deleteSavedRoom: (id: ID) => Promise<void>;
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
  addFurnitureAt: (definitionId: string, point: { x: number; z: number }) => void;
  duplicateFurniture: (id: ID) => void;
  updateFurniture: (
    id: ID,
    updates: Partial<Omit<FurnitureInstance, "id" | "definitionId">>
  ) => void;
  removeFurniture: (id: ID) => void;
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

function roomCenter(room: Room) {
  const xs = room.vertices.map((vertex) => vertex.x);
  const zs = room.vertices.map((vertex) => vertex.z);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...zs) + Math.max(...zs)) / 2
  };
}

type HistoryPatch = Pick<
  EditorState,
  "room" | "past" | "future" | "pendingSnapshot"
>;

/** Every room mutation goes through here so undo stays consistent. */
function commitRoom(state: EditorState, nextRoom: Room): HistoryPatch {
  const past = state.pendingSnapshot
    ? [...state.past, state.pendingSnapshot].slice(-HISTORY_LIMIT)
    : state.past;

  return {
    room: touch(nextRoom),
    past,
    future: [],
    pendingSnapshot: null
  };
}

/** A fresh room starts a fresh timeline. */
function resetHistory(room: Room): HistoryPatch {
  return { room, past: [], future: [], pendingSnapshot: null };
}

function createFurnitureId() {
  return `furniture-${Math.random().toString(36).slice(2, 9)}`;
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
  hydrated: false,
  savedRooms: [],
  past: [],
  future: [],
  pendingSnapshot: null,
  beginInteraction: () => set((state) => ({ pendingSnapshot: state.room })),
  endInteraction: () => set({ pendingSnapshot: null }),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);

      if (!previous) {
        return {};
      }

      return {
        room: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.room].slice(-HISTORY_LIMIT),
        pendingSnapshot: null,
        selection: selectionStillValid(state.selection, previous)
          ? state.selection
          : { kind: "room" }
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future.at(-1);

      if (!next) {
        return {};
      }

      return {
        room: next,
        past: [...state.past, state.room].slice(-HISTORY_LIMIT),
        future: state.future.slice(0, -1),
        pendingSnapshot: null,
        selection: selectionStillValid(state.selection, next)
          ? state.selection
          : { kind: "room" }
      };
    }),
  setMode: (mode) =>
    set({
      mode,
      selection: { kind: "room" },
      tool: mode === "setup" ? "select" : get().tool
    }),
  setTool: (tool) => set({ tool }),
  setSelection: (selection) => set({ selection }),
  hydrate: async () => {
    const rooms = await localRoomRepository.getRooms();
    const lastId = await localRoomRepository.getLastRoomId();
    const preferred =
      rooms.find((room) => room.id === lastId) ?? rooms[0] ?? null;

    if (preferred) {
      set({
        ...resetHistory(preferred),
        mode: "blueprint",
        selection: { kind: "room" },
        viewport: { zoom: 1, panX: 124, panY: 104 },
        savedRooms: rooms,
        hydrated: true,
        savedState: "saved"
      });
      return;
    }

    set({
      savedRooms: [],
      hydrated: true,
      savedState: "idle"
    });
  },
  refreshSavedRooms: async () => {
    const rooms = await localRoomRepository.getRooms();
    set({ savedRooms: rooms });
  },
  loadRoom: async (id) => {
    const room = await localRoomRepository.getRoom(id);

    if (!room) {
      return;
    }

    await localRoomRepository.setLastRoomId(room.id);
    set({
      ...resetHistory(room),
      mode: "blueprint",
      selection: { kind: "room" },
      viewport: { zoom: 1, panX: 124, panY: 104 },
      savedState: "saved"
    });
  },
  deleteSavedRoom: async (id) => {
    await localRoomRepository.deleteRoom(id);
    const rooms = await localRoomRepository.getRooms();
    const current = get().room;

    if (current.id === id) {
      const next = rooms[0] ?? createRectangularRoom(4.2, 3.4, 2.6, "Bedroom study");
      set({
        ...resetHistory(next),
        mode: rooms[0] ? "blueprint" : "setup",
        selection: { kind: "room" },
        viewport: { zoom: 1, panX: 124, panY: 104 },
        savedRooms: rooms,
        savedState: rooms[0] ? "saved" : "idle"
      });

      if (rooms[0]) {
        await localRoomRepository.setLastRoomId(rooms[0].id);
      }

      return;
    }

    set({ savedRooms: rooms });
  },
  createSimpleRoom: (width, depth, height) =>
    set({
      ...resetHistory(createRectangularRoom(width, depth, height, "New room")),
      mode: "blueprint",
      selection: { kind: "room" },
      viewport: { zoom: 1, panX: 124, panY: 104 }
    }),
  createLShapedRoom: () =>
    set({
      ...resetHistory(
        createPolygonRoom(
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
        )
      ),
      mode: "blueprint",
      selection: { kind: "room" },
      viewport: { zoom: 0.92, panX: 124, panY: 96 }
    }),
  updateRoomName: (name) =>
    set((state) => commitRoom(state, { ...state.room, name })),
  updateWallHeight: (height) =>
    set((state) => commitRoom(state, { ...state.room, wallHeight: height })),
  updateVertex: (id, updates) =>
    set((state) => {
      const vertices = state.room.vertices.map((vertex) =>
        vertex.id === id ? { ...vertex, ...updates } : vertex
      );

      return commitRoom(state, {
        ...state.room,
        vertices,
        walls: wallsFromVertices(vertices)
      });
    }),
  insertVertexOnWall: (wallId, point) =>
    set((state) => {
      const wall = state.room.walls.find((item) => item.id === wallId);

      if (!wall) {
        return {};
      }

      const startIndex = state.room.vertices.findIndex(
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
        ...state.room.vertices.slice(0, insertAt),
        vertex,
        ...state.room.vertices.slice(insertAt)
      ];

      return {
        ...commitRoom(state, {
          ...state.room,
          vertices,
          walls: wallsFromVertices(vertices)
        }),
        selection: { kind: "vertex", id: vertex.id },
        tool: "vertex"
      };
    }),
  removeVertex: (id) =>
    set((state) => {
      if (
        state.room.vertices.length <= 3 ||
        !state.room.vertices.some((vertex) => vertex.id === id)
      ) {
        return {};
      }

      const vertices = state.room.vertices.filter((vertex) => vertex.id !== id);
      const selectedRemoved =
        state.selection.kind === "vertex" && state.selection.id === id;

      return {
        ...commitRoom(state, {
          ...state.room,
          vertices,
          walls: wallsFromVertices(vertices),
          openings: []
        }),
        selection: selectedRemoved ? { kind: "room" } : state.selection
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
    const center = roomCenter(get().room);

    get().addFurnitureAt(definitionId, center);
  },
  addFurnitureAt: (definitionId, point) => {
    const definition = getFurnitureDefinition(definitionId);

    if (!definition) {
      return;
    }

    const furniture: FurnitureInstance = {
      id: createFurnitureId(),
      definitionId,
      x: roundMeters(point.x),
      z: roundMeters(point.z),
      width: definition.defaultWidth,
      depth: definition.defaultDepth,
      height: definition.defaultHeight,
      rotation: 0,
      color: definition.color
    };

    set((state) => ({
      ...commitRoom(
        { ...state, pendingSnapshot: state.pendingSnapshot ?? state.room },
        { ...state.room, furniture: [...state.room.furniture, furniture] }
      ),
      selection: { kind: "furniture", id: furniture.id }
    }));
  },
  duplicateFurniture: (id) =>
    set((state) => {
      const original = state.room.furniture.find((item) => item.id === id);

      if (!original) {
        return {};
      }

      const copy: FurnitureInstance = {
        ...original,
        id: createFurnitureId(),
        x: roundMeters(original.x + 0.25),
        z: roundMeters(original.z + 0.25)
      };

      return {
        ...commitRoom(
          { ...state, pendingSnapshot: state.pendingSnapshot ?? state.room },
          { ...state.room, furniture: [...state.room.furniture, copy] }
        ),
        selection: { kind: "furniture", id: copy.id }
      };
    }),
  updateFurniture: (id, updates) =>
    set((state) =>
      commitRoom(state, {
        ...state.room,
        furniture: state.room.furniture.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      })
    ),
  removeFurniture: (id) =>
    set((state) => ({
      ...commitRoom(
        { ...state, pendingSnapshot: state.pendingSnapshot ?? state.room },
        {
          ...state.room,
          furniture: state.room.furniture.filter((item) => item.id !== id)
        }
      ),
      selection:
        state.selection.kind === "furniture" && state.selection.id === id
          ? { kind: "room" }
          : state.selection
    })),
  markSaving: () => set({ savedState: "saving" }),
  markSaved: () => set({ savedState: "saved" })
}));

function selectionStillValid(selection: Selection, room: Room) {
  if (selection.kind === "furniture") {
    return room.furniture.some((item) => item.id === selection.id);
  }

  if (selection.kind === "vertex") {
    return room.vertices.some((vertex) => vertex.id === selection.id);
  }

  return true;
}

export const defaultFurniture = furnitureCatalog;
