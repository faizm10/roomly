"use client";

import { DrawablyButton, DrawablyCard, DrawablyDivider } from "drawably/react";
import { MotionConfig } from "framer-motion";
import { ArrowRight, Armchair, PencilLine, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeUp } from "@/components/ui/amicro/fade-up";
import { WordReveal } from "@/components/ui/amicro/word-reveal";
import { RoomSketch } from "@/components/landing/room-sketch";

const notes = [
  {
    icon: PencilLine,
    title: "Draw the shape",
    body: "Start from a rectangle or drag vertices until the outline matches the room you actually live in."
  },
  {
    icon: Armchair,
    title: "Drop in furniture",
    body: "Real footprints at real scale, so you find out the sofa doesn't fit before it arrives."
  },
  {
    icon: Save,
    title: "It saves itself",
    body: "Every change is kept locally. Close the tab and your room is waiting where you left it."
  }
];

export function LandingPage() {
  const router = useRouter();

  return (
    // The sketch chrome already freezes its own boil for reduced motion; this
    // holds the entrance animations to the same promise.
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
        <header className="mx-auto flex max-w-[1000px] items-center justify-between px-6 py-6">
          <span className="hand-title text-xl">Roomly</span>
          <Link
            className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
            href="/dashboard"
          >
            Open the planner
          </Link>
        </header>

        <main className="mx-auto max-w-[1000px] px-6 pb-24">
          <section className="grid items-center gap-10 py-10 md:grid-cols-[1fr_minmax(0,420px)] md:py-16">
            <div>
              <div className="panel-label mb-3">Room planner</div>
              <WordReveal
                className="hand-title gap-x-6 gap-y-3 text-[40px] leading-[1.45] md:text-[52px]"
                text="Plan a room on paper."
              />
              <FadeUp delay={0.15}>
                <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-[var(--muted)]">
                  Sketch the floor, push the walls around, and try the furniture
                  where it would really go — without the tape measure, and
                  without pretending your living room is a perfect rectangle.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <DrawablyButton
                    type="button"
                    variant="solid"
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to the dashboard
                    <ArrowRight size={15} />
                  </DrawablyButton>
                  <span className="text-xs text-[var(--muted)]">
                    No account. Saves in this browser.
                  </span>
                </div>
              </FadeUp>
            </div>

            <FadeUp delay={0.25}>
              <DrawablyCard className="p-6">
                <RoomSketch className="h-auto w-full" />
                <div className="mt-4 text-center text-xs text-[var(--muted)]">
                  An L-shaped room, 5.2 m across
                </div>
              </DrawablyCard>
            </FadeUp>
          </section>

          <DrawablyDivider />

          <section className="pt-12">
            <h2 className="hand-title mb-8 text-2xl">How it goes</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {notes.map((note, index) => (
                <FadeUp key={note.title} delay={0.1 * index}>
                  <DrawablyCard className="h-full p-5">
                    <note.icon className="text-[var(--accent)]" size={20} />
                    <div className="hand-title mt-3 text-lg">{note.title}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {note.body}
                    </p>
                  </DrawablyCard>
                </FadeUp>
              ))}
            </div>
          </section>
        </main>

        <footer className="mx-auto max-w-[1000px] px-6 pb-12">
          <DrawablyDivider />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 text-xs text-[var(--muted)]">
            <span>Roomly — drawn, not rendered.</span>
            <Link
              className="underline-offset-4 hover:text-[var(--foreground)] hover:underline"
              href="/dashboard"
            >
              Open the planner →
            </Link>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
