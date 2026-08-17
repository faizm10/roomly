"use client";

import { DrawablyButton, DrawablyDivider, DrawablyInput } from "drawably/react";
import {
  Armchair,
  Box,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CornerDownRight,
  Grid3X3,
  Home,
  MousePointer2,
  Move,
  Redo2,
  Ruler,
  Trash2,
  Undo2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BlueprintCanvas } from "@/components/blueprint/blueprint-canvas";
import { FurnitureProperties } from "@/components/inspector/furniture-properties";
import { FurnitureLibrary } from "@/components/library/furniture-library";
import { RoomSetupPanel } from "@/components/setup/room-setup-panel";
import { SavedRoomsPanel } from "@/components/setup/saved-rooms-panel";
import {
  ImagesBadge,
  materialPreviewImages
} from "@/components/ui/aceternity-effects";
import { WaveDots } from "@/components/ui/amicro/wave-dots";
import { Dock, DockIcon } from "@/components/ui/dock";
import { getFurnitureDefinition } from "@/features/furniture/catalog";
import { localRoomRepository } from "@/features/persistence/room-repository";
import { verticesToPoints } from "@/lib/geometry/points";
import { useEditorStore } from "@/stores/editor-store";

export function RoomPlannerApp() {
  const room = useEditorStore((state) => state.room);
  const mode = useEditorStore((state) => state.mode);
  const savedState = useEditorStore((state) => state.savedState);
  const hydrated = useEditorStore((state) => state.hydrated);
  const markSaving = useEditorStore((state) => state.markSaving);
  const markSaved = useEditorStore((state) => state.markSaved);
  const hydrate = useEditorStore((state) => state.hydrate);
  const refreshSavedRooms = useEditorStore((state) => state.refreshSavedRooms);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    markSaving();
    const timeout = window.setTimeout(async () => {
      await localRoomRepository.saveRoom(room);
      markSaved();
      await refreshSavedRooms();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [hydrated, markSaved, markSaving, refreshSavedRooms, room]);

  if (!hydrated) {
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--background)] text-[var(--muted)]">
        <WaveDots />
        <span className="hand-title text-base">Loading rooms…</span>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white">
            <Home size={17} />
          </div>
          <div>
            <div className="hand-title text-lg leading-6">{room.name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span>{room.vertices.length} vertices</span>
              <span className="size-1 rounded-full bg-[#b4b8b0]" />
              <span>{room.furniture.length} furniture</span>
              <span className="size-1 rounded-full bg-[#b4b8b0]" />
              <span>{room.wallHeight.toFixed(2)} m walls</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-xs text-[var(--muted)]">
          <HistoryControls />
          <span className="h-5 w-px bg-[var(--line)]" />
          <span className="flex items-center gap-2">
            <CheckCircle2
              className={
                savedState === "saving"
                  ? "text-[#9b722f]"
                  : "text-[var(--accent)]"
              }
              size={14}
            />
            {savedState === "saving" ? "Saving..." : "Saved locally"}
          </span>
        </div>
      </header>

      <div
        className="grid min-h-0 flex-1 transition-[grid-template-columns] duration-150 ease-out"
        style={{
          gridTemplateColumns: inspectorCollapsed
            ? "minmax(0, 1fr) 44px"
            : "minmax(0, 1fr) 300px"
        }}
      >
        <section className="relative min-h-0 min-w-0 overflow-hidden bg-[var(--blueprint)]">
          {mode === "setup" ? <RoomSetupPanel /> : <BlueprintCanvas />}
          <EditorDock />
        </section>

        <InspectorPanel
          collapsed={inspectorCollapsed}
          onToggle={() => setInspectorCollapsed((collapsed) => !collapsed)}
        />
      </div>
    </main>
  );
}

function HistoryControls() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);

  return (
    <span className="flex items-center gap-1">
      <button
        aria-label="Undo"
        className="history-button"
        disabled={!canUndo}
        title="Undo (⌘Z)"
        type="button"
        onClick={undo}
      >
        <Undo2 size={14} />
      </button>
      <button
        aria-label="Redo"
        className="history-button"
        disabled={!canRedo}
        title="Redo (⇧⌘Z)"
        type="button"
        onClick={redo}
      >
        <Redo2 size={14} />
      </button>
    </span>
  );
}

function EditorDock() {
  const mode = useEditorStore((state) => state.mode);
  const tool = useEditorStore((state) => state.tool);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setMode = useEditorStore((state) => state.setMode);
  const setTool = useEditorStore((state) => state.setTool);

  function openFurnitureLibrary() {
    setTool("furniture");
    setSelection({ kind: "room" });
  }

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
        <DockIcon
          active={tool === "furniture"}
          label="Furniture"
          onClick={openFurnitureLibrary}
        >
          <Armchair />
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

function InspectorPanel({
  collapsed,
  onToggle
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const room = useEditorStore((state) => state.room);
  const mode = useEditorStore((state) => state.mode);
  const tool = useEditorStore((state) => state.tool);
  const selection = useEditorStore((state) => state.selection);
  const updateRoomName = useEditorStore((state) => state.updateRoomName);
  const updateWallHeight = useEditorStore((state) => state.updateWallHeight);
  const updateVertex = useEditorStore((state) => state.updateVertex);
  const removeVertex = useEditorStore((state) => state.removeVertex);
  const addFurniture = useEditorStore((state) => state.addFurniture);
  const updateFurniture = useEditorStore((state) => state.updateFurniture);
  const removeFurniture = useEditorStore((state) => state.removeFurniture);
  const duplicateFurniture = useEditorStore((state) => state.duplicateFurniture);
  const beginInteraction = useEditorStore((state) => state.beginInteraction);
  const previewImages = materialPreviewImages();
  const roomPolygon = useMemo(
    () => verticesToPoints(room.vertices),
    [room.vertices]
  );
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

  if (collapsed) {
    return (
      <aside className="collapsed-inspector border-l border-[var(--line)] bg-[var(--panel)]">
        <button
          aria-label="Expand properties"
          className="panel-toggle"
          type="button"
          onClick={onToggle}
        >
          <ChevronLeft size={15} />
        </button>
        <div className="collapsed-inspector-label">Properties</div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div className="panel-label">Properties</div>
        <button
          aria-label="Collapse properties"
          className="panel-toggle"
          type="button"
          onClick={onToggle}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="inspector-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="hand-title text-base">Room</div>
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
          <section className="space-y-3">
            <DrawablyDivider />
            <div className="hand-title pt-2 text-base">Setup</div>
            <div className="grid grid-cols-2 gap-2">
              <span className="metric-chip">X/Z meters</span>
              <span className="metric-chip">Local save</span>
            </div>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Create exact rectangles or load the sample polygon, then refine
              vertices in Blueprint.
            </p>
            <SavedRoomsPanel compact />
          </section>
        ) : selectedVertex ? (
          <section className="space-y-3">
            <DrawablyDivider />
            <div className="hand-title pt-2 text-base">Selected Vertex</div>
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
            <DrawablyButton
              className="w-full"
              disabled={!canRemoveVertex}
              tone="danger"
              type="button"
              onClick={() => removeVertex(selectedVertex.id)}
            >
              <Trash2 size={14} />
              Remove vertex
            </DrawablyButton>
            {!canRemoveVertex ? (
              <p className="text-xs leading-5 text-[var(--muted)]">
                A room needs at least three vertices.
              </p>
            ) : null}
          </section>
        ) : selectedFurniture ? (
          <FurnitureProperties
            definition={selectedFurnitureDefinition ?? undefined}
            item={selectedFurniture}
            roomPolygon={roomPolygon}
            onChange={(updates) => updateFurniture(selectedFurniture.id, updates)}
            onDuplicate={() => duplicateFurniture(selectedFurniture.id)}
            onRemove={() => removeFurniture(selectedFurniture.id)}
            onScrubStart={beginInteraction}
          />
        ) : tool === "furniture" ? (
          <FurnitureLibrary onAdd={addFurniture} />
        ) : (
          <RoomInspectorEmptyState />
        )}
      </div>
    </aside>
  );
}

function RoomInspectorEmptyState() {
  return (
    <section className="space-y-4">
      <DrawablyDivider />
      <p className="pt-2 text-xs leading-5 text-[var(--muted)]">
        Use the dock to edit vertices, add wall points, or open furniture.
      </p>
      <SavedRoomsPanel />
    </section>
  );
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
      <DrawablyInput
        className="text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
      <span className="flex items-baseline justify-between">
        {label}
        <span className="text-[11px]">{suffix}</span>
      </span>
      <DrawablyInput
        className="text-sm"
        disabled={disabled}
        step="0.1"
        type="number"
        value={Number(value.toFixed(2))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
