import type {
  FurnitureDefinition,
  FurnitureGroup
} from "@/types/furniture";

/**
 * Ten well-drawn pieces beat fifty rough ones. IDs are stable because saved
 * rooms reference them — `double-bed` keeps its id even though it now reads
 * as a queen, which is what its 153 x 203 cm footprint always described.
 */
export const furnitureCatalog: FurnitureDefinition[] = [
  {
    id: "double-bed",
    name: "Queen bed",
    category: "Beds",
    group: "Bedroom",
    symbol: "bed",
    symbolOptions: { pillows: 2 },
    layer: "base",
    defaultWidth: 1.53,
    defaultDepth: 2.03,
    defaultHeight: 0.55,
    minWidth: 1.2,
    maxWidth: 2.1,
    minDepth: 1.7,
    maxDepth: 2.3,
    resizable: true,
    keywords: ["bed", "queen", "double", "mattress", "sleep", "bedroom"],
    color: "#d8cdbd"
  },
  {
    id: "single-bed",
    name: "Single bed",
    category: "Beds",
    group: "Bedroom",
    symbol: "bed",
    symbolOptions: { pillows: 1 },
    layer: "base",
    defaultWidth: 0.9,
    defaultDepth: 2,
    defaultHeight: 0.5,
    minWidth: 0.7,
    maxWidth: 1.2,
    minDepth: 1.6,
    maxDepth: 2.2,
    resizable: true,
    keywords: ["bed", "single", "twin", "mattress", "sleep", "bedroom"],
    color: "#d8cdbd"
  },
  {
    id: "desk",
    name: "Desk",
    category: "Desks",
    group: "Office",
    symbol: "desk",
    symbolOptions: { seatMarker: true },
    layer: "base",
    defaultWidth: 1.4,
    defaultDepth: 0.7,
    defaultHeight: 0.74,
    minWidth: 0.8,
    maxWidth: 2.4,
    minDepth: 0.45,
    maxDepth: 1,
    resizable: true,
    keywords: ["desk", "workstation", "study", "table", "office", "computer"],
    color: "#c6a882"
  },
  {
    id: "office-chair",
    name: "Office chair",
    category: "Seating",
    group: "Office",
    symbol: "chair",
    symbolOptions: { chair: "office" },
    layer: "surface",
    defaultWidth: 0.62,
    defaultDepth: 0.62,
    defaultHeight: 0.95,
    minWidth: 0.45,
    maxWidth: 0.8,
    minDepth: 0.45,
    maxDepth: 0.8,
    resizable: true,
    keywords: ["chair", "office", "desk chair", "task", "swivel", "seat"],
    color: "#9aa19b"
  },
  {
    id: "sofa",
    name: "Sofa",
    category: "Seating",
    group: "Living",
    symbol: "sofa",
    symbolOptions: { seats: 3 },
    layer: "base",
    defaultWidth: 1.9,
    defaultDepth: 0.88,
    defaultHeight: 0.82,
    minWidth: 1.2,
    maxWidth: 3.2,
    minDepth: 0.7,
    maxDepth: 1.1,
    resizable: true,
    keywords: ["sofa", "couch", "settee", "lounge", "living", "seat"],
    color: "#b7bdb6"
  },
  {
    id: "loveseat",
    name: "Loveseat",
    category: "Seating",
    group: "Living",
    symbol: "sofa",
    symbolOptions: { seats: 2 },
    layer: "base",
    defaultWidth: 1.35,
    defaultDepth: 0.85,
    defaultHeight: 0.82,
    minWidth: 1,
    maxWidth: 1.8,
    minDepth: 0.7,
    maxDepth: 1.05,
    resizable: true,
    keywords: ["loveseat", "sofa", "couch", "two seat", "living"],
    color: "#b7bdb6"
  },
  {
    id: "coffee-table",
    name: "Coffee table",
    category: "Tables",
    group: "Living",
    symbol: "table",
    symbolOptions: { tableShape: "rect" },
    layer: "surface",
    defaultWidth: 1.05,
    defaultDepth: 0.55,
    defaultHeight: 0.42,
    minWidth: 0.6,
    maxWidth: 1.6,
    minDepth: 0.4,
    maxDepth: 0.9,
    resizable: true,
    keywords: ["coffee table", "table", "living", "low table"],
    color: "#c6a882"
  },
  {
    id: "side-table",
    name: "Side table",
    category: "Tables",
    group: "Bedroom",
    symbol: "table",
    symbolOptions: { tableShape: "round" },
    layer: "surface",
    defaultWidth: 0.45,
    defaultDepth: 0.45,
    defaultHeight: 0.55,
    minWidth: 0.3,
    maxWidth: 0.8,
    minDepth: 0.3,
    maxDepth: 0.8,
    resizable: true,
    keywords: ["side table", "nightstand", "bedside", "end table", "round"],
    color: "#c6a882"
  },
  {
    id: "dining-table",
    name: "Dining table",
    category: "Tables",
    group: "Living",
    symbol: "table",
    symbolOptions: { tableShape: "rect" },
    layer: "base",
    defaultWidth: 1.6,
    defaultDepth: 0.9,
    defaultHeight: 0.75,
    minWidth: 0.9,
    maxWidth: 2.6,
    minDepth: 0.7,
    maxDepth: 1.2,
    resizable: true,
    keywords: ["dining table", "table", "eat", "kitchen", "dinner"],
    color: "#c09b6f"
  },
  {
    id: "dresser",
    name: "Dresser",
    category: "Storage",
    group: "Storage",
    symbol: "dresser",
    layer: "base",
    defaultWidth: 1.2,
    defaultDepth: 0.48,
    defaultHeight: 0.88,
    minWidth: 0.6,
    maxWidth: 2.2,
    minDepth: 0.35,
    maxDepth: 0.7,
    resizable: true,
    keywords: ["dresser", "drawers", "chest", "storage", "bedroom"],
    color: "#cfc9bd"
  },
  {
    id: "bookcase",
    name: "Bookshelf",
    category: "Storage",
    group: "Storage",
    symbol: "bookshelf",
    layer: "base",
    defaultWidth: 0.9,
    defaultDepth: 0.34,
    defaultHeight: 1.9,
    minWidth: 0.4,
    maxWidth: 2.4,
    minDepth: 0.25,
    maxDepth: 0.55,
    resizable: true,
    keywords: ["bookshelf", "bookcase", "shelving", "shelf", "storage", "books"],
    color: "#c9ac83"
  },
  {
    id: "tv-console",
    name: "TV",
    category: "Electronics",
    group: "Living",
    symbol: "tv",
    layer: "base",
    defaultWidth: 1.5,
    defaultDepth: 0.38,
    defaultHeight: 0.55,
    minWidth: 0.8,
    maxWidth: 2.6,
    minDepth: 0.3,
    maxDepth: 0.6,
    resizable: true,
    keywords: ["tv", "television", "media", "console", "screen", "living"],
    color: "#8f9793"
  },
  {
    id: "rug",
    name: "Rug",
    category: "Rugs",
    group: "Decor",
    symbol: "rug",
    layer: "floor",
    defaultWidth: 1.8,
    defaultDepth: 1.2,
    defaultHeight: 0.02,
    minWidth: 0.6,
    maxWidth: 4.5,
    minDepth: 0.4,
    maxDepth: 3.5,
    resizable: true,
    keywords: ["rug", "carpet", "mat", "floor", "decor"],
    color: "#b9a894"
  },
  {
    id: "floor-lamp",
    name: "Floor lamp",
    category: "Lighting",
    group: "Decor",
    symbol: "lamp",
    layer: "accent",
    defaultWidth: 0.36,
    defaultDepth: 0.36,
    defaultHeight: 1.6,
    minWidth: 0.24,
    maxWidth: 0.6,
    minDepth: 0.24,
    maxDepth: 0.6,
    resizable: true,
    keywords: ["lamp", "floor lamp", "light", "lighting", "decor"],
    color: "#cdbf9c"
  }
];

export const furnitureGroups: FurnitureGroup[] = [
  "Bedroom",
  "Living",
  "Office",
  "Storage",
  "Decor"
];

export function getFurnitureDefinition(id: string) {
  return furnitureCatalog.find((definition) => definition.id === id);
}

/** Instant, dependency-free filtering for the library search field. */
export function searchFurniture(query: string, group: FurnitureGroup | "All") {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return furnitureCatalog.filter((definition) => {
    if (group !== "All" && definition.group !== group) {
      return false;
    }

    if (terms.length === 0) {
      return true;
    }

    const haystack = [
      definition.name,
      definition.group,
      definition.category,
      ...(definition.keywords ?? [])
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
