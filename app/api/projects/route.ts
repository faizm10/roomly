import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { RoomlyDesign } from "@/lib/roomly";

export async function POST(request: Request) {
  const design = (await request.json().catch(() => null)) as RoomlyDesign | null;

  if (!design?.id || !design.roomImage) {
    return NextResponse.json({ error: "Design payload is incomplete." }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      saved: false,
      requiresAuth: true,
      shareUrl: `/share/${design.id}`,
      note: "Supabase is not configured. The design was kept locally for this MVP session.",
    });
  }

  return NextResponse.json({
    saved: true,
    requiresAuth: false,
    shareUrl: `/share/${design.id}`,
  });
}
