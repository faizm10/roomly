"use client";

/**
 * Vendored from Amicro btn-2 (`Star on GitHub` / sparkle interaction in
 * `src/components/AnimatedButton.tsx`). The published `@subhanhq/amicro`
 * package has no CLI bin, so this was copied rather than installed.
 * Local changes: "use client"; framer-motion; paper/ink colors; reusable
 * label and icons; freeze the hover swap when reduced motion is requested.
 */

import { useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

const SWAP_SPRING = { type: "spring", stiffness: 600, damping: 25 } as const;
const LAYOUT_SPRING = { type: "spring", stiffness: 500, damping: 25 } as const;

type Icon = ComponentType<{ className?: string }>;

function SparkleMark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.5-6.2 4.5 2.4-7.6L2 9.6h7.6z" />
    </svg>
  );
}

export function SparkleButton({
  children = "Go to the dashboard",
  className = "",
  disabled,
  hoverIcon: HoverIcon = Star,
  idleIcon: IdleIcon = ArrowRight,
  onClick,
  type = "button"
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  hoverIcon?: Icon;
  idleIcon?: Icon;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const reduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const showSparkle = Boolean(isHovered && !reduceMotion);

  return (
    <motion.button
      layout
      animate={{
        paddingLeft: showSparkle ? 28 : 24,
        paddingRight: showSparkle ? 28 : 24
      }}
      className={`relative flex h-11 min-w-[75px] items-center justify-center rounded-[40px] border-0 bg-[var(--accent-strong)] text-[13px] text-[var(--panel-strong)] shadow-none ${className}`}
      disabled={disabled}
      transition={LAYOUT_SPRING}
      type={type}
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      onBlur={() => setIsHovered(false)}
      onClick={onClick}
      onFocus={() => setIsHovered(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="flex w-full items-center justify-center"
        layout
        transition={LAYOUT_SPRING}
      >
        <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {!showSparkle ? (
              <motion.div
                key="icon1"
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                exit={{ y: -15, opacity: 0, scale: 0.8 }}
                initial={{ y: -15, opacity: 0, scale: 0.8 }}
                transition={SWAP_SPRING}
              >
                <IdleIcon className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="icon2"
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                exit={{ y: 15, opacity: 0, scale: 0.8 }}
                initial={{ y: 15, opacity: 0, scale: 0.8 }}
                transition={SWAP_SPRING}
              >
                <HoverIcon className="h-4 w-4 text-yellow-400" />
                <motion.div
                  animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                  className="absolute -top-3 -right-2"
                  exit={{ opacity: 0, scale: 0, rotate: 45, y: 10 }}
                  initial={{ opacity: 0, scale: 0, rotate: -45, y: 10 }}
                  transition={{ ...SWAP_SPRING, delay: 0.05 }}
                >
                  <SparkleMark className="h-2.5 w-2.5 text-yellow-200" />
                </motion.div>
                <motion.div
                  animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }}
                  className="absolute -top-1 -left-3"
                  exit={{ opacity: 0, scale: 0, rotate: -45, x: 10 }}
                  initial={{ opacity: 0, scale: 0, rotate: 45, x: 10 }}
                  transition={{ ...SWAP_SPRING, delay: 0.1 }}
                >
                  <SparkleMark className="h-1.5 w-1.5 text-yellow-400" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.span
          className="ml-2.5 whitespace-nowrap font-medium tracking-tight"
          layout
        >
          {children}
        </motion.span>
      </motion.div>
    </motion.button>
  );
}
