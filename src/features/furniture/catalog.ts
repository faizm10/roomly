import type { FurnitureDefinition } from "@/types/furniture";

export const furnitureCatalog: FurnitureDefinition[] = [
  {
    id: "double-bed",
    name: "Double bed",
    category: "Beds",
    defaultWidth: 1.55,
    defaultDepth: 2.05,
    defaultHeight: 0.55,
    resizable: true,
    color: "#d9c9b5"
  },
  {
    id: "desk",
    name: "Desk",
    category: "Desks",
    defaultWidth: 1.4,
    defaultDepth: 0.7,
    defaultHeight: 0.74,
    resizable: true,
    color: "#b98f62"
  },
  {
    id: "office-chair",
    name: "Office chair",
    category: "Seating",
    defaultWidth: 0.62,
    defaultDepth: 0.62,
    defaultHeight: 0.95,
    resizable: false,
    color: "#3f4747"
  },
  {
    id: "dresser",
    name: "Dresser",
    category: "Storage",
    defaultWidth: 1.2,
    defaultDepth: 0.48,
    defaultHeight: 0.88,
    resizable: true,
    color: "#d6d0c4"
  },
  {
    id: "rug",
    name: "Rug",
    category: "Rugs",
    defaultWidth: 1.8,
    defaultDepth: 1.2,
    defaultHeight: 0.03,
    resizable: true,
    color: "#8c6d57"
  }
];

export function getFurnitureDefinition(id: string) {
  return furnitureCatalog.find((definition) => definition.id === id);
}
