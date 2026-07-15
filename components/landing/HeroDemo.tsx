"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HouseAsset, TreeAsset, VillagerSprite } from "@/components/world/WorldAssets";

type Phase = "sketching" | "magic" | "alive";

const PHASE_DURATIONS: Record<Phase, number> = {
  sketching: 3000,
  magic: 1400,
  alive: 4600,
};

const NEXT_PHASE: Record<Phase, Phase> = {
  sketching: "magic",
  magic: "alive",
  alive: "sketching",
};

/** Looping sketch → magic → living-world animation for the landing hero. */
export function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("sketching");

  useEffect(() => {
    const t = setTimeout(() => setPhase(NEXT_PHASE[phase]), PHASE_DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#cfeafe] via-[#eaf7fb] to-[#d8eec9] shadow-2xl shadow-stone-300/60 ring-1 ring-black/5">
      {/* sun */}
      <div className="absolute right-[10%] top-[10%] h-8 w-8 rounded-full bg-[#ffe28a] shadow-[0_0_24px_8px_rgba(255,226,138,0.5)]" />

      <AnimatePresence mode="wait">
        {phase === "sketching" && (
          <motion.svg
            key="sketch"
            viewBox="0 0 320 200"
            className="absolute inset-0 h-full w-full"
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
          >
            {/* hand-drawn house */}
            <motion.path
              d="M105 130 L105 85 L140 55 L175 85 L175 130 Z M125 130 L125 105 L145 105 L145 130"
              fill="none"
              stroke="#78716c"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
            {/* hand-drawn tree */}
            <motion.path
              d="M225 130 L225 105 M225 105 Q200 100 208 78 Q210 58 228 62 Q248 56 246 78 Q252 98 225 105"
              fill="none"
              stroke="#78716c"
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, delay: 1.5, ease: "easeInOut" }}
            />
          </motion.svg>
        )}

        {phase === "magic" && (
          <motion.div
            key="magic"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(7)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-xl"
                style={{
                  left: `${28 + ((i * 37) % 50)}%`,
                  top: `${28 + ((i * 23) % 45)}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, delay: i * 0.1 }}
              >
                ✨
              </motion.span>
            ))}
          </motion.div>
        )}

        {phase === "alive" && (
          <motion.div key="alive" className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            {/* hills */}
            <svg className="absolute bottom-0 h-1/2 w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <path d="M0 40 Q 120 10 240 40 T 400 35 L 400 100 L 0 100 Z" fill="#bfe3a4" />
              <path d="M0 70 Q 140 45 280 70 T 400 68 L 400 100 L 0 100 Z" fill="#b2dc96" />
            </svg>
            <motion.div
              className="absolute left-[27%] top-[24%] h-[42%] w-[26%]"
              initial={{ scale: 0.3, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
            >
              <HouseAsset />
            </motion.div>
            <motion.div
              className="absolute left-[62%] top-[32%] h-[36%] w-[17%]"
              initial={{ scale: 0.3, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.15 }}
            >
              <TreeAsset />
            </motion.div>
            {/* villager strolls across */}
            <motion.div
              className="absolute top-[62%] h-[22%] w-[9%]"
              initial={{ left: "-10%" }}
              animate={{ left: "46%" }}
              transition={{ duration: 2.6, delay: 0.5, ease: "linear" }}
            >
              <VillagerSprite color="#f2a65a" walking waving={false} />
              <motion.div
                className="absolute -top-6 left-1/2 whitespace-nowrap rounded-xl rounded-bl-sm bg-white px-2 py-0.5 text-[10px] font-bold text-stone-600 shadow"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 3.2 }}
              >
                This town is nice.
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* phase caption */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-500 shadow backdrop-blur">
        {phase === "sketching" && "1 · You sketch"}
        {phase === "magic" && "2 · AI understands"}
        {phase === "alive" && "3 · It comes alive"}
      </div>
    </div>
  );
}
