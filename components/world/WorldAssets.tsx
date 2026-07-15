"use client";

/**
 * Hand-illustrated SVG assets for the living world.
 * All animation is pure CSS (keyframes defined in globals.css) so dozens of
 * instances stay cheap. Sizing is handled by the parent — every asset fills
 * its container via viewBox.
 */

export function HouseAsset({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-[0_6px_10px_rgba(120,100,80,0.25)]">
      {/* chimney smoke */}
      <g>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={72}
            cy={18}
            r={4}
            fill="#cbd5e1"
            style={{ animation: `sw-smoke 3s ease-out ${i * 1}s infinite` }}
          />
        ))}
      </g>
      {/* chimney */}
      <rect x={67} y={16} width={10} height={18} rx={2} fill="#b0736b" />
      {/* body */}
      <rect x={18} y={42} width={64} height={44} rx={7} fill="#fdf1dc" stroke="#e8d5b5" strokeWidth={2} />
      {/* roof */}
      <path d="M12 46 L50 14 L88 46 Q88 50 84 50 L16 50 Q12 50 12 46 Z" fill="#e8837a" />
      <path d="M12 46 L50 14 L88 46" fill="none" stroke="#d96c62" strokeWidth={3} strokeLinecap="round" />
      {/* door */}
      <g style={{ transformOrigin: "43px 86px", transform: active ? "skewY(-8deg) translateX(3px)" : undefined, transition: "transform 180ms ease" }}>
        <rect x={43} y={60} width={14} height={26} rx={6} fill={active ? "#a96f49" : "#c98d5f"} />
        <circle cx={53} cy={74} r={1.6} fill="#8a5a34" />
      </g>
      {/* windows (blinking) */}
      <rect x={25} y={56} width={12} height={12} rx={3.5} fill={active ? "#fff0a8" : "#ffe9a8"} stroke="#e3c56e" strokeWidth={1.5} style={{ animation: active ? "sw-window-glow 1.6s ease-in-out infinite" : "sw-blink 5s infinite" }} />
      <rect x={63} y={56} width={12} height={12} rx={3.5} fill={active ? "#fff0a8" : "#ffe9a8"} stroke="#e3c56e" strokeWidth={1.5} style={{ animation: active ? "sw-window-glow 1.6s 0.3s ease-in-out infinite" : "sw-blink 7s 1.2s infinite" }} />
      {active && (
        <path d="M45 86 Q50 78 55 86 Z" fill="#ffd36a" opacity={0.55} />
      )}
    </svg>
  );
}

export function TreeAsset() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-[0_5px_8px_rgba(90,120,80,0.25)]">
      {/* trunk */}
      <path d="M46 96 Q48 74 47 62 L53 62 Q52 74 54 96 Z" fill="#a97d54" />
      {/* swaying crown */}
      <g style={{ animation: "sw-sway 4s ease-in-out infinite", transformOrigin: "50px 70px" }}>
        <circle cx={50} cy={38} r={26} fill="#8fce87" />
        <circle cx={32} cy={50} r={18} fill="#7cbf74" />
        <circle cx={68} cy={50} r={18} fill="#a2d99a" />
        <circle cx={50} cy={54} r={20} fill="#8fce87" />
        {/* leaf highlights */}
        <circle cx={42} cy={32} r={3.5} fill="#c4ecba" style={{ animation: "sw-twinkle 3s infinite" }} />
        <circle cx={60} cy={42} r={3} fill="#c4ecba" style={{ animation: "sw-twinkle 4s 1s infinite" }} />
        <circle cx={36} cy={48} r={2.5} fill="#c4ecba" style={{ animation: "sw-twinkle 3.5s 0.5s infinite" }} />
      </g>
    </svg>
  );
}

export function CafeAsset() {
  return (
    <svg viewBox="0 0 110 100" className="h-full w-full overflow-visible drop-shadow-[0_6px_10px_rgba(120,100,80,0.25)]">
      {/* steam above the cup sign */}
      <g>
        {[0, 1].map((i) => (
          <path
            key={i}
            d="M55 20 q3 -4 0 -8"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ animation: `sw-steam 2.4s ease-out ${i * 1.2}s infinite` }}
          />
        ))}
      </g>
      {/* body */}
      <rect x={14} y={44} width={82} height={42} rx={7} fill="#fff4ea" stroke="#eeddca" strokeWidth={2} />
      {/* awning */}
      <path d="M10 44 Q10 34 20 34 L90 34 Q100 34 100 44 L100 48 L10 48 Z" fill="#f2a65a" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={14 + i * 21} y={34} width={10.5} height={14} rx={2} fill="#fbd0a0" />
      ))}
      {/* hanging cup sign */}
      <g style={{ animation: "sw-sway 3.5s ease-in-out infinite", transformOrigin: "55px 26px" }}>
        <circle cx={55} cy={26} r={9} fill="#fff" stroke="#d9c6b0" strokeWidth={2} />
        <text x={55} y={30} textAnchor="middle" fontSize={10}>☕</text>
      </g>
      {/* door + window */}
      <rect x={26} y={58} width={16} height={28} rx={6} fill="#b98a62" />
      <rect x={56} y={58} width={26} height={16} rx={4} fill="#ffeec9" stroke="#e6cf9a" strokeWidth={1.5} style={{ animation: "sw-blink 6s infinite" }} />
      {/* CAFE lettering */}
      <text x={55} y={31} textAnchor="middle" fontSize={0}>cafe</text>
    </svg>
  );
}

export function RiverAsset() {
  return (
    <svg viewBox="0 0 200 60" className="h-full w-full overflow-visible" preserveAspectRatio="none">
      <path
        d="M0 30 Q 30 12 60 28 T 120 30 T 200 26 L 200 46 Q 160 58 120 46 T 60 48 T 0 46 Z"
        fill="#a6d8f0"
        opacity={0.9}
      />
      <path
        d="M0 30 Q 30 12 60 28 T 120 30 T 200 26 L 200 46 Q 160 58 120 46 T 60 48 T 0 46 Z"
        fill="none"
        stroke="#8ccae8"
        strokeWidth={2}
      />
      {/* flowing ripples */}
      {[
        "M14 34 q 10 -4 20 0",
        "M70 38 q 10 -4 20 0",
        "M130 34 q 10 -4 20 0",
        "M164 40 q 8 -3 16 0",
        "M40 42 q 8 -3 16 0",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#f0faff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 6"
          style={{ animation: `sw-flow 1.6s linear ${i * 0.3}s infinite` }}
        />
      ))}
    </svg>
  );
}

export function RoadAsset() {
  return (
    <svg viewBox="0 0 200 44" className="h-full w-full overflow-visible" preserveAspectRatio="none">
      <path
        d="M0 22 Q 50 6 100 22 T 200 20 L 200 36 Q 150 48 100 36 T 0 38 Z"
        fill="#e3d3bc"
      />
      <path
        d="M0 22 Q 50 6 100 22 T 200 20 L 200 36 Q 150 48 100 36 T 0 38 Z"
        fill="none"
        stroke="#d4c1a5"
        strokeWidth={2}
      />
      {/* paving stones */}
      {[18, 48, 80, 112, 144, 176].map((x, i) => (
        <ellipse key={i} cx={x} cy={26 + (i % 2 === 0 ? -3 : 3)} rx={7} ry={3.5} fill="#d8c6ab" />
      ))}
    </svg>
  );
}

/** A cute round villager. Body color varies per villager. */
export function VillagerSprite({
  color,
  walking,
  waving,
}: {
  color: string;
  walking: boolean;
  waving: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 52"
      className="h-full w-full overflow-visible drop-shadow-[0_3px_4px_rgba(80,70,60,0.3)]"
      style={walking ? { animation: "sw-bob 0.45s ease-in-out infinite" } : undefined}
    >
      {/* legs */}
      <g>
        <rect x={14} y={40} width={5} height={10} rx={2.5} fill="#7a6a5c" style={walking ? { animation: "sw-hop 0.45s ease-in-out infinite" } : undefined} />
        <rect x={21} y={40} width={5} height={10} rx={2.5} fill="#7a6a5c" style={walking ? { animation: "sw-hop 0.45s 0.22s ease-in-out infinite" } : undefined} />
      </g>
      {/* body */}
      <path d="M9 30 Q9 20 20 20 Q31 20 31 30 L31 38 Q31 43 26 43 L14 43 Q9 43 9 38 Z" fill={color} />
      {/* waving arm */}
      <rect
        x={29}
        y={24}
        width={4.5}
        height={12}
        rx={2.25}
        fill={color}
        style={{
          transformOrigin: "31px 26px",
          animation: waving ? "sw-wave 1.2s ease-in-out infinite" : undefined,
        }}
      />
      <rect x={6.5} y={24} width={4.5} height={12} rx={2.25} fill={color} />
      {/* head */}
      <circle cx={20} cy={12} r={9.5} fill="#ffe3c7" />
      {/* hair tuft */}
      <path d="M13 8 Q16 2 20 3.5 Q24 2 27 8 Q24 5.5 20 6 Q16 5.5 13 8 Z" fill="#8a6a4f" />
      {/* face */}
      <circle cx={16.5} cy={12} r={1.3} fill="#4a3f35" />
      <circle cx={23.5} cy={12} r={1.3} fill="#4a3f35" />
      <path d="M17.5 16 Q20 18 22.5 16" fill="none" stroke="#4a3f35" strokeWidth={1.2} strokeLinecap="round" />
      {/* blush */}
      <circle cx={13.5} cy={14.5} r={1.6} fill="#ffb8a8" opacity={0.7} />
      <circle cx={26.5} cy={14.5} r={1.6} fill="#ffb8a8" opacity={0.7} />
    </svg>
  );
}
