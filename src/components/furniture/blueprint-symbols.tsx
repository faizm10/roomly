import type { FurnitureSymbol, FurnitureSymbolOptions } from "@/types/furniture";

/**
 * Top-down architectural symbols.
 *
 * Every symbol draws centred on the origin, spanning -width/2..width/2 and
 * -depth/2..depth/2 in *canvas pixels* — the parent applies position and
 * rotation, so stroke weights stay a constant screen width at any zoom.
 *
 * Orientation is shared by every piece: local -Y is the back (headboard, sofa
 * back, the side that meets a wall) and +Y is the front (foot of the bed, the
 * side you sit at). That single convention is what makes rotation legible.
 */

export type DetailLevel = 0 | 1 | 2;

export interface FurnitureSymbolProps {
  width: number;
  depth: number;
  detail: DetailLevel;
  tint: string;
  options?: FurnitureSymbolOptions;
}

/** Restrained, architectural palette — the canvas stays calm. */
export const symbolTokens = {
  line: "#6f756d",
  hairline: "#aeb4ab",
  faint: "#c8ccc3",
  ink: "#4a504a",
  paper: "#ffffff"
};

const TINT_OPACITY = 0.22;
const SOFT_OPACITY = 0.4;

function clampRadius(width: number, depth: number, max = 3) {
  return Math.max(0, Math.min(max, width / 8, depth / 8));
}

/**
 * The shared shell every solid piece sits on: white paper, a restrained wash
 * of the item's colour, and a neutral outline.
 */
function Body({
  width,
  depth,
  tint,
  radius,
  x,
  y
}: {
  width: number;
  depth: number;
  tint: string;
  radius?: number;
  x?: number;
  y?: number;
}) {
  const rx = radius ?? clampRadius(width, depth);
  const left = x ?? -width / 2;
  const top = y ?? -depth / 2;

  return (
    <>
      <rect
        x={left}
        y={top}
        width={width}
        height={depth}
        rx={rx}
        fill={symbolTokens.paper}
      />
      <rect
        x={left}
        y={top}
        width={width}
        height={depth}
        rx={rx}
        fill={tint}
        fillOpacity={TINT_OPACITY}
      />
      <rect
        x={left}
        y={top}
        width={width}
        height={depth}
        rx={rx}
        fill="none"
        stroke={symbolTokens.line}
        strokeWidth={1.15}
      />
    </>
  );
}

/** An inner panel — mattress, cushion, tabletop inset. */
function Panel({
  x,
  y,
  width,
  depth,
  tint,
  radius = 2,
  opacity = SOFT_OPACITY,
  stroke = symbolTokens.hairline
}: {
  x: number;
  y: number;
  width: number;
  depth: number;
  tint: string;
  radius?: number;
  opacity?: number;
  stroke?: string | null;
}) {
  if (width <= 0 || depth <= 0) {
    return null;
  }

  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={depth}
        rx={radius}
        fill={tint}
        fillOpacity={opacity}
      />
      {stroke ? (
        <rect
          x={x}
          y={y}
          width={width}
          height={depth}
          rx={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={0.9}
        />
      ) : null}
    </>
  );
}

function BedSymbol({ width, depth, detail, tint, options }: FurnitureSymbolProps) {
  const pillows = options?.pillows ?? 2;
  const headboard = Math.max(3, depth * 0.055);
  const inset = Math.max(1.5, Math.min(width, depth) * 0.035);
  const mattressTop = -depth / 2 + headboard + inset * 0.5;
  const mattressHeight = depth / 2 - inset - mattressTop;
  const mattressWidth = width - inset * 2;

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />

      {/* Headboard: the strongest cue for which way the bed faces. */}
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={headboard}
        rx={clampRadius(width, headboard, 2)}
        fill={symbolTokens.ink}
        fillOpacity={0.5}
      />

      {detail === 0 ? null : (
        <>
          <Panel
            x={-mattressWidth / 2}
            y={mattressTop}
            width={mattressWidth}
            depth={mattressHeight}
            tint={symbolTokens.paper}
            opacity={0.85}
            radius={2}
          />

          {/* Duvet covers the lower two thirds; its turn-down edge reads as bedding. */}
          <Panel
            x={-mattressWidth / 2}
            y={mattressTop + mattressHeight * 0.34}
            width={mattressWidth}
            depth={mattressHeight * 0.66}
            tint={tint}
            opacity={0.34}
            radius={2}
          />

          <PillowRow
            count={pillows}
            mattressWidth={mattressWidth}
            top={mattressTop + mattressHeight * 0.045}
            height={mattressHeight * 0.2}
          />

          {detail === 2 ? (
            <>
              {/* Fold lines in the duvet, kept very light. */}
              <line
                x1={-mattressWidth / 2}
                x2={mattressWidth / 2}
                y1={mattressTop + mattressHeight * 0.62}
                y2={mattressTop + mattressHeight * 0.62}
                stroke={symbolTokens.faint}
                strokeWidth={0.75}
              />
              <line
                x1={-mattressWidth / 2}
                x2={mattressWidth / 2}
                y1={mattressTop + mattressHeight * 0.82}
                y2={mattressTop + mattressHeight * 0.82}
                stroke={symbolTokens.faint}
                strokeWidth={0.75}
              />
            </>
          ) : null}
        </>
      )}
    </>
  );
}

function PillowRow({
  count,
  mattressWidth,
  top,
  height
}: {
  count: number;
  mattressWidth: number;
  top: number;
  height: number;
}) {
  const gap = count > 1 ? Math.max(2, mattressWidth * 0.04) : 0;
  const pillowWidth =
    count > 1 ? (mattressWidth * 0.9 - gap) / 2 : mattressWidth * 0.56;
  const totalWidth = pillowWidth * count + gap * (count - 1);

  if (pillowWidth <= 1 || height <= 1) {
    return null;
  }

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x={-totalWidth / 2 + index * (pillowWidth + gap)}
          y={top}
          width={pillowWidth}
          height={height}
          rx={Math.min(3, height / 2)}
          fill={symbolTokens.paper}
          stroke={symbolTokens.hairline}
          strokeWidth={0.9}
        />
      ))}
    </>
  );
}

function DeskSymbol({ width, depth, detail, tint, options }: FurnitureSymbolProps) {
  const inset = Math.max(1.5, Math.min(width, depth) * 0.06);
  const legSize = Math.max(2.5, Math.min(width, depth) * 0.1);
  const monitorWidth = Math.min(width * 0.36, 34);
  const monitorHeight = Math.max(2.5, depth * 0.1);

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />

      {/* Thicker back edge = the side against the wall. */}
      <line
        x1={-width / 2 + inset * 0.5}
        x2={width / 2 - inset * 0.5}
        y1={-depth / 2 + inset}
        y2={-depth / 2 + inset}
        stroke={symbolTokens.hairline}
        strokeWidth={1}
      />

      {detail === 0 ? null : (
        <>
          {/* Monitor sits at the back, so the free edge is clearly the seat side. */}
          <rect
            x={-monitorWidth / 2}
            y={-depth / 2 + inset * 1.4}
            width={monitorWidth}
            height={monitorHeight}
            rx={1.5}
            fill={symbolTokens.ink}
            fillOpacity={0.62}
          />
          <line
            x1={0}
            x2={0}
            y1={-depth / 2 + inset * 1.4 + monitorHeight}
            y2={-depth / 2 + inset * 1.4 + monitorHeight + Math.min(4, depth * 0.06)}
            stroke={symbolTokens.ink}
            strokeOpacity={0.45}
            strokeWidth={1.2}
          />

          {detail === 2 ? (
            <>
              {/* Keyboard towards the front edge. */}
              <rect
                x={-width * 0.17}
                y={depth / 2 - inset * 1.2 - Math.max(2, depth * 0.11)}
                width={width * 0.34}
                height={Math.max(2, depth * 0.11)}
                rx={1.5}
                fill={symbolTokens.paper}
                stroke={symbolTokens.hairline}
                strokeWidth={0.85}
              />
              <DeskLegs width={width} depth={depth} inset={inset} size={legSize} />
              {options?.seatMarker ? (
                <path
                  d={describeSeatArc(depth / 2 + Math.min(14, width * 0.16), width)}
                  fill="none"
                  stroke={symbolTokens.faint}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
    </>
  );
}

/** A dashed arc just outside the front edge, hinting where the chair goes. */
function describeSeatArc(centerY: number, width: number) {
  const radius = Math.min(width * 0.22, 16);

  return `M ${-radius} ${centerY} A ${radius} ${radius} 0 0 0 ${radius} ${centerY}`;
}

function DeskLegs({
  width,
  depth,
  inset,
  size
}: {
  width: number;
  depth: number;
  inset: number;
  size: number;
}) {
  const positions = [
    { x: -width / 2 + inset, y: -depth / 2 + inset },
    { x: width / 2 - inset - size, y: -depth / 2 + inset },
    { x: -width / 2 + inset, y: depth / 2 - inset - size },
    { x: width / 2 - inset - size, y: depth / 2 - inset - size }
  ];

  return (
    <>
      {positions.map((position, index) => (
        <rect
          key={index}
          x={position.x}
          y={position.y}
          width={size}
          height={size}
          rx={1}
          fill="none"
          stroke={symbolTokens.faint}
          strokeWidth={0.9}
        />
      ))}
    </>
  );
}

function ChairSymbol({ width, depth, detail, tint, options }: FurnitureSymbolProps) {
  const isOffice = (options?.chair ?? "office") === "office";
  const backHeight = Math.max(2.5, depth * 0.17);
  const seatWidth = width * (isOffice ? 0.74 : 0.8);
  const seatDepth = depth * (isOffice ? 0.62 : 0.66);
  const seatTop = -depth / 2 + backHeight + Math.max(1, depth * 0.06);
  const radius = clampRadius(width, depth, isOffice ? 6 : 2);

  return (
    <>
      {isOffice && detail === 2 ? (
        <CasterBase width={width} depth={depth} />
      ) : null}

      <Body width={width} depth={depth} tint={tint} radius={radius} />

      {/* Backrest at the top edge — the chair's facing direction. */}
      <rect
        x={-width * 0.38}
        y={-depth / 2 + Math.max(1, depth * 0.05)}
        width={width * 0.76}
        height={backHeight}
        rx={Math.min(3, backHeight / 2)}
        fill={symbolTokens.ink}
        fillOpacity={0.42}
      />

      {detail === 0 ? null : (
        <>
          <Panel
            x={-seatWidth / 2}
            y={seatTop}
            width={seatWidth}
            depth={seatDepth}
            tint={symbolTokens.paper}
            opacity={0.8}
            radius={isOffice ? 4 : 2}
          />

          {detail === 2 ? (
            <>
              {/* Armrests. */}
              <rect
                x={-width / 2 + Math.max(1, width * 0.04)}
                y={seatTop}
                width={Math.max(1.5, width * 0.07)}
                height={seatDepth * 0.72}
                rx={1.5}
                fill={symbolTokens.hairline}
                fillOpacity={0.7}
              />
              <rect
                x={width / 2 - Math.max(1, width * 0.04) - Math.max(1.5, width * 0.07)}
                y={seatTop}
                width={Math.max(1.5, width * 0.07)}
                height={seatDepth * 0.72}
                rx={1.5}
                fill={symbolTokens.hairline}
                fillOpacity={0.7}
              />
            </>
          ) : null}
        </>
      )}
    </>
  );
}

/** Five-spoke caster base, drawn under the seat like a real plan symbol. */
function CasterBase({ width, depth }: { width: number; depth: number }) {
  const radius = Math.min(width, depth) / 2;

  return (
    <g stroke={symbolTokens.faint} strokeWidth={0.9} fill="none">
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;

        return (
          <line
            key={index}
            x1={0}
            y1={0}
            x2={Math.cos(angle) * radius}
            y2={Math.sin(angle) * radius}
          />
        );
      })}
      <circle cx={0} cy={0} r={radius * 0.2} />
    </g>
  );
}

function SofaSymbol({ width, depth, detail, tint, options }: FurnitureSymbolProps) {
  const seats = options?.seats ?? 3;
  const armWidth = Math.max(3, width * 0.075);
  const backDepth = Math.max(3, depth * 0.24);
  const inset = Math.max(1, Math.min(width, depth) * 0.03);
  const seatLeft = -width / 2 + armWidth;
  const seatWidth = width - armWidth * 2;
  const seatTop = -depth / 2 + backDepth;
  const seatDepth = depth - backDepth - inset;

  return (
    <>
      <Body width={width} depth={depth} tint={tint} radius={clampRadius(width, depth, 4)} />

      {/* Backrest along the top edge. */}
      <Panel
        x={-width / 2 + inset}
        y={-depth / 2 + inset}
        width={width - inset * 2}
        depth={backDepth - inset}
        tint={tint}
        opacity={0.45}
        radius={2}
      />

      {detail === 0 ? null : (
        <>
          {/* Armrests left and right. */}
          <Panel
            x={-width / 2 + inset}
            y={seatTop}
            width={armWidth - inset}
            depth={seatDepth}
            tint={tint}
            opacity={0.45}
            radius={2}
          />
          <Panel
            x={width / 2 - armWidth}
            y={seatTop}
            width={armWidth - inset}
            depth={seatDepth}
            tint={tint}
            opacity={0.45}
            radius={2}
          />

          {/* Seat cushions. */}
          {Array.from({ length: seats }, (_, index) => {
            const cushionWidth = seatWidth / seats;

            return (
              <Panel
                key={index}
                x={seatLeft + index * cushionWidth + inset * 0.5}
                y={seatTop}
                width={cushionWidth - inset}
                depth={seatDepth}
                tint={symbolTokens.paper}
                opacity={0.75}
                radius={2}
              />
            );
          })}
        </>
      )}
    </>
  );
}

function TableSymbol({ width, depth, detail, tint, options }: FurnitureSymbolProps) {
  const round = (options?.tableShape ?? "rect") === "round";
  const inset = Math.max(2, Math.min(width, depth) * 0.11);

  if (round) {
    const radius = Math.min(width, depth) / 2;

    return (
      <>
        <circle cx={0} cy={0} r={radius} fill={symbolTokens.paper} />
        <circle cx={0} cy={0} r={radius} fill={tint} fillOpacity={TINT_OPACITY} />
        <circle
          cx={0}
          cy={0}
          r={radius}
          fill="none"
          stroke={symbolTokens.line}
          strokeWidth={1.15}
        />
        {detail === 0 ? null : (
          <circle
            cx={0}
            cy={0}
            r={Math.max(1, radius - inset)}
            fill="none"
            stroke={symbolTokens.hairline}
            strokeWidth={0.9}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />
      {detail === 0 ? null : (
        <rect
          x={-width / 2 + inset}
          y={-depth / 2 + inset}
          width={Math.max(1, width - inset * 2)}
          height={Math.max(1, depth - inset * 2)}
          rx={2}
          fill="none"
          stroke={symbolTokens.hairline}
          strokeWidth={0.9}
        />
      )}
    </>
  );
}

function DresserSymbol({ width, depth, detail, tint }: FurnitureSymbolProps) {
  const inset = Math.max(1.5, Math.min(width, depth) * 0.09);
  const drawers = width > 90 ? 3 : 2;
  const drawerWidth = (width - inset * 2) / drawers;

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />

      {/* Back panel against the wall. */}
      <line
        x1={-width / 2 + inset * 0.6}
        x2={width / 2 - inset * 0.6}
        y1={-depth / 2 + inset * 0.7}
        y2={-depth / 2 + inset * 0.7}
        stroke={symbolTokens.hairline}
        strokeWidth={1}
      />

      {detail === 0
        ? null
        : Array.from({ length: drawers }, (_, index) => {
            const x = -width / 2 + inset + index * drawerWidth;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={-depth / 2 + inset * 1.5}
                  width={Math.max(1, drawerWidth - inset * 0.5)}
                  height={Math.max(1, depth - inset * 2.5)}
                  rx={1.5}
                  fill="none"
                  stroke={symbolTokens.faint}
                  strokeWidth={0.9}
                />
                {detail === 2 ? (
                  <line
                    x1={x + drawerWidth * 0.28}
                    x2={x + drawerWidth * 0.62}
                    y1={depth / 2 - inset * 1.5}
                    y2={depth / 2 - inset * 1.5}
                    stroke={symbolTokens.ink}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                    strokeWidth={1.4}
                  />
                ) : null}
              </g>
            );
          })}
    </>
  );
}

function BookshelfSymbol({ width, depth, detail, tint }: FurnitureSymbolProps) {
  const inset = Math.max(1.2, depth * 0.16);
  const bookTop = -depth / 2 + inset * 1.4;
  const bookHeight = Math.max(1, depth - inset * 2.4);

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />

      {/* Solid back panel — bookshelves always sit against a wall. */}
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={Math.max(1.5, inset)}
        fill={symbolTokens.ink}
        fillOpacity={0.42}
      />

      {detail === 0 ? null : (
        <>
          {/* Books along the open front. */}
          {buildBookTicks(width).map((tick, index) => (
            <line
              key={index}
              x1={tick}
              x2={tick}
              y1={bookTop}
              y2={bookTop + bookHeight}
              stroke={symbolTokens.hairline}
              strokeWidth={detail === 2 ? 1 : 0.8}
            />
          ))}
        </>
      )}
    </>
  );
}

/** Slightly uneven spacing so a shelf reads as books, not as a ruler. */
function buildBookTicks(width: number) {
  const usable = width * 0.88;
  const count = Math.max(2, Math.min(14, Math.round(usable / 7)));
  const step = usable / count;
  const offsets = [0, 0.18, -0.14, 0.09, -0.2, 0.12];

  return Array.from({ length: count - 1 }, (_, index) => {
    const jitter = offsets[index % offsets.length] * step;

    return -usable / 2 + step * (index + 1) + jitter;
  });
}

function TvSymbol({ width, depth, detail, tint }: FurnitureSymbolProps) {
  const inset = Math.max(1.2, depth * 0.16);
  const screenHeight = Math.max(2, depth * 0.2);

  return (
    <>
      <Body width={width} depth={depth} tint={tint} />

      {/* The panel itself: a wide, shallow bar along the back. */}
      <rect
        x={-width / 2 + inset}
        y={-depth / 2 + inset}
        width={Math.max(1, width - inset * 2)}
        height={screenHeight}
        rx={1}
        fill={symbolTokens.ink}
        fillOpacity={0.7}
      />

      {detail === 0 ? null : (
        <>
          {/* Stand, pointing into the room. */}
          <line
            x1={0}
            x2={0}
            y1={-depth / 2 + inset + screenHeight}
            y2={-depth / 2 + inset + screenHeight + Math.max(2, depth * 0.16)}
            stroke={symbolTokens.ink}
            strokeOpacity={0.5}
            strokeWidth={1.4}
          />
          {detail === 2 ? (
            <rect
              x={-width * 0.14}
              y={-depth / 2 + inset + screenHeight + Math.max(2, depth * 0.16)}
              width={width * 0.28}
              height={Math.max(1.5, depth * 0.1)}
              rx={1}
              fill={symbolTokens.hairline}
              fillOpacity={0.8}
            />
          ) : null}
        </>
      )}
    </>
  );
}

function LampSymbol({ width, depth, detail, tint }: FurnitureSymbolProps) {
  const radius = Math.min(width, depth) / 2;

  return (
    <>
      <circle cx={0} cy={0} r={radius} fill={symbolTokens.paper} />
      <circle cx={0} cy={0} r={radius} fill={tint} fillOpacity={TINT_OPACITY} />
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill="none"
        stroke={symbolTokens.line}
        strokeWidth={1.15}
      />
      {detail === 0 ? null : (
        <circle
          cx={0}
          cy={0}
          r={Math.max(0.8, radius * 0.3)}
          fill="none"
          stroke={symbolTokens.hairline}
          strokeWidth={1}
        />
      )}
      {detail === 2 ? (
        <g stroke={symbolTokens.faint} strokeWidth={0.85}>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2;

            return (
              <line
                key={index}
                x1={Math.cos(angle) * radius * 0.42}
                y1={Math.sin(angle) * radius * 0.42}
                x2={Math.cos(angle) * radius * 0.88}
                y2={Math.sin(angle) * radius * 0.88}
              />
            );
          })}
        </g>
      ) : null}
    </>
  );
}

function RugSymbol({ width, depth, detail, tint }: FurnitureSymbolProps) {
  const border = Math.max(2, Math.min(width, depth) * 0.09);

  return (
    <>
      {/* Deliberately lighter than solid furniture: soft fill, thin border. */}
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        rx={2}
        fill={tint}
        fillOpacity={0.16}
      />
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        rx={2}
        fill="none"
        stroke={symbolTokens.hairline}
        strokeWidth={1}
      />
      {detail === 0 ? null : (
        <rect
          x={-width / 2 + border}
          y={-depth / 2 + border}
          width={Math.max(1, width - border * 2)}
          height={Math.max(1, depth - border * 2)}
          rx={1.5}
          fill="none"
          stroke={symbolTokens.faint}
          strokeWidth={0.85}
        />
      )}
      {detail === 2 ? (
        <g stroke={symbolTokens.faint} strokeWidth={0.7} strokeOpacity={0.9}>
          {buildRugFringe(width, depth, border).map((line, index) => (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
            />
          ))}
        </g>
      ) : null}
    </>
  );
}

/** Short fringe ticks on the two short ends — restrained, not decorative. */
function buildRugFringe(width: number, depth: number, border: number) {
  const count = Math.max(2, Math.min(12, Math.round(width / 12)));
  const step = (width - border * 2) / count;

  return Array.from({ length: count + 1 }, (_, index) => {
    const x = -width / 2 + border + index * step;

    return [
      {
        x1: x,
        y1: -depth / 2 + border * 0.25,
        x2: x,
        y2: -depth / 2 + border * 0.75
      },
      {
        x1: x,
        y1: depth / 2 - border * 0.75,
        x2: x,
        y2: depth / 2 - border * 0.25
      }
    ];
  }).flat();
}

const symbolRegistry: Record<
  FurnitureSymbol,
  (props: FurnitureSymbolProps) => React.ReactElement
> = {
  bed: BedSymbol,
  desk: DeskSymbol,
  chair: ChairSymbol,
  sofa: SofaSymbol,
  table: TableSymbol,
  dresser: DresserSymbol,
  bookshelf: BookshelfSymbol,
  rug: RugSymbol,
  tv: TvSymbol,
  lamp: LampSymbol
};

/** Draws any catalog piece; unknown symbols fall back to a plain body. */
export function FurnitureBlueprint({
  symbol,
  ...props
}: FurnitureSymbolProps & { symbol: FurnitureSymbol }) {
  const Symbol = symbolRegistry[symbol];

  if (!Symbol) {
    return <Body width={props.width} depth={props.depth} tint={props.tint} />;
  }

  return <Symbol {...props} />;
}

/**
 * Detail falls away as a piece gets small on screen, so a 15 px object is a
 * clean silhouette instead of a smudge of meaningless strokes.
 */
export function detailForSize(width: number, depth: number): DetailLevel {
  const smallest = Math.min(width, depth);
  const area = width * depth;

  if (smallest < 16 || area < 900) {
    return 0;
  }

  if (smallest < 34 || area < 3400) {
    return 1;
  }

  return 2;
}
