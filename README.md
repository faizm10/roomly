# ✏️ Roomly

**Draw Anything. Watch It Come Alive.**

Roomly is an AI whiteboard: sketch simple objects on an infinite canvas and
watch them turn into a tiny living village — illustrated houses with chimney
smoke, swaying trees, flowing rivers, and villagers who wander around, get
coffee, and chat.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), hit **Start Drawing**,
sketch a house or a tree, and press **Bring To Life**.

### Vision API (optional)

Copy `.env.example` to `.env.local` and set **one** of:

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI (`gpt-4o-mini` by default, override with `OPENAI_VISION_MODEL`) |
| `GEMINI_API_KEY` | Google Gemini (`gemini-2.0-flash` by default, override with `GEMINI_VISION_MODEL`) |

**Without a key the app still works**: it falls back to a local demo mode that
guesses object types from the shape of each stroke, so the sketch → world
moment is never blocked.

## How it works

1. **Sketch** — the left pane is a [tldraw](https://tldraw.dev) canvas with a
   minimal toolbar (pencil, eraser, undo, clear).
2. **Recognize** — *Bring To Life* exports the drawing as a PNG and posts it to
   `POST /api/recognize`, which asks a vision model to return
   `{ objects: [{ type, x, y }] }` with positions as percentages. Allowed
   types: `house`, `tree`, `road`, `river`, `cafe`, `person`.
3. **Live** — the right pane replaces sketches with illustrated SVG assets
   (Framer Motion entrances, CSS keyframe idle animations) and spawns
   villagers. Sketched `person`s become extra villagers.
4. **Villagers** — a small finite-state machine (`lib/villagers.ts`):
   `entering → idle → walking → sipping/inside → …`. They prefer strolling
   along roads, visit cafes and houses, and show speech bubbles. No AI needed.

## Project layout

```
app/
  page.tsx               Landing page (hero + looping sketch→world demo)
  draw/page.tsx          Editor: 40% canvas / 60% living world
  api/recognize/route.ts Vision endpoint (OpenAI → Gemini → demo fallback)
components/
  editor/SketchCanvas.tsx  tldraw wrapper + custom toolbar
  landing/HeroDemo.tsx     Looping hero animation
  world/LivingWorld.tsx    World renderer, tooltips, villager loop
  world/WorldAssets.tsx    Illustrated SVG assets (house, tree, cafe, …)
lib/
  world.ts               Types, coordinate mapping, sample village, demo-mode guessing
  villagers.ts           Villager finite-state machine
```

## Stack

Next.js 15 · TypeScript · Tailwind CSS 4 · shadcn/ui · tldraw · Framer Motion ·
OpenAI or Gemini Vision
