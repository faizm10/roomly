"use client";

import { DrawablyButton } from "drawably/react";
import { Copy, RotateCw, Trash2 } from "lucide-react";
import {
  AngleInput,
  DimensionInput
} from "@/components/inspector/dimension-input";
import { FurniturePreview } from "@/components/furniture/furniture-preview";
import { getMaterialPreset, materialPresets } from "@/features/furniture/materials";
import type { Point } from "@/lib/geometry/points";
import { distanceToNearestWall } from "@/lib/geometry/snapping";
import { formatDistance, formatFootprint } from "@/lib/units";
import {
  furnitureSizeBounds,
  type FurnitureDefinition
} from "@/types/furniture";
import type { FurnitureInstance } from "@/types/room";

/**
 * Compact, section-based properties for the selected piece. Small headings and
 * hairline separators rather than a stack of cards.
 */
export function FurnitureProperties({
  item,
  definition,
  roomPolygon,
  onChange,
  onScrubStart,
  onDuplicate,
  onRemove
}: {
  item: FurnitureInstance;
  definition?: FurnitureDefinition;
  roomPolygon: Point[];
  onChange: (
    updates: Partial<Omit<FurnitureInstance, "id" | "definitionId">>
  ) => void;
  onScrubStart: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const name = definition?.name ?? "Furniture";
  const resizable = definition?.resizable ?? true;
  const bounds = furnitureSizeBounds(definition);
  const wallGap = distanceToNearestWall(item, roomPolygon);
  const materialId = item.material?.id ?? "";

  return (
    <div className="properties">
      <header className="properties-header">
        {definition ? (
          <span className="properties-thumb">
            <FurniturePreview definition={definition} size={40} padding={3} />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
            {formatFootprint(item.width, item.depth)}
          </span>
        </span>
      </header>

      <PropertySection title="Transform">
        <div className="properties-row">
          <DimensionInput
            label="X"
            max={100}
            min={-100}
            value={item.x}
            onCommit={(value) => onChange({ x: value })}
            onScrubStart={onScrubStart}
          />
          <DimensionInput
            label="Z"
            max={100}
            min={-100}
            value={item.z}
            onCommit={(value) => onChange({ z: value })}
            onScrubStart={onScrubStart}
          />
        </div>
        <div className="properties-row">
          <AngleInput
            label="Rotation"
            value={item.rotation}
            onCommit={(value) => onChange({ rotation: value })}
            onScrubStart={onScrubStart}
          />
          <button
            aria-label="Rotate 90 degrees"
            className="icon-action-button self-end"
            type="button"
            onClick={() => {
              onScrubStart();
              onChange({ rotation: (item.rotation + 90) % 360 });
            }}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </PropertySection>

      <PropertySection title="Size">
        <div className="properties-row">
          <DimensionInput
            disabled={!resizable}
            label="W"
            max={bounds.maxWidth}
            min={bounds.minWidth}
            value={item.width}
            onCommit={(value) => onChange({ width: value })}
            onScrubStart={onScrubStart}
          />
          <DimensionInput
            disabled={!resizable}
            label="D"
            max={bounds.maxDepth}
            min={bounds.minDepth}
            value={item.depth}
            onCommit={(value) => onChange({ depth: value })}
            onScrubStart={onScrubStart}
          />
        </div>
        <DimensionInput
          label="H"
          max={3}
          min={0.01}
          value={item.height}
          onCommit={(value) => onChange({ height: value })}
          onScrubStart={onScrubStart}
        />
      </PropertySection>

      <PropertySection title="Appearance">
        <label className="dimension-field">
          <span className="dimension-label">Material</span>
          <span className="field-shell">
            <select
              aria-label="Material"
              className="properties-select"
              value={materialId}
              onChange={(event) => {
                onScrubStart();
                const preset = getMaterialPreset(event.target.value);

                onChange({ material: preset ? { ...preset } : undefined });
              }}
            >
              <option value="">None</option>
              {materialPresets.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="dimension-field">
          <span className="dimension-label">Colour</span>
          <span className="field-shell color-field">
            <input
              aria-label="Furniture colour"
              type="color"
              value={item.color ?? "#9ca39d"}
              onChange={(event) => {
                onScrubStart();
                onChange({ color: event.target.value });
              }}
            />
            <span className="text-xs text-[var(--muted)]">
              {(item.color ?? "#9ca39d").toUpperCase()}
            </span>
          </span>
        </label>
      </PropertySection>

      <PropertySection title="Placement">
        <div className="properties-readout">
          <span>Distance from wall</span>
          <span
            className={
              wallGap !== null && wallGap < 0
                ? "properties-readout-value is-warning"
                : "properties-readout-value"
            }
          >
            {wallGap === null
              ? "—"
              : wallGap < 0
                ? "Outside room"
                : formatDistance(wallGap)}
          </span>
        </div>
      </PropertySection>

      <div className="properties-actions">
        <DrawablyButton
          className="w-full"
          tone="neutral"
          type="button"
          onClick={onDuplicate}
        >
          <Copy size={14} />
          Duplicate
        </DrawablyButton>
        <DrawablyButton
          className="w-full"
          tone="danger"
          type="button"
          onClick={onRemove}
        >
          <Trash2 size={14} />
          Delete
        </DrawablyButton>
      </div>
    </div>
  );
}

function PropertySection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="properties-section">
      <h3 className="properties-section-title">{title}</h3>
      {children}
    </section>
  );
}
