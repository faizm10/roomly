# Roomly Planner

A canvas-first room planner foundation for sketching real room geometry, turning it into an editable blueprint, and eventually rendering the same canonical model in 3D.

## Architecture

- **Coordinate system**: meters internally. X is room width, Z is room depth, Y is vertical height for future 3D.
- **Canonical model**: `Room` stores vertices, walls, openings, furniture, materials, and wall height. Blueprint and future R3F views must both consume this model.
- **Editor state**: Zustand stores the room, mode, tool, selection, viewport, and save state. Mutations update room data in world units, never canvas pixels.
- **Blueprint rendering**: SVG projects X/Z meters to canvas pixels via viewport pan/zoom. Grid, walls, vertices, and measurements are rendered from room vertices.
- **Geometry layer**: reusable utilities cover wall math, polygon checks, coordinate transforms, snapping, and oriented-rectangle collision.
- **Persistence**: local-first `RoomRepository` abstraction backed by `localStorage`, replaceable later by a backend.
- **3D strategy**: Phase 6 should add React Three Fiber components that consume the same `Room`: polygon floor geometry, split wall segments for openings, placeholder furniture meshes, OrbitControls, warm lighting, and demand-aware rendering.

## MVP Structure

```txt
src/
  app/                    Next.js App Router entry
  components/
    blueprint/            SVG blueprint engine
    editor/               Main editor shell
    setup/                Room creation UI
  features/
    furniture/            Furniture definitions
    persistence/          Room repository abstraction
  lib/geometry/           Testable geometry and transforms
  stores/                 Zustand editor store
  types/                  Canonical room and furniture types
```

## Dependencies

- `next`, `react`, `react-dom`: application shell and rendering.
- `tailwindcss`: compact design-tool styling.
- `zustand`: canonical editor state without prop-drilling.
- `lucide-react`: accessible tool icons.
- `vitest`: targeted geometry tests.

React Three Fiber, Three.js, Drei, and model-loading dependencies are intentionally deferred until Phase 6.

## Implementation Sequence

1. Foundation: types, room model, store, persistence boundary, app shell.
2. Blueprint: grid, pan/zoom, rectangular room, wall rendering, measurements, vertex editing.
3. Sketch: point drawing, polygon completion, alignment snapping, invalid geometry prevention.
4. Furniture: library, placement, transform controls, snapping, collisions.
5. Architecture: doors, windows, deterministic split-wall openings.
6. 3D: R3F scene consuming the same model.
7. Fidelity: better materials, GLB assets, lighting, transitions.
8. Persistence: dashboard, saved rooms, thumbnails, autosave polish.

## Key Risks

- Irregular polygons need consistent winding, self-intersection handling, and triangulation before 3D floors.
- Wall resizing must preserve valid geometry instead of producing impossible rooms.
- Door/window openings should split wall geometry first; avoid CSG until proven necessary.
- Furniture positions must stay in meters while the canvas transforms independently.
- Rotated furniture collision needs robust oriented rectangle math before smart placement.
- GLTF assets need normalized dimensions, pivots, and forward direction.
- R3F performance depends on memoized geometry, selective store subscriptions, sensible shadows, and capped DPR.

## Commands

```bash
npm run dev
npm run test
npm run typecheck
npm run build
```
