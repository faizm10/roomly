"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FurniturePreview } from "@/components/furniture/furniture-preview";
import {
  furnitureGroups,
  searchFurniture
} from "@/features/furniture/catalog";
import {
  FURNITURE_DRAG_MIME,
  useFurnitureDragStore
} from "@/features/furniture/drag-state";
import { formatFootprint } from "@/lib/units";
import type { FurnitureDefinition, FurnitureGroup } from "@/types/furniture";

type ActiveGroup = FurnitureGroup | "All";

const groupTabs: ActiveGroup[] = ["All", ...furnitureGroups];

/**
 * An asset browser, not a shop. Every card shows the real blueprint symbol at
 * miniature scale so what you drag is what you get.
 */
export function FurnitureLibrary({
  onAdd
}: {
  onAdd: (definitionId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ActiveGroup>("All");
  const results = useMemo(() => searchFurniture(query, group), [group, query]);

  // Only section the list when the user is actually browsing everything.
  const sections = useMemo(() => {
    if (group !== "All" || query.trim().length > 0) {
      return [{ title: null, items: results }];
    }

    return furnitureGroups
      .map((name) => ({
        title: name as string | null,
        items: results.filter((definition) => definition.group === name)
      }))
      .filter((section) => section.items.length > 0);
  }, [group, query, results]);

  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Furniture</div>
        <span className="text-[11px] text-[var(--muted)]">
          {results.length} item{results.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="library-search">
        <Search size={14} />
        <input
          aria-label="Search furniture"
          placeholder="Search furniture..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className="library-search-clear"
            type="button"
            onClick={() => setQuery("")}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div className="library-tabs" role="tablist">
        {groupTabs.map((tab) => (
          <button
            key={tab}
            aria-selected={group === tab}
            className="library-tab"
            data-active={group === tab}
            role="tab"
            type="button"
            onClick={() => setGroup(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="library-empty">
          <div className="text-sm font-medium text-[var(--foreground)]">
            No furniture found
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Try another search.</p>
        </div>
      ) : (
        <div key={`${group}-${query}`} className="library-results">
          {sections.map((section, index) => (
            <div key={section.title ?? `section-${index}`}>
              {section.title ? (
                <div className="library-section-title">{section.title}</div>
              ) : null}
              <div className="library-grid">
                {section.items.map((definition) => (
                  <FurnitureCard
                    key={definition.id}
                    definition={definition}
                    onAdd={onAdd}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-4 text-[var(--muted)]">
        Drag a piece onto the room, or click to drop it in the centre.
      </p>
    </section>
  );
}

function FurnitureCard({
  definition,
  onAdd
}: {
  definition: FurnitureDefinition;
  onAdd: (definitionId: string) => void;
}) {
  const startDrag = useFurnitureDragStore((state) => state.startDrag);
  const endDrag = useFurnitureDragStore((state) => state.endDrag);

  return (
    <button
      className="furniture-card"
      draggable
      title={`${definition.name} · ${formatFootprint(
        definition.defaultWidth,
        definition.defaultDepth
      )}`}
      type="button"
      onClick={() => onAdd(definition.id)}
      onDragEnd={endDrag}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(FURNITURE_DRAG_MIME, definition.id);
        startDrag(definition.id);
      }}
    >
      <span className="furniture-card-preview">
        <FurniturePreview definition={definition} size={58} />
      </span>
      <span className="furniture-card-name">{definition.name}</span>
      <span className="furniture-card-size">
        {formatFootprint(definition.defaultWidth, definition.defaultDepth)}
      </span>
    </button>
  );
}
