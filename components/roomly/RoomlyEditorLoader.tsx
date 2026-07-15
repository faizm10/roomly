"use client";

import dynamic from "next/dynamic";

const RoomlyEditor = dynamic(
  () => import("@/components/roomly/RoomlyEditor").then((module) => module.RoomlyEditor),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-dvh place-items-center bg-[#f6f0e8] text-sm font-bold text-[#65745f]">
        Preparing the room editor...
      </div>
    ),
  },
);

export function RoomlyEditorLoader() {
  return <RoomlyEditor />;
}
