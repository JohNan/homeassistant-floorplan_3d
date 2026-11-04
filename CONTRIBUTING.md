# Contributing to Home Assistant 3D Floorplan Editor & Card (`floorplan_3d`)

Thank you for your interest in contributing to `floorplan_3d`. This guide outlines our architecture, mathematical foundations, frozen type contracts, and engineering standards.

---

## 1. Development Environment Setup

This repository uses [mise](https://mise.jdx.dev) to manage toolchains reproducibly across platforms (Node.js 22, Python 3.12/3.14, and Ruff).

```bash
# Clone the repository
git clone https://github.com/JohNan/homeassistant-floorplan_3d.git
cd homeassistant-floorplan-editor

# Install dependencies via mise
mise run lint
```

### Essential Commands
- `mise run lint`: Runs TypeScript compiler typecheck (`tsc --noEmit`) and Python Ruff linter.
- `mise run test`: Executes the Vitest unit and integration test suite (`tests/unit/*.test.ts`).
- `mise run test:py`: Executes Python pytest suite testing storage, revision locking, and WebSocket endpoints.
- `mise run build`: Bundles the Vite frontend application into `custom_components/floorplan_3d/frontend/dist/`.

---

## 2. Mathematical Foundations & Computational Geometry

All spatial coordinates are modeled in a metric right-handed coordinate system where **$1\text{ unit} = 1\text{ meter}$**.

### 2.1 Blueprint 2-Point Distance Calibration
Given two user-clicked pixel coordinates $P_1 = (u_1, v_1)$ and $P_2 = (u_2, v_2)$ on a reference blueprint image and a known real-world distance $D_{\text{real}}$ in meters:

$$\text{meters\_per\_pixel} = \frac{D_{\text{real}}}{\sqrt{(u_2 - u_1)^2 + (v_2 - v_1)^2}}$$

The blueprint plane in 3D world space is scaled to $(W_{\text{px}} \cdot \text{meters\_per\_pixel},\, H_{\text{px}} \cdot \text{meters\_per\_pixel})$, enabling 1:1 metric tracing.

### 2.2 Hybrid Node-Edge Corner Miter Joint Solver
To avoid Z-fighting and overlapping geometry at wall intersections:
1. At each `WallNode`, incident wall edges are sorted counter-clockwise by angle $\theta = \text{atan2}(\Delta y, \Delta x)$.
2. Half-thickness offset lines $(\pm w_i / 2)$ intersect adjacent wall offset lines to produce shared miter vertices $M_{i, i+1}$.
3. **Miter Clamp**: When two walls meet at an acute angle ($\Delta\theta < 30^\circ$) where $\|M_{i, i+1} - N\| > 2.5 \cdot \max(w_i, w_{i+1})$, the vertex is beveled to prevent geometric spikes.
4. Wall segments are extruded vertically along $+Y_{\text{3D}}$.

### 2.3 Non-CSG Parametric Wall Opening Partitioning
Runtime Constructive Solid Geometry (CSG) is avoided for performance and stability on mobile GPUs. Each `WallOpening` on a wall segment $[0, L]$ is represented by normalized parameter $t \in [0, 1]$:
- Solid wall intervals extrude full height $[0, H_{\text{wall}}]$.
- Opening intervals extrude:
  - **Sill block**: $[0, \text{sill\_height}]$ (if $\text{sill\_height} > 0$).
  - **Lintel/header block**: $[\text{head\_height}, H_{\text{wall}}]$ (if $\text{head\_height} < H_{\text{wall}}$).
  - **Void**: $[\text{sill\_height}, \text{head\_height}]$ where parametric door frames and leaves are positioned. Door leaves pivot on their hinge edge to smoothly animate swing angles.

### 2.4 Hybrid 2D Wall-Occluded Lightmap Baker
To eliminate light bleed through walls without expensive 6-sided cubemap shadow passes per light:
1. Fixed wall segments and closed doors form 2D occlusion blockers.
2. An angular ray sweep around each active light computes a closed star-shaped visibility polygon $P_{\text{vis}}$ ($O(V \log V)$).
3. Active light radial gradients are drawn additively onto an offscreen canvas lightmap texture (`512x512`) clipped to $P_{\text{vis}}$.
4. Room and wall materials sample the lightmap texture at zero fragment shadow cost.

### 2.5 Sims-Style Camera-Facing Wall Cutaway
In `auto_cutaway` mode, each wall segment checks view normal alignment:

$$d = \vec{n}_{\text{xz}} \cdot \frac{\vec{p}_{\text{cam,xz}} - \vec{m}_{\text{xz}}}{\|\vec{p}_{\text{cam,xz}} - \vec{m}_{\text{xz}}\|}$$

If $d > 0.15$ (wall faces the camera between the camera and the room interior), the wall target height smoothly lerps to 0.35m.

---

## 3. Core Architectural Invariants

1. **Frozen Type Contracts**:
   - `src/types/floorplan.ts`: Data schema for `FloorplanDocument`, `FloorLevel`, `WallNode`, `WallEdge`, `WallOpening`, `RoomPolygon`, `FurnitureItem`, `EntityPlacement`, `ActionConfig`, and `FloorplanCardConfig`.
   - `src/types/ha.ts`: Home Assistant core frontend contracts.
   - `src/engine/contracts.ts`: Shared 3D engine interfaces.
   - Do not alter exported interfaces without full coordinator verification.
2. **Security Boundary**:
   - WebSocket commands modifying state (`save`, `delete`, `upload_blueprint`) require admin (`@require_admin`).
   - Read-only and subscription commands (`list`, `get`, `subscribe`) are open to authenticated users for kiosk wall tablets.
3. **Wall-Tablet Performance & 0-FPS Idle Loop**:
   - `RenderLoopController` must sleep when idle (`isDirty === false`, no active tweens, damping settled).
   - Never run unconditional 60 FPS loops.
4. **$O(1)$ Watched-Entity State Diffing**:
   - Never iterate all keys of `hass.states`. Always diff against `WatchedEntityDiffer`'s cached set.
5. **Three.js Resource Disposal**:
   - Whenever meshes or textures are replaced or unmounted, explicitly call `.dispose()` on geometries, materials, and textures to avoid GPU memory leaks on wall tablets.
6. **HACS Bundle Commitment**:
   - Frontend bundles in `custom_components/floorplan_3d/frontend/dist/` must be compiled and committed so HACS users do not require Node.js on Home Assistant OS.

---

## 4. Testing & Code Quality Standards

All pull requests and commits must pass:
- **TypeScript**: `mise run lint` (zero `tsc` errors).
- **Vitest**: `mise run test` (100% passing tests for 2D geometry, visibility sweeps, state diffing, history, and 3D engine).
- **Pytest**: `mise run test:py` (100% passing tests for storage and WebSocket APIs).
- **Ruff**: Python linting with zero warnings.
