"use client";

import { DraftingCompass, Grid2X2, MoveRight } from "lucide-react";
import { useState } from "react";
import {
  BackgroundBoxes,
  BackgroundRippleEffect,
  ImagesBadge,
  materialPreviewImages
} from "@/components/ui/aceternity-effects";
import { useEditorStore } from "@/stores/editor-store";

export function RoomSetupPanel() {
  const createSimpleRoom = useEditorStore((state) => state.createSimpleRoom);
  const createLShapedRoom = useEditorStore((state) => state.createLShapedRoom);
  const [width, setWidth] = useState(4.2);
  const [depth, setDepth] = useState(3.4);
  const [height, setHeight] = useState(2.6);
  const previewImages = materialPreviewImages();

  return (
    <div className="relative h-full overflow-auto px-8 py-7">
      <BackgroundBoxes className="pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-[1120px] grid-cols-[minmax(420px,1fr)_360px] gap-10">
        <div>
          <div className="mb-7 flex items-start justify-between gap-6">
            <div>
              <div className="panel-label mb-2">Room Setup</div>
              <h1 className="text-[28px] font-semibold leading-tight">
                Create a room
              </h1>
              <p className="mt-3 max-w-[600px] text-sm leading-6 text-[var(--muted)]">
                Start with exact dimensions or load an irregular room to verify
                the shared polygon model and blueprint renderer.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="metric-chip">
                <Grid2X2 size={13} />
                meters
              </span>
              <ImagesBadge text="Material ideas" images={previewImages} />
            </div>
          </div>

          <form
            className="border-t border-[var(--line)] pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              createSimpleRoom(width, depth, height);
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Simple Room</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Rectangular rooms are the fastest path into Blueprint.
                </div>
              </div>
              <DraftingCompass className="text-[var(--accent)]" size={18} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricField label="Width" value={width} onChange={setWidth} />
              <MetricField label="Length" value={depth} onChange={setDepth} />
              <MetricField label="Height" value={height} onChange={setHeight} />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button className="primary-button" type="submit">
                Generate Blueprint
                <MoveRight size={15} />
              </button>
              <div className="text-xs text-[var(--muted)]">
                {width.toFixed(1)} m × {depth.toFixed(1)} m floor ·{" "}
                {height.toFixed(1)} m walls
              </div>
            </div>
          </form>

          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-5">
            <SetupMetric label="Area" value={`${(width * depth).toFixed(1)} m²`} />
            <SetupMetric
              label="Perimeter"
              value={`${(width * 2 + depth * 2).toFixed(1)} m`}
            />
            <SetupMetric label="Vertices" value="4" />
          </div>
        </div>

        <aside className="border-t border-[var(--line)] pt-5">
          <div className="mb-5">
            <div className="text-base font-semibold">Custom Polygon</div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              Use this sample to inspect irregular-room editing.
            </div>
          </div>

          <div className="relative mb-5 overflow-hidden rounded-lg border border-[#d7d9d2] bg-white">
            <div className="absolute right-3 top-3 z-10">
              <ImagesBadge text="Room palette" images={previewImages} />
            </div>
            <div className="border-b border-[#e5e6df] bg-[#fafaf7] px-3 py-2 text-xs font-medium text-[var(--muted)]">
              L-shaped room preview
            </div>
            <div className="relative h-52 p-5">
              <BackgroundRippleEffect
                cellSize={24}
                className="absolute inset-5"
                cols={12}
                rows={7}
              />
              <svg viewBox="0 0 220 150" className="relative h-full w-full">
                <defs>
                  <pattern
                    id="setup-grid"
                    width="12"
                    height="12"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M12 0H0V12"
                      fill="none"
                      stroke="#e3e5df"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="220" height="150" fill="url(#setup-grid)" />
                <path
                  d="M30 28H190V76H122V122H30Z"
                  fill="#f7f4eb"
                  stroke="#1f4f47"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
                <path
                  d="M30 28H190V76H122V122H30Z"
                  fill="none"
                  stroke="#8aa49c"
                  strokeDasharray="5 5"
                  strokeWidth="2"
                />
                <text x="95" y="22" fill="#686d68" fontSize="10">
                  5.2 m
                </text>
                <text x="196" y="58" fill="#686d68" fontSize="10">
                  2.0 m
                </text>
              </svg>
            </div>
          </div>

          <button
            className="secondary-button w-full"
            type="button"
            onClick={createLShapedRoom}
          >
            Load L-shaped room
          </button>
        </aside>
      </div>
    </div>
  );
}

function MetricField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
      {label}
      <span className="field-shell">
        <input
          className="text-sm"
          min="0.5"
          step="0.1"
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pr-2 text-[11px] text-[var(--muted)]">m</span>
      </span>
    </label>
  );
}

function SetupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--line)] pl-3">
      <div className="text-[11px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
