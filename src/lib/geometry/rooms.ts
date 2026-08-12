import type { Room, RoomVertex, Wall } from "@/types/room";
import type { Point } from "./points";

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function wallsFromVertices(vertices: RoomVertex[]): Wall[] {
  return vertices.map((vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];

    return {
      id: `wall-${vertex.id}-${next.id}`,
      startVertexId: vertex.id,
      endVertexId: next.id,
      thickness: 0.14
    };
  });
}

export function createRectangularRoom(
  width: number,
  depth: number,
  height: number,
  name = "Untitled room"
): Room {
  const vertices: RoomVertex[] = [
    { id: "v-nw", x: 0, z: 0 },
    { id: "v-ne", x: width, z: 0 },
    { id: "v-se", x: width, z: depth },
    { id: "v-sw", x: 0, z: depth }
  ];

  return {
    id: createId("room"),
    name,
    wallHeight: height,
    vertices,
    walls: wallsFromVertices(vertices),
    openings: [],
    furniture: [],
    floorMaterial: {
      id: "light-oak",
      name: "Light oak",
      color: "#d8c5a3",
      roughness: 0.62
    },
    wallMaterial: {
      id: "soft-white",
      name: "Soft white",
      color: "#f2f0e8",
      roughness: 0.8
    },
    updatedAt: new Date().toISOString()
  };
}

export function createPolygonRoom(
  points: Point[],
  height: number,
  name = "Custom room"
): Room {
  const vertices = points.map((point, index) => ({
    id: `v-${index + 1}`,
    x: point.x,
    z: point.z
  }));

  return {
    ...createRectangularRoom(1, 1, height, name),
    vertices,
    walls: wallsFromVertices(vertices),
    updatedAt: new Date().toISOString()
  };
}
