# Roomly

Roomly is a polished MVP for visualizing furniture from online stores inside a real room photo.

Users can upload a room image, calibrate an approximate wall width, paste a furniture product URL,
place a cutout on an interactive canvas, compare before/after views, vote on layout variants, and
export a shareable visualization. The first design works without login; saving is ready for Supabase.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- shadcn/ui with Base UI primitives
- Konva / react-konva for the room canvas
- Supabase client plumbing for auth, projects, and saved designs
- Server-side retailer adapter interface with clean mock fallbacks
- Background-removal provider route with a mock fallback

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BACKGROUND_REMOVAL_API_URL=
BACKGROUND_REMOVAL_API_KEY=
```

The MVP runs without these keys. When Supabase is not configured, designs are persisted locally in
`localStorage`, and the save API returns a friendly login/configuration message.

## Product Extraction

Roomly intentionally does not depend on unrestricted Amazon scraping. Product URLs are handled
through `lib/product-adapters.ts`, where retailer-specific adapters can be added for permitted APIs
or metadata sources. If extraction is unavailable, the app uses editable mock metadata and supports
manual product image, dimensions, price, and URL entry.

## Background Removal

`POST /api/images/remove-background` is a provider interface. Without
`BACKGROUND_REMOVAL_API_URL`, it returns the original image or the bundled transparent demo cutout.
Plug a provider into this route to call a real background-removal API server-side.

## Design State

The editor keeps exact state as JSON:

- room image
- calibration values
- product metadata
- placed furniture transforms
- Konva canvas JSON

This payload is what should be stored in Supabase Postgres for reopening and editing saved designs.

## Routes

- `/` - premium Roomly landing page with seeded public transformations
- `/draw` - desktop-optimized editor with mobile-friendly layout
- `/api/products/extract` - server-side product metadata adapter endpoint
- `/api/images/remove-background` - background-removal provider endpoint
- `/api/projects` - Supabase-ready project save endpoint with local fallback

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
