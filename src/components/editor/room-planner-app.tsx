"use client";

import {
  Armchair,
  BedDouble,
  Box,
  CheckCircle2,
  CornerDownRight,
  Grid3X3,
  Home,
  LampFloor,
  MousePointer2,
  Move,
  Palette,
  Plus,
  RotateCw,
  Ruler,
  Sofa,
  Table2,
  Trash2
} from "lucide-react";
import { useEffect } from "react";
import { BlueprintCanvas } from "@/components/blueprint/blueprint-canvas";
import { RoomSetupPanel } from "@/components/setup/room-setup-panel";
import {
  ImagesBadge,
  materialPreviewImages
} from "@/components/ui/aceternity-effects";
import { Dock, DockIcon } from "@/components/ui/dock";
import {
  furnitureCatalog,
  getFurnitureDefinition
} from "@/features/furniture/catalog";
import { localRoomRepository } from "@/features/persistence/room-repository";
import { useEditorStore } from "@/stores/editor-store";
import type { FurnitureCategory } from "@/types/furniture";
import type { FurnitureInstance } from "@/types/room";

export function RoomPlannerApp() {
  const room = useEditorStore((state) => state.room);
  const mode = useEditorStore((state) => state.mode);
  const savedState = useEditorStore((state) => state.savedState);
  const markSaving = useEditorStore((state) => state.markSaving);
  const markSaved = useEditorStore((state) => state.markSaved);

  useEffect(() => {
    markSaving();
    const timeout = window.setTimeout(async () => {
      await localRoomRepository.saveRoom(room);
      markSaved();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [markSaved, markSaving, room]);

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white">
            <Home size={17} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-4">{room.name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span>{room.vertices.length} vertices</span>
              <span className="size-1 rounded-full bg-[#b4b8b0]" />
              <span>{room.furniture.length} furniture</span>
              <span className="size-1 rounded-full bg-[#b4b8b0]" />
              <span>{room.wallHeight.toFixed(2)} m walls</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-[var(--muted)]">
          <CheckCircle2
            className={
              savedState === "saving" ? "text-[#9b722f]" : "text-[var(--accent)]"
            }
            size={14}
          />
          <span>{savedState === "saving" ? "Saving..." : "Saved locally"}</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
        <section className="relative min-h-0 min-w-0 overflow-hidden bg-[var(--blueprint)]">
          {mode === "setup" ? <RoomSetupPanel /> : <BlueprintCanvas />}
          <EditorDock />
        </section>

        <InspectorPanel />
      </div>
    </main>
  );
}

function EditorDock() {
  const mode = useEditorStore((state) => state.mode);
  const tool = useEditorStore((state) => state.tool);
  const setMode = useEditorStore((state) => state.setMode);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
      <Dock
        className="pointer-events-auto"
        direction="middle"
        iconDistance={96}
        iconMagnification={58}
        iconSize={42}
      >
        <DockIcon
          active={tool === "select"}
          label="Select"
          onClick={() => setTool("select")}
        >
          <MousePointer2 />
        </DockIcon>
        <DockIcon
          active={tool === "vertex"}
          label="Vertices"
          onClick={() => setTool("vertex")}
        >
          <Box />
        </DockIcon>
        <DockIcon
          active={tool === "insert-vertex"}
          label="Add Vertex"
          onClick={() => setTool("insert-vertex")}
        >
          <CornerDownRight />
        </DockIcon>
        <DockIcon active={tool === "pan"} label="Pan" onClick={() => setTool("pan")}>
          <Move />
        </DockIcon>
        <span aria-hidden="true" className="dock-separator" />
        <DockIcon
          active={mode === "blueprint"}
          label="Blueprint"
          onClick={() => setMode("blueprint")}
        >
          <Grid3X3 />
        </DockIcon>
        <DockIcon
          active={mode === "setup"}
          label="New Room"
          onClick={() => setMode("setup")}
        >
          <Ruler />
        </DockIcon>
      </Dock>
    </div>
  );
}

function InspectorPanel() {
  const room = useEditorStore((state) => state.room);
  const mode = useEditorStore((state) => state.mode);
  const selection = useEditorStore((state) => state.selection);
  const updateRoomName = useEditorStore((state) => state.updateRoomName);
  const updateWallHeight = useEditorStore((state) => state.updateWallHeight);
  const updateVertex = useEditorStore((state) => state.updateVertex);
  const removeVertex = useEditorStore((state) => state.removeVertex);
  const addFurniture = useEditorStore((state) => state.addFurniture);
  const updateFurniture = useEditorStore((state) => state.updateFurniture);
  const removeFurniture = useEditorStore((state) => state.removeFurniture);
  const previewImages = materialPreviewImages();
  const canRemoveVertex = room.vertices.length > 3;
  const selectedVertex =
    selection.kind === "vertex"
      ? room.vertices.find((vertex) => vertex.id === selection.id)
      : null;
  const selectedFurniture =
    selection.kind === "furniture"
      ? room.furniture.find((item) => item.id === selection.id)
      : null;
  const selectedFurnitureDefinition = selectedFurniture
    ? getFurnitureDefinition(selectedFurniture.definitionId)
    : null;

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="shrink-0 border-b border-[var(--line)] px-4 py-3">
        <div className="panel-label">Properties</div>
      </div>

      <div className="inspector-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Room</div>
            <span className="metric-chip">{room.vertices.length} points</span>
          </div>
          <ImagesBadge
            className="w-full justify-start shadow-none"
            images={previewImages}
            text="Current palette"
          />
          <LabeledInput
            label="Name"
            value={room.name}
            onChange={(value) => updateRoomName(value)}
          />
          <NumberInput
            label="Wall height"
            suffix="m"
            value={room.wallHeight}
            onChange={(value) => updateWallHeight(value)}
          />
        </section>

        {mode === "setup" ? (
          <section className="space-y-3 border-t border-[var(--line)] pt-5">
            <div className="text-sm font-semibold">Setup</div>
            <div className="grid grid-cols-2 gap-2">
              <span className="metric-chip">X/Z meters</span>
              <span className="metric-chip">Local save</span>
            </div>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Create exact rectangles or load the sample polygon, then refine
              vertices in Blueprint.
            </p>
          </section>
        ) : selectedVertex ? (
          <section className="space-y-3 border-t border-[var(--line)] pt-5">
            <div className="text-sm font-semibold">Selected Vertex</div>
            <NumberInput
              label="X"
              suffix="m"
              value={selectedVertex.x}
              onChange={(value) => updateVertex(selectedVertex.id, { x: value })}
            />
            <NumberInput
              label="Z"
              suffix="m"
              value={selectedVertex.z}
              onChange={(value) => updateVertex(selectedVertex.id, { z: value })}
            />
            <button
              className="danger-button w-full"
              disabled={!canRemoveVertex}
              type="button"
              onClick={() => removeVertex(selectedVertex.id)}
            >
              <Trash2 size={14} />
              Remove vertex
            </button>
            {!canRemoveVertex ? (
              <p className="text-xs leading-5 text-[var(--muted)]">
                A room needs at least three vertices.
              </p>
            ) : null}
          </section>
        ) : selectedFurniture ? (
          <FurnitureInspector
            item={selectedFurniture}
            name={selectedFurnitureDefinition?.name ?? "Furniture"}
            resizable={selectedFurnitureDefinition?.resizable ?? true}
            onChange={(updates) => updateFurniture(selectedFurniture.id, updates)}
            onRemove={() => removeFurniture(selectedFurniture.id)}
          />
        ) : (
          <FurnitureLibrary onAdd={addFurniture} />
        )}
      </div>
    </aside>
  );
}

function FurnitureLibrary({ onAdd }: { onAdd: (definitionId: string) => void }) {
  return (
    <section className="space-y-3 border-t border-[var(--line)] pt-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Furniture</div>
        <span className="metric-chip">Drag after add</span>
      </div>
      <div className="furniture-library-grid grid grid-cols-2 gap-2">
        {furnitureCatalog.map((definition) => {
          const Icon = iconForCategory(definition.category, definition.id);

          return (
            <button
              key={definition.id}
              className="furniture-card"
              type="button"
              onClick={() => onAdd(definition.id)}
            >
              <span
                className="furniture-swatch"
                style={{ backgroundColor: definition.color }}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-[var(--foreground)]">
                  {definition.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                  {definition.defaultWidth} x {definition.defaultDepth} m
                </span>
              </span>
              <Plus className="furniture-add-icon" size={13} />
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Select furniture on the blueprint to edit exact size, placement, color,
        and rotation.
      </p>
    </section>
  );
}

function FurnitureInspector({
  item,
  name,
  resizable,
  onChange,
  onRemove
}: {
  item: FurnitureInstance;
  name: string;
  resizable: boolean;
  onChange: (
    updates: Partial<Omit<FurnitureInstance, "id" | "definitionId">>
  ) => void;
  onRemove: () => void;
}) {
  return (
    <section className="space-y-3 border-t border-[var(--line)] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">
            {item.width.toFixed(2)} x {item.depth.toFixed(2)} m
          </div>
        </div>
        <span className="metric-chip">{Math.round(item.rotation)} deg</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="X"
          suffix="m"
          value={item.x}
          onChange={(value) => onChange({ x: value })}
        />
        <NumberInput
          label="Z"
          suffix="m"
          value={item.z}
          onChange={(value) => onChange({ z: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          disabled={!resizable}
          label="Width"
          suffix="m"
          value={item.width}
          onChange={(value) => onChange({ width: Math.max(0.1, value) })}
        />
        <NumberInput
          disabled={!resizable}
          label="Depth"
          suffix="m"
          value={item.depth}
          onChange={(value) => onChange({ depth: Math.max(0.1, value) })}
        />
      </div>

      <NumberInput
        label="Height"
        suffix="m"
        value={item.height}
        onChange={(value) => onChange({ height: Math.max(0.01, value) })}
      />

      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
        Rotation
        <span className="flex items-center gap-2">
          <input
            className="furniture-range"
            max="359"
            min="0"
            step="15"
            type="range"
            value={item.rotation}
            onChange={(event) => onChange({ rotation: Number(event.target.value) })}
          />
          <button
            aria-label="Rotate 90 degrees"
            className="icon-action-button"
            type="button"
            onClick={() => onChange({ rotation: (item.rotation + 90) % 360 })}
          >
            <RotateCw size={14} />
          </button>
        </span>
      </label>

      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
        Color
        <span className="field-shell color-field">
          <Palette size={14} />
          <input
            aria-label="Furniture color"
            type="color"
            value={item.color ?? "#9ca39d"}
            onChange={(event) => onChange({ color: event.target.value })}
          />
          <span className="text-xs text-[var(--muted)]">
            {(item.color ?? "#9ca39d").toUpperCase()}
          </span>
        </span>
      </label>

      <button className="danger-button w-full" type="button" onClick={onRemove}>
        <Trash2 size={14} />
        Remove furniture
      </button>
    </section>
  );
}

function iconForCategory(category: FurnitureCategory, definitionId: string) {
  if (category === "Beds") {
    return BedDouble;
  }

  if (category === "Seating") {
    return definitionId === "sofa" ? Sofa : Armchair;
  }

  if (category === "Lighting") {
    return LampFloor;
  }

  if (category === "Tables" || category === "Desks") {
    return Table2;
  }

  return Armchair;
}

function LabeledInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
      {label}
      <span className="field-shell">
        <input
          className="text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function NumberInput({
  disabled = false,
  label,
  suffix,
  value,
  onChange
}: {
  disabled?: boolean;
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
      {label}
      <span className="field-shell">
        <input
          className="text-sm"
          disabled={disabled}
          step="0.1"
          type="number"
          value={Number(value.toFixed(2))}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pr-2 text-[11px] text-[var(--muted)]">{suffix}</span>
      </span>
    </label>
  );
}
