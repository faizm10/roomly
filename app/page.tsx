"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroDemo } from "@/components/landing/HeroDemo";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#faf7f2] text-stone-800">
      {/* soft ambient blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <span className="text-2xl">✏️</span> Roomly
        </div>
        <Button
          render={<Link href="/draw" />}
          nativeButton={false}
          variant="ghost"
          className="rounded-full font-bold text-stone-600"
        >
          Open the editor
        </Button>
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-14 text-center lg:pt-20">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-violet-600 shadow-sm ring-1 ring-violet-100"
        >
          <Sparkles className="size-4" />
          An AI whiteboard that dreams with you
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="max-w-4xl text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Draw Anything.
          <br />
          <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent">
            Watch It Come Alive.
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-6 max-w-xl text-pretty text-lg text-stone-500"
        >
          Sketch a house, a tree, a winding river — and Roomly turns your
          doodles into a tiny living village, complete with villagers who move in.
        </motion.p>

        <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.24 }} className="mt-9">
          <Button
            render={<Link href="/draw" />}
            nativeButton={false}
            size="lg"
            className="h-14 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-lg font-bold text-white shadow-xl shadow-violet-300/50 transition-transform hover:scale-105 hover:from-violet-500 hover:to-fuchsia-500"
          >
            Start Drawing <ArrowRight className="size-5" />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 w-full max-w-2xl"
        >
          <HeroDemo />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            { icon: "✏️", title: "Sketch", text: "Doodle houses, trees, rivers and roads on an infinite canvas." },
            { icon: "🪄", title: "AI understands", text: "Vision AI reads your strokes and figures out what you meant." },
            { icon: "🏡", title: "It lives", text: "Your sketch becomes a cozy village with wandering villagers." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-3xl bg-white/80 p-6 text-left shadow-sm ring-1 ring-black/5 backdrop-blur"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-extrabold">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{f.text}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-stone-200/70 py-6 text-center text-sm text-stone-400">
        Made with ✨ — everything you draw stays on your canvas.
      </footer>
    </main>
  );
}
