"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { WorldObject, WorldObjectType } from "@/lib/world";
import { TOOLTIP_ICON, TOOLTIP_LABEL } from "@/lib/world";
import { spawnVillager, spawnVillagerAt, tickVillagers, type Villager } from "@/lib/villagers";
import { HouseAsset, TreeAsset, CafeAsset, RiverAsset, RoadAsset, VillagerSprite } from "./WorldAssets";

const MIN_VILLAGERS = 3;

/** Rendered footprint of each asset, as % of world width/height. */
const ASSET_SIZE: Record<WorldObjectType, { w: number; h: number }> = {
  house: { w: 15, h: 22 },
  tree: { w: 11, h: 18 },
  cafe: { w: 17, h: 22 },
  river: { w: 38, h: 11 },
  road: { w: 36, h: 8 },
  person: { w: 0, h: 0 }, // persons become villagers, not static objects
};

export function LivingWorld({
  objects,
  recognizing,
  onLoadSample,
}: {
  objects: WorldObject[];
  recognizing: boolean;
  onLoadSample?: () => void;
}) {
  const staticObjects = objects.filter((o) => o.type !== "person");
  const villagers = useVillagers(objects);
  const hasWorld = objects.length > 0;

  // Ground decals (roads, rivers) sit under buildings; buildings sort by y for depth.
  const decals = staticObjects.filter((o) => o.type === "road" || o.type === "river");
  const buildings = staticObjects
    .filter((o) => o.type !== "road" && o.type !== "river")
    .sort((a, b) => a.y - b.y);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#cfeafe] via-[#e8f6fb] to-[#d8eec9]">
      <Scenery />

      <AnimatePresence>
        {decals.map((obj, i) => (
          <WorldObjectView key={obj.id} obj={obj} index={i} zIndex={5} />
        ))}
        {buildings.map((obj, i) => (
          <WorldObjectView key={obj.id} obj={obj} index={decals.length + i} zIndex={10 + i} />
        ))}
      </AnimatePresence>

      {villagers.map((v) => (
        <VillagerView
          key={v.id}
          villager={v}
          // Depth-sort with buildings: stand in front of anything higher up the hill.
          // (9 + count so ties resolve with the building in front when it sits lower.)
          zIndex={9 + buildings.filter((b) => b.y < v.y).length}
        />
      ))}

      {!hasWorld && !recognizing && <EmptyState onLoadSample={onLoadSample} />}

      <AnimatePresence>{recognizing && <MagicOverlay />}</AnimatePresence>
    </div>
  );
}

/* ── Villager simulation loop ───────────────────────────────────── */

function useVillagers(objects: WorldObject[]): Villager[] {
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  // (Re)spawn the population whenever the world is rebuilt.
  useEffect(() => {
    if (objects.length === 0) {
      setVillagers([]);
      return;
    }
    const now = performance.now();
    const persons = objects.filter((o) => o.type === "person");
    const next: Villager[] = persons.map((p, i) => spawnVillagerAt(p.x, p.y, i, now));
    for (let i = next.length; i < Math.max(MIN_VILLAGERS, next.length); i++) {
      next.push(spawnVillager(i, now));
    }
    // Stagger the walk-ins so they arrive one by one.
    next.forEach((v, i) => {
      if (v.state === "entering") v.x -= i * 8 * (v.facing === 1 ? 1 : -1);
    });
    setVillagers(next);
  }, [objects]);

  // Fixed rAF loop driving the FSM.
  useEffect(() => {
    if (villagers.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setVillagers((prev) => tickVillagers(prev, objectsRef.current, dt, now));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villagers.length > 0]);

  return villagers;
}

/* ── Object rendering ───────────────────────────────────────────── */

function WorldObjectView({ obj, index, zIndex }: { obj: WorldObject; index: number; zIndex: number }) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const size = ASSET_SIZE[obj.type];
  const interactive = obj.type === "house";

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: `${obj.x - size.w / 2}%`,
        top: `${obj.y - size.h / 2}%`,
        width: `${size.w}%`,
        height: `${size.h}%`,
        zIndex,
      }}
      initial={{ opacity: 0, scale: 0.3, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: index * 0.12 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => interactive && setActive((current) => !current)}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Toggle house activity" : undefined}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActive((current) => !current);
        }
      }}
      whileHover={{ scale: 1.06 }}
    >
      <ObjectAsset type={obj.type} active={active} />
      <AnimatePresence>
        {(hovered || active) && (
          <motion.div
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 whitespace-nowrap rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-lg ring-1 ring-black/5"
            initial={{ opacity: 0, y: 6, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 4, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.15 }}
          >
            <div className="text-sm font-bold text-stone-700">
              {TOOLTIP_ICON[obj.type]} {TOOLTIP_LABEL[obj.type]}
            </div>
            <div className="text-xs text-stone-400">
              {active && obj.type === "house" ? "Door open, lights on" : obj.meta}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ObjectAsset({ type, active }: { type: WorldObjectType; active: boolean }) {
  switch (type) {
    case "house":
      return <HouseAsset active={active} />;
    case "tree":
      return <TreeAsset />;
    case "cafe":
      return <CafeAsset />;
    case "river":
      return <RiverAsset />;
    case "road":
      return <RoadAsset />;
    default:
      return null;
  }
}

function VillagerView({ villager: v, zIndex }: { villager: Villager; zIndex: number }) {
  if (v.state === "inside") return null;
  return (
    <div
      className="absolute"
      style={{
        left: `${v.x}%`,
        top: `${v.y}%`,
        width: "5%",
        height: "9%",
        zIndex,
        transform: "translate(-50%, -85%)",
      }}
    >
      <AnimatePresence>
        {v.speech && (
          <motion.div
            key={v.speech}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 shadow-md ring-1 ring-black/5"
            initial={{ opacity: 0, scale: 0.6, y: 6, x: "-30%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-30%" }}
            exit={{ opacity: 0, scale: 0.8, x: "-30%" }}
          >
            {v.speech}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ transform: `scaleX(${v.facing})`, width: "100%", height: "100%" }}>
        <VillagerSprite
          color={v.color}
          walking={v.state === "walking" || v.state === "entering"}
          waving={v.waving}
        />
      </div>
      {v.state === "sipping" && (
        <div className="absolute -right-1 top-1/2 text-[10px]">☕</div>
      )}
    </div>
  );
}

/* ── Backdrop, empty state & magic overlay ──────────────────────── */

function Scenery() {
  return (
    <>
      {/* sun */}
      <div className="absolute right-[8%] top-[6%] h-14 w-14 rounded-full bg-[#ffe28a] shadow-[0_0_40px_12px_rgba(255,226,138,0.55)]" />
      {/* drifting clouds */}
      {[
        { top: "8%", left: "12%", scale: 1, dur: 14 },
        { top: "16%", left: "45%", scale: 0.7, dur: 18 },
        { top: "5%", left: "68%", scale: 0.85, dur: 22 },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute opacity-80"
          style={{
            top: c.top,
            left: c.left,
            animation: `sw-drift ${c.dur}s ease-in-out infinite alternate`,
          }}
        >
          <svg width={90 * c.scale} height={36 * c.scale} viewBox="0 0 90 36">
            <ellipse cx={30} cy={24} rx={26} ry={12} fill="white" />
            <ellipse cx={55} cy={18} rx={22} ry={13} fill="white" />
            <ellipse cx={70} cy={26} rx={18} ry={9} fill="white" />
          </svg>
        </div>
      ))}
      {/* rolling hills */}
      <svg className="absolute bottom-0 left-0 h-[55%] w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <path d="M0 80 Q 100 30 200 70 T 400 60 L 400 200 L 0 200 Z" fill="#cde8b5" opacity={0.7} />
        <path d="M0 120 Q 120 70 240 110 T 400 100 L 400 200 L 0 200 Z" fill="#bfe3a4" opacity={0.8} />
        <path d="M0 160 Q 130 120 260 150 T 400 145 L 400 200 L 0 200 Z" fill="#b2dc96" />
      </svg>
    </>
  );
}

function EmptyState({ onLoadSample }: { onLoadSample?: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 text-center">
      <motion.div
        className="text-5xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        🏡
      </motion.div>
      <p className="max-w-56 text-lg font-bold text-stone-500">Your world is waiting</p>
      <p className="max-w-64 text-sm text-stone-400">
        Sketch a house, a tree or a river on the left, then press{" "}
        <span className="font-semibold text-stone-500">Bring To Life</span> ✨
      </p>
      {onLoadSample && (
        <button
          type="button"
          onClick={onLoadSample}
          className="mt-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-violet-500 shadow-sm ring-1 ring-violet-100 transition-colors hover:bg-white"
        >
          or peek at a sample village →
        </button>
      )}
    </div>
  );
}

function MagicOverlay() {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative h-16 w-16">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${50 + 38 * Math.cos((i / 5) * Math.PI * 2)}%`,
              top: `${50 + 38 * Math.sin((i / 5) * Math.PI * 2)}%`,
            }}
            animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.28 }}
          >
            ✨
          </motion.span>
        ))}
      </div>
      <p className="text-lg font-bold text-stone-600">Reading your sketch…</p>
      <p className="text-sm text-stone-400">a little magic is happening</p>
    </motion.div>
  );
}
