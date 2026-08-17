"use client";

import { DrawablyInput } from "drawably/react";
import { useRef, useState } from "react";
import { clamp, parseLengthToMeters } from "@/lib/units";

/**
 * A compact numeric field for real-world values.
 *
 * The label doubles as a scrubber: drag it sideways to adjust, the way
 * professional design tools do. Typed input accepts "152 cm", "1.52 m" or a
 * bare number, but the value handed back is always in metres.
 */
export function DimensionInput({
  label,
  value,
  min = 0,
  max = 100,
  step = 0.01,
  disabled = false,
  suffix = "m",
  onCommit,
  onScrubStart
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  onCommit: (value: number) => void;
  onScrubStart?: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ pointerId: number; startX: number; startValue: number } | null>(
    null
  );

  const display = draft ?? value.toFixed(2);

  function commit(text: string) {
    const parsed = parseLengthToMeters(text);

    if (parsed !== null) {
      // Mark the start of the edit so a typed value is one undo step.
      onScrubStart?.();
      onCommit(clamp(parsed, min, max));
    }

    setDraft(null);
  }

  return (
    <label className="dimension-field">
      <span
        className={disabled ? "dimension-label" : "dimension-label is-scrubbable"}
        onPointerDown={(event) => {
          if (disabled) {
            return;
          }

          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startValue: value
          };
          onScrubStart?.();
        }}
        onPointerMove={(event) => {
          const active = scrub.current;

          if (!active || active.pointerId !== event.pointerId) {
            return;
          }

          // One pixel of travel is one step; Shift slows it down for precision.
          const multiplier = event.shiftKey ? 0.25 : 1;
          const delta = (event.clientX - active.startX) * step * multiplier;

          onCommit(
            clamp(Math.round((active.startValue + delta) / step) * step, min, max)
          );
        }}
        onPointerUp={(event) => {
          if (scrub.current?.pointerId === event.pointerId) {
            scrub.current = null;
          }
        }}
      >
        {label}
        <span className="dimension-suffix">{suffix}</span>
      </span>
      <DrawablyInput
        className="text-sm"
        disabled={disabled}
        inputMode="decimal"
        value={display}
        onBlur={(event) => commit(event.target.value)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

/** Degrees behave differently enough from lengths to warrant their own field. */
export function AngleInput({
  label,
  value,
  onCommit,
  onScrubStart
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  onScrubStart?: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ pointerId: number; startX: number; startValue: number } | null>(
    null
  );

  function commit(text: string) {
    const parsed = Number(text.replace(/[^\d.-]/g, ""));

    if (Number.isFinite(parsed)) {
      onScrubStart?.();
      onCommit(((Math.round(parsed) % 360) + 360) % 360);
    }

    setDraft(null);
  }

  return (
    <label className="dimension-field">
      <span
        className="dimension-label is-scrubbable"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startValue: value
          };
          onScrubStart?.();
        }}
        onPointerMove={(event) => {
          const active = scrub.current;

          if (!active || active.pointerId !== event.pointerId) {
            return;
          }

          const delta = event.clientX - active.startX;

          onCommit(((Math.round(active.startValue + delta) % 360) + 360) % 360);
        }}
        onPointerUp={(event) => {
          if (scrub.current?.pointerId === event.pointerId) {
            scrub.current = null;
          }
        }}
      >
        {label}
        <span className="dimension-suffix">°</span>
      </span>
      <DrawablyInput
        className="text-sm"
        inputMode="numeric"
        value={draft ?? String(Math.round(value))}
        onBlur={(event) => commit(event.target.value)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
