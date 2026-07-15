export type Retailer = "Amazon" | "IKEA" | "Wayfair" | "Article" | "Manual" | "Demo Store";

export type ProductMetadata = {
  id: string;
  name: string;
  retailer: Retailer;
  price: number;
  currency: "USD";
  dimensions: {
    widthIn: number;
    heightIn: number;
    depthIn: number;
  };
  imageUrl: string;
  cutoutUrl: string;
  productUrl: string;
  extractionStatus: "extracted" | "mock" | "manual";
  note?: string;
};

export type PlacedFurniture = {
  id: string;
  productId: string;
  name: string;
  retailer: Retailer;
  price: number;
  productUrl: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
  warning?: string;
};

export type RoomCalibration = {
  wallWidthFt: number;
  floorLineY: number;
  pixelsPerFoot: number;
};

export type RoomlyDesign = {
  id: string;
  title: string;
  roomImage: string;
  calibration: RoomCalibration;
  products: ProductMetadata[];
  placed: PlacedFurniture[];
  activeLayout: "A" | "B";
  canvasJson: string;
  updatedAt: string;
};

export const sampleRoomImage = "/roomly/demo-room.png";

const sofaCutout = "/roomly/sofa-cutout.png";
const chairCutout = "/roomly/chair-cutout.png";
const tableCutout = "/roomly/table-cutout.png";

export const sampleProducts: ProductMetadata[] = [
  {
    id: "demo-sofa",
    name: "Moss Performance Sofa",
    retailer: "Demo Store",
    price: 899,
    currency: "USD",
    dimensions: { widthIn: 86, heightIn: 31, depthIn: 38 },
    imageUrl: sofaCutout,
    cutoutUrl: sofaCutout,
    productUrl: "https://example.com/moss-sofa",
    extractionStatus: "mock",
    note: "Demo asset with transparent background.",
  },
  {
    id: "demo-chair",
    name: "Terracotta Reading Chair",
    retailer: "Demo Store",
    price: 320,
    currency: "USD",
    dimensions: { widthIn: 32, heightIn: 35, depthIn: 34 },
    imageUrl: chairCutout,
    cutoutUrl: chairCutout,
    productUrl: "https://example.com/reading-chair",
    extractionStatus: "mock",
  },
  {
    id: "demo-table",
    name: "Oval Oak Coffee Table",
    retailer: "Demo Store",
    price: 260,
    currency: "USD",
    dimensions: { widthIn: 48, heightIn: 17, depthIn: 26 },
    imageUrl: tableCutout,
    cutoutUrl: tableCutout,
    productUrl: "https://example.com/oak-table",
    extractionStatus: "mock",
  },
];

export const createSampleDesign = (): RoomlyDesign => ({
  id: "local-roomly-demo",
  title: "Warm sage living room",
  roomImage: sampleRoomImage,
  calibration: { wallWidthFt: 12, floorLineY: 632, pixelsPerFoot: 96 },
  products: sampleProducts,
  placed: [
    {
      id: "placed-sofa",
      productId: "demo-sofa",
      name: sampleProducts[0].name,
      retailer: sampleProducts[0].retailer,
      price: sampleProducts[0].price,
      productUrl: sampleProducts[0].productUrl,
      imageUrl: sampleProducts[0].cutoutUrl,
      x: 430,
      y: 424,
      width: 610,
      height: 310,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 1,
    },
  ],
  activeLayout: "A",
  canvasJson: "{}",
  updatedAt: new Date().toISOString(),
});

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const estimateRenderedWidthIn = (
  item: Pick<PlacedFurniture, "width" | "scaleX">,
  calibration: RoomCalibration,
) => (Math.abs(item.width * item.scaleX) / calibration.pixelsPerFoot) * 12;

export const getOversizeWarning = (
  item: Pick<PlacedFurniture, "width" | "scaleX" | "name">,
  calibration: RoomCalibration,
) => {
  const itemWidthFt = estimateRenderedWidthIn(item, calibration) / 12;
  if (itemWidthFt > calibration.wallWidthFt * 0.72) {
    return `${item.name} may dominate this ${calibration.wallWidthFt} ft wall. Visualization is approximate.`;
  }
  return undefined;
};
