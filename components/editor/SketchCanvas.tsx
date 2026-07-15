"use client";

import { useCallback, useState } from "react";
import { Tldraw, useEditor, useValue, type Editor } from "tldraw";
import { motion } from "framer-motion";
import { Eraser, Pencil, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SketchStroke } from "@/lib/world";
import "tldraw/tldraw.css";

export interface SketchSnapshot {
  /** PNG data URL of the drawing. */
  image: string;
  /** Per-stroke bounds normalized to 0–100 of the snapshot, for keyless demo mode. */
  strokes: SketchStroke[];
}

export function SketchCanvas({
  onBringToLife,
  busy,
}: {
  onBringToLife: (snapshot: SketchSnapshot) => void;
  busy: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <Tldraw
        hideUi
        onMount={(editor) => {
          editor.setCurrentTool("draw");
          editor.user.updateUserPreferences({ colorScheme: "light" });
        }}
      >
        <CanvasOverlay onBringToLife={onBringToLife} busy={busy} />
      </Tldraw>
    </div>
  );
}

async function captureSnapshot(editor: Editor): Promise<SketchSnapshot | null> {
  const shapeIds = [...editor.getCurrentPageShapeIds()];
  if (shapeIds.length === 0) return null;

  const { url } = await editor.toImageDataUrl(shapeIds, {
    format: "png",
    background: true,
    padding: 24,
    scale: 1,
  });

  // Overall bounds of the drawing, for normalizing per-stroke positions.
  const bounds = shapeIds
    .map((id) => editor.getShapePageBounds(id))
    .filter((b): b is NonNullable<typeof b> => !!b);
  const minX = Math.min(...bounds.map((b) => b.minX));
  const minY = Math.min(...bounds.map((b) => b.minY));
  const maxX = Math.max(...bounds.map((b) => b.maxX));
  const maxY = Math.max(...bounds.map((b) => b.maxY));
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);

  const strokes: SketchStroke[] = bounds.map((b) => ({
    cx: ((b.midX - minX) / w) * 100,
    cy: ((b.midY - minY) / h) * 100,
    w: (b.width / w) * 100,
    h: (b.height / h) * 100,
  }));

  return { image: url, strokes };
}

function CanvasOverlay({
  onBringToLife,
  busy,
}: {
  onBringToLife: (snapshot: SketchSnapshot) => void;
  busy: boolean;
}) {
  const editor = useEditor();
  const [empty, setEmpty] = useState(false);
  const currentTool = useValue("current tool", () => editor.getCurrentToolId(), [editor]);
  const hasShapes = useValue(
    "has shapes",
    () => editor.getCurrentPageShapeIds().size > 0,
    [editor],
  );

  const handleBringToLife = useCallback(async () => {
    const snapshot = await captureSnapshot(editor);
    if (!snapshot) {
      setEmpty(true);
      setTimeout(() => setEmpty(false), 1600);
      return;
    }
    onBringToLife(snapshot);
  }, [editor, onBringToLife]);

  return (
    <>
      {/* tool rail */}
      <div className="pointer-events-auto absolute left-4 top-1/2 z-[300] flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl bg-white/90 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <ToolButton
          label="Pencil"
          active={currentTool === "draw"}
          onClick={() => editor.setCurrentTool("draw")}
        >
          <Pencil className="size-4" />
        </ToolButton>
        <ToolButton
          label="Eraser"
          active={currentTool === "eraser"}
          onClick={() => editor.setCurrentTool("eraser")}
        >
          <Eraser className="size-4" />
        </ToolButton>
        <div className="mx-1 h-px bg-stone-200" />
        <ToolButton label="Undo" onClick={() => editor.undo()}>
          <RotateCcw className="size-4" />
        </ToolButton>
        <ToolButton
          label="Clear"
          onClick={() => editor.deleteShapes([...editor.getCurrentPageShapeIds()])}
        >
          <Trash2 className="size-4" />
        </ToolButton>
      </div>

      {/* bring to life */}
      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-[300] -translate-x-1/2">
        <motion.div
          animate={empty ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.45 }}
        >
          <Button
            size="lg"
            disabled={busy}
            onClick={handleBringToLife}
            className={cn(
              "h-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-base font-bold text-white shadow-xl shadow-violet-300/50 transition-transform hover:scale-105 hover:from-violet-500 hover:to-fuchsia-500",
              busy && "opacity-70",
            )}
          >
            <Sparkles className={cn("size-5", busy && "animate-spin")} />
            {busy ? "Dreaming…" : "Bring To Life"}
          </Button>
        </motion.div>
        {empty && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center text-xs font-semibold text-stone-500"
          >
            Draw something first! ✏️
          </motion.p>
        )}
        {!hasShapes && !empty && (
          <p className="mt-2 text-center text-xs text-stone-400">
            Try a house, tree, road, river or cafe
          </p>
        )}
      </div>
    </>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700",
        active && "bg-violet-100 text-violet-600 hover:bg-violet-100 hover:text-violet-600",
      )}
    >
      {children}
    </button>
  );
}
