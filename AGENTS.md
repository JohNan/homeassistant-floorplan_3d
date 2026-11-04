# AGENTS.md — AI Agent Architecture & Engineering Guide (`floorplan_3d`)

This repository contains **Home Assistant 3D Floorplan Editor & Card (`floorplan_3d`)**, a HACS-compatible integration (`custom_components/floorplan_3d`) that pairs an admin-only 2D/3D CAD floorplan sidebar editor (`<floorplan-editor-panel>`) with a wall-tablet-optimized Three.js 3D Lovelace card (`<floorplan-3d-card>`).

---

## 1. Core Architectural Invariants

1. **Single HACS Integration Packaging (`custom_components/floorplan_3d`)**:
   - All floorplan data is persisted in Home Assistant's `.storage/floorplan_3d.floorplans` (`STORAGE_VERSION = 1`) via `homeassistant.helpers.storage.Store` with optimistic `revision` locking.
   - Pre-compiled ES module bundles (`floorplan-panel.js`, `floorplan-card.js`, and shared chunks) live in `custom_components/floorplan_3d/frontend/dist/` and **MUST be committed to Git** so Home Assistant OS users installing via HACS do not need Node.js on their appliance.
2. **Security Boundary (Wall-Tablet Safe)**:
   - Sidebar panel registration (`floorplan-3d-editor`) and mutating WebSocket commands (`floorplan_3d/save`, `floorplan_3d/delete`, `floorplan_3d/upload_blueprint`) MUST enforce `@websocket_api.require_admin` (`require_admin=True`).
   - Read-only and real-time subscription WebSocket commands (`floorplan_3d/list`, `floorplan_3d/get`, `floorplan_3d/subscribe`) are open to all authenticated Home Assistant users so wall-tablet kiosk accounts can render and interact with the 3D Lovelace card safely.
3. **Metric World Space (`1 unit = 1 meter`)**:
   - In 2D floor space: `+X` = East (right), `+Y` = South (down).
   - In Three.js 3D space: `(x_2d, floor_elevation + z_elevation, y_2d)` where `+Y_3D` is vertical up.
4. **Wall-Tablet WebGL Performance & 0-FPS Idle Render Loop**:
   - Never run an unconditional 60 FPS `requestAnimationFrame` loop. `RenderLoopController` MUST sleep at **0 FPS** when `isDirty === false`, no state tweens are active, and `OrbitControls` damping has settled.
   - Never attach dynamic `castShadow = true` cubemaps to individual `PointLight` entities. Room-bounded light occlusion is computed via a cached 2D rotational-sweep visibility polygon (`src/utils/visibility2d.ts`) baked into an additive 2D floor lightmap texture (`src/engine/LightmapBaker2D.ts`), paired with a capped pool of non-shadow `THREE.PointLight`s (`High=8`, `Tablet=4`, `Low=0`) and 1 cached architectural `DirectionalLight` shadow map.
5. **$O(1)$ Watched-Entity State Diffing**:
   - Home Assistant calls `set hass(newHass)` on every smart-home state update. Never iterate all keys of `hass.states`. Always use `WatchedEntityDiffer` (`src/utils/ha-registry.ts`) to inspect only the `Set<string>` of entity IDs referenced by the active floorplan and its bound HA Areas.
6. **Three.js Resource Disposal**:
   - Whenever rebuilding wall, room, furniture, or lightmap meshes/textures, explicitly call `.dispose()` on superseded `BufferGeometry`, `Material`, and `Texture` instances to prevent WebGL memory leaks on long-running wall tablets.

---

## 2. Frozen Type Contracts (`src/types/` & `src/engine/contracts.ts`)

- `src/types/floorplan.ts`: Canonical schema for `FloorplanDocument`, `FloorLevel`, `WallNode`, `WallEdge`, `WallOpening`, `RoomPolygon`, `FurnitureItem`, `EntityPlacement`, `ActionConfig`, and `FloorplanCardConfig`.
- `src/types/ha.ts`: Home Assistant `HomeAssistant`, `HassEntity`, `AreaRegistryEntry`, `FloorRegistryEntry`, `EntityRegistryEntry`, and WebSocket message contracts.
- `src/engine/contracts.ts`: Shared interfaces between the 3D engine modules (`WallBuilder3D`, `RoomBuilder3D`, `RenderLoopController`, `LightmapBaker2D`, `LightPoolManager`, `ProceduralCatalog3D`, `BadgeOverlayManager`, `FloorplanScene3D`).
- **Rule**: Do not break or rename exported interfaces in `src/types/*` or `src/engine/contracts.ts` without coordinator verification across all consumers.

---

## 3. Toolchain & Verification Commands (`mise`)

Always execute build, lint, and test commands via `mise`:

```bash
# TypeScript typecheck + Python ruff lint
mise run lint

# Run Vitest unit & integration test suite
mise run test

# Run Python backend pytest suite
mise run test:py

# Build production ES modules into custom_components/floorplan_3d/frontend/dist/
mise run build
```

---

## 4. Subagent Delegation & Git Workflow

- **Coordinator (Argon / Primary Model)**: Owns architecture, frozen contracts (`src/types/*`, `src/engine/contracts.ts`), cross-module orchestrator assembly (`src/engine/FloorplanScene3D.ts`), `mise` verification gates, and mandatory 5-pillar `/review` + autofix.
- **Parallel `flash` Subagents**: Delegate modular implementation waves across strictly disjoint file sets (`invoke_subagent` with `Model: "flash"`).
- **Git Policy**:
  - Remote: `https://github.com/JohNan/homeassistant-floorplan_3d.git` (`main` branch).
  - Commit frequently using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) and push directly to `origin main` (no Pull Requests).
