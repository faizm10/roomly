"use client";

import {
  Box,
  CheckCircle2,
  CornerDownRight,
  Grid3X3,
  Home,
  MousePointer2,
  Move,
  Ruler,
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
import { localRoomRepository } from "@/features/persistence/room-repository";
import { useEditorStore } from "@/stores/editor-store";

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
    <main className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
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
        <section className="relative min-w-0 bg-[var(--blueprint)]">
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
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
      <Dock
        className="pointer-events-auto"
        direction="middle"
        iconDistance={112}
        iconMagnification={66}
        iconSize={46}
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
  const previewImages = materialPreviewImages();
  const canRemoveVertex = room.vertices.length > 3;
  const selectedVertex =
    selection.kind === "vertex"
      ? room.vertices.find((vertex) => vertex.id === selection.id)
      : null;

  return (
    <aside className="min-w-0 border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="panel-label">Properties</div>
      </div>

      <div className="space-y-6 p-5">
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
        ) : (
          <section className="border-t border-[var(--line)] pt-5 text-xs leading-5 text-[var(--muted)]">
            Select a vertex to edit exact X/Z coordinates. Drag vertices on the
            canvas for fast geometry changes.
          </section>
        )}
      </div>
    </aside>
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
  label,
  suffix,
  value,
  onChange
}: {
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
