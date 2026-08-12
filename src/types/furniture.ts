export type FurnitureCategory =
  | "Beds"
  | "Desks"
  | "Seating"
  | "Storage"
  | "Tables"
  | "Rugs"
  | "Lighting"
  | "Electronics";

export interface FurnitureDefinition {
  id: string;
  name: string;
  category: FurnitureCategory;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
  minWidth?: number;
  maxWidth?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  resizable: boolean;
  color: string;
}
