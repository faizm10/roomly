"use client";

/**
 * Vendored from the Amicro registry (`registry/ui/entrance/fade-up.tsx`).
 * See word-reveal.tsx for why these are copied rather than CLI-installed.
 * Local changes: added "use client", typed the easing tuple for framer-motion.
 */

import React from "react";
import { motion } from "framer-motion";

interface FadeUpProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  yOffset?: number;
  className?: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function FadeUp({
  children,
  duration = 0.6,
  delay = 0,
  yOffset = 20,
  className = ""
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: EASE_OUT_EXPO
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
