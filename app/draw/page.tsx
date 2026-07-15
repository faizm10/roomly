"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LivingWorld } from "@/components/world/LivingWorld";
import type { SketchSnapshot } from "@/components/editor/SketchCanvas";
import type { RecognizeResponse, WorldObject } from "@/lib/world";
import { houseWorldFromSketch, isWorldObjectType, makeWorldObject, sampleWorld } from "@/lib/world";

// tldraw touches window at import time — client-only.
const SketchCanvas = dynamic(
  () => import("@/components/editor/SketchCanvas").then((m) => m.SketchCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-stone-400">
        Preparing your canvas…
      </div>
    ),
  },
);

export default function DrawPage() {
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const handleBringToLife = useCallback(async (snapshot: SketchSnapshot) => {
    setRecognizing(true);
    setError(null);
    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: snapshot.image }),
      });
      const data = (await res.json()) as RecognizeResponse;

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      let next: WorldObject[];
      if (data.fallback) {
        // No vision key configured — prototype one interactive house scene from the sketch.
        setDemoMode(true);
        next = houseWorldFromSketch(snapshot.strokes);
      } else {
        setDemoMode(false);
        next = (data.objects ?? []).flatMap((o) =>
          isWorldObjectType(o.type) ? [makeWorldObject(o.type, o.x, o.y)] : [],
        );
      }

      if (next.length === 0) {
        setError("Hmm, I couldn't recognize anything. Try a simple house or tree!");
      }
      // Small pause so the magic overlay reads as a moment, not a flash.
      await new Promise((r) => setTimeout(r, 600));
      setObjects(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRecognizing(false);
    }
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-[#faf7f2]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200/70 bg-white/70 px-5 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-stone-700">
          <span className="text-xl">✏️</span> Roomly
        </Link>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          {demoMode && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
              House prototype mode
            </span>
          )}
          <span className="hidden sm:block">Sketch on the left · watch it live on the right</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT — canvas (40%) */}
        <div className="relative w-2/5 border-r border-stone-200/70">
          <SketchCanvas onBringToLife={handleBringToLife} busy={recognizing} />
        </div>

        {/* RIGHT — living world (60%) */}
        <div className="relative w-3/5">
          <LivingWorld
            objects={objects}
            recognizing={recognizing}
            onLoadSample={() => setObjects(sampleWorld())}
          />

          <AnimatePresence>
            {error && (
              <motion.div
                className="absolute left-1/2 top-4 z-[60] -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-rose-500 shadow-lg ring-1 ring-rose-100"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
