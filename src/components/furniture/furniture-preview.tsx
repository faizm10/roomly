import { FurnitureBlueprint } from "@/components/furniture/blueprint-symbols";
import type { FurnitureDefinition } from "@/types/furniture";

/**
 * The same symbols the canvas draws, scaled to fit a card. Using the real
 * blueprint instead of a generic icon means the library preview and the placed
 * object are recognisably the same object.
 */
export function FurniturePreview({
  definition,
  size = 64,
  padding = 6,
  className
}: {
  definition: FurnitureDefinition;
  size?: number;
  padding?: number;
  className?: string;
}) {
  const box = size - padding * 2;
  const ratio = definition.defaultWidth / definition.defaultDepth;
  const width = ratio >= 1 ? box : box * ratio;
  const depth = ratio >= 1 ? box / ratio : box;

  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <g transform={`translate(${size / 2} ${size / 2})`}>
        {/* Always full detail: a card is small, but telling a dresser from a
            bookshelf is the entire job of a preview. */}
        <FurnitureBlueprint
          depth={depth}
          detail={2}
          options={definition.symbolOptions}
          symbol={definition.symbol}
          tint={definition.color}
          width={width}
        />
      </g>
    </svg>
  );
}
