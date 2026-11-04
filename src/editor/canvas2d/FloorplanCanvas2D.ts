import { LitElement, html, css, nothing, PropertyValues, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  EntityPlacement,
  FloorLevel,
  FurnitureCatalogType,
  FurnitureItem,
  OpeningType,
  Point2D,
  RoomPolygon,
  WallEdge,
  WallNode,
  WallOpening
} from '../../types/floorplan';
import type {
  EditorSelection,
  EditorToolMode,
  PaletteDragPayload
} from '../editor-contracts';
import {
  computeFloorBoundingBox2D,
  distance2D,
  findPolygonLabelCenter2D,
  pointInPolygon2D,
  polygonArea2D,
  projectPointOntoSegment,
  snapPoint2D,
  solveWallMiterFootprints,
  type SnapResult
} from '../../utils/geometry2d';
import type { WallMiterFootprint } from '../../engine/contracts';

/**
 * High-performance 2D CAD Floorplan Canvas (`<floorplan-canvas-2d>`)
 *
 * Provides metric pan/zoom viewport, interactive wall miter drafting, opening placement,
 * room polygon tracing, furniture and entity manipulation, snap engine, onion-skin trace,
 * calibrated blueprint background, and HTML5 palette drag-and-drop.
 *
 * Wave 4: Multi-touch pinch-to-zoom & two-finger pan, enlarged touch hit-targets,
 * on-screen touch action pills, floating zoom controls, and Home Assistant theme integration.
 */
@customElement('floorplan-canvas-2d')
export class FloorplanCanvas2D extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--primary-background-color, #0b0f19);
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .canvas-svg {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }

    .cursor-select {
      cursor: default;
    }

    .cursor-panning {
      cursor: grabbing !important;
    }

    .cursor-grab {
      cursor: grab;
    }

    .wall-footprint {
      cursor: pointer;
      transition: fill 0.15s, stroke 0.15s;
    }

    .wall-node {
      cursor: move;
      transition: transform 0.15s;
    }

    .wall-node:hover {
      transform: scale(1.2);
    }

    .room-polygon {
      cursor: pointer;
      transition: fill-opacity 0.15s, stroke 0.15s;
    }

    .furniture-item {
      cursor: move;
    }

    .rotation-handle {
      cursor: grab;
    }

    .rotation-handle:active {
      cursor: grabbing;
    }

    .entity-item {
      cursor: move;
    }

    .opening-item {
      cursor: ew-resize;
    }

    .ghost-layer {
      pointer-events: none;
      opacity: 0.25;
    }

    .hud-overlay {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 10;
    }

    .hud-scale-bar {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .scale-ruler {
      height: 4px;
      border: 1px solid var(--primary-color, #38bdf8);
      border-top: none;
      background: rgba(56, 189, 248, 0.2);
      margin-top: 2px;
    }

    .hud-coords {
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.75rem;
      display: flex;
      gap: 0.75rem;
    }

    .hud-coords strong {
      color: var(--primary-text-color, #f8fafc);
    }

    .hud-tool-badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-color, #38bdf8);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.8125rem;
      font-weight: 600;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .touch-action-bar {
      position: absolute;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      z-index: 10;
      pointer-events: auto;
      max-width: 90vw;
    }

    .touch-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--divider-color, #334155);
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      transition: transform 0.1s, opacity 0.15s, background-color 0.15s;
      min-height: 36px;
    }

    .touch-pill:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .touch-pill:active:not(:disabled) {
      transform: translateY(1px);
    }

    .touch-pill:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .touch-pill-success {
      background: var(--success-color, #10b981);
      color: #ffffff;
      border-color: transparent;
    }

    .touch-pill-danger {
      background: var(--error-color, #ef4444);
      color: #ffffff;
      border-color: transparent;
    }

    .touch-pill-warning {
      background: var(--warning-color, #f59e0b);
      color: #ffffff;
      border-color: transparent;
    }

    .zoom-controls {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      z-index: 10;
      pointer-events: auto;
    }

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      min-height: 36px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #334155);
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      transition: background-color 0.15s, transform 0.1s;
    }

    .zoom-btn:hover {
      background: var(--secondary-background-color, #334155);
    }

    .zoom-btn:active {
      transform: scale(0.95);
    }

    .zoom-btn-fit {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .dimension-label {
      font-size: 10px;
      font-weight: 600;
      fill: var(--primary-text-color, #cbd5e1);
      text-anchor: middle;
      pointer-events: none;
      user-select: none;
    }
  `;

  // Component Properties
  @property({ attribute: false }) floor: FloorLevel | null = null;
  @property({ attribute: false }) ghostFloor: FloorLevel | null = null;
  @property({ type: String }) toolMode: EditorToolMode = 'select';
  @property({ attribute: false }) selection: EditorSelection = { kind: 'none', id: null };
  @property({ type: Number }) gridSize = 0.1;
  @property({ type: Boolean }) snapToGrid = true;
  @property({ type: Number }) snapAngleDeg = 15;
  @property({ type: String }) pendingOpeningType: OpeningType = 'door_single';

  // Internal Viewport (Pan/Zoom) State
  @state() private pixelsPerMeter = 60; // 20..250 px/m
  @state() private panX = 0; // World center X (meters)
  @state() private panY = 0; // World center Y (meters)
  @state() private canvasWidth = 800;
  @state() private canvasHeight = 600;

  // Interaction State
  @state() private isPanning = false;
  @state() private panStartScreen: Point2D = { x: 0, y: 0 };
  @state() private panStartWorld: Point2D = { x: 0, y: 0 };
  @state() private spaceHeld = false;
  private didPanMove = false;
  private panStartedOnSelectable = false;

  // Multi-Touch Pointer Tracking
  private activePointers = new Map<number, Point2D>();
  private prevPinchDist: number | null = null;
  private prevPinchCenter: Point2D | null = null;

  // Active Tool States
  @state() private cursorWorld: Point2D = { x: 0, y: 0 };
  @state() private snappedCursor: Point2D = { x: 0, y: 0 };

  // Draw Wall State
  @state() private wallDrawStartNodeId: string | null = null;
  @state() private wallDrawStartPoint: Point2D | null = null;

  // Draw Room State
  @state() private roomDrawPoints: Array<{ x: number; y: number; node_id?: string | null }> = [];

  // Add Opening Hover State
  @state() private hoverWallId: string | null = null;
  @state() private hoverWallT = 0.5;
  @state() private hoverOpeningPoint: Point2D | null = null;

  // Measure State
  @state() private measureP1: Point2D | null = null;
  @state() private measureP2: Point2D | null = null;
  @state() private measureLocked = false;

  // Selection Drag State
  private dragKind: 'node' | 'furniture' | 'furniture_rotate' | 'entity' | 'opening' | 'strip_point' | null = null;
  private dragItemId: string | null = null;
  private dragStartWorld: Point2D = { x: 0, y: 0 };
  private itemOriginalPos: Point2D = { x: 0, y: 0 };
  private isItemDragging = false;

  private resizeObserver?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            this.canvasWidth = cr.width;
            this.canvasHeight = cr.height;
          }
        }
      });
      this.resizeObserver.observe(this);
    }

    window.addEventListener('keydown', this.handleGlobalKeyDown);
    window.addEventListener('keyup', this.handleGlobalKeyUp);
    window.addEventListener('pointermove', this.handleGlobalPointerMove);
    window.addEventListener('pointerup', this.handleGlobalPointerUp);
    window.addEventListener('pointercancel', this.handleGlobalPointerUp);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    window.removeEventListener('keyup', this.handleGlobalKeyUp);
    window.removeEventListener('pointermove', this.handleGlobalPointerMove);
    window.removeEventListener('pointerup', this.handleGlobalPointerUp);
    window.removeEventListener('pointercancel', this.handleGlobalPointerUp);
  }

  private hasInitialFit = false;

  override willUpdate(): void {
    if (
      !this.hasInitialFit &&
      this.floor &&
      (this.floor.nodes.length > 0 || this.floor.blueprint)
    ) {
      this.hasInitialFit = true;
      this.fitViewToFloor(false);
    }
  }

  // Coordinate Conversion Helpers
  public worldToScreen(wx: number, wy: number): Point2D {
    return {
      x: this.canvasWidth / 2 + (wx - this.panX) * this.pixelsPerMeter,
      y: this.canvasHeight / 2 + (wy - this.panY) * this.pixelsPerMeter
    };
  }

  public screenToWorld(sx: number, sy: number): Point2D {
    return {
      x: this.panX + (sx - this.canvasWidth / 2) / this.pixelsPerMeter,
      y: this.panY + (sy - this.canvasHeight / 2) / this.pixelsPerMeter
    };
  }

  private sx(wx: number): number {
    return this.canvasWidth / 2 + (wx - this.panX) * this.pixelsPerMeter;
  }

  private sy(wy: number): number {
    return this.canvasHeight / 2 + (wy - this.panY) * this.pixelsPerMeter;
  }

  /**
   * Returns current world coordinates (meters) at center of viewport.
   */
  public getViewportCenterWorld(): Point2D {
    return {
      x: Number(this.panX.toFixed(3)),
      y: Number(this.panY.toFixed(3))
    };
  }

  /**
   * Zooms in by a factor of 1.25.
   */
  public zoomIn(): void {
    this.pixelsPerMeter = Math.max(20, Math.min(250, this.pixelsPerMeter * 1.25));
    this.requestUpdate();
  }

  /**
   * Zooms out by a factor of 0.8.
   */
  public zoomOut(): void {
    this.pixelsPerMeter = Math.max(20, Math.min(250, this.pixelsPerMeter * 0.8));
    this.requestUpdate();
  }

  /**
   * Centers and zooms the 2D CAD viewport to encompass all elements of the floor.
   */
  public fitViewToFloor(triggerUpdate = true): void {
    if (!this.floor) return;
    const bbox = computeFloorBoundingBox2D(this.floor, 1.5);
    this.panX = bbox.centerX;
    this.panY = bbox.centerY;
    const w = this.canvasWidth || 800;
    const h = this.canvasHeight || 600;
    const ppmX = (w - 100) / Math.max(1, bbox.width);
    const ppmY = (h - 100) / Math.max(1, bbox.height);
    this.pixelsPerMeter = Math.max(20, Math.min(250, Math.min(ppmX, ppmY)));
    if (triggerUpdate) {
      this.requestUpdate();
    }
  }

  private emitFloorChange(floor: FloorLevel, description: string): void {
    this.dispatchEvent(
      new CustomEvent('floor-change', {
        detail: { floor, description },
        bubbles: true,
        composed: true
      })
    );
  }

  private emitSelectionChange(selection: EditorSelection): void {
    this.selection = selection;
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        detail: { selection },
        bubbles: true,
        composed: true
      })
    );
  }

  // Snapping Calculation Helper
  private getSnapResult(pt: Point2D, anchor?: Point2D, excludeNodeIds?: Set<string>): SnapResult {
    if (!this.floor) {
      return { point: pt, snappedNodeId: null, snappedWallId: null };
    }
    return snapPoint2D(pt, {
      gridSize: this.gridSize,
      snapToGrid: this.snapToGrid,
      nodes: this.floor.nodes,
      walls: this.floor.walls,
      nodeSnapRadius: 0.25,
      anchorPoint: anchor,
      snapAngleDeg: this.snapAngleDeg,
      excludeNodeIds
    });
  }

  // Keyboard Handlers
  private handleGlobalKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.code === 'Space' && !this.spaceHeld) {
      this.spaceHeld = true;
      this.requestUpdate();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelected();
    } else if (e.key === 'Escape') {
      this.cancelActiveOperation();
    }
  };

  private handleGlobalKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      this.requestUpdate();
    }
  };

  private cancelActiveOperation(): void {
    if (this.wallDrawStartPoint || this.wallDrawStartNodeId) {
      this.wallDrawStartPoint = null;
      this.wallDrawStartNodeId = null;
    } else if (this.roomDrawPoints.length > 0) {
      this.roomDrawPoints = [];
    } else if (this.measureP1) {
      this.measureP1 = null;
      this.measureP2 = null;
      this.measureLocked = false;
    } else if (this.selection.kind !== 'none') {
      this.emitSelectionChange({ kind: 'none', id: null });
    }
    this.requestUpdate();
  }

  private deleteSelected(): void {
    if (!this.floor || this.selection.kind === 'none' || !this.selection.id) return;
    const { kind, id } = this.selection;
    const updatedFloor: FloorLevel = { ...this.floor };
    let desc = '';

    if (kind === 'node') {
      const removedWallIds = new Set(
        updatedFloor.walls.filter((w) => w.start_node_id === id || w.end_node_id === id).map((w) => w.id)
      );
      updatedFloor.nodes = updatedFloor.nodes.filter((n) => n.id !== id);
      updatedFloor.walls = updatedFloor.walls.filter((w) => !removedWallIds.has(w.id));
      updatedFloor.openings = updatedFloor.openings.filter((o) => !removedWallIds.has(o.wall_id));
      updatedFloor.rooms = updatedFloor.rooms
        .map((r) => ({
          ...r,
          points: r.points.filter((p) => p.node_id !== id)
        }))
        .filter((r) => r.points.length >= 3);
      desc = 'Deleted wall node';
    } else if (kind === 'wall') {
      updatedFloor.walls = updatedFloor.walls.filter((w) => w.id !== id);
      updatedFloor.openings = updatedFloor.openings.filter((o) => o.wall_id !== id);
      desc = 'Deleted wall';
    } else if (kind === 'opening') {
      updatedFloor.openings = updatedFloor.openings.filter((o) => o.id !== id);
      desc = 'Deleted opening';
    } else if (kind === 'room') {
      updatedFloor.rooms = updatedFloor.rooms.filter((r) => r.id !== id);
      desc = 'Deleted room';
    } else if (kind === 'furniture') {
      updatedFloor.furniture = updatedFloor.furniture.filter((f) => f.id !== id);
      desc = 'Deleted furniture';
    } else if (kind === 'entity') {
      updatedFloor.entities = updatedFloor.entities.filter((e) => e.id !== id);
      desc = 'Deleted entity placement';
    }

    this.floor = updatedFloor;
    this.emitSelectionChange({ kind: 'none', id: null });
    this.emitFloorChange(updatedFloor, desc);
  }

  // Wheel Zoom
  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    const mouseWorldBefore = this.screenToWorld(mouseScreenX, mouseScreenY);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newPpm = Math.max(20, Math.min(250, this.pixelsPerMeter * zoomFactor));

    this.panX = mouseWorldBefore.x - (mouseScreenX - this.canvasWidth / 2) / newPpm;
    this.panY = mouseWorldBefore.y - (mouseScreenY - this.canvasHeight / 2) / newPpm;
    this.pixelsPerMeter = newPpm;
  }

  // Pointer Interaction
  private handleSvgPointerDown(e: PointerEvent): void {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const isPanTrigger = e.button === 1 || e.button === 2 || (e.button === 0 && this.spaceHeld);

    if (isPanTrigger) {
      e.preventDefault();
      this.isPanning = true;
      this.panStartScreen = { x: e.clientX, y: e.clientY };
      this.panStartWorld = { x: this.panX, y: this.panY };
      this.didPanMove = false;
      return;
    }

    if (e.button !== 0 || !this.floor) return;

    // Single-Finger Empty-Canvas Pan in 'select' Mode
    if (this.toolMode === 'select' && !this.isItemDragging && this.activePointers.size === 1) {
      this.isPanning = true;
      this.panStartScreen = { x: e.clientX, y: e.clientY };
      this.panStartWorld = { x: this.panX, y: this.panY };
      this.didPanMove = false;
      return;
    }

    const rect = this.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPt = this.screenToWorld(screenX, screenY);

    if (this.toolMode === 'draw_wall') {
      this.handleDrawWallClick(worldPt);
    } else if (this.toolMode === 'draw_room') {
      this.handleDrawRoomClick(worldPt);
    } else if (this.toolMode === 'add_opening') {
      this.handleAddOpeningClick();
    } else if (this.toolMode === 'measure') {
      this.handleMeasureClick(worldPt);
    }
  }

  private handleGlobalPointerMove = (e: PointerEvent): void => {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Multi-Touch Pinch-to-Zoom & Two-Finger Pan (All Tool Modes)
    if (this.activePointers.size === 2) {
      if (this.isItemDragging) {
        this.isItemDragging = false;
        this.dragKind = null;
        this.dragItemId = null;
      }
      this.isPanning = false;

      const pts = Array.from(this.activePointers.values());
      const rect = this.getBoundingClientRect();
      const s1 = { x: pts[0].x - rect.left, y: pts[0].y - rect.top };
      const s2 = { x: pts[1].x - rect.left, y: pts[1].y - rect.top };

      const dist = Math.hypot(s2.x - s1.x, s2.y - s1.y);
      const center = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

      if (this.prevPinchDist && this.prevPinchCenter && this.prevPinchDist > 10) {
        const ratio = dist / this.prevPinchDist;
        const newPpm = Math.max(20, Math.min(250, this.pixelsPerMeter * ratio));

        // Keep the world point under prevPinchCenter anchored while applying center translation
        const worldUnderPrevCenter = {
          x: this.panX + (this.prevPinchCenter.x - this.canvasWidth / 2) / this.pixelsPerMeter,
          y: this.panY + (this.prevPinchCenter.y - this.canvasHeight / 2) / this.pixelsPerMeter
        };

        this.panX = worldUnderPrevCenter.x - (center.x - this.canvasWidth / 2) / newPpm;
        this.panY = worldUnderPrevCenter.y - (center.y - this.canvasHeight / 2) / newPpm;
        this.pixelsPerMeter = newPpm;
      }

      this.prevPinchDist = dist;
      this.prevPinchCenter = center;
      return;
    }

    if (this.activePointers.size < 2) {
      this.prevPinchDist = null;
      this.prevPinchCenter = null;
    }

    if (this.isPanning) {
      const dx = (e.clientX - this.panStartScreen.x) / this.pixelsPerMeter;
      const dy = (e.clientY - this.panStartScreen.y) / this.pixelsPerMeter;
      this.panX = this.panStartWorld.x - dx;
      this.panY = this.panStartWorld.y - dy;
      if (Math.hypot(e.clientX - this.panStartScreen.x, e.clientY - this.panStartScreen.y) > 5) {
        this.didPanMove = true;
      }
      return;
    }

    const rect = this.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    this.cursorWorld = this.screenToWorld(screenX, screenY);

    if (this.toolMode === 'draw_wall' && this.wallDrawStartPoint) {
      const snap = this.getSnapResult(this.cursorWorld, this.wallDrawStartPoint);
      this.snappedCursor = snap.point;
    } else {
      const snap = this.getSnapResult(this.cursorWorld);
      this.snappedCursor = snap.point;
    }

    if (this.toolMode === 'add_opening' && this.floor) {
      this.updateOpeningHover(this.cursorWorld);
    }

    if (this.isItemDragging && this.floor) {
      this.handleItemDragMove(this.cursorWorld);
    }

    if (this.toolMode === 'measure' && this.measureP1 && !this.measureLocked) {
      this.measureP2 = this.snappedCursor;
    }
  };

  private handleGlobalPointerUp = (e: PointerEvent): void => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.prevPinchDist = null;
      this.prevPinchCenter = null;
    }

    if (this.isPanning) {
      this.isPanning = false;
      // If was in select mode and user tapped empty background (not a room/wall) without panning, clear selection
      if (this.toolMode === 'select' && !this.didPanMove && !this.panStartedOnSelectable) {
        this.emitSelectionChange({ kind: 'none', id: null });
      }
      this.panStartedOnSelectable = false;
    }

    if (this.isItemDragging && this.floor) {
      this.isItemDragging = false;
      const desc =
        this.dragKind === 'furniture_rotate'
          ? 'Rotated furniture'
          : `Moved ${this.dragKind || 'item'}`;
      this.emitFloorChange(this.floor, desc);
      this.dragKind = null;
      this.dragItemId = null;
    }
  };

  // Tool: draw_wall
  private handleDrawWallClick(pt: Point2D): void {
    if (!this.floor) return;

    if (!this.wallDrawStartPoint) {
      // First point of wall
      const snap = this.getSnapResult(pt);
      if (snap.snappedNodeId) {
        this.wallDrawStartNodeId = snap.snappedNodeId;
        this.wallDrawStartPoint = snap.point;
      } else {
        const newNode: WallNode = {
          id: 'node_' + Math.random().toString(36).substring(2, 9),
          x: Number(snap.point.x.toFixed(3)),
          y: Number(snap.point.y.toFixed(3))
        };
        const updatedFloor = {
          ...this.floor,
          nodes: [...this.floor.nodes, newNode]
        };
        this.floor = updatedFloor;
        this.wallDrawStartNodeId = newNode.id;
        this.wallDrawStartPoint = { x: newNode.x, y: newNode.y };
        this.emitFloorChange(updatedFloor, 'Added wall start node');
      }
    } else {
      // Second point of wall segment
      const snap = this.getSnapResult(pt, this.wallDrawStartPoint);
      const dist = distance2D(this.wallDrawStartPoint, snap.point);
      if (dist < 0.1) return; // Prevent zero-length wall

      let endNodeId = snap.snappedNodeId;
      let updatedNodes = [...this.floor.nodes];

      if (!endNodeId) {
        const newNode: WallNode = {
          id: 'node_' + Math.random().toString(36).substring(2, 9),
          x: Number(snap.point.x.toFixed(3)),
          y: Number(snap.point.y.toFixed(3))
        };
        updatedNodes.push(newNode);
        endNodeId = newNode.id;
      }

      if (endNodeId === this.wallDrawStartNodeId) return;

      const newWall: WallEdge = {
        id: 'wall_' + Math.random().toString(36).substring(2, 9),
        start_node_id: this.wallDrawStartNodeId!,
        end_node_id: endNodeId,
        thickness: 0.15,
        height_override: null,
        is_exterior: false,
        color_override: null
      };

      const updatedFloor: FloorLevel = {
        ...this.floor,
        nodes: updatedNodes,
        walls: [...this.floor.walls, newWall]
      };

      this.floor = updatedFloor;
      this.emitFloorChange(updatedFloor, 'Added wall segment');

      // Continue chain
      this.wallDrawStartNodeId = endNodeId;
      this.wallDrawStartPoint = snap.point;
    }
  }

  // Tool: draw_room
  private handleDrawRoomClick(pt: Point2D): void {
    if (!this.floor) return;
    const snap = this.getSnapResult(pt);

    // If near first point and length >= 3, close polygon
    if (this.roomDrawPoints.length >= 3) {
      const first = this.roomDrawPoints[0];
      if (distance2D(snap.point, first) < 0.35) {
        this.finishRoomPolygon();
        return;
      }
    }

    this.roomDrawPoints = [
      ...this.roomDrawPoints,
      { x: snap.point.x, y: snap.point.y, node_id: snap.snappedNodeId }
    ];
  }

  private finishRoomPolygon(): void {
    if (!this.floor || this.roomDrawPoints.length < 3) return;

    const newRoom: RoomPolygon = {
      id: 'room_' + Math.random().toString(36).substring(2, 9),
      name: `Room ${this.floor.rooms.length + 1}`,
      ha_area_id: null,
      points: [...this.roomDrawPoints],
      floor_material: 'wood_oak',
      floor_color: '#334155',
      show_label: true,
      temp_entity_id: null,
      humidity_entity_id: null,
      motion_entity_id: null,
      room_tap_action: { action: 'default' }
    };

    const updatedFloor: FloorLevel = {
      ...this.floor,
      rooms: [...this.floor.rooms, newRoom]
    };

    this.floor = updatedFloor;
    this.roomDrawPoints = [];
    this.emitFloorChange(updatedFloor, `Created ${newRoom.name}`);
    this.emitSelectionChange({ kind: 'room', id: newRoom.id });
  }

  // Tool: add_opening
  private updateOpeningHover(pt: Point2D): void {
    if (!this.floor) return;
    const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));

    let bestWall: WallEdge | null = null;
    let bestProj: { point: Point2D; t: number; distance: number } | null = null;
    let minDist = 0.6; // 60cm proximity

    for (const wall of this.floor.walls) {
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) continue;

      const proj = projectPointOntoSegment(pt, a, b);
      if (proj.distance < minDist) {
        minDist = proj.distance;
        bestWall = wall;
        bestProj = proj;
      }
    }

    if (bestWall && bestProj) {
      this.hoverWallId = bestWall.id;
      this.hoverWallT = bestProj.t;
      this.hoverOpeningPoint = bestProj.point;
    } else {
      this.hoverWallId = null;
      this.hoverOpeningPoint = null;
    }
  }

  private handleAddOpeningClick(): void {
    if (!this.floor || !this.hoverWallId || !this.hoverOpeningPoint) return;

    const isDoor = this.pendingOpeningType.startsWith('door');
    const width = isDoor ? 0.9 : 1.2;

    const newOpening: WallOpening = {
      id: 'op_' + Math.random().toString(36).substring(2, 9),
      wall_id: this.hoverWallId,
      type: this.pendingOpeningType,
      t: Number(this.hoverWallT.toFixed(3)),
      width,
      sill_height: isDoor ? 0.0 : 0.9,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: null
    };

    const updatedFloor: FloorLevel = {
      ...this.floor,
      openings: [...this.floor.openings, newOpening]
    };

    this.floor = updatedFloor;
    this.emitFloorChange(updatedFloor, `Added ${this.pendingOpeningType}`);
    this.emitSelectionChange({ kind: 'opening', id: newOpening.id });
  }

  // Tool: measure
  private handleMeasureClick(pt: Point2D): void {
    const snap = this.getSnapResult(pt);
    if (!this.measureP1 || this.measureLocked) {
      this.measureP1 = snap.point;
      this.measureP2 = snap.point;
      this.measureLocked = false;
    } else {
      this.measureP2 = snap.point;
      this.measureLocked = true;
    }
  }

  // Item Dragging Logic in 'select' Mode
  private updateCursorFromPointerEvent(e: PointerEvent): void {
    const rect = this.getBoundingClientRect();
    this.cursorWorld = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  private startNodeDrag(e: PointerEvent, node: WallNode): void {
    if (this.toolMode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.updateCursorFromPointerEvent(e);
    this.emitSelectionChange({ kind: 'node', id: node.id });
    this.dragKind = 'node';
    this.dragItemId = node.id;
    this.dragStartWorld = { x: node.x, y: node.y };
    this.itemOriginalPos = { x: node.x, y: node.y };
    this.isItemDragging = true;
  }

  private startFurnitureDrag(e: PointerEvent, furniture: FurnitureItem): void {
    if (this.toolMode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.updateCursorFromPointerEvent(e);
    this.emitSelectionChange({ kind: 'furniture', id: furniture.id });
    this.dragKind = 'furniture';
    this.dragItemId = furniture.id;
    this.dragStartWorld = { ...this.cursorWorld };
    this.itemOriginalPos = { x: furniture.x, y: furniture.y };
    this.isItemDragging = true;
  }

  private startFurnitureRotate(e: PointerEvent, furniture: FurnitureItem): void {
    if (this.toolMode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.updateCursorFromPointerEvent(e);
    this.emitSelectionChange({ kind: 'furniture', id: furniture.id });
    this.dragKind = 'furniture_rotate';
    this.dragItemId = furniture.id;
    this.itemOriginalPos = { x: furniture.x, y: furniture.y };
    this.isItemDragging = true;
  }

  private startEntityDrag(e: PointerEvent, entity: EntityPlacement): void {
    if (this.toolMode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.updateCursorFromPointerEvent(e);
    this.emitSelectionChange({ kind: 'entity', id: entity.id });
    this.dragKind = 'entity';
    this.dragItemId = entity.id;
    this.dragStartWorld = { ...this.cursorWorld };
    this.itemOriginalPos = { x: entity.x, y: entity.y };
    this.isItemDragging = true;
  }

  private startOpeningDrag(e: PointerEvent, opening: WallOpening): void {
    if (this.toolMode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.updateCursorFromPointerEvent(e);
    this.emitSelectionChange({ kind: 'opening', id: opening.id });
    this.dragKind = 'opening';
    this.dragItemId = opening.id;
    this.isItemDragging = true;
  }

  private handleItemDragMove(worldPt: Point2D): void {
    if (!this.floor || !this.dragItemId) return;

    if (this.dragKind === 'node') {
      const snap = this.getSnapResult(worldPt, undefined, new Set([this.dragItemId]));
      const nx = snap.point.x;
      const ny = snap.point.y;

      const updatedNodes = this.floor.nodes.map((n) =>
        n.id === this.dragItemId ? { ...n, x: nx, y: ny } : n
      );
      const updatedRooms = this.floor.rooms.map((r) => ({
        ...r,
        points: r.points.map((p) => (p.node_id === this.dragItemId ? { ...p, x: nx, y: ny } : p))
      }));

      this.floor = {
        ...this.floor,
        nodes: updatedNodes,
        rooms: updatedRooms
      };
    } else if (this.dragKind === 'furniture') {
      const dx = worldPt.x - this.dragStartWorld.x;
      const dy = worldPt.y - this.dragStartWorld.y;
      let rawX = this.itemOriginalPos.x + dx;
      let rawY = this.itemOriginalPos.y + dy;

      if (this.snapToGrid && this.gridSize > 0) {
        rawX = Math.round(rawX / this.gridSize) * this.gridSize;
        rawY = Math.round(rawY / this.gridSize) * this.gridSize;
      }

      this.floor = {
        ...this.floor,
        furniture: this.floor.furniture.map((f) =>
          f.id === this.dragItemId ? { ...f, x: Number(rawX.toFixed(3)), y: Number(rawY.toFixed(3)) } : f
        )
      };
    } else if (this.dragKind === 'furniture_rotate') {
      const cx = this.itemOriginalPos.x;
      const cy = this.itemOriginalPos.y;
      const rawRad = Math.atan2(worldPt.y - cy, worldPt.x - cx);
      let deg = (rawRad * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      deg = deg % 360;

      if (this.snapAngleDeg > 0) {
        deg = Math.round(deg / this.snapAngleDeg) * this.snapAngleDeg;
      }

      this.floor = {
        ...this.floor,
        furniture: this.floor.furniture.map((f) =>
          f.id === this.dragItemId ? { ...f, rotation_deg: deg % 360 } : f
        )
      };
    } else if (this.dragKind === 'entity') {
      const dx = worldPt.x - this.dragStartWorld.x;
      const dy = worldPt.y - this.dragStartWorld.y;
      let rawX = this.itemOriginalPos.x + dx;
      let rawY = this.itemOriginalPos.y + dy;

      if (this.snapToGrid && this.gridSize > 0) {
        rawX = Math.round(rawX / this.gridSize) * this.gridSize;
        rawY = Math.round(rawY / this.gridSize) * this.gridSize;
      }

      // Auto-update containing room via pointInPolygon2D
      const newPos = { x: rawX, y: rawY };
      const room = this.floor.rooms.find((r) => pointInPolygon2D(newPos, r.points));

      this.floor = {
        ...this.floor,
        entities: this.floor.entities.map((e) =>
          e.id === this.dragItemId
            ? { ...e, x: Number(rawX.toFixed(3)), y: Number(rawY.toFixed(3)), room_id: room ? room.id : null }
            : e
        )
      };
    } else if (this.dragKind === 'opening') {
      const opening = this.floor.openings.find((o) => o.id === this.dragItemId);
      if (!opening) return;
      const wall = this.floor.walls.find((w) => w.id === opening.wall_id);
      if (!wall) return;
      const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) return;

      const proj = projectPointOntoSegment(worldPt, a, b);
      const wallLen = distance2D(a, b);
      const halfT = opening.width / 2 / Math.max(0.1, wallLen);
      const clampedT = Math.max(halfT, Math.min(1 - halfT, proj.t));

      this.floor = {
        ...this.floor,
        openings: this.floor.openings.map((o) =>
          o.id === this.dragItemId ? { ...o, t: Number(clampedT.toFixed(3)) } : o
        )
      };
    }
  }

  // HTML5 Drag and Drop Target
  private handleDragOver(e: DragEvent): void {
    if (e.dataTransfer?.types.includes('application/x-floorplan-palette')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (!this.floor) return;

    const raw = e.dataTransfer?.getData('application/x-floorplan-palette');
    if (!raw) return;

    let payload: PaletteDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const rect = this.getBoundingClientRect();
    const dropWorld = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const snap = this.getSnapResult(dropWorld);
    const pos = snap.point;

    if (payload.kind === 'entity') {
      const domain = payload.domain || (payload.entityId ? payload.entityId.split('.')[0] : 'switch');
      const containingRoom = this.floor.rooms.find((r) => pointInPolygon2D(pos, r.points));

      let zElevation = 1.2;
      let meshType: EntityPlacement['mesh_type'] = 'none';
      let lightConfig: EntityPlacement['light_config'] | undefined = undefined;

      if (domain === 'light') {
        zElevation = 2.4;
        meshType = 'ceiling_light';
        lightConfig = {
          kind: 'point',
          radius_m: 4.5,
          intensity_multiplier: 1.0,
          cast_real_point_light: true
        };
      } else if (domain === 'media_player') {
        zElevation = 0.8;
        meshType = 'tv_screen';
      } else if (domain === 'fan') {
        zElevation = 2.4;
        meshType = 'ceiling_fan';
      } else if (domain === 'climate') {
        zElevation = 1.5;
        meshType = 'thermostat';
      }

      const newEntity: EntityPlacement = {
        id: 'ent_' + Math.random().toString(36).substring(2, 9),
        entity_id: payload.entityId || 'light.new_entity',
        domain,
        room_id: containingRoom ? containingRoom.id : null,
        x: Number(pos.x.toFixed(3)),
        y: Number(pos.y.toFixed(3)),
        z_elevation: zElevation,
        rotation_deg: 0,
        light_config: lightConfig,
        mesh_type: meshType,
        mesh_scale: [1, 1, 1],
        badge: {
          visible: true,
          style: 'compact_pill',
          label_override: payload.label || null,
          icon_override: null
        },
        tap_action: { action: 'toggle' },
        hold_action: { action: 'more-info' },
        double_tap_action: { action: 'none' }
      };

      const updatedFloor: FloorLevel = {
        ...this.floor,
        entities: [...this.floor.entities, newEntity]
      };
      this.floor = updatedFloor;
      this.emitFloorChange(updatedFloor, `Placed entity ${newEntity.entity_id}`);
      this.emitSelectionChange({ kind: 'entity', id: newEntity.id });
    } else if (payload.kind === 'furniture') {
      const fType: FurnitureCatalogType = payload.furnitureType || 'chair';
      const dims = this.getDefaultFurnitureDimensions(fType);

      const newFurniture: FurnitureItem = {
        id: 'furn_' + Math.random().toString(36).substring(2, 9),
        catalog_type: fType,
        label: payload.label || this.formatFurnitureName(fType),
        x: Number(pos.x.toFixed(3)),
        y: Number(pos.y.toFixed(3)),
        z_elevation: 0.0,
        width: payload.defaultWidth ?? dims.width,
        depth: payload.defaultDepth ?? dims.depth,
        height: payload.defaultHeight ?? dims.height,
        rotation_deg: 0,
        color: null
      };

      const updatedFloor: FloorLevel = {
        ...this.floor,
        furniture: [...this.floor.furniture, newFurniture]
      };
      this.floor = updatedFloor;
      this.emitFloorChange(updatedFloor, `Placed furniture ${newFurniture.label}`);
      this.emitSelectionChange({ kind: 'furniture', id: newFurniture.id });
    } else if (payload.kind === 'opening') {
      const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));
      let nearestWall: WallEdge | null = null;
      let nearestProj: { point: Point2D; t: number; distance: number } | null = null;
      let minDist = 0.8;

      for (const wall of this.floor.walls) {
        const a = nodeMap.get(wall.start_node_id);
        const b = nodeMap.get(wall.end_node_id);
        if (!a || !b) continue;
        const proj = projectPointOntoSegment(pos, a, b);
        if (proj.distance < minDist) {
          minDist = proj.distance;
          nearestWall = wall;
          nearestProj = proj;
        }
      }

      if (nearestWall && nearestProj) {
        const opType = payload.openingType || 'door_single';
        const isDoor = opType.startsWith('door');
        const newOpening: WallOpening = {
          id: 'op_' + Math.random().toString(36).substring(2, 9),
          wall_id: nearestWall.id,
          type: opType,
          t: Number(nearestProj.t.toFixed(3)),
          width: isDoor ? 0.9 : 1.2,
          sill_height: isDoor ? 0.0 : 0.9,
          head_height: 2.1,
          swing_direction: 'left_in',
          bound_entity_id: null
        };

        const updatedFloor: FloorLevel = {
          ...this.floor,
          openings: [...this.floor.openings, newOpening]
        };
        this.floor = updatedFloor;
        this.emitFloorChange(updatedFloor, `Placed opening ${opType}`);
        this.emitSelectionChange({ kind: 'opening', id: newOpening.id });
      }
    }
  }

  private getDefaultFurnitureDimensions(type: FurnitureCatalogType): { width: number; depth: number; height: number } {
    switch (type) {
      case 'sofa_straight': return { width: 2.0, depth: 0.9, height: 0.85 };
      case 'sofa_l_shape': return { width: 2.4, depth: 1.8, height: 0.85 };
      case 'bed_double': return { width: 1.8, depth: 2.0, height: 0.9 };
      case 'bed_single': return { width: 1.0, depth: 2.0, height: 0.9 };
      case 'dining_table': return { width: 1.6, depth: 0.9, height: 0.75 };
      case 'desk': return { width: 1.4, depth: 0.7, height: 0.75 };
      case 'chair': return { width: 0.5, depth: 0.5, height: 0.85 };
      case 'tv_stand': return { width: 1.8, depth: 0.45, height: 0.5 };
      case 'kitchen_counter': return { width: 1.8, depth: 0.65, height: 0.9 };
      case 'refrigerator': return { width: 0.8, depth: 0.7, height: 1.8 };
      case 'stove': return { width: 0.7, depth: 0.65, height: 0.9 };
      case 'sink_cabinet': return { width: 1.0, depth: 0.65, height: 0.9 };
      case 'bathtub': return { width: 1.7, depth: 0.75, height: 0.55 };
      case 'shower_enclosure': return { width: 1.0, depth: 1.0, height: 2.0 };
      case 'toilet': return { width: 0.5, depth: 0.7, height: 0.8 };
      case 'wardrobe': return { width: 1.5, depth: 0.6, height: 2.1 };
      case 'bookcase': return { width: 1.0, depth: 0.35, height: 2.0 };
      case 'potted_plant': return { width: 0.5, depth: 0.5, height: 0.9 };
      case 'rug': return { width: 2.0, depth: 1.5, height: 0.02 };
      default: return { width: 1.0, depth: 1.0, height: 1.0 };
    }
  }

  private formatFurnitureName(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // --- SVG Rendering Subroutines ---

  private renderGrid() {
    const minW = this.screenToWorld(0, 0);
    const maxW = this.screenToWorld(this.canvasWidth, this.canvasHeight);

    const startX = Math.floor(minW.x);
    const endX = Math.ceil(maxW.x);
    const startY = Math.floor(minW.y);
    const endY = Math.ceil(maxW.y);

    const lines: unknown[] = [];

    // Minor grid (if sufficiently zoomed in)
    if (this.pixelsPerMeter > 45 && this.gridSize >= 0.05) {
      const step = this.gridSize;
      const subStartX = Math.floor(minW.x / step) * step;
      const subEndX = Math.ceil(maxW.x / step) * step;
      const subStartY = Math.floor(minW.y / step) * step;
      const subEndY = Math.ceil(maxW.y / step) * step;

      for (let x = subStartX; x <= subEndX; x += step) {
        if (Math.abs(x - Math.round(x)) > 1e-4) {
          lines.push(svg`
            <line
              x1="${this.sx(x)}" y1="0" x2="${this.sx(x)}" y2="${this.canvasHeight}"
              stroke="var(--divider-color, #1e293b)" stroke-width="0.5" stroke-opacity="0.25"
            />
          `);
        }
      }
      for (let y = subStartY; y <= subEndY; y += step) {
        if (Math.abs(y - Math.round(y)) > 1e-4) {
          lines.push(svg`
            <line
              x1="0" y1="${this.sy(y)}" x2="${this.canvasWidth}" y2="${this.sy(y)}"
              stroke="var(--divider-color, #1e293b)" stroke-width="0.5" stroke-opacity="0.25"
            />
          `);
        }
      }
    }

    // Major 1-meter grid
    for (let x = startX; x <= endX; x++) {
      const isOrigin = Math.abs(x) < 1e-4;
      lines.push(svg`
        <line
          x1="${this.sx(x)}" y1="0" x2="${this.sx(x)}" y2="${this.canvasHeight}"
          stroke="var(--divider-color, #334155)"
          stroke-width="${isOrigin ? 1.5 : 0.8}"
          stroke-opacity="${isOrigin ? 0.9 : 0.45}"
        />
      `);
    }

    for (let y = startY; y <= endY; y++) {
      const isOrigin = Math.abs(y) < 1e-4;
      lines.push(svg`
        <line
          x1="0" y1="${this.sy(y)}" x2="${this.canvasWidth}" y2="${this.sy(y)}"
          stroke="var(--divider-color, #334155)"
          stroke-width="${isOrigin ? 1.5 : 0.8}"
          stroke-opacity="${isOrigin ? 0.9 : 0.45}"
        />
      `);
    }

    return lines;
  }

  private renderBlueprint() {
    if (!this.floor?.blueprint?.image_url) return nothing;
    const bp = this.floor.blueprint;
    const wPx = bp.natural_width_px * bp.meters_per_pixel * this.pixelsPerMeter;
    const hPx = bp.natural_height_px * bp.meters_per_pixel * this.pixelsPerMeter;
    const xPx = this.sx(bp.offset_x);
    const yPx = this.sy(bp.offset_y);

    return svg`
      <g
        transform="rotate(${bp.rotation_deg}, ${xPx + wPx / 2}, ${yPx + hPx / 2})"
        opacity="${bp.opacity}"
        style="pointer-events: none;"
      >
        <image
          href="${bp.image_url}"
          x="${xPx}"
          y="${yPx}"
          width="${wPx}"
          height="${hPx}"
        />
      </g>
    `;
  }

  private renderGhostFloor() {
    if (!this.ghostFloor) return nothing;
    const ghost = this.ghostFloor;
    const nodeMap = new Map(ghost.nodes.map((n) => [n.id, n]));

    return svg`
      <g class="ghost-layer">
        <!-- Ghost Rooms -->
        ${ghost.rooms.map((r) => {
          if (!r.points || r.points.length < 3) return nothing;
          const pts = r.points.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(' ');
          return svg`
            <polygon
              points="${pts}"
              fill="rgba(56, 189, 248, 0.05)"
              stroke="#38bdf8"
              stroke-width="1.5"
              stroke-dasharray="4,4"
            />
          `;
        })}
        <!-- Ghost Walls -->
        ${ghost.walls.map((w) => {
          const a = nodeMap.get(w.start_node_id);
          const b = nodeMap.get(w.end_node_id);
          if (!a || !b) return nothing;
          return svg`
            <line
              x1="${this.sx(a.x)}" y1="${this.sy(a.y)}"
              x2="${this.sx(b.x)}" y2="${this.sy(b.y)}"
              stroke="#38bdf8"
              stroke-width="${Math.max(2, w.thickness * this.pixelsPerMeter)}"
              stroke-dasharray="4,4"
            />
          `;
        })}
      </g>
    `;
  }

  private renderRooms() {
    if (!this.floor) return nothing;

    return this.floor.rooms.map((room) => {
      if (!room.points || room.points.length < 3) return nothing;
      const pts = room.points.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(' ');
      const isSelected = this.selection.kind === 'room' && this.selection.id === room.id;

      let labelX = 0;
      let labelY = 0;
      let areaStr = '';

      if (room.show_label) {
        const center = findPolygonLabelCenter2D(room.points);
        labelX = this.sx(center.x);
        labelY = this.sy(center.y);
        areaStr = `${polygonArea2D(room.points).toFixed(1)} m²`;
      }

      return svg`
        <g class="room-group">
          <polygon
            class="room-polygon"
            points="${pts}"
            fill="${room.floor_color || '#334155'}"
            fill-opacity="${isSelected ? 0.5 : 0.3}"
            stroke="${isSelected ? '#38bdf8' : '#475569'}"
            stroke-width="${isSelected ? 2.5 : 1}"
            @pointerdown="${(e: PointerEvent) => {
              if (this.toolMode === 'select' && e.button === 0) {
                e.stopPropagation();
                this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                this.emitSelectionChange({ kind: 'room', id: room.id });
                if (this.activePointers.size === 1) {
                  this.isPanning = true;
                  this.panStartScreen = { x: e.clientX, y: e.clientY };
                  this.panStartWorld = { x: this.panX, y: this.panY };
                  this.didPanMove = false;
                  this.panStartedOnSelectable = true;
                }
              }
            }}"
          />
          ${room.show_label
            ? svg`
                <text
                  x="${labelX}"
                  y="${labelY - 6}"
                  fill="#f8fafc"
                  font-size="12"
                  font-weight="600"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${room.name}
                </text>
                <text
                  x="${labelX}"
                  y="${labelY + 10}"
                  fill="#94a3b8"
                  font-size="10"
                  font-weight="500"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${areaStr}
                </text>
              `
            : nothing}
        </g>
      `;
    });
  }

  private renderWalls(footprints: Map<string, WallMiterFootprint>) {
    if (!this.floor) return nothing;
    const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));

    return this.floor.walls.map((wall) => {
      const isSelected = this.selection.kind === 'wall' && this.selection.id === wall.id;
      const fp = footprints.get(wall.id);
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) return nothing;

      let quadPts = '';
      if (fp) {
        quadPts = fp.quad.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(' ');
      } else {
        // Fallback straight box
        const len = distance2D(a, b);
        if (len < 1e-4) return nothing;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        const hw = wall.thickness / 2;
        const nx = -uy * hw;
        const ny = ux * hw;
        quadPts = [
          `${this.sx(a.x + nx)},${this.sy(a.y + ny)}`,
          `${this.sx(b.x + nx)},${this.sy(b.y + ny)}`,
          `${this.sx(b.x - nx)},${this.sy(b.y - ny)}`,
          `${this.sx(a.x - nx)},${this.sy(a.y - ny)}`
        ].join(' ');
      }

      const wallLen = distance2D(a, b);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const normal = fp ? fp.normal : { x: -(b.y - a.y) / wallLen, y: (b.x - a.x) / wallLen };
      const labelOffset = 0.22;
      const labelPosX = this.sx(midX + normal.x * labelOffset);
      const labelPosY = this.sy(midY + normal.y * labelOffset);

      return svg`
        <g class="wall-group">
          <polygon
            class="wall-footprint"
            points="${quadPts}"
            fill="${wall.color_override || (isSelected ? '#0284c7' : '#475569')}"
            stroke="${isSelected ? '#38bdf8' : '#334155'}"
            stroke-width="${isSelected ? 2 : 1}"
            @pointerdown="${(e: PointerEvent) => {
              if (this.toolMode === 'select' && e.button === 0) {
                e.stopPropagation();
                this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                this.emitSelectionChange({ kind: 'wall', id: wall.id });
                if (this.activePointers.size === 1) {
                  this.isPanning = true;
                  this.panStartScreen = { x: e.clientX, y: e.clientY };
                  this.panStartWorld = { x: this.panX, y: this.panY };
                  this.didPanMove = false;
                  this.panStartedOnSelectable = true;
                }
              }
            }}"
          />
          ${wallLen > 0.6
            ? svg`
                <text
                  class="dimension-label"
                  x="${labelPosX}"
                  y="${labelPosY}"
                >
                  ${wallLen.toFixed(2)} m
                </text>
              `
            : nothing}
        </g>
      `;
    });
  }

  private renderOpenings() {
    if (!this.floor) return nothing;
    const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));
    const wallMap = new Map(this.floor.walls.map((w) => [w.id, w]));

    return this.floor.openings.map((opening) => {
      const wall = wallMap.get(opening.wall_id);
      if (!wall) return nothing;
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) return nothing;

      const wallLen = distance2D(a, b);
      if (wallLen < 1e-4) return nothing;

      const ux = (b.x - a.x) / wallLen;
      const uy = (b.y - a.y) / wallLen;
      const nx = -uy;
      const ny = ux;

      const ox = a.x + opening.t * (b.x - a.x);
      const oy = a.y + opening.t * (b.y - a.y);
      const hw = opening.width / 2;

      const p1 = { x: ox - hw * ux, y: oy - hw * uy };
      const p2 = { x: ox + hw * ux, y: oy + hw * uy };

      const isSelected = this.selection.kind === 'opening' && this.selection.id === opening.id;
      const strokeColor = isSelected ? '#38bdf8' : '#94a3b8';

      // Door leaf & swing arc calculation
      const isDoor = opening.type.startsWith('door');
      const isLeft = opening.swing_direction.startsWith('left');
      const isOut = opening.swing_direction.endsWith('out');

      const hinge = isLeft ? p1 : p2;
      const latch = isLeft ? p2 : p1;
      const normSign = isOut ? -1 : 1;

      const leafEnd = {
        x: hinge.x + normSign * opening.width * nx,
        y: hinge.y + normSign * opening.width * ny
      };

      const radPx = opening.width * this.pixelsPerMeter;
      const sweepFlag = (isLeft && !isOut) || (!isLeft && isOut) ? 1 : 0;

      return svg`
        <g
          class="opening-item"
          @pointerdown="${(e: PointerEvent) => this.startOpeningDrag(e, opening)}"
        >
          <!-- Transparent enlarged touch hit-box -->
          <line
            x1="${this.sx(p1.x)}" y1="${this.sy(p1.y)}"
            x2="${this.sx(p2.x)}" y2="${this.sy(p2.y)}"
            stroke="transparent"
            stroke-width="32"
          />

          <!-- Wall cutout line -->
          <line
            x1="${this.sx(p1.x)}" y1="${this.sy(p1.y)}"
            x2="${this.sx(p2.x)}" y2="${this.sy(p2.y)}"
            stroke="#0f172a"
            stroke-width="${Math.max(3, wall.thickness * this.pixelsPerMeter)}"
          />

          ${isDoor
            ? svg`
                <!-- Door Leaf -->
                <line
                  x1="${this.sx(hinge.x)}" y1="${this.sy(hinge.y)}"
                  x2="${this.sx(leafEnd.x)}" y2="${this.sy(leafEnd.y)}"
                  stroke="${strokeColor}"
                  stroke-width="2.5"
                />
                <!-- Door Swing Arc -->
                <path
                  d="M ${this.sx(latch.x)} ${this.sy(latch.y)} A ${radPx} ${radPx} 0 0 ${sweepFlag} ${this.sx(leafEnd.x)} ${this.sy(leafEnd.y)}"
                  fill="none"
                  stroke="${strokeColor}"
                  stroke-width="1.2"
                  stroke-dasharray="3,3"
                />
              `
            : svg`
                <!-- Window Double Line -->
                <line
                  x1="${this.sx(p1.x)}" y1="${this.sy(p1.y)}"
                  x2="${this.sx(p2.x)}" y2="${this.sy(p2.y)}"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                />
                <line
                  x1="${this.sx(p1.x + nx * (wall.thickness / 2))}" y1="${this.sy(p1.y + ny * (wall.thickness / 2))}"
                  x2="${this.sx(p2.x + nx * (wall.thickness / 2))}" y2="${this.sy(p2.y + ny * (wall.thickness / 2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
                <line
                  x1="${this.sx(p1.x - nx * (wall.thickness / 2))}" y1="${this.sy(p1.y - ny * (wall.thickness / 2))}"
                  x2="${this.sx(p2.x - nx * (wall.thickness / 2))}" y2="${this.sy(p2.y - ny * (wall.thickness / 2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
              `}
        </g>
      `;
    });
  }

  private renderWallNodes() {
    if (!this.floor) return nothing;

    return this.floor.nodes.map((node) => {
      const isSelected = this.selection.kind === 'node' && this.selection.id === node.id;
      const nx = this.sx(node.x);
      const ny = this.sy(node.y);

      return svg`
        <g
          class="wall-node"
          transform="translate(${nx}, ${ny})"
          @pointerdown="${(e: PointerEvent) => this.startNodeDrag(e, node)}"
        >
          <!-- Enlarged touch target -->
          <circle r="18" fill="transparent" />

          ${isSelected
            ? svg`
                <circle r="12" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2" />
              `
            : nothing}
          <circle
            r="${isSelected ? 7 : 5}"
            fill="${isSelected ? '#38bdf8' : '#94a3b8'}"
            stroke="#0f172a"
            stroke-width="1.5"
          />
        </g>
      `;
    });
  }

  private renderFurniture() {
    if (!this.floor) return nothing;

    return this.floor.furniture.map((item) => {
      const isSelected = this.selection.kind === 'furniture' && this.selection.id === item.id;
      const wPx = item.width * this.pixelsPerMeter;
      const dPx = item.depth * this.pixelsPerMeter;
      const strokeColor = isSelected ? '#38bdf8' : '#64748b';
      const rotHandleDist = dPx / 2 + 20;

      return svg`
        <g
          class="furniture-item"
          transform="translate(${this.sx(item.x)}, ${this.sy(item.y)}) rotate(${item.rotation_deg})"
          @pointerdown="${(e: PointerEvent) => this.startFurnitureDrag(e, item)}"
        >
          <!-- Main Bounding Box -->
          <rect
            x="${-wPx / 2}"
            y="${-dPx / 2}"
            width="${wPx}"
            height="${dPx}"
            rx="4"
            fill="${isSelected ? '#1e293b' : '#0f172a'}"
            fill-opacity="0.85"
            stroke="${strokeColor}"
            stroke-width="${isSelected ? 2 : 1}"
          />

          <!-- Facing Indicator Notch -->
          <path
            d="M ${-wPx * 0.25} ${-dPx / 2} L 0 ${-dPx / 2 + 6} L ${wPx * 0.25} ${-dPx / 2}"
            fill="none"
            stroke="${strokeColor}"
            stroke-width="1.5"
          />

          <!-- Label -->
          <text
            x="0"
            y="3"
            fill="#f8fafc"
            font-size="10"
            font-weight="500"
            text-anchor="middle"
            style="pointer-events: none;"
          >
            ${item.label}
          </text>

          <!-- Interactive Rotation Handle (When Selected) with Enlarged Touch Target -->
          ${isSelected
            ? svg`
                <line
                  x1="0" y1="${-dPx / 2}"
                  x2="0" y2="${-rotHandleDist}"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-dasharray="3,2"
                />
                <!-- Enlarged 18px touch hit-target -->
                <circle
                  cx="0"
                  cy="${-rotHandleDist}"
                  r="18"
                  fill="transparent"
                  class="rotation-handle"
                  @pointerdown="${(e: PointerEvent) => this.startFurnitureRotate(e, item)}"
                />
                <circle
                  class="rotation-handle"
                  cx="0"
                  cy="${-rotHandleDist}"
                  r="6"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  stroke-width="2"
                  style="pointer-events: none;"
                />
              `
            : nothing}
        </g>
      `;
    });
  }

  private renderEntities() {
    if (!this.floor) return nothing;

    return this.floor.entities.map((entity) => {
      const isSelected = this.selection.kind === 'entity' && this.selection.id === entity.id;
      const ex = this.sx(entity.x);
      const ey = this.sy(entity.y);

      let domainColor = '#3b82f6';
      let domainIcon = '🔘';

      switch (entity.domain) {
        case 'light':
          domainColor = '#eab308';
          domainIcon = '💡';
          break;
        case 'media_player':
          domainColor = '#8b5cf6';
          domainIcon = '📺';
          break;
        case 'fan':
          domainColor = '#14b8a6';
          domainIcon = '🌀';
          break;
        case 'climate':
          domainColor = '#06b6d4';
          domainIcon = '❄️';
          break;
        case 'binary_sensor':
        case 'sensor':
          domainColor = '#10b981';
          domainIcon = '📊';
          break;
      }

      return svg`
        <g
          class="entity-item"
          transform="translate(${ex}, ${ey})"
          @pointerdown="${(e: PointerEvent) => this.startEntityDrag(e, entity)}"
        >
          <!-- Enlarged 20px Touch Hit-Target -->
          <circle r="20" fill="transparent" />

          <!-- Light Falloff Circle Preview when selected -->
          ${isSelected && entity.light_config && entity.light_config.radius_m
            ? svg`
                <circle
                  r="${entity.light_config.radius_m * this.pixelsPerMeter}"
                  fill="rgba(253, 224, 71, 0.08)"
                  stroke="#facc15"
                  stroke-width="1.5"
                  stroke-dasharray="5,4"
                  style="pointer-events: none;"
                />
              `
            : nothing}

          <!-- Outer Selection Ring -->
          ${isSelected
            ? svg`
                <circle r="18" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,2" />
              `
            : nothing}

          <!-- Main Entity Badge -->
          <circle
            r="12"
            fill="${domainColor}"
            stroke="#ffffff"
            stroke-width="1.5"
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"
          />

          <!-- Domain Icon -->
          <text
            x="0"
            y="4"
            font-size="10"
            text-anchor="middle"
            style="pointer-events: none;"
          >
            ${domainIcon}
          </text>
        </g>
      `;
    });
  }

  private renderActiveToolPreviews() {
    const previews: unknown[] = [];

    // Draw Wall Segment Preview
    if (this.toolMode === 'draw_wall' && this.wallDrawStartPoint) {
      const p1 = this.wallDrawStartPoint;
      const p2 = this.snappedCursor;
      const len = distance2D(p1, p2);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      previews.push(svg`
        <g class="tool-preview">
          <line
            x1="${this.sx(p1.x)}" y1="${this.sy(p1.y)}"
            x2="${this.sx(p2.x)}" y2="${this.sy(p2.y)}"
            stroke="#38bdf8"
            stroke-width="2.5"
            stroke-dasharray="4,4"
          />
          <circle cx="${this.sx(p1.x)}" cy="${this.sy(p1.y)}" r="5" fill="#38bdf8" />
          <circle cx="${this.sx(p2.x)}" cy="${this.sy(p2.y)}" r="5" fill="#38bdf8" />
          <text
            x="${this.sx(mid.x)}"
            y="${this.sy(mid.y) - 10}"
            class="dimension-label"
            fill="#38bdf8"
          >
            ${len.toFixed(2)} m
          </text>
        </g>
      `);
    }

    // Draw Room Polygon Preview
    if (this.toolMode === 'draw_room' && this.roomDrawPoints.length > 0) {
      const allPts = [...this.roomDrawPoints, { x: this.snappedCursor.x, y: this.snappedCursor.y }];
      const ptsStr = allPts.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(' ');

      previews.push(svg`
        <g class="tool-preview">
          <polygon
            points="${ptsStr}"
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            stroke-width="2"
            stroke-dasharray="4,4"
          />
          ${this.roomDrawPoints.map(
            (p, idx) => svg`
              <circle
                cx="${this.sx(p.x)}" cy="${this.sy(p.y)}"
                r="${idx === 0 ? 7 : 4}"
                fill="${idx === 0 ? '#10b981' : '#38bdf8'}"
                stroke="#ffffff"
                stroke-width="1.5"
              />
            `
          )}
        </g>
      `);
    }

    // Add Opening Hover Ghost
    if (this.toolMode === 'add_opening' && this.hoverOpeningPoint) {
      previews.push(svg`
        <g class="tool-preview">
          <circle
            cx="${this.sx(this.hoverOpeningPoint.x)}"
            cy="${this.sy(this.hoverOpeningPoint.y)}"
            r="8"
            fill="#38bdf8"
            fill-opacity="0.5"
            stroke="#38bdf8"
            stroke-width="2"
          />
        </g>
      `);
    }

    // Measure Ruler
    if (this.toolMode === 'measure' && this.measureP1 && this.measureP2) {
      const p1 = this.measureP1;
      const p2 = this.measureP2;
      const dist = distance2D(p1, p2);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      previews.push(svg`
        <g class="tool-preview">
          <line
            x1="${this.sx(p1.x)}" y1="${this.sy(p1.y)}"
            x2="${this.sx(p2.x)}" y2="${this.sy(p2.y)}"
            stroke="#f59e0b"
            stroke-width="2"
            stroke-dasharray="4,2"
          />
          <circle cx="${this.sx(p1.x)}" cy="${this.sy(p1.y)}" r="4" fill="#f59e0b" />
          <circle cx="${this.sx(p2.x)}" cy="${this.sy(p2.y)}" r="4" fill="#f59e0b" />
          <rect
            x="${this.sx(mid.x) - 40}"
            y="${this.sy(mid.y) - 24}"
            width="80"
            height="20"
            rx="4"
            fill="var(--card-background-color, #0f172a)"
            stroke="#f59e0b"
            stroke-width="1"
          />
          <text
            x="${this.sx(mid.x)}"
            y="${this.sy(mid.y) - 10}"
            fill="#f59e0b"
            font-size="11"
            font-weight="bold"
            text-anchor="middle"
          >
            ${dist.toFixed(2)} m
          </text>
        </g>
      `);
    }

    return previews;
  }

  private renderTouchActionBar() {
    if (this.toolMode === 'draw_wall' && this.wallDrawStartPoint) {
      return html`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-success" @click="${() => this.cancelActiveOperation()}">
            ✓ Finish Wall
          </button>
          <button class="touch-pill touch-pill-danger" @click="${() => this.cancelActiveOperation()}">
            ✕ Cancel
          </button>
        </div>
      `;
    }

    if (this.toolMode === 'draw_room' && this.roomDrawPoints.length > 0) {
      return html`
        <div class="touch-action-bar">
          <button
            class="touch-pill touch-pill-success"
            ?disabled="${this.roomDrawPoints.length < 3}"
            @click="${() => this.finishRoomPolygon()}"
          >
            ✓ Complete Room (${this.roomDrawPoints.length})
          </button>
          <button class="touch-pill touch-pill-danger" @click="${() => this.cancelActiveOperation()}">
            ✕ Cancel
          </button>
        </div>
      `;
    }

    if (this.toolMode === 'measure' && this.measureP1) {
      return html`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-warning" @click="${() => this.cancelActiveOperation()}">
            ✕ Clear Measure
          </button>
        </div>
      `;
    }

    if (this.selection.kind !== 'none' && this.selection.id) {
      return html`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-danger" @click="${() => this.deleteSelected()}">
            🗑 Delete ${this.selection.kind}
          </button>
        </div>
      `;
    }

    return nothing;
  }

  override render() {
    const cursorClass = this.isPanning
      ? 'cursor-panning'
      : this.spaceHeld
      ? 'cursor-grab'
      : this.toolMode === 'select'
      ? 'cursor-select'
      : '';

    const footprints = this.floor
      ? solveWallMiterFootprints(this.floor.nodes, this.floor.walls, this.floor.rooms)
      : new Map<string, WallMiterFootprint>();

    // Scale bar calculation (1m, 2m, or 5m)
    let scaleUnit = 1;
    if (this.pixelsPerMeter < 35) scaleUnit = 5;
    else if (this.pixelsPerMeter < 70) scaleUnit = 2;
    const scaleBarPx = scaleUnit * this.pixelsPerMeter;

    return html`
      <div
        class="canvas-container"
        style="width: 100%; height: 100%; position: relative;"
        @wheel="${this.handleWheel}"
        @dragover="${this.handleDragOver}"
        @drop="${this.handleDrop}"
        @contextmenu="${(e: MouseEvent) => e.preventDefault()}"
      >
        <svg
          class="canvas-svg ${cursorClass}"
          @pointerdown="${this.handleSvgPointerDown}"
        >
          <!-- Background Grid -->
          <g class="grid-layer">
            ${this.renderGrid()}
          </g>

          <!-- Blueprint Background -->
          ${this.renderBlueprint()}

          <!-- Onion-skin Ghost Floor -->
          ${this.renderGhostFloor()}

          <!-- Rooms -->
          <g class="rooms-layer">
            ${this.renderRooms()}
          </g>

          <!-- Mitered Walls -->
          <g class="walls-layer">
            ${this.renderWalls(footprints)}
          </g>

          <!-- Openings (Doors & Windows) -->
          <g class="openings-layer">
            ${this.renderOpenings()}
          </g>

          <!-- Furniture Items -->
          <g class="furniture-layer">
            ${this.renderFurniture()}
          </g>

          <!-- Placed Smart Home Entities -->
          <g class="entities-layer">
            ${this.renderEntities()}
          </g>

          <!-- Wall Nodes -->
          <g class="nodes-layer">
            ${this.renderWallNodes()}
          </g>

          <!-- Active Tool & Interactive Previews -->
          ${this.renderActiveToolPreviews()}
        </svg>

        <!-- Floating On-Screen Touch Action Pills -->
        ${this.renderTouchActionBar()}

        <!-- Metric Scale & Coordinates HUD Overlay -->
        <div class="hud-overlay">
          <div class="hud-scale-bar">
            <span>${scaleUnit} m</span>
            <div class="scale-ruler" style="width: ${scaleBarPx}px;"></div>
          </div>
          <div class="hud-coords">
            <span>X: <strong>${this.cursorWorld.x.toFixed(2)} m</strong></span>
            <span>Y: <strong>${this.cursorWorld.y.toFixed(2)} m</strong></span>
            <span>Snap: <strong>${this.snapToGrid ? `${this.gridSize}m` : 'Off'}</strong></span>
          </div>
        </div>

        <!-- Tool Mode Badge -->
        <div class="hud-tool-badge">
          <span>Tool: <strong>${this.toolMode.toUpperCase()}</strong></span>
        </div>

        <!-- Floating Zoom & Fit Controls -->
        <div class="zoom-controls">
          <button class="zoom-btn" title="Zoom In" @click="${() => this.zoomIn()}">+</button>
          <button class="zoom-btn" title="Zoom Out" @click="${() => this.zoomOut()}">−</button>
          <button class="zoom-btn zoom-btn-fit" title="Fit to Floor" @click="${() => this.fitViewToFloor()}">⊡ Fit</button>
        </div>
      </div>
    `;
  }
}
