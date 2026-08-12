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
    id: "bookcase",
    name: "Bookcase",
    category: "Storage",
    defaultWidth: 0.9,
    defaultDepth: 0.34,
    defaultHeight: 1.9,
    resizable: true,
    color: "#c6a06d"
  },
  {
    id: "sofa",
    name: "Sofa",
    category: "Seating",
    defaultWidth: 1.9,
    defaultDepth: 0.88,
    defaultHeight: 0.82,
    resizable: true,
    color: "#7f948f"
  },
  {
    id: "coffee-table",
    name: "Coffee table",
    category: "Tables",
    defaultWidth: 1.05,
    defaultDepth: 0.55,
    defaultHeight: 0.42,
    resizable: true,
    color: "#b18a58"
  },
  {
    id: "floor-lamp",
    name: "Floor lamp",
    category: "Lighting",
    defaultWidth: 0.36,
    defaultDepth: 0.36,
    defaultHeight: 1.6,
    resizable: false,
    color: "#e2c46d"
  },
  {
    id: "tv-console",
    name: "TV console",
    category: "Electronics",
    defaultWidth: 1.5,
    defaultDepth: 0.38,
    defaultHeight: 0.55,
    resizable: true,
    color: "#4f5a5b"
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
