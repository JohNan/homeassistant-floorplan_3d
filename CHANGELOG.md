# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-04

### Added

#### Home Assistant Integration & Backend Storage
- HACS-compatible single integration packaging under `custom_components/floorplan_3d`.
- Persistent atomic storage (`STORAGE_VERSION = 1`) via `homeassistant.helpers.storage.Store` in `.storage/floorplan_3d.floorplans`.
- Optimistic concurrency control using monotonically increasing `revision` numbers.
- Granular WebSocket API commands: `floorplan_3d/list`, `floorplan_3d/get`, `floorplan_3d/save`, `floorplan_3d/delete`, `floorplan_3d/upload_blueprint`, and `floorplan_3d/subscribe`.
- Wall-tablet safe security boundary with `@websocket_api.require_admin` enforcement on mutating commands.
- Automatic custom sidebar panel registration (`floorplan-3d-editor`) and Lovelace static resource registration (`/floorplan_3d_static/floorplan-card.js`).

#### 2D CAD Sidebar Floorplan Editor
- Metric CAD authoring workspace with $1\text{ unit} = 1\text{ meter}$ scale and configurable snap grid.
- Interactive Blueprint 2-Point Distance Calibration converting image pixel distances to metric space.
- Hybrid Node-Edge wall graph with automatic corner miter joint solver and acute angle bevel clamps ($<30^\circ$).
- Room polygon tool with automatic node snapping, area computation, and surface material assignments.
- Searchable Home Assistant entity palette with Area-based auto-filtering and unplaced indicators.
- Context-sensitive property inspector for floors, walls, openings, rooms, furniture, and placed entities.
- 50-step immutable undo/redo history stack with ring buffer snapshotting.
- Split-screen 2D CAD and live 3D Three.js viewport with camera bookmark capture.

#### Shared Three.js 3D Rendering Engine & Lighting
- Hybrid 2D wall-occluded lightmap baker with $O(V \log V)$ angular ray-sweep visibility polygon solver, eliminating light bleed through walls at zero fragment shadow pass cost.
- Pooled dynamic `THREE.PointLight`s ($K=8$ high, $K=4$ tablet, $K=0$ low) paired with a cached architectural directional shadow map.
- Dynamic Sims-style camera-facing wall cutaway smoothly scaling front walls down to cross-sections based on horizontal view alignment.
- Non-CSG parametric wall opening partitioner supporting solid walls, sill blocks, lintel blocks, and hinged door swing meshes.
- 19 procedural resizable 3D furniture models and functional animated entities (hinged doors, rotating ceiling fans, glowing TV screens).
- 0-FPS idle dirty-flag render loop completely halting `requestAnimationFrame` when scenes settle.
- $O(1)$ Watched-Entity State Differ (`WatchedEntityDiffer`) inspecting only floorplan-bound entities.

#### 3D Lovelace Card & Visual Card Editor
- Interactive Three.js Lovelace Card (`<floorplan-3d-card>`) with touch-friendly CSS2D floating badges and room labels.
- Floating glassmorphic HUD:
  - Top-left floor switcher pill bar and stacked dollhouse mode toggle.
  - Top-right wall cutaway mode cycler (`Cutaway`, `Half`, `Full`), camera projection toggle (`3D Perspective` vs `Isometric`), and reset camera bookmark button.
- Real-time WebSocket hot-reload subscription automatically updating cards when saved in the sidebar editor.
- Visual Lovelace Card Editor (`<floorplan-3d-card-editor>`) with floorplan selector, floor level dropdown, dimensional inputs, and overlay toggles.

#### Documentation & Continuous Integration
- Comprehensive `README.md` with architectural diagrams, HACS installation guide, quick-start workflow, and YAML reference.
- Detailed `CONTRIBUTING.md` covering geometric formulas, lighting mathematics, and architectural invariants.
- MIT License (`LICENSE`).
- GitHub Actions CI workflow (`.github/workflows/validate.yml`) validating TypeScript, Python backend tests, Ruff linting, and Vite builds.
