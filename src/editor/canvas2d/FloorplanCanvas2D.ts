import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import Konva from 'konva';
import type {
  EntityPlacement,
  FloorLevel,
  FurnitureItem,
  Point2D,
  RoomPolygon,
  WallNode,
  WallOpening
} from '../../types/floorplan';
import type { EditorSelection, EditorToolMode } from '../editor-contracts';
import {
  computeCalibrationMetersPerPixel,
  computeFloorBoundingBox2D,
  distance2D,
  findPolygonLabelCenter2D,
  midpoint2D,
  polygonArea2D,
  projectPointOntoSegment,
  snapPoint2D,
  solveWallMiterFootprints,
  splitWallIntervalsForOpenings,
  syncAutoDetectedRoomsFromWalls
} from '../../utils/geometry2d';

/**
 * Ensures HTMLCanvasElement.prototype.getContext('2d') returns a valid 2D context shim
 * in headless test environments (e.g. Vitest + jsdom) where native canvas is absent.
 */
function ensureCanvas2DContextSupport(): void {
  if (typeof HTMLCanvasElement === 'undefined' || typeof document === 'undefined') return;
  if (document.createElement('canvas').getContext('2d') !== null) {
    return;
  }
  const proto = HTMLCanvasElement.prototype;
  const origGetContext = proto.getContext;

  const createMock2DContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const noop = () => {};
    const ctx: Record<string, unknown> = {
      canvas,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      shadowColor: 'rgba(0,0,0,0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      lineCap: 'butt',
      lineDashOffset: 0,
      lineJoin: 'miter',
      lineWidth: 1,
      miterLimit: 10,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      arc: noop,
      arcTo: noop,
      beginPath: noop,
      bezierCurveTo: noop,
      clearRect: noop,
      clip: noop,
      closePath: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      createPattern: () => ({}),
      createRadialGradient: () => ({ addColorStop: noop }),
      drawImage: noop,
      ellipse: noop,
      fill: noop,
      fillRect: noop,
      fillText: noop,
      getImageData: (_x: number, _y: number, w = 1, h = 1) => ({
        data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
        width: w,
        height: h
      }),
      createImageData: (w = 1, h = 1) => ({
        data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
        width: w,
        height: h
      }),
      lineTo: noop,
      measureText: (text: string) => ({
        width: (text?.length ?? 0) * 6,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2
      }),
      moveTo: noop,
      putImageData: noop,
      quadraticCurveTo: noop,
      rect: noop,
      roundRect: noop,
      restore: noop,
      rotate: noop,
      save: noop,
      scale: noop,
      setLineDash: noop,
      getLineDash: () => [],
      setTransform: noop,
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      stroke: noop,
      strokeRect: noop,
      strokeText: noop,
      transform: noop,
      translate: noop,
      isPointInPath: () => false,
      isPointInStroke: () => false
    };
    return ctx as unknown as CanvasRenderingContext2D;
  };

  proto.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
    const res = origGetContext ? origGetContext.call(this, contextId as never, options as never) : null;
    if (res) return res;
    if (contextId === '2d') {
      return createMock2DContext(this) as never;
    }
    return null;
  } as typeof proto.getContext;
}

/**
 * `<floorplan-canvas-2d>`: Interactive 2D CAD Floorplan Viewport powered by **Konva.js**
 * and Mapbox **polylabel**, with automatic closed-wall planar room cycle detection.
 */
@customElement('floorplan-canvas-2d')
export class FloorplanCanvas2D extends LitElement {
  static styles = css`
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

    .konva-mount {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
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
      z-index: 10;
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
  `;

  @property({ attribute: false }) floor: FloorLevel | null = null;
  @property({ attribute: false }) ghostFloor: FloorLevel | null = null;
  @property({ type: String }) toolMode: EditorToolMode = 'select';
  @property({ attribute: false }) selection: EditorSelection = { kind: 'none', id: null };
  @property({ type: Number }) gridSize = 0.5;
  @property({ type: Boolean }) snapToGrid = true;
  @property({ type: Boolean }) showGrid = true;
  @property({ type: Boolean }) showBlueprint = true;

  // Viewport Transform State (metric world coordinates at center + pixelsPerMeter)
  @state() panX = 0;
  @state() panY = 0;
  @state() pixelsPerMeter = 60;
  @state() canvasWidth = 800;
  @state() canvasHeight = 600;
  @state() private cursorWorld: Point2D = { x: 0, y: 0 };
  @state() private snappedCursorWorld: Point2D = { x: 0, y: 0 };

  // Drawing / Calibration tool state
  @state() private wallChainStart: {
    point: Point2D;
    nodeId: string | null;
    wallId: string | null;
  } | null = null;
  @state() private roomChainPoints: Point2D[] = [];
  @state() private calibrationStartPoint: Point2D | null = null;
  @state() private openingPreview: { wallId: string; t: number; point: Point2D } | null = null;

  @query('.konva-mount') private konvaMountEl!: HTMLDivElement;

  // Konva Scene Graph instances
  public stage: Konva.Stage | null = null;
  private gridLayer: Konva.Layer | null = null;
  private sceneLayer: Konva.Layer | null = null;
  private overlayLayer: Konva.Layer | null = null;
  private transformer: Konva.Transformer | null = null;

  private resizeObserver: ResizeObserver | null = null;
  private blueprintImageCache = new Map<string, HTMLImageElement>();
  private activeFloorDraft: FloorLevel | null = null;
  private isSpacePressed = false;
  private isShiftPressed = false;
  private isPanningStage = false;
  private wallDrawDownHandled = false;
  private currentSnapResult: {
    point: Point2D;
    snappedNodeId: string | null;
    snappedWallId: string | null;
  } = { point: { x: 0, y: 0 }, snappedNodeId: null, snappedWallId: null };
  private panStartClient: Point2D = { x: 0, y: 0 };
  private panStartWorld: Point2D = { x: 0, y: 0 };

  // Multi-touch pinch state
  private activeTouchPoints = new Map<number, Point2D>();
  private pinchInitialDistance = 0;
  private pinchInitialScale = 60;
  private pinchInitialPan: Point2D = { x: 0, y: 0 };
  private pinchInitialMidScreen: Point2D = { x: 0, y: 0 };

  connectedCallback(): void {
    super.connectedCallback();
    Konva.dragDistance = 3; // 3px deadzone so tapping never causes micro-drag jitter
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
  }

  protected firstUpdated(): void {
    ensureCanvas2DContextSupport();
    this.initKonvaStage();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.syncKonvaViewport();
          }
        }
      });
      this.resizeObserver.observe(this);
    }

    const rect = this.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvasWidth = rect.width;
      this.canvasHeight = rect.height;
    }

    if (this.floor) {
      this.zoomToFit();
    } else {
      this.syncKonvaViewport();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('toolMode') && this.toolMode !== changedProps.get('toolMode')) {
      this.cancelActiveToolChain();
    }

    if (
      changedProps.has('floor') ||
      changedProps.has('ghostFloor') ||
      changedProps.has('selection') ||
      changedProps.has('toolMode') ||
      changedProps.has('showGrid') ||
      changedProps.has('showBlueprint') ||
      changedProps.has('gridSize') ||
      changedProps.has('panX') ||
      changedProps.has('panY') ||
      changedProps.has('pixelsPerMeter') ||
      changedProps.has('canvasWidth') ||
      changedProps.has('canvasHeight')
    ) {
      this.syncKonvaViewport();
      this.rebuildSceneLayer();
      this.rebuildOverlayLayer();
    }
  }

  // ============================================================================
  // Konva Stage Initialization & Coordinate Transforms
  // ============================================================================

  private initKonvaStage(): void {
    if (!this.konvaMountEl || this.stage) return;

    this.stage = new Konva.Stage({
      container: this.konvaMountEl,
      width: this.canvasWidth,
      height: this.canvasHeight
    });

    this.gridLayer = new Konva.Layer({ listening: false });
    this.sceneLayer = new Konva.Layer();
    this.overlayLayer = new Konva.Layer({ listening: false });

    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      borderStroke: '#38bdf8',
      anchorStroke: '#0284c7',
      anchorFill: '#f8fafc',
      anchorSize: 9,
      ignoreStroke: true
    });
    this.sceneLayer.add(this.transformer);

    this.stage.add(this.gridLayer);
    this.stage.add(this.sceneLayer);
    this.stage.add(this.overlayLayer);

    // Stage Wheel Zoom (zooms toward cursor)
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const pointer = this.stage?.getPointerPosition();
      if (!pointer) return;

      const worldBefore = this.screenToWorld(pointer.x, pointer.y);
      const zoomFactor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextScale = Math.max(15, Math.min(300, this.pixelsPerMeter * zoomFactor));
      if (Math.abs(nextScale - this.pixelsPerMeter) < 1e-4) return;

      this.pixelsPerMeter = nextScale;
      this.panX = worldBefore.x - (pointer.x - this.canvasWidth / 2) / this.pixelsPerMeter;
      this.panY = worldBefore.y - (pointer.y - this.canvasHeight / 2) / this.pixelsPerMeter;
      this.syncKonvaViewport();
      this.rebuildSceneLayer();
      this.rebuildOverlayLayer();
    });

    // Right-click finishes active wall/room chain instead of opening browser menu
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      if (this.wallChainStart || this.roomChainPoints.length > 0 || this.calibrationStartPoint) {
        if (this.toolMode === 'draw_room' && this.roomChainPoints.length >= 3) {
          this.commitRoomPolygon();
        } else {
          this.cancelActiveToolChain();
        }
      }
    });

    // Unified Stage Pointer Down / Move / Up for background pan & drawing tools
    this.stage.on('pointerdown', (e) => {
      const evt = e.evt as PointerEvent;
      const pointer = this.stage?.getPointerPosition();
      if (!pointer) return;

      // Right-click during wall/room drawing finishes the active chain immediately
      if (evt.button === 2 && this.toolMode !== 'select') {
        if (this.toolMode === 'draw_room' && this.roomChainPoints.length >= 3) {
          this.commitRoomPolygon();
        } else {
          this.cancelActiveToolChain();
        }
        return;
      }

      // Middle click, right click, Spacebar+drag, or dragging empty stage in 'select' mode pans viewport
      const isMiddleOrRight = evt.button === 1 || evt.button === 2;
      const clickedOnEmptyStage = e.target === this.stage;

      if (isMiddleOrRight || this.isSpacePressed || (this.toolMode === 'select' && clickedOnEmptyStage)) {
        this.isPanningStage = true;
        this.panStartClient = { x: pointer.x, y: pointer.y };
        this.panStartWorld = { x: this.panX, y: this.panY };
        if (clickedOnEmptyStage && this.toolMode === 'select' && !this.isSpacePressed && !isMiddleOrRight) {
          this.emitSelectionChange({ kind: 'none', id: null });
        }
        return;
      }

      if (this.toolMode !== 'select') {
        const worldPt = this.screenToWorld(pointer.x, pointer.y);
        this.updateCursorAndSnap(worldPt);
        this.handleDrawingToolClick();
      }
    });

    this.stage.on('pointermove', () => {
      const pointer = this.stage?.getPointerPosition();
      if (!pointer) return;

      if (this.isPanningStage && this.activeTouchPoints.size < 2) {
        const dx = pointer.x - this.panStartClient.x;
        const dy = pointer.y - this.panStartClient.y;
        this.panX = this.panStartWorld.x - dx / this.pixelsPerMeter;
        this.panY = this.panStartWorld.y - dy / this.pixelsPerMeter;
        this.syncKonvaViewport();
        return;
      }

      const worldPt = this.screenToWorld(pointer.x, pointer.y);
      this.updateCursorAndSnap(worldPt);
      this.rebuildOverlayLayer();
    });

    this.stage.on('pointerup', () => {
      this.isPanningStage = false;
      const pointer = this.stage?.getPointerPosition();
      if (
        pointer &&
        this.toolMode === 'draw_wall' &&
        this.wallChainStart &&
        this.wallDrawDownHandled
      ) {
        const worldPt = this.screenToWorld(pointer.x, pointer.y);
        this.updateCursorAndSnap(worldPt);
        // Support Click-Drag-Release wall drawing if user dragged >= 0.25m from start point
        if (distance2D(this.currentSnapResult.point, this.wallChainStart.point) >= 0.25) {
          this.commitWallSegment(this.currentSnapResult);
        }
      }
      this.wallDrawDownHandled = false;
    });

    this.stage.on('dblclick dbltap', () => {
      if (this.toolMode === 'draw_wall' && this.wallChainStart) {
        this.wallChainStart = null;
        this.rebuildOverlayLayer();
      } else if (this.toolMode === 'draw_room' && this.roomChainPoints.length >= 3) {
        this.commitRoomPolygon();
      }
    });

    // Multi-touch pinch-zoom support on mount container
    this.konvaMountEl.addEventListener('pointerdown', this.onMountPointerDown);
    this.konvaMountEl.addEventListener('pointermove', this.onMountPointerMove);
    this.konvaMountEl.addEventListener('pointerup', this.onMountPointerUp);
    this.konvaMountEl.addEventListener('pointercancel', this.onMountPointerUp);
  }

  public worldToScreen(pt: Point2D): Point2D {
    return {
      x: this.canvasWidth / 2 + (pt.x - this.panX) * this.pixelsPerMeter,
      y: this.canvasHeight / 2 + (pt.y - this.panY) * this.pixelsPerMeter
    };
  }

  public screenToWorld(screenX: number, screenY: number): Point2D {
    return {
      x: this.panX + (screenX - this.canvasWidth / 2) / this.pixelsPerMeter,
      y: this.panY + (screenY - this.canvasHeight / 2) / this.pixelsPerMeter
    };
  }

  public getViewportCenterWorld(): Point2D {
    return {
      x: Number(this.panX.toFixed(2)),
      y: Number(this.panY.toFixed(2))
    };
  }

  public zoomIn(): void {
    this.pixelsPerMeter = Math.min(300, this.pixelsPerMeter * 1.25);
    this.syncKonvaViewport();
    this.rebuildSceneLayer();
  }

  public zoomOut(): void {
    this.pixelsPerMeter = Math.max(15, this.pixelsPerMeter / 1.25);
    this.syncKonvaViewport();
    this.rebuildSceneLayer();
  }

  public zoomToFit(): void {
    if (!this.floor) {
      this.panX = 0;
      this.panY = 0;
      this.pixelsPerMeter = 60;
      this.syncKonvaViewport();
      return;
    }

    const bbox = computeFloorBoundingBox2D(this.floor, 2.0);
    const center = midpoint2D({ x: bbox.minX, y: bbox.minY }, { x: bbox.maxX, y: bbox.maxY });
    this.panX = center.x;
    this.panY = center.y;

    if (this.canvasWidth > 0 && this.canvasHeight > 0 && bbox.width > 0 && bbox.height > 0) {
      const scaleX = (this.canvasWidth * 0.8) / bbox.width;
      const scaleY = (this.canvasHeight * 0.8) / bbox.height;
      this.pixelsPerMeter = Math.max(15, Math.min(300, Math.min(scaleX, scaleY)));
    } else {
      this.pixelsPerMeter = 60;
    }
    this.syncKonvaViewport();
    this.rebuildSceneLayer();
  }

  /**
   * Synchronizes the Konva.Stage transform (`scale` = `pixelsPerMeter`, `position` = screen center offset)
   * and redraws the metric background grid. Because scene nodes live in metric world space,
   * panning is instantaneous with zero lag.
   */
  private syncKonvaViewport(): void {
    if (!this.stage) return;
    if (this.stage.width() !== this.canvasWidth || this.stage.height() !== this.canvasHeight) {
      this.stage.size({ width: this.canvasWidth, height: this.canvasHeight });
    }

    const offsetX = this.canvasWidth / 2 - this.panX * this.pixelsPerMeter;
    const offsetY = this.canvasHeight / 2 - this.panY * this.pixelsPerMeter;

    if (this.sceneLayer) {
      this.sceneLayer.position({ x: offsetX, y: offsetY });
      this.sceneLayer.scale({ x: this.pixelsPerMeter, y: this.pixelsPerMeter });
    }
    if (this.overlayLayer) {
      this.overlayLayer.position({ x: offsetX, y: offsetY });
      this.overlayLayer.scale({ x: this.pixelsPerMeter, y: this.pixelsPerMeter });
    }

    this.rebuildGridLayer();
    this.stage.batchDraw();
  }

  // ============================================================================
  // Programmatic & Interactive Manipulation Helpers (Wall Node, Wall Edge, etc.)
  // ============================================================================

  /**
   * Moves a single WallNode to `rawWorldPt` (applying `snapPoint2D` while excluding `nodeId`
   * and its incident walls so it never self-snaps) and auto-synchronizes room polygons.
   */
  public moveNodeTo(nodeId: string, rawWorldPt: Point2D, commit = true): void {
    const baseFloor = this.activeFloorDraft ?? this.floor;
    if (!baseFloor) return;

    const nextFloor: FloorLevel = structuredClone(baseFloor);
    const node = nextFloor.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const snapRes = snapPoint2D(rawWorldPt, {
      gridSize: this.gridSize,
      snapToGrid: this.snapToGrid,
      nodes: nextFloor.nodes,
      walls: nextFloor.walls,
      nodeSnapRadius: 0.25,
      excludeNodeIds: new Set([nodeId])
    });

    if (commit && snapRes.snappedNodeId && snapRes.snappedNodeId !== nodeId) {
      const targetId = snapRes.snappedNodeId;
      nextFloor.walls = nextFloor.walls
        .map((w) => ({
          ...w,
          start_node_id: w.start_node_id === nodeId ? targetId : w.start_node_id,
          end_node_id: w.end_node_id === nodeId ? targetId : w.end_node_id
        }))
        .filter((w) => w.start_node_id !== w.end_node_id);
      nextFloor.nodes = nextFloor.nodes.filter((n) => n.id !== nodeId);
    } else {
      node.x = Number(snapRes.point.x.toFixed(4));
      node.y = Number(snapRes.point.y.toFixed(4));
    }

    nextFloor.rooms = syncAutoDetectedRoomsFromWalls(nextFloor);

    if (commit) {
      this.activeFloorDraft = null;
      this.emitFloorChange(nextFloor, 'Move wall node');
    } else {
      this.activeFloorDraft = nextFloor;
      this.rebuildSceneLayer();
    }
  }

  /**
   * Translates both endpoints of `wallId` by `(dx, dy)` in meters (snapping the start node
   * while excluding both endpoints and their incident walls) and auto-synchronizes room polygons.
   */
  public moveWallByDelta(wallId: string, dx: number, dy: number, commit = true): void {
    const baseFloor = this.floor;
    if (!baseFloor) return;

    const nextFloor: FloorLevel = structuredClone(baseFloor);
    const wall = nextFloor.walls.find((w) => w.id === wallId);
    if (!wall) return;

    const startNode = nextFloor.nodes.find((n) => n.id === wall.start_node_id);
    const endNode = nextFloor.nodes.find((n) => n.id === wall.end_node_id);
    if (!startNode || !endNode) return;

    const rawStart: Point2D = { x: startNode.x + dx, y: startNode.y + dy };
    const snapRes = snapPoint2D(rawStart, {
      gridSize: this.gridSize,
      snapToGrid: this.snapToGrid,
      nodes: nextFloor.nodes,
      walls: nextFloor.walls,
      nodeSnapRadius: 0.2,
      excludeNodeIds: new Set([startNode.id, endNode.id])
    });

    const snappedDx = Number((snapRes.point.x - startNode.x).toFixed(4));
    const snappedDy = Number((snapRes.point.y - startNode.y).toFixed(4));

    startNode.x = Number((startNode.x + snappedDx).toFixed(4));
    startNode.y = Number((startNode.y + snappedDy).toFixed(4));
    endNode.x = Number((endNode.x + snappedDx).toFixed(4));
    endNode.y = Number((endNode.y + snappedDy).toFixed(4));

    // Also translate any room vertices explicitly linked to startNode/endNode before cycle sync
    for (const room of nextFloor.rooms) {
      for (const pt of room.points) {
        if (pt.node_id === startNode.id) {
          pt.x = startNode.x;
          pt.y = startNode.y;
        } else if (pt.node_id === endNode.id) {
          pt.x = endNode.x;
          pt.y = endNode.y;
        }
      }
    }

    nextFloor.rooms = syncAutoDetectedRoomsFromWalls(nextFloor);

    if (commit) {
      this.activeFloorDraft = null;
      this.emitFloorChange(nextFloor, 'Move wall');
    } else {
      this.activeFloorDraft = nextFloor;
      this.rebuildSceneLayer();
    }
  }

  // ============================================================================
  // Konva Layer Builders (Grid, Scene, Overlay)
  // ============================================================================

  private rebuildGridLayer(): void {
    if (!this.gridLayer) return;
    this.gridLayer.destroyChildren();

    if (!this.showGrid || this.gridSize <= 0) {
      this.gridLayer.batchDraw();
      return;
    }

    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvasWidth, this.canvasHeight);
    const step = this.gridSize;
    const majorEvery = 2; // every 1.0m when gridSize = 0.5m

    const startX = Math.floor(topLeft.x / step) * step;
    const endX = Math.ceil(bottomRight.x / step) * step;
    const startY = Math.floor(topLeft.y / step) * step;
    const endY = Math.ceil(bottomRight.y / step) * step;

    for (let x = startX; x <= endX; x = Number((x + step).toFixed(4))) {
      const sx = this.worldToScreen({ x, y: 0 }).x;
      const isAxis = Math.abs(x) < 1e-4;
      const isMajor = Math.abs(Math.round(x / step) % majorEvery) === 0;
      this.gridLayer.add(
        new Konva.Line({
          points: [sx, 0, sx, this.canvasHeight],
          stroke: isAxis
            ? 'rgba(56, 189, 248, 0.35)'
            : isMajor
              ? 'rgba(148, 163, 184, 0.14)'
              : 'rgba(148, 163, 184, 0.06)',
          strokeWidth: isAxis ? 1.5 : 1,
          listening: false
        })
      );
    }

    for (let y = startY; y <= endY; y = Number((y + step).toFixed(4))) {
      const sy = this.worldToScreen({ x: 0, y }).y;
      const isAxis = Math.abs(y) < 1e-4;
      const isMajor = Math.abs(Math.round(y / step) % majorEvery) === 0;
      this.gridLayer.add(
        new Konva.Line({
          points: [0, sy, this.canvasWidth, sy],
          stroke: isAxis
            ? 'rgba(56, 189, 248, 0.35)'
            : isMajor
              ? 'rgba(148, 163, 184, 0.14)'
              : 'rgba(148, 163, 184, 0.06)',
          strokeWidth: isAxis ? 1.5 : 1,
          listening: false
        })
      );
    }

    this.gridLayer.batchDraw();
  }

  private rebuildSceneLayer(): void {
    if (!this.sceneLayer || !this.transformer) return;

    // Detach transformer before clearing children, then re-add transformer at top
    this.transformer.nodes([]);
    const children = this.sceneLayer.getChildren((node) => node !== this.transformer);
    children.forEach((c) => c.destroy());

    const activeFloor = this.activeFloorDraft ?? this.floor;
    if (!activeFloor) {
      this.sceneLayer.batchDraw();
      return;
    }

    const invScale = 1 / this.pixelsPerMeter;

    // 1. Blueprint Image Background
    if (this.showBlueprint && activeFloor.blueprint?.image_url) {
      const bp = activeFloor.blueprint;
      let imgEl = this.blueprintImageCache.get(bp.image_url);
      if (!imgEl) {
        imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.onload = () => this.rebuildSceneLayer();
        imgEl.src = bp.image_url;
        this.blueprintImageCache.set(bp.image_url, imgEl);
      }
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        this.sceneLayer.add(
          new Konva.Image({
            image: imgEl,
            x: bp.offset_x,
            y: bp.offset_y,
            width: imgEl.naturalWidth * bp.meters_per_pixel,
            height: imgEl.naturalHeight * bp.meters_per_pixel,
            rotation: bp.rotation_deg,
            opacity: bp.opacity,
            listening: false
          })
        );
      }
    }

    // 2. Ghost Floor Reference Layer
    if (this.ghostFloor && this.ghostFloor.id !== activeFloor.id) {
      const ghostNodes = new Map(this.ghostFloor.nodes.map((n) => [n.id, n]));
      for (const gw of this.ghostFloor.walls) {
        const a = ghostNodes.get(gw.start_node_id);
        const b = ghostNodes.get(gw.end_node_id);
        if (!a || !b) continue;
        this.sceneLayer.add(
          new Konva.Line({
            points: [a.x, a.y, b.x, b.y],
            stroke: 'rgba(148, 163, 184, 0.25)',
            strokeWidth: gw.thickness,
            lineCap: 'round',
            listening: false
          })
        );
      }
    }

    // 3. Rooms (Polygons + Mapbox Polylabel Center Text)
    for (const room of activeFloor.rooms) {
      this.addRoomToLayer(room, invScale);
    }

    // 4. Furniture Items (with Konva.Transformer support for selected item)
    for (const item of activeFloor.furniture) {
      this.addFurnitureToLayer(item, invScale);
    }

    // 5. Walls (Mitered Footprints + Draggable Hit Target + Length Label)
    this.addWallsToLayer(activeFloor, invScale);

    // 6. Wall Openings (Doors & Windows)
    this.addOpeningsToLayer(activeFloor, invScale);

    // 7. Wall Anchor Nodes (Draggable Konva Groups)
    for (const node of activeFloor.nodes) {
      this.addWallNodeToLayer(node, invScale);
    }

    // 8. Home Assistant Entity Badges
    for (const entity of activeFloor.entities) {
      this.addEntityToLayer(entity, invScale);
    }

    this.transformer.moveToTop();
    this.sceneLayer.batchDraw();
  }

  private addRoomToLayer(room: RoomPolygon, invScale: number): void {
    if (!this.sceneLayer || room.points.length < 3) return;
    const isSelected = this.selection.kind === 'room' && this.selection.id === room.id;

    const group = new Konva.Group({
      id: room.id,
      name: 'room-polygon',
      listening: this.toolMode === 'select'
    });

    const flatPts: number[] = [];
    for (const p of room.points) {
      flatPts.push(p.x, p.y);
    }

    const fill = room.floor_color
      ? `${room.floor_color}40`
      : isSelected
        ? 'rgba(56, 189, 248, 0.22)'
        : 'rgba(30, 41, 59, 0.45)';

    group.add(
      new Konva.Line({
        points: flatPts,
        closed: true,
        fill,
        stroke: isSelected ? '#38bdf8' : 'rgba(100, 116, 139, 0.45)',
        strokeWidth: isSelected ? 2 : 1,
        strokeScaleEnabled: false
      })
    );

    const labelCenter = findPolygonLabelCenter2D(room.points);
    const areaSqm = polygonArea2D(room.points);
    const labelText = `${room.name}\n${areaSqm.toFixed(1)} m²`;

    const textNode = new Konva.Text({
      x: labelCenter.x,
      y: labelCenter.y,
      text: labelText,
      fontSize: 12,
      fontStyle: 'bold',
      fill: isSelected ? '#38bdf8' : '#e2e8f0',
      align: 'center',
      scaleX: invScale,
      scaleY: invScale,
      listening: false
    });
    textNode.offsetX(textNode.width() / 2);
    textNode.offsetY(textNode.height() / 2);
    group.add(textNode);

    group.on('click tap', (e) => {
      if (this.toolMode !== 'select') return;
      e.cancelBubble = true;
      this.emitSelectionChange({ kind: 'room', id: room.id });
    });

    this.sceneLayer.add(group);
  }

  private addWallsToLayer(floor: FloorLevel, invScale: number): void {
    if (!this.sceneLayer) return;
    const nodeMap = new Map(floor.nodes.map((n) => [n.id, n]));
    const footprints = solveWallMiterFootprints(floor.nodes, floor.walls, floor.rooms);

    for (const wall of floor.walls) {
      const startNode = nodeMap.get(wall.start_node_id);
      const endNode = nodeMap.get(wall.end_node_id);
      if (!startNode || !endNode) continue;

      const isSelected = this.selection.kind === 'wall' && this.selection.id === wall.id;
      const wallLength = distance2D(startNode, endNode);
      if (wallLength < 1e-4) continue;

      const wallOpenings = floor.openings.filter((o) => o.wall_id === wall.id);
      const intervals = splitWallIntervalsForOpenings(wallLength, wallOpenings);
      const fp = footprints.get(wall.id);

      const wallGroup = new Konva.Group({
        id: wall.id,
        name: 'wall-group',
        draggable: this.toolMode === 'select',
        listening: this.toolMode === 'select'
      });

      // Draw solid wall segments
      for (const interval of intervals) {
        if (interval.kind !== 'solid') continue;
        if (wallOpenings.length === 0 && fp && fp.quad.length === 4) {
          wallGroup.add(
            new Konva.Line({
              points: fp.quad.flatMap((p: Point2D) => [p.x, p.y]),
              closed: true,
              fill: isSelected ? '#0284c7' : '#64748b',
              stroke: isSelected ? '#38bdf8' : '#94a3b8',
              strokeWidth: isSelected ? 2 : 1,
              strokeScaleEnabled: false
            })
          );
        } else {
          const sx = startNode.x + (endNode.x - startNode.x) * interval.tStart;
          const sy = startNode.y + (endNode.y - startNode.y) * interval.tStart;
          const ex = startNode.x + (endNode.x - startNode.x) * interval.tEnd;
          const ey = startNode.y + (endNode.y - startNode.y) * interval.tEnd;
          wallGroup.add(
            new Konva.Line({
              points: [sx, sy, ex, ey],
              stroke: isSelected ? '#0284c7' : '#64748b',
              strokeWidth: wall.thickness,
              lineCap: 'butt'
            })
          );
        }
      }

      // Generous 24px touch hit target along the entire wall edge
      wallGroup.add(
        new Konva.Line({
          points: [startNode.x, startNode.y, endNode.x, endNode.y],
          stroke: 'rgba(0,0,0,0.001)',
          strokeWidth: wall.thickness,
          hitStrokeWidth: 24 * invScale
        })
      );

      // Wall dimension label
      if (wallLength >= 0.4) {
        const mid = midpoint2D(startNode, endNode);
        const dimLabel = new Konva.Text({
          x: mid.x,
          y: mid.y - 12 * invScale,
          text: `${wallLength.toFixed(2)}m`,
          fontSize: 10,
          fontStyle: 'bold',
          fill: isSelected ? '#38bdf8' : '#cbd5e1',
          scaleX: invScale,
          scaleY: invScale,
          listening: false
        });
        dimLabel.offsetX(dimLabel.width() / 2);
        dimLabel.offsetY(dimLabel.height() / 2);
        wallGroup.add(dimLabel);
      }

      wallGroup.on('click tap', (e) => {
        if (this.toolMode !== 'select') return;
        e.cancelBubble = true;
        this.emitSelectionChange({ kind: 'wall', id: wall.id });
      });

      wallGroup.on('dragstart', (e) => {
        e.cancelBubble = true;
        this.emitSelectionChange({ kind: 'wall', id: wall.id });
      });

      wallGroup.on('dragmove', (e) => {
        e.cancelBubble = true;
        const dx = wallGroup.x();
        const dy = wallGroup.y();
        wallGroup.position({ x: 0, y: 0 });
        this.moveWallByDelta(wall.id, dx, dy, false);
      });

      wallGroup.on('dragend', (e) => {
        e.cancelBubble = true;
        const dx = wallGroup.x();
        const dy = wallGroup.y();
        wallGroup.position({ x: 0, y: 0 });
        if (this.activeFloorDraft) {
          const committed = structuredClone(this.activeFloorDraft);
          this.activeFloorDraft = null;
          this.emitFloorChange(committed, 'Move wall');
        } else if (Math.hypot(dx, dy) > 1e-4) {
          this.moveWallByDelta(wall.id, dx, dy, true);
        }
      });

      this.sceneLayer.add(wallGroup);
    }
  }

  private addWallNodeToLayer(node: WallNode, invScale: number): void {
    if (!this.sceneLayer) return;
    const isSelected = this.selection.kind === 'node' && this.selection.id === node.id;

    const nodeGroup = new Konva.Group({
      id: node.id,
      name: 'wall-node',
      x: node.x,
      y: node.y,
      draggable: this.toolMode === 'select',
      listening: this.toolMode === 'select'
    });

    // 18px radius invisible touch target
    nodeGroup.add(
      new Konva.Circle({
        x: 0,
        y: 0,
        radius: 18 * invScale,
        fill: 'rgba(0,0,0,0.001)'
      })
    );

    if (isSelected) {
      nodeGroup.add(
        new Konva.Circle({
          x: 0,
          y: 0,
          radius: 10 * invScale,
          fill: 'rgba(56, 189, 248, 0.25)',
          stroke: '#38bdf8',
          strokeWidth: 1.5,
          strokeScaleEnabled: false,
          listening: false
        })
      );
    }

    nodeGroup.add(
      new Konva.Circle({
        x: 0,
        y: 0,
        radius: (isSelected ? 6 : 5) * invScale,
        fill: isSelected ? '#38bdf8' : '#f8fafc',
        stroke: '#0f172a',
        strokeWidth: 2,
        strokeScaleEnabled: false,
        name: 'wall-node-dot'
      })
    );

    nodeGroup.on('click tap', (e) => {
      if (this.toolMode !== 'select') return;
      e.cancelBubble = true;
      this.emitSelectionChange({ kind: 'node', id: node.id });
    });

    nodeGroup.on('dragstart', (e) => {
      e.cancelBubble = true;
      this.emitSelectionChange({ kind: 'node', id: node.id });
    });

    nodeGroup.on('dragmove', (e) => {
      e.cancelBubble = true;
      const targetWorld = { x: nodeGroup.x(), y: nodeGroup.y() };
      this.moveNodeTo(node.id, targetWorld, false);
    });

    nodeGroup.on('dragend', (e) => {
      e.cancelBubble = true;
      const targetWorld = { x: nodeGroup.x(), y: nodeGroup.y() };
      this.moveNodeTo(node.id, targetWorld, true);
    });

    this.sceneLayer.add(nodeGroup);
  }

  private addOpeningsToLayer(floor: FloorLevel, invScale: number): void {
    if (!this.sceneLayer) return;
    const nodeMap = new Map(floor.nodes.map((n) => [n.id, n]));
    const wallMap = new Map(floor.walls.map((w) => [w.id, w]));

    for (const op of floor.openings) {
      const wall = wallMap.get(op.wall_id);
      if (!wall) continue;
      const start = nodeMap.get(wall.start_node_id);
      const end = nodeMap.get(wall.end_node_id);
      if (!start || !end) continue;

      const isSelected = this.selection.kind === 'opening' && this.selection.id === op.id;
      const cx = start.x + (end.x - start.x) * op.t;
      const cy = start.y + (end.y - start.y) * op.t;
      const angleDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;

      const opGroup = new Konva.Group({
        id: op.id,
        name: 'opening-item',
        x: cx,
        y: cy,
        rotation: angleDeg,
        draggable: this.toolMode === 'select',
        listening: this.toolMode === 'select'
      });

      const halfW = op.width / 2;
      const halfT = wall.thickness / 2;
      const isDoorOp = op.type.startsWith('door') || op.type === 'archway';
      const strokeColor = isSelected ? '#38bdf8' : isDoorOp ? '#f59e0b' : '#38bdf8';

      // Wall cutout background + jambs
      opGroup.add(
        new Konva.Rect({
          x: -halfW,
          y: -halfT,
          width: op.width,
          height: wall.thickness,
          fill: '#0b0f19',
          stroke: strokeColor,
          strokeWidth: isSelected ? 2 : 1.5,
          strokeScaleEnabled: false
        })
      );

      if (isDoorOp) {
        opGroup.add(
          new Konva.Line({
            points: [-halfW, halfT, -halfW, halfT + op.width],
            stroke: strokeColor,
            strokeWidth: 2,
            strokeScaleEnabled: false
          })
        );
        opGroup.add(
          new Konva.Arc({
            x: -halfW,
            y: halfT,
            innerRadius: op.width,
            outerRadius: op.width,
            angle: 90,
            rotation: 0,
            stroke: strokeColor,
            strokeWidth: 1,
            dash: [4 * invScale, 4 * invScale]
          })
        );
      } else {
        opGroup.add(
          new Konva.Line({
            points: [-halfW, -0.02, halfW, -0.02],
            stroke: strokeColor,
            strokeWidth: 1.5,
            strokeScaleEnabled: false
          })
        );
        opGroup.add(
          new Konva.Line({
            points: [-halfW, 0.02, halfW, 0.02],
            stroke: strokeColor,
            strokeWidth: 1.5,
            strokeScaleEnabled: false
          })
        );
      }

      opGroup.on('click tap', (e) => {
        if (this.toolMode !== 'select') return;
        e.cancelBubble = true;
        this.emitSelectionChange({ kind: 'opening', id: op.id });
      });

      opGroup.on('dragend', (e) => {
        e.cancelBubble = true;
        const nextFloor: FloorLevel = structuredClone(floor);
        const targetOp = nextFloor.openings.find((o) => o.id === op.id);
        if (!targetOp) return;
        const proj = projectPointOntoSegment({ x: opGroup.x(), y: opGroup.y() }, start, end);
        targetOp.t = Number(Math.max(0.05, Math.min(0.95, proj.t)).toFixed(4));
        this.emitFloorChange(nextFloor, 'Move wall opening');
      });

      this.sceneLayer.add(opGroup);
    }
  }

  private addFurnitureToLayer(item: FurnitureItem, invScale: number): void {
    if (!this.sceneLayer || !this.transformer) return;
    const isSelected = this.selection.kind === 'furniture' && this.selection.id === item.id;

    const group = new Konva.Group({
      id: item.id,
      name: 'furniture-item',
      x: item.x,
      y: item.y,
      rotation: item.rotation_deg,
      draggable: this.toolMode === 'select',
      listening: this.toolMode === 'select'
    });

    const halfW = item.width / 2;
    const halfD = item.depth / 2;

    const bodyRect = new Konva.Rect({
      x: -halfW,
      y: -halfD,
      width: item.width,
      height: item.depth,
      cornerRadius: 0.05,
      fill: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(51, 65, 85, 0.85)',
      stroke: isSelected ? '#38bdf8' : '#94a3b8',
      strokeWidth: isSelected ? 2 : 1.5,
      strokeScaleEnabled: false
    });
    group.add(bodyRect);

    const label = new Konva.Text({
      x: 0,
      y: 0,
      text: item.label || item.catalog_type.replace(/_/g, ' '),
      fontSize: 10,
      fill: '#f8fafc',
      scaleX: invScale,
      scaleY: invScale,
      listening: false
    });
    label.offsetX(label.width() / 2);
    label.offsetY(label.height() / 2);
    group.add(label);

    group.on('click tap', (e) => {
      if (this.toolMode !== 'select') return;
      e.cancelBubble = true;
      this.emitSelectionChange({ kind: 'furniture', id: item.id });
    });

    group.on('dragend', (e) => {
      e.cancelBubble = true;
      if (!this.floor) return;
      const nextFloor: FloorLevel = structuredClone(this.floor);
      const target = nextFloor.furniture.find((f) => f.id === item.id);
      if (!target) return;
      const snapped = snapPoint2D(
        { x: group.x(), y: group.y() },
        { gridSize: this.gridSize, snapToGrid: this.snapToGrid }
      );
      target.x = Number(snapped.point.x.toFixed(3));
      target.y = Number(snapped.point.y.toFixed(3));
      this.emitFloorChange(nextFloor, 'Move furniture');
    });

    group.on('transformend', () => {
      if (!this.floor) return;
      const nextFloor: FloorLevel = structuredClone(this.floor);
      const target = nextFloor.furniture.find((f) => f.id === item.id);
      if (!target) return;
      target.x = Number(group.x().toFixed(3));
      target.y = Number(group.y().toFixed(3));
      target.rotation_deg = Number((((group.rotation() % 360) + 360) % 360).toFixed(1));
      target.width = Number(Math.max(0.2, item.width * Math.abs(group.scaleX())).toFixed(3));
      target.depth = Number(Math.max(0.2, item.depth * Math.abs(group.scaleY())).toFixed(3));
      group.scale({ x: 1, y: 1 });
      this.emitFloorChange(nextFloor, 'Transform furniture');
    });

    this.sceneLayer.add(group);

    if (isSelected && this.toolMode === 'select') {
      this.transformer.nodes([group]);
    }
  }

  private addEntityToLayer(entity: EntityPlacement, invScale: number): void {
    if (!this.sceneLayer) return;
    const isSelected = this.selection.kind === 'entity' && this.selection.id === entity.id;
    const domain = entity.entity_id.split('.')[0] || 'sensor';

    const domainColors: Record<string, string> = {
      light: '#facc15',
      switch: '#38bdf8',
      climate: '#fb923c',
      sensor: '#34d399',
      binary_sensor: '#a78bfa',
      camera: '#f43f5e',
      media_player: '#ec4899'
    };
    const badgeColor = domainColors[domain] ?? '#38bdf8';

    const group = new Konva.Group({
      id: entity.id,
      name: 'entity-item',
      x: entity.x,
      y: entity.y,
      draggable: this.toolMode === 'select',
      listening: this.toolMode === 'select'
    });

    group.add(
      new Konva.Circle({
        x: 0,
        y: 0,
        radius: 14 * invScale,
        fill: '#0f172a',
        stroke: isSelected ? '#38bdf8' : badgeColor,
        strokeWidth: isSelected ? 2.5 : 1.5,
        strokeScaleEnabled: false
      })
    );

    group.add(
      new Konva.Circle({
        x: 0,
        y: 0,
        radius: 5 * invScale,
        fill: badgeColor,
        listening: false
      })
    );

    const shortName =
      entity.badge?.label_override || entity.entity_id.split('.')[1] || entity.entity_id;
    const nameText = new Konva.Text({
      x: 0,
      y: 20 * invScale,
      text: shortName,
      fontSize: 10,
      fontStyle: 'bold',
      fill: '#f8fafc',
      scaleX: invScale,
      scaleY: invScale,
      listening: false
    });
    nameText.offsetX(nameText.width() / 2);
    group.add(nameText);

    group.on('click tap', (e) => {
      if (this.toolMode !== 'select') return;
      e.cancelBubble = true;
      this.emitSelectionChange({ kind: 'entity', id: entity.id });
    });

    group.on('dragend', (e) => {
      e.cancelBubble = true;
      if (!this.floor) return;
      const nextFloor: FloorLevel = structuredClone(this.floor);
      const target = nextFloor.entities.find((en) => en.id === entity.id);
      if (!target) return;
      const snapped = snapPoint2D(
        { x: group.x(), y: group.y() },
        { gridSize: this.gridSize, snapToGrid: this.snapToGrid }
      );
      target.x = Number(snapped.point.x.toFixed(3));
      target.y = Number(snapped.point.y.toFixed(3));
      this.emitFloorChange(nextFloor, 'Move entity');
    });

    this.sceneLayer.add(group);
  }

  private rebuildOverlayLayer(): void {
    if (!this.overlayLayer) return;
    this.overlayLayer.destroyChildren();
    if (!this.floor) {
      this.overlayLayer.batchDraw();
      return;
    }

    const invScale = 1 / this.pixelsPerMeter;

    // 1. Active Wall Drawing Rubber-band Line + Start Anchor + Length Label
    if (this.toolMode === 'draw_wall' && this.wallChainStart) {
      const startPt = this.wallChainStart.point;
      const endPt = this.snappedCursorWorld;

      // Start node marker
      this.overlayLayer.add(
        new Konva.Circle({
          x: startPt.x,
          y: startPt.y,
          radius: 7 * invScale,
          fill: '#10b981',
          stroke: '#0f172a',
          strokeWidth: 2,
          strokeScaleEnabled: false,
          listening: false
        })
      );

      // Rubber-band line
      this.overlayLayer.add(
        new Konva.Line({
          points: [startPt.x, startPt.y, endPt.x, endPt.y],
          stroke: '#38bdf8',
          strokeWidth: 2.5,
          dash: [6 * invScale, 4 * invScale],
          strokeScaleEnabled: false,
          listening: false
        })
      );

      const segLen = distance2D(startPt, endPt);
      if (segLen >= 0.1) {
        const mid = midpoint2D(startPt, endPt);
        const lenLabel = new Konva.Text({
          x: mid.x,
          y: mid.y - 14 * invScale,
          text: `${segLen.toFixed(2)}m`,
          fontSize: 11,
          fontStyle: 'bold',
          fill: '#38bdf8',
          scaleX: invScale,
          scaleY: invScale,
          listening: false
        });
        lenLabel.offsetX(lenLabel.width() / 2);
        lenLabel.offsetY(lenLabel.height() / 2);
        this.overlayLayer.add(lenLabel);
      }
    }

    // 2. Active Room Polygon Preview
    if (this.toolMode === 'draw_room' && this.roomChainPoints.length > 0) {
      const pts = [...this.roomChainPoints, this.snappedCursorWorld];
      this.overlayLayer.add(
        new Konva.Line({
          points: pts.flatMap((p) => [p.x, p.y]),
          closed: true,
          fill: 'rgba(56, 189, 248, 0.15)',
          stroke: '#38bdf8',
          strokeWidth: 2,
          dash: [6 * invScale, 4 * invScale],
          strokeScaleEnabled: false,
          listening: false
        })
      );
    }

    // 3. Measure Line Preview
    if (this.toolMode === 'measure' && this.calibrationStartPoint) {
      this.overlayLayer.add(
        new Konva.Line({
          points: [
            this.calibrationStartPoint.x,
            this.calibrationStartPoint.y,
            this.cursorWorld.x,
            this.cursorWorld.y
          ],
          stroke: '#f59e0b',
          strokeWidth: 2.5,
          dash: [6 * invScale, 4 * invScale],
          strokeScaleEnabled: false,
          listening: false
        })
      );
    }

    // 4. Snap Target Indicator Ring in Drawing Modes (Green when magnetically snapped to Node/Wall)
    if (this.toolMode !== 'select') {
      const isMagneticSnap = Boolean(
        this.currentSnapResult.snappedNodeId || this.currentSnapResult.snappedWallId
      );
      this.overlayLayer.add(
        new Konva.Circle({
          x: this.snappedCursorWorld.x,
          y: this.snappedCursorWorld.y,
          radius: (isMagneticSnap ? 9 : 6) * invScale,
          fill: isMagneticSnap ? 'rgba(16, 185, 129, 0.25)' : undefined,
          stroke: isMagneticSnap ? '#10b981' : '#38bdf8',
          strokeWidth: isMagneticSnap ? 2.5 : 2,
          strokeScaleEnabled: false,
          listening: false
        })
      );
    }

    this.overlayLayer.batchDraw();
  }

  // ============================================================================
  // Drawing Tools & Multi-Touch Handlers
  // ============================================================================

  private updateCursorAndSnap(worldPt: Point2D): void {
    this.cursorWorld = worldPt;
    if (!this.floor) {
      this.snappedCursorWorld = worldPt;
      this.currentSnapResult = { point: worldPt, snappedNodeId: null, snappedWallId: null };
      return;
    }

    let anchorPoint: Point2D | undefined;
    if (this.toolMode === 'draw_wall' && this.wallChainStart) {
      anchorPoint = this.wallChainStart.point;
    } else if (this.toolMode === 'draw_room' && this.roomChainPoints.length > 0) {
      anchorPoint = this.roomChainPoints[this.roomChainPoints.length - 1];
    }

    const snap = snapPoint2D(worldPt, {
      gridSize: this.gridSize,
      snapToGrid: this.snapToGrid,
      nodes: this.floor.nodes,
      walls: this.floor.walls,
      nodeSnapRadius: 0.35,
      anchorPoint,
      snapAngleDeg: this.isShiftPressed ? 45 : undefined
    });

    // Soft orthogonal axis alignment when drawing walls without locking out diagonals or target nodes
    if (
      anchorPoint &&
      !this.isShiftPressed &&
      !snap.snappedNodeId &&
      !snap.snappedWallId
    ) {
      if (Math.abs(snap.point.x - anchorPoint.x) <= 0.12) {
        snap.point.x = anchorPoint.x;
      } else if (Math.abs(snap.point.y - anchorPoint.y) <= 0.12) {
        snap.point.y = anchorPoint.y;
      }
    }

    this.snappedCursorWorld = snap.point;
    this.currentSnapResult = {
      point: snap.point,
      snappedNodeId: snap.snappedNodeId,
      snappedWallId: snap.snappedWallId
    };

    if (this.toolMode === 'add_opening') {
      this.openingPreview = this.findNearestWallProjection(worldPt);
    } else {
      this.openingPreview = null;
    }
  }

  private findNearestWallProjection(pt: Point2D): { wallId: string; t: number; point: Point2D } | null {
    if (!this.floor) return null;
    const nodeMap = new Map(this.floor.nodes.map((n) => [n.id, n]));
    let best: { wallId: string; t: number; point: Point2D; dist: number } | null = null;

    for (const wall of this.floor.walls) {
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) continue;
      const proj = projectPointOntoSegment(pt, a, b);
      if (proj.distance <= 0.6 && (!best || proj.distance < best.dist)) {
        best = {
          wallId: wall.id,
          t: Math.max(0.08, Math.min(0.92, proj.t)),
          point: proj.point,
          dist: proj.distance
        };
      }
    }
    return best ? { wallId: best.wallId, t: best.t, point: best.point } : null;
  }

  private handleDrawingToolClick(): void {
    if (!this.floor) return;

    if (this.toolMode === 'draw_wall') {
      this.handleDrawWallStep();
    } else if (this.toolMode === 'draw_room') {
      this.handleDrawRoomStep();
    } else if (this.toolMode === 'add_opening') {
      this.handlePlaceOpeningStep();
    } else if (this.toolMode === 'measure') {
      this.handleCalibrationStep();
    }
  }

  /**
   * Resolves an existing WallNode or creates a new one. If `snap.wallId` is set
   * (or the point lies on an existing WallEdge interior), splits that WallEdge into
   * two connected WallEdges at the new node so T-junctions connect into the planar wall graph.
   */
  private resolveOrSplitWallNode(
    floor: FloorLevel,
    snap: { point: Point2D; nodeId: string | null; wallId: string | null }
  ): string {
    if (snap.nodeId && floor.nodes.some((n) => n.id === snap.nodeId)) {
      return snap.nodeId;
    }

    // Check if an existing node is already at this coordinate
    for (const existing of floor.nodes) {
      if (distance2D(existing, snap.point) <= 0.2) {
        return existing.id;
      }
    }

    const newNodeId = `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newNode: WallNode = {
      id: newNodeId,
      x: Number(snap.point.x.toFixed(4)),
      y: Number(snap.point.y.toFixed(4))
    };
    floor.nodes.push(newNode);

    // Check if this node splits an existing wall edge (T-junction connection)
    const nodeMap = new Map(floor.nodes.map((n) => [n.id, n]));
    let targetWall = snap.wallId ? floor.walls.find((w) => w.id === snap.wallId) : undefined;

    if (!targetWall) {
      for (const w of floor.walls) {
        const a = nodeMap.get(w.start_node_id);
        const b = nodeMap.get(w.end_node_id);
        if (!a || !b) continue;
        const proj = projectPointOntoSegment(newNode, a, b);
        if (proj.distance <= 0.2 && proj.t > 0.03 && proj.t < 0.97) {
          targetWall = w;
          break;
        }
      }
    }

    if (targetWall && targetWall.start_node_id !== newNodeId && targetWall.end_node_id !== newNodeId) {
      const a = nodeMap.get(targetWall.start_node_id);
      const b = nodeMap.get(targetWall.end_node_id);
      if (a && b && distance2D(a, newNode) > 0.05 && distance2D(b, newNode) > 0.05) {
        const w1Id = `${targetWall.id}_a`;
        const w2Id = `${targetWall.id}_b`;
        const splitT = projectPointOntoSegment(newNode, a, b).t;

        const w1 = {
          ...targetWall,
          id: floor.walls.some((w) => w.id === w1Id)
            ? `wall_${Date.now().toString(36)}_a`
            : w1Id,
          start_node_id: targetWall.start_node_id,
          end_node_id: newNodeId
        };
        const w2 = {
          ...targetWall,
          id: floor.walls.some((w) => w.id === w2Id)
            ? `wall_${Date.now().toString(36)}_b`
            : w2Id,
          start_node_id: newNodeId,
          end_node_id: targetWall.end_node_id
        };

        floor.walls = floor.walls.flatMap((w) => (w.id === targetWall!.id ? [w1, w2] : [w]));
        floor.openings = floor.openings.map((op) => {
          if (op.wall_id !== targetWall!.id) return op;
          if (op.t < splitT) {
            return { ...op, wall_id: w1.id, t: Number(Math.max(0.08, Math.min(0.92, op.t / splitT)).toFixed(4)) };
          }
          return {
            ...op,
            wall_id: w2.id,
            t: Number(Math.max(0.08, Math.min(0.92, (op.t - splitT) / (1 - splitT))).toFixed(4))
          };
        });
      }
    }

    return newNodeId;
  }

  private handleDrawWallStep(): void {
    if (!this.floor) return;
    const snap = this.currentSnapResult;

    // Step 1: Start a new wall chain (no orphan node added until segment is completed)
    if (!this.wallChainStart) {
      this.wallChainStart = {
        point: { ...snap.point },
        nodeId: snap.snappedNodeId,
        wallId: snap.snappedWallId
      };
      this.wallDrawDownHandled = true;
      this.rebuildOverlayLayer();
      return;
    }

    // Clicking the current start/end point again (or double-clicking) finishes the wall chain!
    if (distance2D(snap.point, this.wallChainStart.point) < 0.08) {
      this.wallChainStart = null;
      this.wallDrawDownHandled = false;
      this.rebuildOverlayLayer();
      return;
    }

    // Step 2: Commit wall segment from wallChainStart to snap
    this.wallDrawDownHandled = false;
    this.commitWallSegment(snap);
  }

  private commitWallSegment(snap: {
    point: Point2D;
    snappedNodeId: string | null;
    snappedWallId: string | null;
  }): void {
    if (!this.floor || !this.wallChainStart) return;
    const nextFloor: FloorLevel = structuredClone(this.floor);

    const startNodeId = this.resolveOrSplitWallNode(nextFloor, this.wallChainStart);
    const endNodeId = this.resolveOrSplitWallNode(nextFloor, {
      point: snap.point,
      nodeId: snap.snappedNodeId,
      wallId: snap.snappedWallId
    });

    if (startNodeId === endNodeId) {
      this.wallChainStart = null;
      this.rebuildOverlayLayer();
      return;
    }

    // Avoid duplicate wall between the same two nodes
    const alreadyExists = nextFloor.walls.some(
      (w) =>
        (w.start_node_id === startNodeId && w.end_node_id === endNodeId) ||
        (w.start_node_id === endNodeId && w.end_node_id === startNodeId)
    );

    if (!alreadyExists) {
      const wallId = `wall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      nextFloor.walls.push({
        id: wallId,
        start_node_id: startNodeId,
        end_node_id: endNodeId,
        thickness: 0.15,
        height_override: null,
        is_exterior: false,
        color_override: null
      });
    }

    // Automatically detect closed wall loops and create/update rooms!
    nextFloor.rooms = syncAutoDetectedRoomsFromWalls(nextFloor);

    // If the user connected onto an existing node or split an existing wall, finish the chain cleanly;
    // otherwise continue chaining from the newly placed corner node
    const connectedToExisting = Boolean(snap.snappedNodeId || snap.snappedWallId);
    const endNode = nextFloor.nodes.find((n) => n.id === endNodeId);
    this.wallChainStart =
      connectedToExisting || !endNode
        ? null
        : { point: { x: endNode.x, y: endNode.y }, nodeId: endNode.id, wallId: null };

    this.emitFloorChange(nextFloor, 'Draw wall');
    this.rebuildOverlayLayer();
  }

  private handleDrawRoomStep(): void {
    const pt = { x: Number(this.snappedCursorWorld.x.toFixed(3)), y: Number(this.snappedCursorWorld.y.toFixed(3)) };
    if (this.roomChainPoints.length >= 3 && distance2D(pt, this.roomChainPoints[0]) <= 0.3) {
      this.commitRoomPolygon();
      return;
    }
    this.roomChainPoints = [...this.roomChainPoints, pt];
    this.rebuildOverlayLayer();
  }

  private commitRoomPolygon(): void {
    if (!this.floor || this.roomChainPoints.length < 3) return;
    const nextFloor: FloorLevel = structuredClone(this.floor);
    const roomId = `room_${Date.now().toString(36)}`;
    nextFloor.rooms.push({
      id: roomId,
      name: `Room ${nextFloor.rooms.length + 1}`,
      ha_area_id: null,
      points: this.roomChainPoints.map((p) => {
        const nearNode = nextFloor.nodes.find((n) => distance2D(n, p) <= 0.2);
        return nearNode ? { x: nearNode.x, y: nearNode.y, node_id: nearNode.id } : p;
      }),
      floor_material: 'wood_oak',
      floor_color: '#d4a373',
      show_label: true,
      temp_entity_id: null,
      humidity_entity_id: null,
      motion_entity_id: null,
      room_tap_action: { action: 'zoom-room' }
    });
    this.roomChainPoints = [];
    this.emitFloorChange(nextFloor, 'Create room polygon');
    this.emitSelectionChange({ kind: 'room', id: roomId });
  }

  private handlePlaceOpeningStep(): void {
    if (!this.floor) return;
    const proj = this.openingPreview ?? this.findNearestWallProjection(this.cursorWorld);
    if (!proj) return;

    const nextFloor: FloorLevel = structuredClone(this.floor);
    const opId = `op_${Date.now().toString(36)}`;
    const newOpening: WallOpening = {
      id: opId,
      wall_id: proj.wallId,
      type: 'door_single',
      t: Number(proj.t.toFixed(4)),
      width: 0.9,
      sill_height: 0,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: null
    };
    nextFloor.openings.push(newOpening);
    this.emitFloorChange(nextFloor, `Place ${newOpening.type}`);
    this.emitSelectionChange({ kind: 'opening', id: opId });
  }

  private handleCalibrationStep(): void {
    if (!this.floor?.blueprint) return;
    if (!this.calibrationStartPoint) {
      this.calibrationStartPoint = { ...this.cursorWorld };
      return;
    }

    const p1 = this.calibrationStartPoint;
    const p2 = this.cursorWorld;
    this.calibrationStartPoint = null;

    const currentScale = this.floor.blueprint.meters_per_pixel || 0.01;
    const pixelDistance = distance2D(p1, p2) / currentScale;
    if (pixelDistance < 1) return;

    const input = window.prompt('Enter real-world distance between the two points in meters:', '3.0');
    const meters = input ? Number.parseFloat(input) : NaN;
    if (!Number.isFinite(meters) || meters <= 0) return;

    const nextFloor: FloorLevel = structuredClone(this.floor);
    if (nextFloor.blueprint) {
      nextFloor.blueprint.meters_per_pixel = computeCalibrationMetersPerPixel(
        { x: 0, y: 0 },
        { x: pixelDistance, y: 0 },
        meters
      );
      this.emitFloorChange(nextFloor, 'Calibrate blueprint scale');
    }
  }

  private cancelActiveToolChain(): void {
    this.wallChainStart = null;
    this.wallDrawDownHandled = false;
    this.roomChainPoints = [];
    this.calibrationStartPoint = null;
    this.openingPreview = null;
    this.rebuildOverlayLayer();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const path = e.composedPath();
    const inInput = path.some(
      (el) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
    );
    if (inInput) return;

    if (e.code === 'Space') {
      this.isSpacePressed = true;
    } else if (e.key === 'Shift') {
      this.isShiftPressed = true;
    } else if (e.key === 'Escape') {
      this.cancelActiveToolChain();
    } else if (e.key === 'Enter') {
      if (this.toolMode === 'draw_room' && this.roomChainPoints.length >= 3) {
        this.commitRoomPolygon();
      } else if (this.toolMode === 'draw_wall' && this.wallChainStart) {
        this.cancelActiveToolChain();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
    } else if (e.key === 'Shift') {
      this.isShiftPressed = false;
    }
  };

  // Multi-touch pinch-zoom handlers
  private onMountPointerDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    this.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activeTouchPoints.size === 2) {
      const pts = Array.from(this.activeTouchPoints.values());
      this.pinchInitialDistance = Math.max(10, distance2D(pts[0], pts[1]));
      this.pinchInitialScale = this.pixelsPerMeter;
      this.pinchInitialPan = { x: this.panX, y: this.panY };
      const rect = this.getBoundingClientRect();
      this.pinchInitialMidScreen = {
        x: (pts[0].x + pts[1].x) / 2 - rect.left,
        y: (pts[0].y + pts[1].y) / 2 - rect.top
      };
    }
  };

  private onMountPointerMove = (e: PointerEvent): void => {
    if (!this.activeTouchPoints.has(e.pointerId)) return;
    this.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activeTouchPoints.size === 2) {
      const pts = Array.from(this.activeTouchPoints.values());
      const dist = Math.max(10, distance2D(pts[0], pts[1]));
      const ratio = dist / this.pinchInitialDistance;
      this.pixelsPerMeter = Math.max(15, Math.min(300, this.pinchInitialScale * ratio));

      const rect = this.getBoundingClientRect();
      const midScreen = {
        x: (pts[0].x + pts[1].x) / 2 - rect.left,
        y: (pts[0].y + pts[1].y) / 2 - rect.top
      };
      this.panX =
        this.pinchInitialPan.x - (midScreen.x - this.pinchInitialMidScreen.x) / this.pixelsPerMeter;
      this.panY =
        this.pinchInitialPan.y - (midScreen.y - this.pinchInitialMidScreen.y) / this.pixelsPerMeter;
      this.syncKonvaViewport();
      this.rebuildSceneLayer();
    }
  };

  private onMountPointerUp = (e: PointerEvent): void => {
    this.activeTouchPoints.delete(e.pointerId);
  };

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
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        detail: { selection },
        bubbles: true,
        composed: true
      })
    );
  }

  // ============================================================================
  // Render HUD & Mount Container
  // ============================================================================

  private renderTouchActionBar() {
    if (this.toolMode === 'draw_wall' && this.wallChainStart) {
      return html`
        <div class="touch-action-bar">
          <button
            class="touch-pill touch-pill-success"
            @click=${() => this.cancelActiveToolChain()}
          >
            ✓ Finish Wall Chain (Esc / Right-Click)
          </button>
        </div>
      `;
    }

    if (this.toolMode === 'draw_room' && this.roomChainPoints.length > 0) {
      return html`
        <div class="touch-action-bar">
          <button
            class="touch-pill touch-pill-success"
            ?disabled=${this.roomChainPoints.length < 3}
            @click=${() => this.commitRoomPolygon()}
          >
            ✓ Complete Room (${this.roomChainPoints.length} pts)
          </button>
          <button
            class="touch-pill touch-pill-danger"
            @click=${() => this.cancelActiveToolChain()}
          >
            ✕ Cancel
          </button>
        </div>
      `;
    }

    return nothing;
  }

  render() {
    const toolLabels: Record<EditorToolMode, string> = {
      select: 'Select & Move (Konva 2D)',
      draw_wall: 'Draw Wall (Auto-Room)',
      draw_room: 'Draw Custom Room',
      add_opening: 'Add Door / Window',
      measure: 'Measure / Calibrate'
    };

    return html`
      <div class="konva-mount"></div>

      ${this.renderTouchActionBar()}

      <div class="hud-tool-badge">
        <span>🛠️ ${toolLabels[this.toolMode]}</span>
      </div>

      <div class="hud-overlay">
        <div class="hud-scale-bar">
          <span>1 m</span>
          <div class="scale-ruler" style="width: ${Math.round(this.pixelsPerMeter)}px"></div>
        </div>
        <div class="hud-coords">
          <span>X: <strong>${this.snappedCursorWorld.x.toFixed(2)}m</strong></span>
          <span>Y: <strong>${this.snappedCursorWorld.y.toFixed(2)}m</strong></span>
        </div>
      </div>

      <div class="zoom-controls">
        <button class="zoom-btn" title="Zoom In" @click=${() => this.zoomIn()}>+</button>
        <button class="zoom-btn" title="Zoom Out" @click=${() => this.zoomOut()}>−</button>
        <button class="zoom-btn zoom-btn-fit" title="Zoom to Fit" @click=${() => this.zoomToFit()}>
          Fit
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-canvas-2d': FloorplanCanvas2D;
  }
}
