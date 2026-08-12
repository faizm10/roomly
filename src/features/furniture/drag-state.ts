"use client";

import { create } from "zustand";

/**
 * Tracks the piece being dragged out of the library.
 *
 * The HTML drag-and-drop API hides `dataTransfer` payloads during `dragover`,
 * so the canvas cannot ask what is being dragged while it draws the preview.
 * Keeping the in-flight definition here lets both sides read it; the drop
 * itself still carries the id on `dataTransfer` so the interaction degrades
 * sensibly if this state is ever missed.
 */
interface FurnitureDragState {
  definitionId: string | null;
  startDrag: (definitionId: string) => void;
  endDrag: () => void;
}

export const FURNITURE_DRAG_MIME = "application/x-furniture-definition";

export const useFurnitureDragStore = create<FurnitureDragState>((set) => ({
  definitionId: null,
  startDrag: (definitionId) => set({ definitionId }),
  endDrag: () => set({ definitionId: null })
}));
