"use client";

/**
 * Vendored from the Amicro registry (`registry/ui/loading/wave-dots.tsx`).
 * See word-reveal.tsx for why these are copied rather than CLI-installed.
 * Local changes: added "use client"; the dots inherit `currentColor` instead of
 * a hardcoded zinc/white pair so they read as ink on the paper theme.
 */

import React from "react";
import { motion } from "framer-motion";

export const WaveDots = () => {
  return (
    <div className="flex h-6 items-center space-x-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-current"
          animate={{ y: [4, -4, 4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};
