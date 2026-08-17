import { roughCircle, roughLine, roughRoundedRect } from "drawably";

/**
 * A floor plan drawn with drawably's own rough helpers, so the illustration
 * shares a hand with the controls around it.
 *
 * Every seed here is fixed. These paths are generated during render, and a
 * random seed would produce different geometry on the server and the client —
 * a hydration mismatch. The controls can afford a fresh sketch per mount
 * because they draw in an effect, after hydration; this cannot.
 */

const wall = { seed: 4821, roughness: 1.15 };
const furniture = { seed: 1907, roughness: 0.95 };
const detail = { seed: 3344, roughness: 0.8 };

// An L-shaped room, traced corner to corner.
const corners: Array<[number, number]> = [
  [26, 26],
  [250, 26],
  [250, 108],
  [150, 108],
  [150, 186],
  [26, 186]
];

const walls = corners.map((point, index) => {
  const next = corners[(index + 1) % corners.length];

  return roughLine(point[0], point[1], next[0], next[1], {
    ...wall,
    seed: wall.seed + index * 17
  });
});

const sofa = roughRoundedRect(44, 44, 74, 30, 6, furniture);
const table = roughRoundedRect(48, 104, 52, 52, 4, {
  ...furniture,
  seed: furniture.seed + 41
});
const bed = roughRoundedRect(170, 44, 62, 46, 5, {
  ...furniture,
  seed: furniture.seed + 83
});
const rug = roughCircle(196, 148, 26, detail);

export function RoomSketch({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 276 212"
    >
      <g
        stroke="var(--foreground)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {walls.map((d, index) => (
          <path key={index} d={d} strokeWidth={2.2} />
        ))}
        <path d={sofa} strokeWidth={1.4} />
        <path d={table} strokeWidth={1.4} />
        <path d={bed} strokeWidth={1.4} />
        <path
          d={rug}
          opacity={0.55}
          strokeDasharray="4 5"
          strokeWidth={1.2}
        />
      </g>
    </svg>
  );
}
