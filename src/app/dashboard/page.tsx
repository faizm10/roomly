import type { Metadata } from "next";
import { RoomPlannerApp } from "@/components/editor/room-planner-app";

export const metadata: Metadata = {
  title: "Planner · Roomly",
  description: "Sketch and furnish real rooms from a shared room model."
};

export default function DashboardPage() {
  return <RoomPlannerApp />;
}
