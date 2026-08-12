import type { MaterialConfig } from "@/types/room";

/**
 * Material presets written straight onto the canonical `FurnitureInstance`,
 * so whatever renders the room in 3D reads the same values the panel shows.
 */
export const materialPresets: MaterialConfig[] = [
  { id: "fabric", name: "Fabric", color: "#cfc7ba", roughness: 0.9 },
  { id: "wood", name: "Wood", color: "#c39a6b", roughness: 0.6 },
  { id: "metal", name: "Metal", color: "#9aa0a2", roughness: 0.25 },
  { id: "leather", name: "Leather", color: "#8d6b53", roughness: 0.5 },
  { id: "glass", name: "Glass", color: "#cdd8d9", roughness: 0.05 }
];

export function getMaterialPreset(id: string) {
  return materialPresets.find((material) => material.id === id);
}
