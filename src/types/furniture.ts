/**
 * Legacy taxonomy. Kept because saved rooms and existing catalog entries
 * reference it; the sidebar browses by `FurnitureGroup` instead.
 */
export type FurnitureCategory =
  | "Beds"
  | "Desks"
  | "Seating"
  | "Storage"
  | "Tables"
  | "Rugs"
  | "Lighting"
  | "Electronics";

/** Compact browsing groups used by the library sidebar. */
export type FurnitureGroup =
  | "Bedroom"
  | "Living"
  | "Office"
  | "Storage"
  | "Decor";

/**
 * Which top-down symbol draws this piece. Several definitions can share one
 * symbol and differentiate through `symbolOptions`.
 */
export type FurnitureSymbol =
  | "bed"
  | "desk"
  | "chair"
  | "sofa"
  | "table"
  | "dresser"
  | "bookshelf"
  | "rug"
  | "tv"
  | "lamp";

/**
 * Paint order on the blueprint. Lower values render first, so a rug always
 * ends up beneath the bed standing on it regardless of creation order.
 */
export type FurnitureLayer = "floor" | "base" | "surface" | "accent";

export const FURNITURE_LAYER_ORDER: Record<FurnitureLayer, number> = {
  floor: 0,
  base: 1,
  surface: 2,
  accent: 3
};

export interface FurnitureSymbolOptions {
  /** Beds: how many pillows to draw. */
  pillows?: 1 | 2;
  /** Chairs: office chairs get a caster base, dining chairs do not. */
  chair?: "office" | "dining";
  /** Sofas: number of seat cushions. */
  seats?: 2 | 3;
  /** Tables: silhouette of the top. */
  tableShape?: "round" | "rect";
  /** Desks: draw the seating-side marker so orientation is obvious. */
  seatMarker?: boolean;
}

export interface FurnitureDefinition {
  id: string;
  name: string;
  category: FurnitureCategory;
  group: FurnitureGroup;
  symbol: FurnitureSymbol;
  symbolOptions?: FurnitureSymbolOptions;
  layer: FurnitureLayer;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minDepth?: number;
  maxDepth?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  resizable: boolean;
  /** Extra search terms beyond the name. */
  keywords?: string[];
  color: string;
}

/** Fallback bounds so nothing can be resized into a 3 cm sliver. */
export const MIN_FURNITURE_SIZE = 0.2;
export const MAX_FURNITURE_SIZE = 6;

export function furnitureSizeBounds(definition?: FurnitureDefinition) {
  return {
    minWidth: definition?.minWidth ?? MIN_FURNITURE_SIZE,
    maxWidth: definition?.maxWidth ?? MAX_FURNITURE_SIZE,
    minDepth: definition?.minDepth ?? MIN_FURNITURE_SIZE,
    maxDepth: definition?.maxDepth ?? MAX_FURNITURE_SIZE
  };
}
