"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";

type DockDirection = "top" | "middle" | "bottom";

interface DockContextValue {
  iconSize: number;
  iconMagnification: number;
  iconDistance: number;
  mouseX: number | null;
}

const DockContext = createContext<DockContextValue | null>(null);

export function Dock({
  children,
  className = "",
  iconSize = 44,
  iconMagnification = 64,
  iconDistance = 120,
  direction = "middle"
}: {
  children: ReactNode;
  className?: string;
  iconSize?: number;
  iconMagnification?: number;
  iconDistance?: number;
  direction?: DockDirection;
}) {
  const [mouseX, setMouseX] = useState<number | null>(null);

  return (
    <DockContext.Provider
      value={{ iconSize, iconMagnification, iconDistance, mouseX }}
    >
      <div
        className={`dock-shell ${className}`}
        data-direction={direction}
        onPointerLeave={() => setMouseX(null)}
        onPointerMove={(event) => setMouseX(event.clientX)}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

export function DockIcon({
  active = false,
  children,
  className = "",
  label,
  onClick
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  label: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const context = useContext(DockContext);

  if (!context) {
    throw new Error("DockIcon must be rendered inside Dock");
  }

  const { iconSize, iconMagnification, iconDistance, mouseX } = context;
  let size = iconSize;

  if (mouseX !== null && ref.current) {
    const bounds = ref.current.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const distance = Math.abs(mouseX - center);
    const influence = Math.max(0, 1 - distance / iconDistance);
    size = iconSize + (iconMagnification - iconSize) * influence;
  }

  const style = {
    "--dock-icon-size": `${size}px`
  } as CSSProperties;

  return (
    <button
      ref={ref}
      aria-label={label}
      className={`dock-icon ${className}`}
      data-active={active}
      style={style}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
      <span className="dock-tooltip">{label}</span>
      <span aria-hidden="true" className="dock-indicator" />
    </button>
  );
}
