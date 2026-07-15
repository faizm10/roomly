"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import {
  ArrowDown,
  ArrowUp,
  BringToFront,
  Camera,
  Copy,
  FlipHorizontal,
  ImagePlus,
  Layers,
  Link2,
  Loader2,
  Lock,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  SendToBack,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Vote,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Ellipse, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { Button } from "@/components/ui/button";
import {
  createSampleDesign,
  formatMoney,
  getOversizeWarning,
  sampleProducts,
  type PlacedFurniture,
  type ProductMetadata,
  type RoomCalibration,
  type RoomlyDesign,
} from "@/lib/roomly";
import { cn } from "@/lib/utils";

type HistoryState = Pick<RoomlyDesign, "placed" | "calibration" | "roomImage" | "canvasJson">;

const baseCanvas = { width: 1400, height: 900 };

function useLoadedImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => setImage(null);
  }, [src]);

  return image;
}

const makePlacedFurniture = (
  product: ProductMetadata,
  calibration: RoomCalibration,
  index: number,
): PlacedFurniture => {
  const width = Math.max(96, (product.dimensions.widthIn / 12) * calibration.pixelsPerFoot);
  const height = Math.max(72, (product.dimensions.heightIn / 12) * calibration.pixelsPerFoot);
  const item = {
    id: `placed-${product.id}-${Date.now()}`,
    productId: product.id,
    name: product.name,
    retailer: product.retailer,
    price: product.price,
    productUrl: product.productUrl,
    imageUrl: product.cutoutUrl,
    x: 520 + index * 38,
    y: calibration.floorLineY - height + 22,
    width,
    height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: index + 1,
  };

  return {
    ...item,
    warning: getOversizeWarning(item, calibration),
  };
};

const ProductThumb = ({ src }: { src: string }) => {
  const image = useLoadedImage(src);
  return (
    <Stage width={76} height={54} className="rounded-md bg-[#f7f1e8]">
      <Layer>
        {image ? (
          <KonvaImage image={image} x={8} y={4} width={60} height={46} />
        ) : (
          <Rect x={8} y={8} width={60} height={38} fill="#ddd1c3" cornerRadius={8} />
        )}
      </Layer>
    </Stage>
  );
};

const FurnitureNode = ({
  item,
  isSelected,
  onSelect,
  onChange,
  registerNode,
}: {
  item: PlacedFurniture;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: PlacedFurniture) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
}) => {
  const image = useLoadedImage(item.imageUrl);

  return (
    <>
      <Ellipse
        x={item.x + (item.width * Math.abs(item.scaleX)) / 2}
        y={item.y + item.height * Math.abs(item.scaleY) - 18}
        radiusX={(item.width * Math.abs(item.scaleX)) / 2.25}
        radiusY={Math.max(18, (item.height * Math.abs(item.scaleY)) / 12)}
        fill="#1f1710"
        opacity={0.2}
        blurRadius={18}
        listening={false}
      />
      {image ? (
        <KonvaImage
          ref={(node) => registerNode(item.id, node)}
          image={image}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          rotation={item.rotation}
          scaleX={item.scaleX}
          scaleY={item.scaleY}
          draggable
          opacity={0.98}
          perfectDrawEnabled={false}
          shadowColor={isSelected ? "#2f3b32" : "#1d1710"}
          shadowOpacity={isSelected ? 0.18 : 0.1}
          shadowBlur={isSelected ? 18 : 10}
          shadowOffsetY={isSelected ? 8 : 5}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(event) =>
            onChange({
              ...item,
              x: event.target.x(),
              y: event.target.y(),
            })
          }
          onTransformEnd={(event) => {
            const node = event.target;
            onChange({
              ...item,
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
              scaleX: node.scaleX(),
              scaleY: node.scaleY(),
            });
          }}
        />
      ) : (
        <Rect
          ref={(node) => registerNode(item.id, node as unknown as Konva.Image | null)}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          fill="#aab7a0"
          cornerRadius={18}
          draggable
          onClick={onSelect}
          onDragEnd={(event) => onChange({ ...item, x: event.target.x(), y: event.target.y() })}
        />
      )}
      {item.warning ? (
        <Text
          x={item.x}
          y={item.y - 30}
          text="Scale warning"
          fontSize={18}
          fontStyle="bold"
          fill="#8b3d2e"
          padding={8}
          listening={false}
        />
      ) : null}
    </>
  );
};

export function RoomlyEditor() {
  const initialDesign = useMemo(() => createSampleDesign(), []);
  const [design, setDesign] = useState<RoomlyDesign>(initialDesign);
  const [selectedId, setSelectedId] = useState(initialDesign.placed[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("No login required for this first design.");
  const [zoom, setZoom] = useState(1);
  const [showBefore, setShowBefore] = useState(42);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualImage, setManualImage] = useState(sampleProducts[1].cutoutUrl);
  const [manualName, setManualName] = useState("Custom accent piece");
  const [manualWidth, setManualWidth] = useState(36);
  const [manualHeight, setManualHeight] = useState(32);
  const [manualPrice, setManualPrice] = useState(240);
  const [layoutVotes, setLayoutVotes] = useState({ A: 18, B: 11 });
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const [containerWidth, setContainerWidth] = useState(960);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef<Record<string, Konva.Image | null>>({});
  const roomImage = useLoadedImage(design.roomImage);

  const selectedItem = design.placed.find((item) => item.id === selectedId) ?? null;
  const total = design.placed.reduce((sum, item) => sum + item.price, 0);
  const scale = (containerWidth / baseCanvas.width) * zoom;
  const stageSize = {
    width: baseCanvas.width * scale,
    height: baseCanvas.height * scale,
  };

  const snapshot = useCallback(
    (next = design): HistoryState => ({
      placed: next.placed,
      calibration: next.calibration,
      roomImage: next.roomImage,
      canvasJson: stageRef.current?.toJSON() ?? next.canvasJson,
    }),
    [design],
  );

  const pushHistory = useCallback(() => {
    setHistory((items) => [...items.slice(-24), snapshot()]);
    setFuture([]);
  }, [snapshot]);

  const updateDesign = useCallback((updater: (current: RoomlyDesign) => RoomlyDesign) => {
    setDesign((current) => {
      const next = updater(current);
      return { ...next, canvasJson: stageRef.current?.toJSON() ?? next.canvasJson, updatedAt: new Date().toISOString() };
    });
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("roomly:first-design");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RoomlyDesign;
        setDesign(parsed);
        setSelectedId(parsed.placed[0]?.id ?? "");
      } catch {
        window.localStorage.removeItem("roomly:first-design");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("roomly:first-design", JSON.stringify(design));
  }, [design]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.min(1120, Math.max(360, entry.contentRect.width)));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const selectedNode = selectedId ? nodeRefs.current[selectedId] : null;
    if (selectedNode && transformerRef.current) {
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, design.placed]);

  const registerNode = useCallback((id: string, node: Konva.Image | null) => {
    nodeRefs.current[id] = node;
  }, []);

  const updateItem = useCallback(
    (nextItem: PlacedFurniture, recordHistory = true) => {
      if (recordHistory) pushHistory();
      updateDesign((current) => ({
        ...current,
        placed: current.placed
          .map((item) =>
            item.id === nextItem.id
              ? {
                  ...nextItem,
                  warning: getOversizeWarning(nextItem, current.calibration),
                }
              : item,
          )
          .sort((a, b) => a.zIndex - b.zIndex),
      }));
    },
    [pushHistory, updateDesign],
  );

  const addProductToCanvas = useCallback(
    async (product: ProductMetadata) => {
      pushHistory();
      const cutoutResponse = await fetch("/api/images/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: product.imageUrl }),
      }).then((res) => res.json() as Promise<{ cutoutUrl?: string; note?: string }>);

      const productWithCutout = {
        ...product,
        cutoutUrl: cutoutResponse.cutoutUrl ?? product.cutoutUrl,
      };
      const placed = makePlacedFurniture(productWithCutout, design.calibration, design.placed.length);
      updateDesign((current) => ({
        ...current,
        products: current.products.some((existing) => existing.id === productWithCutout.id)
          ? current.products
          : [...current.products, productWithCutout],
        placed: [...current.placed, placed].sort((a, b) => a.zIndex - b.zIndex),
      }));
      setSelectedId(placed.id);
      setMessage(cutoutResponse.note ?? `${product.name} added as an approximate cutout.`);
    },
    [design.calibration, design.placed.length, pushHistory, updateDesign],
  );

  const handleExtract = async () => {
    if (!url.trim()) {
      setMessage("Paste a full product URL first.");
      return;
    }
    setExtracting(true);
    setMessage("Reading retailer metadata and preparing a cutout...");
    try {
      const response = await fetch("/api/products/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { product?: ProductMetadata; error?: string };
      if (!response.ok || !data.product) throw new Error(data.error ?? "Extraction failed");
      await addProductToCanvas(data.product);
      setUrl("");
    } catch (error) {
      setManualOpen(true);
      setMessage(
        error instanceof Error
          ? `${error.message} Add the product manually below.`
          : "Could not read that store link. Add the product manually below.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleManualProduct = async () => {
    const product: ProductMetadata = {
      id: `manual-${Date.now()}`,
      name: manualName,
      retailer: "Manual",
      price: manualPrice,
      currency: "USD",
      dimensions: { widthIn: manualWidth, heightIn: manualHeight, depthIn: 24 },
      imageUrl: manualImage,
      cutoutUrl: manualImage,
      productUrl: url || "https://example.com/manual-product",
      extractionStatus: "manual",
      note: "Manually entered fallback product.",
    };
    await addProductToCanvas(product);
    setManualOpen(false);
  };

  const handleRoomUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushHistory();
      updateDesign((current) => ({
        ...current,
        roomImage: String(reader.result),
        placed: [],
        canvasJson: "{}",
      }));
      setSelectedId("");
      setMessage("Room photo loaded. Set a known wall width to calibrate the approximate scale.");
    };
    reader.readAsDataURL(file);
  };

  const handleProductUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setManualImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const mutateSelected = (updater: (item: PlacedFurniture) => PlacedFurniture) => {
    if (!selectedItem) return;
    updateItem(updater(selectedItem));
  };

  const duplicateSelected = () => {
    if (!selectedItem) return;
    pushHistory();
    const copy = {
      ...selectedItem,
      id: `${selectedItem.id}-copy-${Date.now()}`,
      x: selectedItem.x + 42,
      y: selectedItem.y + 28,
      zIndex: design.placed.length + 1,
    };
    updateDesign((current) => ({ ...current, placed: [...current.placed, copy] }));
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!selectedItem) return;
    pushHistory();
    updateDesign((current) => ({
      ...current,
      placed: current.placed.filter((item) => item.id !== selectedItem.id),
    }));
    setSelectedId("");
  };

  const changeLayer = (direction: "front" | "back" | "up" | "down") => {
    if (!selectedItem) return;
    pushHistory();
    updateDesign((current) => {
      const items = [...current.placed].sort((a, b) => a.zIndex - b.zIndex);
      const index = items.findIndex((item) => item.id === selectedItem.id);
      if (index < 0) return current;
      if (direction === "front") items.push(items.splice(index, 1)[0]);
      if (direction === "back") items.unshift(items.splice(index, 1)[0]);
      if (direction === "up" && index < items.length - 1) [items[index], items[index + 1]] = [items[index + 1], items[index]];
      if (direction === "down" && index > 0) [items[index], items[index - 1]] = [items[index - 1], items[index]];
      return {
        ...current,
        placed: items.map((item, itemIndex) => ({ ...item, zIndex: itemIndex + 1 })),
      };
    });
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [snapshot(), ...items]);
    setHistory((items) => items.slice(0, -1));
    setDesign((current) => ({ ...current, ...previous, updatedAt: new Date().toISOString() }));
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, snapshot()]);
    setFuture((items) => items.slice(1));
    setDesign((current) => ({ ...current, ...next, updatedAt: new Date().toISOString() }));
  };

  const saveDesign = async () => {
    const nextDesign = {
      ...design,
      canvasJson: stageRef.current?.toJSON() ?? design.canvasJson,
      updatedAt: new Date().toISOString(),
    };
    setDesign(nextDesign);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextDesign),
    }).then((res) => res.json() as Promise<{ saved: boolean; note?: string; shareUrl: string }>);
    setMessage(response.saved ? `Saved. Public link ready at ${response.shareUrl}` : response.note ?? "Saved locally.");
  };

  const exportImage = () => {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = "roomly-before-after.png";
    link.href = dataUrl;
    link.click();
    setMessage("Exported a clean approximate visualization image.");
  };

  return (
    <div className="min-h-dvh bg-[#f6f0e8] text-[#23211d]">
      <header className="sticky top-0 z-30 border-b border-[#ded2c3] bg-[#fbf7f0]/92 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xl font-black">
              <span className="grid size-9 place-items-center rounded-full bg-[#26362d] text-sm text-white">R</span>
              Roomly
              <span className="rounded-full bg-[#dbe5d7] px-2.5 py-1 text-xs font-bold text-[#435641]">
                Approximate visualization
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#7b7165]">
              Place real-store furniture in your room. Save requires login when Supabase is configured.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={undo} disabled={!history.length}>
              <Undo2 /> Undo
            </Button>
            <Button variant="outline" onClick={redo} disabled={!future.length}>
              <Redo2 /> Redo
            </Button>
            <Button variant="outline" onClick={exportImage}>
              <Camera /> Export
            </Button>
            <Button className="bg-[#26362d] text-white hover:bg-[#34483d]" onClick={saveDesign}>
              <Save /> Save design
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">
              <ImagePlus className="size-4" /> Room photo
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#b8aa99] bg-[#f8f2ea] px-3 py-4 text-sm font-bold text-[#62584d] transition hover:bg-[#efe5d8]">
              <Upload className="size-4" />
              Upload your room
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleRoomUpload(event.target.files?.[0] ?? null)} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-[#6f665d]">
                Wall width ft
                <input
                  value={design.calibration.wallWidthFt}
                  type="number"
                  min={4}
                  max={40}
                  className="mt-1 w-full rounded-md border border-[#d7cabb] bg-white px-2 py-2 text-sm"
                  onChange={(event) => {
                    const wallWidthFt = Number(event.target.value) || 12;
                    pushHistory();
                    updateDesign((current) => ({
                      ...current,
                      calibration: {
                        ...current.calibration,
                        wallWidthFt,
                        pixelsPerFoot: baseCanvas.width / Math.max(8, wallWidthFt + 2.5),
                      },
                    }));
                  }}
                />
              </label>
              <label className="text-xs font-bold text-[#6f665d]">
                Floor line
                <input
                  value={design.calibration.floorLineY}
                  type="number"
                  min={420}
                  max={820}
                  className="mt-1 w-full rounded-md border border-[#d7cabb] bg-white px-2 py-2 text-sm"
                  onChange={(event) => {
                    const floorLineY = Number(event.target.value) || 610;
                    pushHistory();
                    updateDesign((current) => ({ ...current, calibration: { ...current.calibration, floorLineY } }));
                  }}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">
                <Link2 className="size-4" /> Product link
              </div>
              {extracting ? <Loader2 className="size-4 animate-spin text-[#65745f]" /> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={url}
                placeholder="https://www.ikea.com/..."
                className="min-w-0 flex-1 rounded-md border border-[#d7cabb] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#aab99f]"
                onChange={(event) => setUrl(event.target.value)}
              />
              <Button onClick={handleExtract} disabled={extracting} className="bg-[#26362d] text-white hover:bg-[#34483d]">
                <Wand2 />
              </Button>
            </div>
            <button
              className="mt-3 text-xs font-bold text-[#5a684f] underline-offset-4 hover:underline"
              onClick={() => setManualOpen((open) => !open)}
            >
              URL failed? Enter product manually
            </button>
            {manualOpen ? (
              <div className="mt-3 space-y-2 rounded-lg bg-[#f4ede3] p-3">
                <input value={manualName} className="w-full rounded-md border border-[#d7cabb] px-2 py-2 text-sm" onChange={(event) => setManualName(event.target.value)} />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#b8aa99] bg-white px-3 py-2 text-xs font-bold">
                  <Scissors className="size-4" /> Upload product image
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleProductUpload(event.target.files?.[0] ?? null)} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input aria-label="Width inches" type="number" value={manualWidth} className="rounded-md border border-[#d7cabb] px-2 py-2 text-sm" onChange={(event) => setManualWidth(Number(event.target.value))} />
                  <input aria-label="Height inches" type="number" value={manualHeight} className="rounded-md border border-[#d7cabb] px-2 py-2 text-sm" onChange={(event) => setManualHeight(Number(event.target.value))} />
                  <input aria-label="Price" type="number" value={manualPrice} className="rounded-md border border-[#d7cabb] px-2 py-2 text-sm" onChange={(event) => setManualPrice(Number(event.target.value))} />
                </div>
                <Button className="w-full bg-[#26362d] text-white hover:bg-[#34483d]" onClick={handleManualProduct}>
                  <Plus /> Add manual item
                </Button>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">
                <ShoppingBag className="size-4" /> Furniture
              </div>
              <span className="text-sm font-black">{formatMoney(total)}</span>
            </div>
            <div className="mt-3 space-y-2">
              {design.products.map((product) => (
                <button
                  key={product.id}
                  className="flex w-full items-center gap-3 rounded-lg border border-[#e1d4c5] bg-white p-2 text-left transition hover:border-[#aab99f]"
                  onClick={() => addProductToCanvas(product)}
                >
                  <ProductThumb src={product.cutoutUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{product.name}</span>
                    <span className="block text-xs font-bold text-[#7c7165]">
                      {product.retailer} · {formatMoney(product.price)}
                    </span>
                  </span>
                  <Plus className="size-4 text-[#65745f]" />
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#746a60]">
                <Sparkles className="size-4 text-[#65745f]" />
                {message}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))}>
                  <ZoomOut />
                </Button>
                <span className="w-12 text-center text-xs font-black">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))}>
                  <ZoomIn />
                </Button>
              </div>
            </div>
            <div ref={containerRef} className="overflow-auto rounded-lg bg-[#2a2723] p-3">
              <div className="mx-auto" style={{ width: stageSize.width, height: stageSize.height }}>
                <Stage
                  ref={stageRef}
                  width={stageSize.width}
                  height={stageSize.height}
                  onMouseDown={(event) => {
                    if (event.target === event.target.getStage()) setSelectedId("");
                  }}
                >
                  <Layer scaleX={scale} scaleY={scale}>
                    {roomImage ? (
                      <KonvaImage image={roomImage} width={baseCanvas.width} height={baseCanvas.height} />
                    ) : (
                      <Rect width={baseCanvas.width} height={baseCanvas.height} fill="#efe6da" />
                    )}
                    <Rect
                      x={0}
                      y={design.calibration.floorLineY}
                      width={baseCanvas.width}
                      height={3}
                      fill="#65745f"
                      opacity={0.55}
                      listening={false}
                    />
                    {design.placed.map((item) => (
                      <FurnitureNode
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        onSelect={() => setSelectedId(item.id)}
                        onChange={(next) => updateItem(next)}
                        registerNode={registerNode}
                      />
                    ))}
                    <Transformer
                      ref={transformerRef}
                      rotateEnabled
                      enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
                      boundBoxFunc={(oldBox, newBox) => (newBox.width < 40 || newBox.height < 40 ? oldBox : newBox)}
                    />
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">Before / after share preview</h2>
                <span className="rounded-full bg-[#e6ded2] px-3 py-1 text-xs font-black text-[#685e52]">
                  {formatMoney(total)} room makeover
                </span>
              </div>
              <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-lg border border-[#ddd1c1] bg-[#f3eadf]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.roomImage} alt="Before room" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${showBefore}%)` }}>
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={design.roomImage} alt="After room background" className="absolute inset-0 h-full w-full object-cover" />
                    {design.placed.slice(0, 4).map((item) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.imageUrl}
                        alt=""
                        className="absolute"
                        style={{
                          width: `${Math.max(12, (item.width / baseCanvas.width) * 100)}%`,
                          left: `${(item.x / baseCanvas.width) * 100}%`,
                          top: `${(item.y / baseCanvas.height) * 100}%`,
                          transform: `rotate(${item.rotation}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="absolute inset-y-0 w-1 bg-white shadow" style={{ left: `${showBefore}%` }} />
              </div>
              <input
                type="range"
                min={8}
                max={92}
                value={showBefore}
                className="mt-3 w-full accent-[#65745f]"
                onChange={(event) => setShowBefore(Number(event.target.value))}
              />
            </section>

            <section className="rounded-lg border border-[#ded2c3] bg-[#26362d] p-4 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#c8d6c2]">
                <Share2 className="size-4" /> Viral card
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight">{formatMoney(total)} bedroom makeover</h2>
              <p className="mt-2 text-sm font-semibold text-[#d9e3d4]">
                TikTok, Instagram, and X-ready share card. Public links and remix buttons become live after auth-backed save.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setDesign((current) => ({ ...current, activeLayout: "A" }))}>
                  <Vote /> Layout A · {layoutVotes.A}
                </Button>
                <Button variant="secondary" onClick={() => setDesign((current) => ({ ...current, activeLayout: "B" }))}>
                  <Vote /> Layout B · {layoutVotes.B}
                </Button>
              </div>
              <Button
                className="mt-3 w-full bg-white text-[#26362d] hover:bg-[#edf3ea]"
                onClick={() => setLayoutVotes((votes) => ({ ...votes, [design.activeLayout]: votes[design.activeLayout] + 1 }))}
              >
                <Sparkles /> Vote for Layout {design.activeLayout}
              </Button>
              <Button variant="outline" className="mt-2 w-full border-white/30 bg-transparent text-white hover:bg-white/10" onClick={saveDesign}>
                <Copy /> Remix this room
              </Button>
            </section>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">
              <SlidersHorizontal className="size-4" /> Selection
            </div>
            {selectedItem ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-lg font-black">{selectedItem.name}</h2>
                  <p className="text-sm font-bold text-[#756b5f]">
                    {formatMoney(selectedItem.price)} · {selectedItem.retailer}
                  </p>
                  {selectedItem.warning ? (
                    <p className="mt-2 rounded-md bg-[#f5ded4] p-2 text-xs font-bold text-[#823d2f]">{selectedItem.warning}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => mutateSelected((item) => ({ ...item, rotation: item.rotation - 8 }))}>
                    <RotateCcw /> Rotate
                  </Button>
                  <Button variant="outline" onClick={() => mutateSelected((item) => ({ ...item, scaleX: item.scaleX * -1 }))}>
                    <FlipHorizontal /> Flip
                  </Button>
                  <Button variant="outline" onClick={duplicateSelected}>
                    <Copy /> Duplicate
                  </Button>
                  <Button variant="destructive" onClick={deleteSelected}>
                    <Trash2 /> Delete
                  </Button>
                </div>
                <label className="block text-xs font-black uppercase tracking-[0.12em] text-[#6c7965]">
                  Width
                  <input
                    type="range"
                    min={60}
                    max={900}
                    value={Math.abs(selectedItem.width * selectedItem.scaleX)}
                    className="mt-2 w-full accent-[#65745f]"
                    onChange={(event) => mutateSelected((item) => ({ ...item, width: Number(event.target.value), scaleX: Math.sign(item.scaleX) || 1 }))}
                  />
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.12em] text-[#6c7965]">
                  Height
                  <input
                    type="range"
                    min={50}
                    max={600}
                    value={Math.abs(selectedItem.height * selectedItem.scaleY)}
                    className="mt-2 w-full accent-[#65745f]"
                    onChange={(event) => mutateSelected((item) => ({ ...item, height: Number(event.target.value), scaleY: Math.sign(item.scaleY) || 1 }))}
                  />
                </label>
                <label className="block text-xs font-black uppercase tracking-[0.12em] text-[#6c7965]">
                  Perspective depth
                  <input
                    type="range"
                    min={0.65}
                    max={1.25}
                    step={0.01}
                    value={Math.abs(selectedItem.scaleY)}
                    className="mt-2 w-full accent-[#65745f]"
                    onChange={(event) => mutateSelected((item) => ({ ...item, scaleY: Number(event.target.value) }))}
                  />
                </label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => mutateSelected((item) => ({ ...item, y: design.calibration.floorLineY - item.height * Math.abs(item.scaleY) + 18 }))}
                >
                  <Lock /> Snap to floor
                </Button>
                <a
                  href={selectedItem.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#e5eddf] px-3 py-2 text-sm font-black text-[#314032]"
                >
                  <ShoppingBag className="size-4" /> View product
                </a>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#f4ede3] p-4 text-sm font-bold text-[#756b5f]">
                Select a furniture cutout to resize, rotate, layer, snap, or delete it.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">
              <Layers className="size-4" /> Layers
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="icon" aria-label="Bring forward" onClick={() => changeLayer("up")}>
                <ArrowUp />
              </Button>
              <Button variant="outline" size="icon" aria-label="Send backward" onClick={() => changeLayer("down")}>
                <ArrowDown />
              </Button>
              <Button variant="outline" size="icon" aria-label="Bring to front" onClick={() => changeLayer("front")}>
                <BringToFront />
              </Button>
              <Button variant="outline" size="icon" aria-label="Send to back" onClick={() => changeLayer("back")}>
                <SendToBack />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {[...design.placed].sort((a, b) => b.zIndex - a.zIndex).map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-bold",
                    item.id === selectedId ? "border-[#65745f] bg-[#e7efdf]" : "border-[#e1d5c7] bg-white",
                  )}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-xs text-[#7a7065]">#{item.zIndex}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#ded2c3] bg-[#fffaf4] p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#65745f]">Saved state</h2>
            <p className="mt-2 text-xs font-semibold text-[#756b5f]">
              Canvas JSON is persisted locally now and can be stored in Supabase once auth is configured.
            </p>
            <pre className="mt-3 max-h-36 overflow-auto rounded-md bg-[#29241f] p-3 text-[10px] text-[#e9dfd2]">
              {JSON.stringify(
                {
                  id: design.id,
                  items: design.placed.length,
                  layout: design.activeLayout,
                  updatedAt: design.updatedAt,
                },
                null,
                2,
              )}
            </pre>
          </section>
        </aside>
      </main>
    </div>
  );
}
