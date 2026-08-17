"use client";

/**
 * Vendored from the Amicro registry (`registry/ui/text/word-reveal.tsx`).
 * The published `@subhanhq/amicro` package ships only the marketing site, so
 * its CLI cannot install anything — the registry item was copied in by hand.
 * Local changes: added "use client", typed the easing tuple for framer-motion.
 */

import React from "react";
import { motion } from "framer-motion";

interface WordRevealProps {
  text: string;
  duration?: number;
  staggerDelay?: number;
  className?: string;
}

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

export function WordReveal({
  text,
  duration = 0.5,
  staggerDelay = 0.04,
  className = "gap-x-2 gap-y-1.5"
}: WordRevealProps) {
  const words = text.split(/\s+/);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration,
        ease: EASE_OUT_CUBIC
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, index) => (
        <motion.span key={index} variants={wordVariants} className="inline-block">
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
