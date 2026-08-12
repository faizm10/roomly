export type ID = string;

export interface RoomVertex {
  id: ID;
  x: number;
  z: number;
}

export type OpeningKind = "door" | "window";

export interface Opening {
  id: ID;
  wallId: ID;
  kind: OpeningKind;
  width: number;
  height: number;
  sillHeight?: number;
  offset: number;
  swing?: "left-in" | "right-in" | "left-out" | "right-out";
}

export interface Wall {
  id: ID;
  startVertexId: ID;
  endVertexId: ID;
  thickness: number;
}

export interface MaterialConfig {
  id: string;
  name: string;
  color: string;
  roughness?: number;
}

export interface FurnitureInstance {
  id: ID;
  definitionId: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  material?: MaterialConfig;
  color?: string;
}

export interface Room {
  id: ID;
  name: string;
  wallHeight: number;
  vertices: RoomVertex[];
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureInstance[];
  floorMaterial?: MaterialConfig;
  wallMaterial?: MaterialConfig;
  updatedAt: string;
}

export type EditorMode = "setup" | "sketch" | "blueprint" | "room-3d";
export type EditorTool = "select" | "vertex" | "insert-vertex" | "pan" | "measure";

export interface BlueprintViewport {
  zoom: number;
  panX: number;
  panY: number;
}
