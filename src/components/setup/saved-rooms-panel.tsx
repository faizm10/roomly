"use client";

import { FolderOpen, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { Room } from "@/types/room";

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function roomSummary(room: Room) {
  const furniture = room.furniture.length;
  const vertices = room.vertices.length;

  return `${vertices} pts · ${furniture} furniture`;
}

export function SavedRoomsPanel({
  compact = false
}: {
  compact?: boolean;
}) {
  const room = useEditorStore((state) => state.room);
  const savedRooms = useEditorStore((state) => state.savedRooms);
  const loadRoom = useEditorStore((state) => state.loadRoom);
  const deleteSavedRoom = useEditorStore((state) => state.deleteSavedRoom);

  if (savedRooms.length === 0) {
    return (
      <section
        className={
          compact
            ? "space-y-2"
            : "space-y-3 border-t border-[var(--line)] pt-5"
        }
      >
        {!compact ? (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen size={15} />
            Saved rooms
          </div>
        ) : null}
        <p className="text-xs leading-5 text-[var(--muted)]">
          No saved rooms yet. Edit a room and it will autosave here.
        </p>
      </section>
    );
  }

  return (
    <section
      className={
        compact ? "space-y-2" : "space-y-3 border-t border-[var(--line)] pt-5"
      }
    >
      {!compact ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen size={15} />
            Saved rooms
          </div>
          <span className="metric-chip">{savedRooms.length}</span>
        </div>
      ) : null}

      <ul className="space-y-2">
        {savedRooms.map((saved) => {
          const active = saved.id === room.id;

          return (
            <li
              key={saved.id}
              className={`rounded-lg border px-3 py-2.5 ${
                active
                  ? "border-[var(--accent)] bg-[#eef5f2]"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  className="min-w-0 flex-1 text-left"
                  type="button"
                  onClick={() => void loadRoom(saved.id)}
                >
                  <div className="truncate text-sm font-semibold">
                    {saved.name || "Untitled room"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {roomSummary(saved)} · {formatUpdatedAt(saved.updatedAt)}
                  </div>
                </button>
                <button
                  aria-label={`Delete ${saved.name}`}
                  className="panel-toggle shrink-0 text-[#8d3424]"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteSavedRoom(saved.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {active ? (
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                  Open now
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
