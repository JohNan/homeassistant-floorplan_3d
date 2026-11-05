import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  CameraBookmark,
  FloorLevel,
  FloorplanDocument,
  FloorplanSummary,
  WallEdge,
  WallNode
} from '../types/floorplan';
import { createDefaultFloorplanDocument } from '../types/floorplan';
import type { HomeAssistant } from '../types/ha';
import type {
  BlueprintCalibrationResult,
  EditorSelection,
  EditorToolMode,
  EditorViewLayout,
  PaletteDragPayload
} from './editor-contracts';
import { EditorHistory } from './state/EditorHistory';
import { FloorplanWsClient } from '../api/ws-client';
import { FloorplanScene3D } from '../engine/FloorplanScene3D';
import { WatchedEntityDiffer } from '../utils/ha-registry';

// Child components
import './canvas2d/FloorplanCanvas2D';
import './canvas2d/BlueprintModal';
import './components/EditorToolbar';
import './components/EntityPalette';
import './components/PropertyInspector';

/**
 * Admin Sidebar CAD Editor Panel for 2D/3D Floorplans (`<floorplan-editor-panel>`).
 * Responsive desktop sidebar & mobile thumb-friendly CAD dock + slide-up sheets.
 */
@customElement('floorplan-editor-panel')
export class FloorplanEditorPanel extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;

  @state() private floorplans: FloorplanSummary[] = [];
  @state() private activeFloorplanId = '';
  @state() private activeFloorId = '';
  @state() private activeTool: EditorToolMode = 'select';
  @state() private viewLayout: EditorViewLayout = '2d';
  @state() private gridSize = 0.1;
  @state() private snapToGrid = true;
  @state() private onionSkin = false;
  @state() private selection: EditorSelection = { kind: 'none', id: null };
  @state() private isBlueprintModalOpen = false;
  @state() private isDirty = false;
  @state() private canUndo = false;
  @state() private canRedo = false;
  @state() private toastMessage: string | null = null;
  @state() private isViewportNarrow = false;
  @state() private activeMobileSheet: 'none' | 'palette' | 'inspector' = 'none';
  @state() private isLeftPaneCollapsed = false;
  @state() private isRightPaneCollapsed = false;
  @state() private isTopToolbarCollapsed = false;
  @state() private splitRatio = 0.65;

  private history!: EditorHistory<FloorplanDocument>;
  private wsClient!: FloorplanWsClient;
  private stateDiffer = new WatchedEntityDiffer();
  private scene3d: FloorplanScene3D | null = null;
  private sceneContainerEl: HTMLElement | null = null;
  private toastTimer: number | null = null;
  private isWsInitialized = false;
  private hostResizeObserver: ResizeObserver | null = null;
  private isResizingSplit = false;
  private prevFocusState: {
    left: boolean;
    right: boolean;
    top: boolean;
    layout: EditorViewLayout;
  } | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      max-height: 100dvh;
      background: var(--primary-background-color, #090d16);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      overscroll-behavior: none;
      box-sizing: border-box;
      position: relative;
    }

    :host([mobile]) {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      max-height: 100dvh;
    }

    floorplan-editor-toolbar {
      flex-shrink: 0;
      z-index: 50;
    }

    .editor-body {
      display: flex;
      flex: 1 1 0%;
      min-height: 0;
      overflow: hidden;
      position: relative;
    }

    .editor-body.mobile {
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      overflow: hidden;
    }

    .center-viewport {
      display: flex;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--primary-background-color, #090d16);
      position: relative;
    }

    .viewport-pane {
      flex: 1 1 0%;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      position: relative;
      overflow: hidden;
    }

    .viewport-pane.hidden {
      display: none;
    }

    .viewport-divider {
      width: 6px;
      background: var(--secondary-background-color, #1e293b);
      border-left: 1px solid var(--divider-color, #334155);
      border-right: 1px solid var(--divider-color, #334155);
      cursor: col-resize;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      user-select: none;
      z-index: 20;
    }

    .viewport-divider:hover {
      background: var(--primary-color, #3b82f6);
    }

    .viewport-divider::after {
      content: '⋮';
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      line-height: 1;
    }

    .pane-expand-tab {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 30;
      background: var(--card-background-color, rgba(15, 23, 42, 0.92));
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #334155);
      padding: 10px 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(4px);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .pane-expand-tab:hover {
      background: var(--secondary-background-color, #1e293b);
      border-color: var(--primary-color, #38bdf8);
      color: var(--primary-color, #38bdf8);
    }

    .pane-expand-tab.left {
      left: 0;
      border-left: none;
      border-radius: 0 8px 8px 0;
    }

    .pane-expand-tab.right {
      right: 0;
      border-right: none;
      border-radius: 8px 0 0 8px;
    }

    .viewport-floating-bar {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 25;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      border: 1px solid var(--divider-color, #334155);
      border-radius: 8px;
      padding: 4px 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(4px);
    }

    .floating-chip-btn {
      background: transparent;
      color: var(--primary-text-color, #cbd5e1);
      border: 1px solid transparent;
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .floating-chip-btn:hover {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #ffffff);
    }

    .floating-chip-btn.active {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
    }

    .scene-3d-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: var(--card-background-color, #0f172a);
    }

    .toast-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card-background-color, #1e293b);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--primary-color, #3b82f6);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      pointer-events: none;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, 8px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    .file-input-hidden {
      display: none;
    }

    /* Mobile Bottom CAD Dock */
    .mobile-bottom-dock {
      min-height: 54px;
      height: calc(54px + env(safe-area-inset-bottom, 0px));
      padding: 0 4px env(safe-area-inset-bottom, 0px) 4px;
      background: var(--card-background-color, #0f172a);
      border-top: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: space-around;
      box-sizing: border-box;
      flex-shrink: 0;
      z-index: 50;
      touch-action: manipulation;
    }

    .dock-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      min-height: 44px;
      flex: 1;
      min-width: 0;
      transition: background 0.15s, color 0.15s;
    }

    .dock-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .dock-btn.active {
      color: var(--primary-color, #38bdf8);
      background: rgba(59, 130, 246, 0.12);
    }

    .dock-icon {
      font-size: 16px;
      line-height: 1;
    }

    .dock-label {
      font-size: 10px;
      font-weight: 600;
      margin-top: 2px;
    }

    .dock-divider {
      width: 1px;
      height: 28px;
      background: var(--divider-color, #334155);
      margin: 0 2px;
      flex-shrink: 0;
    }

    /* Floating Selection Bar on Mobile */
    .mobile-selection-bar {
      position: absolute;
      bottom: calc(62px + env(safe-area-inset-bottom, 0px));
      left: 12px;
      right: 12px;
      background: var(--card-background-color, #1e293b);
      border: 1px solid var(--primary-color, #3b82f6);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 60;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      animation: fadeIn 0.15s ease-out;
    }

    .selection-text {
      font-size: 12px;
      color: var(--primary-text-color, #f8fafc);
    }

    .selection-actions {
      display: flex;
      gap: 6px;
    }

    .btn-sel-edit {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sel-delete {
      background: var(--error-color, #7f1d1d);
      color: #fecaca;
      border: 1px solid var(--error-color, #991b1b);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Slide-up Bottom Sheets */
    .mobile-sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 100;
      backdrop-filter: blur(2px);
    }

    .mobile-sheet-drawer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 75%;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--card-background-color, #0f172a);
      border-top: 1px solid var(--divider-color, #334155);
      border-radius: 16px 16px 0 0;
      z-index: 110;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .mobile-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
    }

    .sheet-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color, #f8fafc);
    }

    .sheet-close-btn {
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .sheet-close-btn:hover {
      color: var(--primary-text-color, #ffffff);
      background: rgba(255, 255, 255, 0.1);
    }

    .mobile-sheet-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();

    const defaultDoc = createDefaultFloorplanDocument();
    this.history = new EditorHistory<FloorplanDocument>(defaultDoc, 50);
    this.activeFloorplanId = defaultDoc.id;
    this.activeFloorId = defaultDoc.floors[0]?.id ?? '';
    this.updateHistoryFlags();

    this.wsClient = new FloorplanWsClient(() => this.hass);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('pointermove', this.handleSplitPointerMove);
    window.addEventListener('pointerup', this.handleSplitPointerUp);
    window.addEventListener('resize', this.syncViewportHeight);
    window.visualViewport?.addEventListener('resize', this.syncViewportHeight);
    window.visualViewport?.addEventListener('scroll', this.syncViewportHeight);

    if (typeof ResizeObserver !== 'undefined') {
      this.hostResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          this.isViewportNarrow = width > 0 && width < 768;
        }
        this.syncViewportHeight();
      });
      this.hostResizeObserver.observe(this);
    }

    this.syncViewportHeight();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('pointermove', this.handleSplitPointerMove);
    window.removeEventListener('pointerup', this.handleSplitPointerUp);
    window.removeEventListener('resize', this.syncViewportHeight);
    window.visualViewport?.removeEventListener('resize', this.syncViewportHeight);
    window.visualViewport?.removeEventListener('scroll', this.syncViewportHeight);
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = null;
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
    this.scene3d?.dispose();
    this.scene3d = null;
  }

  /**
   * Synchronizes the panel's pixel height to the exact visible viewport height
   * (`window.visualViewport.height` / `window.innerHeight` minus any top header offset)
   * so that on mobile browsers (where `100vh` exceeds the visible area due to address/nav bars)
   * both the top toolbar and the bottom CAD dock remain simultaneously visible without page scrolling.
   */
  private syncViewportHeight = (): void => {
    if (typeof window === 'undefined') return;

    const isMobileView = this.isMobile;
    if (isMobileView !== this.hasAttribute('mobile')) {
      this.toggleAttribute('mobile', isMobileView);
    }

    if (isMobileView && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }

    const vvHeight = window.visualViewport?.height ?? 0;
    const innerH = window.innerHeight ?? 0;
    const visibleH =
      vvHeight > 0 && innerH > 0 ? Math.min(vvHeight, innerH) : vvHeight || innerH;
    if (visibleH <= 0) return;

    const rect = this.getBoundingClientRect();
    const topOffset = isMobileView ? 0 : Math.max(0, Math.min(120, rect.top));
    const exactHeight = Math.max(240, Math.floor(visibleH - topOffset));

    const heightCss = `${exactHeight}px`;
    if (this.style.height !== heightCss) {
      this.style.height = heightCss;
      this.style.maxHeight = heightCss;
    }
  };

  override firstUpdated(): void {
    this.syncViewportHeight();
  }

  override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('narrow') || changedProperties.has('isViewportNarrow')) {
      this.syncViewportHeight();
    }
    if (
      (changedProperties.has('narrow') || changedProperties.has('isViewportNarrow')) &&
      this.isMobile &&
      this.viewLayout === 'split'
    ) {
      this.viewLayout = '2d';
    }
  }

  override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('hass') && this.hass && !this.isWsInitialized) {
      this.isWsInitialized = true;
      this.stateDiffer.rebuildWatchedSet(this.currentDocument, this.hass);
      this.loadInitialData();
    }

    if (changedProperties.has('hass') && this.hass && this.scene3d) {
      const changed = this.stateDiffer.diffStates(this.hass);
      if (changed.length > 0) {
        this.scene3d.updateHassStates(this.hass, changed);
      }
    }

    if (changedProperties.has('viewLayout')) {
      this.handleLayoutChangeEffect();
    }
  }

  private get isMobile(): boolean {
    return (
      this.narrow ||
      this.isViewportNarrow ||
      (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768)
    );
  }

  private get isFocusMode(): boolean {
    return (
      this.isLeftPaneCollapsed &&
      this.isRightPaneCollapsed &&
      this.viewLayout === '2d'
    );
  }

  private toggleFocusMode(): void {
    if (!this.isFocusMode) {
      this.prevFocusState = {
        left: this.isLeftPaneCollapsed,
        right: this.isRightPaneCollapsed,
        top: this.isTopToolbarCollapsed,
        layout: this.viewLayout
      };
      this.isLeftPaneCollapsed = true;
      this.isRightPaneCollapsed = true;
      this.viewLayout = '2d';
    } else if (this.prevFocusState) {
      this.isLeftPaneCollapsed = this.prevFocusState.left;
      this.isRightPaneCollapsed = this.prevFocusState.right;
      this.isTopToolbarCollapsed = this.prevFocusState.top;
      this.viewLayout = this.prevFocusState.layout;
      this.prevFocusState = null;
    } else {
      this.isLeftPaneCollapsed = false;
      this.isRightPaneCollapsed = false;
      this.isTopToolbarCollapsed = false;
    }
  }

  private startSplitResize = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    this.isResizingSplit = true;
  };

  private handleSplitPointerMove = (e: PointerEvent): void => {
    if (!this.isResizingSplit) return;
    const centerEl = this.renderRoot.querySelector('.center-viewport') as HTMLElement | null;
    if (!centerEl) return;
    const rect = centerEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawRatio = (e.clientX - rect.left) / rect.width;
    this.splitRatio = Math.max(0.2, Math.min(0.85, Number(rawRatio.toFixed(3))));
    this.scene3d?.resize();
  };

  private handleSplitPointerUp = (): void => {
    if (this.isResizingSplit) {
      this.isResizingSplit = false;
      this.scene3d?.resize();
    }
  };

  private async loadInitialData(): Promise<void> {
    try {
      const summaries = await this.wsClient.listFloorplans();
      this.floorplans = summaries;

      if (summaries.length > 0) {
        const first = summaries[0];
        const doc = await this.wsClient.getFloorplan(first.id);
        this.history.reset(doc);
        this.activeFloorplanId = doc.id;
        this.activeFloorId = doc.floors[0]?.id ?? '';
        this.updateHistoryFlags();
        this.sync3DScene();
      }
    } catch (err) {
      // Standalone/offline fallback
      console.warn('Could not load floorplans via WebSocket; running in standalone mode', err);
    }
  }

  private get currentDocument(): FloorplanDocument {
    return this.history.current;
  }

  private get activeFloor(): FloorLevel | undefined {
    return (
      this.currentDocument.floors.find((f) => f.id === this.activeFloorId) ??
      this.currentDocument.floors[0]
    );
  }

  private updateHistoryFlags(): void {
    this.canUndo = this.history.canUndo;
    this.canRedo = this.history.canRedo;
    this.isDirty = this.history.isDirty;
  }

  private pushHistory(nextDoc: FloorplanDocument, label: string): void {
    this.history.push(nextDoc, label);
    this.updateHistoryFlags();
    this.sync3DScene();
    this.requestUpdate();
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
      this.toastTimer = null;
      this.requestUpdate();
    }, 3200);
    this.requestUpdate();
  }

  // --- Keyboard Shortcuts ---
  private handleKeyDown = (ev: KeyboardEvent): void => {
    // Ignore keystrokes when typing inside input / textarea / select (including across Shadow DOM boundaries)
    const targetEl = (ev.composedPath?.()[0] ?? ev.target) as HTMLElement | undefined;
    const tag = targetEl?.tagName?.toLowerCase();
    if (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      targetEl?.isContentEditable
    ) {
      return;
    }

    const isCtrlOrCmd = ev.ctrlKey || ev.metaKey;

    if (isCtrlOrCmd && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (ev.shiftKey) {
        this.handleRedo();
      } else {
        this.handleUndo();
      }
      return;
    }

    if (isCtrlOrCmd && ev.key.toLowerCase() === 'y') {
      ev.preventDefault();
      this.handleRedo();
      return;
    }

    if (isCtrlOrCmd && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      this.handleSaveFloorplan();
      return;
    }

    // CAD Tool Shortcuts
    switch (ev.key.toLowerCase()) {
      case 'v':
        this.activeTool = 'select';
        break;
      case 'w':
        this.activeTool = 'draw_wall';
        break;
      case 'r':
        this.activeTool = 'draw_room';
        break;
      case 'o':
        this.activeTool = 'add_opening';
        break;
      case 'm':
        this.activeTool = 'measure';
        break;
      case 'b':
        this.isBlueprintModalOpen = true;
        break;
      case '[':
        this.isLeftPaneCollapsed = !this.isLeftPaneCollapsed;
        break;
      case ']':
        this.isRightPaneCollapsed = !this.isRightPaneCollapsed;
        break;
      case 'f':
        this.toggleFocusMode();
        break;
      case 'delete':
      case 'backspace':
        this.deleteSelection();
        break;
    }
  };

  private handleUndo(): void {
    const prev = this.history.undo();
    if (prev) {
      this.updateHistoryFlags();
      this.sync3DScene();
      this.requestUpdate();
      this.showToast('Undo');
    }
  }

  private handleRedo(): void {
    const next = this.history.redo();
    if (next) {
      this.updateHistoryFlags();
      this.sync3DScene();
      this.requestUpdate();
      this.showToast('Redo');
    }
  }

  private deleteSelection(): void {
    if (this.selection.kind === 'none' || !this.selection.id) return;
    const { kind, id } = this.selection;

    const doc = structuredClone(this.currentDocument);
    const floor = doc.floors.find((f) => f.id === this.activeFloorId);
    if (!floor) return;

    switch (kind) {
      case 'node': {
        const removedWallIds = new Set(
          floor.walls
            .filter((w) => w.start_node_id === id || w.end_node_id === id)
            .map((w) => w.id)
        );
        floor.nodes = floor.nodes.filter((n) => n.id !== id);
        floor.walls = floor.walls.filter((w) => !removedWallIds.has(w.id));
        floor.openings = floor.openings.filter((o) => !removedWallIds.has(o.wall_id));
        floor.rooms = floor.rooms
          .map((r) => ({
            ...r,
            points: r.points.filter((p) => p.node_id !== id)
          }))
          .filter((r) => r.points.length >= 3);
        break;
      }
      case 'wall':
        floor.walls = floor.walls.filter((w) => w.id !== id);
        floor.openings = floor.openings.filter((o) => o.wall_id !== id);
        break;
      case 'room':
        floor.rooms = floor.rooms.filter((r) => r.id !== id);
        break;
      case 'opening':
        floor.openings = floor.openings.filter((o) => o.id !== id);
        break;
      case 'furniture':
        floor.furniture = floor.furniture.filter((f) => f.id !== id);
        break;
      case 'entity':
        floor.entities = floor.entities.filter((e) => e.id !== id);
        break;
    }

    this.selection = { kind: 'none', id: null };
    this.pushHistory(doc, `Delete ${kind}`);
    this.showToast(`Deleted ${kind}`);
  }

  // --- 3D Scene Synchronization ---
  private sync3DScene(): void {
    this.stateDiffer.rebuildWatchedSet(this.currentDocument, this.hass);
    if (!this.scene3d) return;
    this.scene3d.setDocument(this.currentDocument, this.activeFloorId, this.hass);
  }

  private handleLayoutChangeEffect(): void {
    if (this.viewLayout === '2d') {
      if (this.scene3d) {
        this.scene3d.dispose();
        this.scene3d = null;
        this.sceneContainerEl = null;
      }
    } else {
      this.updateComplete.then(() => {
        this.ensure3DSceneMounted();
      });
    }
  }

  private ensure3DSceneMounted(): void {
    if (this.viewLayout === '2d') return;

    const container = this.renderRoot.querySelector('#scene-3d-root') as HTMLElement | null;
    if (!container) return;

    if (!this.scene3d || this.sceneContainerEl !== container) {
      this.scene3d?.dispose();
      this.sceneContainerEl = container;
      this.scene3d = new FloorplanScene3D(container, {
        wallMode: 'auto_cutaway',
        projection: 'perspective',
        showRoomLabels: true,
        showEntityBadges: true,
        onCameraChanged: (_bookmark) => {
          // Keep active floor camera bookmark in sync if desired
        }
      });
      this.scene3d.setDocument(this.currentDocument, this.activeFloorId, this.hass);
    } else {
      this.scene3d.resize();
    }
  }

  // --- Toolbar & Inspector Event Handlers ---
  private handleFloorplanChange(ev: CustomEvent<{ floorplanId: string }>): void {
    const { floorplanId } = ev.detail;
    if (!floorplanId) return;

    this.wsClient
      .getFloorplan(floorplanId)
      .then((doc) => {
        this.history.reset(doc);
        this.activeFloorplanId = doc.id;
        this.activeFloorId = doc.floors[0]?.id ?? '';
        this.updateHistoryFlags();
        this.sync3DScene();
        this.requestUpdate();
        this.showToast(`Loaded floorplan: ${doc.name}`);
      })
      .catch((err) => {
        this.showToast(`Failed to load floorplan: ${err.message}`);
      });
  }

  private handleFloorplanNew(): void {
    const id = `floorplan_${Date.now().toString(36)}`;
    const name = `Floorplan ${this.floorplans.length + 1}`;
    const newDoc = createDefaultFloorplanDocument(id, name);

    this.history.reset(newDoc);
    this.activeFloorplanId = newDoc.id;
    this.activeFloorId = newDoc.floors[0]?.id ?? '';
    this.updateHistoryFlags();
    this.sync3DScene();
    this.requestUpdate();
    this.showToast(`Created new floorplan: ${name}`);
  }

  private async handleFloorplanDelete(): Promise<void> {
    if (this.floorplans.length <= 1) {
      this.showToast('Cannot delete the only remaining floorplan.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the floorplan "${this.currentDocument.name}"?`
    );
    if (!confirmed) return;

    try {
      await this.wsClient.deleteFloorplan(this.activeFloorplanId);
      this.showToast('Floorplan deleted.');
      await this.loadInitialData();
    } catch (err: any) {
      this.showToast(`Failed to delete: ${err?.message || err}`);
    }
  }

  private handleFloorChange(ev: CustomEvent<{ floorId: string }>): void {
    this.activeFloorId = ev.detail.floorId;
    this.selection = { kind: 'none', id: null };
    this.scene3d?.setActiveFloor(this.activeFloorId);
    this.requestUpdate();
  }

  private handleFloorAdd(): void {
    const doc = structuredClone(this.currentDocument);
    const maxLevel = Math.max(...doc.floors.map((f) => f.level_index), 0);
    const maxElevation = Math.max(...doc.floors.map((f) => f.elevation), 0);
    const nextLevel = maxLevel + 1;
    const nextElevation = maxElevation + (this.activeFloor?.wall_height ?? 2.6);

    const newFloorId = `floor_${Date.now().toString(36)}`;
    const newFloor: FloorLevel = {
      id: newFloorId,
      name: `Level ${nextLevel}`,
      level_index: nextLevel,
      elevation: nextElevation,
      wall_height: 2.6,
      slab_thickness: 0.15,
      ha_floor_id: null,
      blueprint: null,
      default_camera: null,
      nodes: [],
      walls: [],
      openings: [],
      rooms: [],
      furniture: [],
      entities: []
    };

    doc.floors.push(newFloor);
    this.activeFloorId = newFloorId;
    this.pushHistory(doc, `Add Floor Level ${nextLevel}`);
    this.showToast(`Added Floor: ${newFloor.name}`);
  }

  private handleDuplicatePerimeter(): void {
    const doc = structuredClone(this.currentDocument);
    const curFloor = doc.floors.find((f) => f.id === this.activeFloorId);
    if (!curFloor) return;

    // Find highest floor level below the current level
    const floorBelow = [...doc.floors]
      .filter((f) => f.level_index < curFloor.level_index)
      .sort((a, b) => b.level_index - a.level_index)[0];

    if (!floorBelow) {
      this.showToast('No floor level found below the current level.');
      return;
    }

    const exteriorWalls = floorBelow.walls.filter((w) => w.is_exterior);
    if (exteriorWalls.length === 0) {
      this.showToast('Floor below has no exterior walls to duplicate.');
      return;
    }

    const referencedNodeIds = new Set<string>();
    for (const w of exteriorWalls) {
      referencedNodeIds.add(w.start_node_id);
      referencedNodeIds.add(w.end_node_id);
    }

    const idMap = new Map<string, string>();
    const clonedNodes: WallNode[] = [];

    for (const n of floorBelow.nodes) {
      if (referencedNodeIds.has(n.id)) {
        const newId = `n_${Math.random().toString(36).substring(2, 9)}`;
        idMap.set(n.id, newId);
        clonedNodes.push({ id: newId, x: n.x, y: n.y });
      }
    }

    const clonedWalls: WallEdge[] = exteriorWalls.map((w) => ({
      id: `w_${Math.random().toString(36).substring(2, 9)}`,
      start_node_id: idMap.get(w.start_node_id)!,
      end_node_id: idMap.get(w.end_node_id)!,
      thickness: w.thickness,
      height_override: w.height_override,
      is_exterior: true,
      color_override: w.color_override
    }));

    curFloor.nodes.push(...clonedNodes);
    curFloor.walls.push(...clonedWalls);

    this.pushHistory(doc, 'Duplicate Perimeter from Below');
    this.showToast(`Duplicated ${clonedWalls.length} perimeter walls from ${floorBelow.name}`);
  }

  private handleSaveCamera(): void {
    if (!this.scene3d) {
      this.showToast('3D scene view is not active.');
      return;
    }
    const bookmark = this.scene3d.getCurrentCameraBookmark();
    const doc = structuredClone(this.currentDocument);
    const curFloor = doc.floors.find((f) => f.id === this.activeFloorId);
    if (!curFloor) return;

    curFloor.default_camera = bookmark;
    this.pushHistory(doc, 'Save 3D Camera as Default');
    this.showToast('Saved current 3D camera as floor default.');
  }

  private handleImportJsonClick(): void {
    const input = this.renderRoot.querySelector('#json-file-input') as HTMLInputElement | null;
    input?.click();
  }

  private handleJsonFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as FloorplanDocument;
        if (!parsed.id || !Array.isArray(parsed.floors)) {
          throw new Error('Invalid floorplan JSON schema: missing id or floors array');
        }
        parsed.updated_at = new Date().toISOString();
        this.history.push(parsed, 'Import Floorplan JSON');
        this.activeFloorplanId = parsed.id;
        this.activeFloorId = parsed.floors[0]?.id ?? '';
        this.updateHistoryFlags();
        this.sync3DScene();
        this.requestUpdate();
        this.showToast(`Imported floorplan: ${parsed.name}`);
      } catch (err: any) {
        this.showToast(`Failed to parse JSON: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private handleExportJson(): void {
    const jsonStr = JSON.stringify(this.currentDocument, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentDocument.id || 'floorplan'}.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.showToast('Exported floorplan JSON');
  }

  private async handleSaveFloorplan(): Promise<void> {
    try {
      const doc = this.currentDocument;
      doc.updated_at = new Date().toISOString();

      const saved = await this.wsClient.saveFloorplan(doc, doc.revision);
      this.history.markSaved();
      this.updateHistoryFlags();
      this.showToast(`Floorplan saved (Rev ${saved.revision})`);

      // Refresh list
      const summaries = await this.wsClient.listFloorplans();
      this.floorplans = summaries;
    } catch (err: any) {
      this.showToast(`Failed to save: ${err?.message || err}`);
    }
  }

  private handleDocumentMutate(
    ev: CustomEvent<{ document: FloorplanDocument; description: string }>
  ): void {
    this.pushHistory(ev.detail.document, ev.detail.description);
  }

  private handleCanvasFloorChange(
    ev: CustomEvent<{ floor: FloorLevel; description: string }>
  ): void {
    const { floor, description } = ev.detail;
    const doc = structuredClone(this.currentDocument);
    const idx = doc.floors.findIndex((f) => f.id === floor.id);
    if (idx !== -1) {
      doc.floors[idx] = floor;
    } else {
      doc.floors.push(floor);
    }
    this.pushHistory(doc, description || 'Edit Floor Canvas');
  }

  private handleSelectionChange(
    ev: CustomEvent<{ selection: EditorSelection }>
  ): void {
    this.selection = ev.detail.selection;
    this.requestUpdate();
  }

  private handlePalettePlace(ev: CustomEvent<PaletteDragPayload>): void {
    const payload = ev.detail;
    const doc = structuredClone(this.currentDocument);
    const floor = doc.floors.find((f) => f.id === this.activeFloorId);
    if (!floor) return;

    // Viewport-centered placement
    const canvas = this.renderRoot.querySelector('floorplan-canvas-2d') as any;
    const center =
      canvas?.getViewportCenterWorld?.() ??
      (typeof canvas?.panX === 'number' && typeof canvas?.panY === 'number'
        ? { x: canvas.panX, y: canvas.panY }
        : { x: 0, y: 0 });

    const spawnX = Number(center.x.toFixed(2));
    const spawnY = Number(center.y.toFixed(2));

    if (payload.kind === 'entity' && payload.entityId) {
      const newEntity = {
        id: `ent_${Math.random().toString(36).substring(2, 9)}`,
        entity_id: payload.entityId,
        domain: payload.domain || payload.entityId.split('.')[0] || 'sensor',
        room_id: null,
        x: spawnX,
        y: spawnY,
        z_elevation: payload.domain === 'light' ? 2.4 : 1.2,
        rotation_deg: 0,
        mesh_type: (payload.domain === 'light' ? 'ceiling_light' : 'none') as any,
        mesh_scale: [1, 1, 1] as [number, number, number],
        badge: {
          visible: true,
          style: 'icon_only' as const,
          label_override: null,
          icon_override: null
        },
        tap_action: { action: 'default' as const },
        hold_action: { action: 'none' as const },
        double_tap_action: { action: 'none' as const }
      };
      floor.entities.push(newEntity);
      this.selection = { kind: 'entity', id: newEntity.id };
      this.pushHistory(doc, `Place Entity ${payload.entityId}`);
      this.showToast(`Placed entity: ${payload.entityId}`);
    } else if (payload.kind === 'furniture' && payload.furnitureType) {
      const newFurniture = {
        id: `furn_${Math.random().toString(36).substring(2, 9)}`,
        catalog_type: payload.furnitureType,
        label: payload.label || 'Furniture',
        x: spawnX,
        y: spawnY,
        z_elevation: 0,
        width: payload.defaultWidth ?? 1.5,
        depth: payload.defaultDepth ?? 0.8,
        height: payload.defaultHeight ?? 0.8,
        rotation_deg: 0,
        color: null
      };
      floor.furniture.push(newFurniture);
      this.selection = { kind: 'furniture', id: newFurniture.id };
      this.pushHistory(doc, `Add ${newFurniture.label}`);
      this.showToast(`Added ${newFurniture.label}`);
    } else if (payload.kind === 'opening' && payload.openingType) {
      if (floor.walls.length === 0) {
        this.showToast('Please draw walls first before adding doors or windows.');
        return;
      }
      const wall = floor.walls[0];
      const newOpening = {
        id: `open_${Math.random().toString(36).substring(2, 9)}`,
        wall_id: wall.id,
        type: payload.openingType,
        t: 0.5,
        width: payload.defaultWidth ?? 0.9,
        sill_height: payload.openingType.includes('window') ? 0.9 : 0.0,
        head_height: 2.1,
        swing_direction: 'left_in' as const,
        bound_entity_id: null
      };
      floor.openings.push(newOpening);
      this.selection = { kind: 'opening', id: newOpening.id };
      this.pushHistory(doc, `Add ${payload.label || 'Opening'}`);
      this.showToast(`Added ${payload.label || 'Opening'} to wall`);
    }

    // Auto-close sheet after placing on mobile
    this.activeMobileSheet = 'none';
  }

  private handleBlueprintCalibrated(
    ev: CustomEvent<BlueprintCalibrationResult>
  ): void {
    const result = ev.detail;
    const doc = structuredClone(this.currentDocument);
    const floor = doc.floors.find((f) => f.id === this.activeFloorId);
    if (!floor) return;

    floor.blueprint = {
      image_url: result.imageUrl,
      opacity: result.opacity,
      locked: false,
      offset_x: 0,
      offset_y: 0,
      rotation_deg: 0,
      meters_per_pixel: result.metersPerPixel,
      natural_width_px: result.naturalWidthPx,
      natural_height_px: result.naturalHeightPx
    };

    this.pushHistory(doc, 'Calibrate Blueprint Reference');
    this.isBlueprintModalOpen = false;
    this.showToast('Blueprint scale calibrated successfully');
  }

  render() {
    const activeFloor = this.activeFloor;
    const selectedRoom =
      this.selection.kind === 'room'
        ? activeFloor?.rooms.find((r) => r.id === this.selection.id)
        : null;
    const selectedRoomAreaId = selectedRoom?.ha_area_id ?? null;

    const floorBelow = activeFloor
      ? [...this.currentDocument.floors]
          .filter((f) => f.level_index < activeFloor.level_index)
          .sort((a, b) => b.level_index - a.level_index)[0] ?? null
      : null;

    const isMobile = this.isMobile;

    return html`
      <!-- Top CAD Command Bar -->
      ${!this.isTopToolbarCollapsed || isMobile
        ? html`
            <floorplan-editor-toolbar
              .floorplans=${this.floorplans}
              .activeFloorplanId=${this.activeFloorplanId}
              .floors=${this.currentDocument.floors}
              .activeFloorId=${this.activeFloorId}
              .activeTool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .canUndo=${this.canUndo}
              .canRedo=${this.canRedo}
              .viewLayout=${this.viewLayout}
              .isDirty=${this.isDirty}
              .onionSkin=${this.onionSkin}
              .narrow=${isMobile}
              .leftPaneCollapsed=${this.isLeftPaneCollapsed}
              .rightPaneCollapsed=${this.isRightPaneCollapsed}
              .focusMode=${this.isFocusMode}
              @floorplan-change=${this.handleFloorplanChange}
              @floorplan-new=${this.handleFloorplanNew}
              @floorplan-delete=${this.handleFloorplanDelete}
              @floor-change=${this.handleFloorChange}
              @floor-add=${this.handleFloorAdd}
              @duplicate-perimeter=${this.handleDuplicatePerimeter}
              @toggle-onion-skin=${(ev: CustomEvent<{ onionSkin: boolean }>) =>
                (this.onionSkin = ev.detail.onionSkin)}
              @tool-change=${(ev: CustomEvent<{ tool: EditorToolMode }>) =>
                (this.activeTool = ev.detail.tool)}
              @calibrate-blueprint=${() => (this.isBlueprintModalOpen = true)}
              @grid-size-change=${(ev: CustomEvent<{ gridSize: number }>) =>
                (this.gridSize = ev.detail.gridSize)}
              @snap-toggle=${(ev: CustomEvent<{ snap: boolean }>) =>
                (this.snapToGrid = ev.detail.snap)}
              @undo=${this.handleUndo}
              @redo=${this.handleRedo}
              @layout-change=${(ev: CustomEvent<{ layout: EditorViewLayout }>) =>
                (this.viewLayout = ev.detail.layout)}
              @toggle-left-pane=${() =>
                (this.isLeftPaneCollapsed = !this.isLeftPaneCollapsed)}
              @toggle-right-pane=${() =>
                (this.isRightPaneCollapsed = !this.isRightPaneCollapsed)}
              @toggle-focus-mode=${() => this.toggleFocusMode()}
              @toggle-top-toolbar=${() =>
                (this.isTopToolbarCollapsed = !this.isTopToolbarCollapsed)}
              @save-camera=${this.handleSaveCamera}
              @import-json=${this.handleImportJsonClick}
              @export-json=${this.handleExportJson}
              @save-floorplan=${this.handleSaveFloorplan}
            ></floorplan-editor-toolbar>
          `
        : ''}

      ${isMobile ? this.renderMobileLayout(activeFloor, selectedRoomAreaId, floorBelow) : this.renderDesktopLayout(activeFloor, selectedRoomAreaId, floorBelow)}

      <!-- Blueprint 2-Point Calibration Modal -->
      <floorplan-blueprint-modal
        .open=${this.isBlueprintModalOpen}
        .floorplanId=${this.currentDocument.id}
        .floorId=${this.activeFloorId}
        .currentBlueprint=${activeFloor?.blueprint ?? null}
        .uploadCallback=${(params: {
          floorplanId: string;
          floorId: string;
          mimeType: string;
          dataBase64: string;
        }) => this.wsClient.uploadBlueprint(params)}
        @blueprint-calibrated=${this.handleBlueprintCalibrated}
        @modal-close=${() => (this.isBlueprintModalOpen = false)}
      ></floorplan-blueprint-modal>

      <!-- Toast Overlay -->
      ${this.toastMessage
        ? html`<div class="toast-overlay">${this.toastMessage}</div>`
        : ''}

      <!-- Hidden file input for JSON import -->
      <input
        type="file"
        id="json-file-input"
        class="file-input-hidden"
        accept=".json,application/json"
        @change=${this.handleJsonFileSelected}
      />
    `;
  }

  private renderDesktopLayout(
    activeFloor: FloorLevel | undefined,
    selectedRoomAreaId: string | null,
    floorBelow: FloorLevel | null
  ) {
    const pane2dStyle =
      this.viewLayout === 'split' ? `flex: ${this.splitRatio};` : 'flex: 1;';
    const pane3dStyle =
      this.viewLayout === 'split' ? `flex: ${1 - this.splitRatio};` : 'flex: 1;';

    return html`
      <div class="editor-body">
        <!-- Left Dock: Entity & Catalog Palette (Collapsible) -->
        ${!this.isLeftPaneCollapsed
          ? html`
              <floorplan-entity-palette
                .hass=${this.hass}
                .activeFloor=${activeFloor}
                .selectedRoomAreaId=${selectedRoomAreaId}
                @palette-place=${this.handlePalettePlace}
                @collapse-pane=${() => (this.isLeftPaneCollapsed = true)}
              ></floorplan-entity-palette>
            `
          : ''}

        <!-- Center Viewport: 2D CAD Canvas + Split/3D Live Preview -->
        <div class="center-viewport">
          <!-- Floating Left Expand Tab when Left Palette is Collapsed -->
          ${this.isLeftPaneCollapsed
            ? html`
                <button
                  class="pane-expand-tab left"
                  title="Expand Catalog & Entities ["
                  aria-label="Expand left catalog panel"
                  @click=${() => (this.isLeftPaneCollapsed = false)}
                >
                  ▶ Catalog [
                </button>
              `
            : ''}

          <!-- Floating Right Expand Tab when Right Inspector is Collapsed -->
          ${this.isRightPaneCollapsed
            ? html`
                <button
                  class="pane-expand-tab right"
                  title="Expand Property Inspector ]"
                  aria-label="Expand right property inspector"
                  @click=${() => (this.isRightPaneCollapsed = false)}
                >
                  ◀ Inspector ]
                </button>
              `
            : ''}

          <!-- 2D Viewport Pane -->
          <div
            class="viewport-pane ${this.viewLayout === '3d' ? 'hidden' : ''}"
            style=${pane2dStyle}
          >
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${activeFloor ?? null}
              .toolMode=${this.activeTool}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .ghostFloor=${this.onionSkin ? floorBelow : null}
              .onionSkinFloor=${this.onionSkin ? floorBelow : null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @floor-change=${this.handleCanvasFloorChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
              @palette-place=${this.handlePalettePlace}
              @tool-change=${(ev: CustomEvent<{ tool: EditorToolMode }>) =>
                (this.activeTool = ev.detail.tool)}
            ></floorplan-canvas-2d>

            <!-- Floating 2D Pane Quick Controls (Top-Right) -->
            <div class="viewport-floating-bar">
              ${this.isTopToolbarCollapsed
                ? html`
                    <button
                      class="floating-chip-btn"
                      title="Toggle Home Assistant Sidebar"
                      @click=${() =>
                        this.dispatchEvent(
                          new CustomEvent('hass-toggle-menu', {
                            bubbles: true,
                            composed: true
                          })
                        )}
                    >
                      ☰
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Show Top Toolbar"
                      @click=${() => (this.isTopToolbarCollapsed = false)}
                    >
                      ▼ Toolbar
                    </button>
                  `
                : ''}
              <button
                class="floating-chip-btn ${this.viewLayout === 'split' ? 'active' : ''}"
                title="Toggle 3D Split Preview"
                @click=${() =>
                  (this.viewLayout = this.viewLayout === 'split' ? '2d' : 'split')}
              >
                ◫ 3D Split
              </button>
              <button
                class="floating-chip-btn ${this.isFocusMode ? 'active' : ''}"
                title="Focus Mode: Hide Sidebars & Maximize Canvas [F]"
                @click=${() => this.toggleFocusMode()}
              >
                ${this.isFocusMode ? '🗗 Restore [F]' : '⛶ Focus [F]'}
              </button>
            </div>
          </div>

          ${this.viewLayout === 'split'
            ? html`
                <div
                  class="viewport-divider"
                  title="Drag to resize 2D/3D split (Double-click to hide 3D)"
                  @pointerdown=${this.startSplitResize}
                  @dblclick=${() => (this.viewLayout = '2d')}
                ></div>
              `
            : ''}

          <!-- 3D Preview Pane -->
          <div
            class="viewport-pane ${this.viewLayout === '2d' ? 'hidden' : ''}"
            style=${pane3dStyle}
          >
            <div class="scene-3d-container" id="scene-3d-root"></div>

            <!-- Floating 3D Pane Quick Controls (Top-Right) -->
            <div class="viewport-floating-bar">
              ${this.isTopToolbarCollapsed && this.viewLayout === '3d'
                ? html`
                    <button
                      class="floating-chip-btn"
                      title="Show Top Toolbar"
                      @click=${() => (this.isTopToolbarCollapsed = false)}
                    >
                      ▼ Toolbar
                    </button>
                  `
                : ''}
              ${this.viewLayout === 'split'
                ? html`
                    <button
                      class="floating-chip-btn"
                      title="Maximize 3D Preview"
                      @click=${() => (this.viewLayout = '3d')}
                    >
                      ⛶ Full 3D
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Collapse 3D Preview Pane"
                      @click=${() => (this.viewLayout = '2d')}
                    >
                      ✕ Hide 3D
                    </button>
                  `
                : html`
                    <button
                      class="floating-chip-btn"
                      title="Return to Split 2D + 3D View"
                      @click=${() => (this.viewLayout = 'split')}
                    >
                      ◫ Split 2D+3D
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Switch to 2D Canvas Only"
                      @click=${() => (this.viewLayout = '2d')}
                    >
                      2D Only
                    </button>
                  `}
            </div>
          </div>
        </div>

        <!-- Right Dock: Context-Sensitive Property Inspector (Collapsible) -->
        ${!this.isRightPaneCollapsed
          ? html`
              <floorplan-property-inspector
                .hass=${this.hass}
                .document=${this.currentDocument}
                .floor=${activeFloor}
                .selection=${this.selection}
                @document-mutate=${this.handleDocumentMutate}
                @delete-selected=${() => this.deleteSelection()}
                @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
                @collapse-pane=${() => (this.isRightPaneCollapsed = true)}
              ></floorplan-property-inspector>
            `
          : ''}
      </div>
    `;
  }

  private renderMobileLayout(
    activeFloor: FloorLevel | undefined,
    selectedRoomAreaId: string | null,
    floorBelow: FloorLevel | null
  ) {
    return html`
      <div class="editor-body mobile">
        <!-- Viewport takes entire height minus header and bottom dock -->
        <div class="center-viewport mobile">
          <!-- 2D Viewport Pane -->
          <div class="viewport-pane ${this.viewLayout === '3d' ? 'hidden' : ''}">
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${activeFloor ?? null}
              .toolMode=${this.activeTool}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .ghostFloor=${this.onionSkin ? floorBelow : null}
              .onionSkinFloor=${this.onionSkin ? floorBelow : null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @floor-change=${this.handleCanvasFloorChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
              @palette-place=${this.handlePalettePlace}
              @tool-change=${(ev: CustomEvent<{ tool: EditorToolMode }>) =>
                (this.activeTool = ev.detail.tool)}
            ></floorplan-canvas-2d>
          </div>

          <!-- 3D Preview Pane -->
          <div class="viewport-pane ${this.viewLayout === '2d' ? 'hidden' : ''}">
            <div class="scene-3d-container" id="scene-3d-root"></div>
          </div>
        </div>

        <!-- Compact Floating Selection Bar (Non-blocking) -->
        ${this.selection.kind !== 'none' && this.activeMobileSheet === 'none'
          ? html`
              <div class="mobile-selection-bar">
                <span class="selection-text">Selected: <strong>${this.selection.kind}</strong></span>
                <div class="selection-actions">
                  <button
                    class="btn-sel-edit"
                    @click=${() => (this.activeMobileSheet = 'inspector')}
                  >
                    Edit Properties
                  </button>
                  <button
                    class="btn-sel-delete"
                    @click=${() => this.deleteSelection()}
                  >
                    Delete
                  </button>
                </div>
              </div>
            `
          : ''}

        <!-- Thumb-Friendly Bottom CAD Dock -->
        <div class="mobile-bottom-dock">
          <button
            class="dock-btn ${this.activeTool === 'select' && this.activeMobileSheet === 'none' ? 'active' : ''}"
            @click=${() => {
              this.activeTool = 'select';
              this.activeMobileSheet = 'none';
            }}
          >
            <span class="dock-icon">↖</span>
            <span class="dock-label">Select</span>
          </button>
          <button
            class="dock-btn ${this.activeTool === 'draw_wall' && this.activeMobileSheet === 'none' ? 'active' : ''}"
            @click=${() => {
              this.activeTool = 'draw_wall';
              this.activeMobileSheet = 'none';
            }}
          >
            <span class="dock-icon">🧱</span>
            <span class="dock-label">Wall</span>
          </button>
          <button
            class="dock-btn ${this.activeTool === 'draw_room' && this.activeMobileSheet === 'none' ? 'active' : ''}"
            @click=${() => {
              this.activeTool = 'draw_room';
              this.activeMobileSheet = 'none';
            }}
          >
            <span class="dock-icon">⬚</span>
            <span class="dock-label">Room</span>
          </button>
          <button
            class="dock-btn ${this.activeTool === 'add_opening' && this.activeMobileSheet === 'none' ? 'active' : ''}"
            @click=${() => {
              this.activeTool = 'add_opening';
              this.activeMobileSheet = 'none';
            }}
          >
            <span class="dock-icon">🚪</span>
            <span class="dock-label">Opening</span>
          </button>
          <button
            class="dock-btn ${this.activeTool === 'measure' && this.activeMobileSheet === 'none' ? 'active' : ''}"
            @click=${() => {
              this.activeTool = 'measure';
              this.activeMobileSheet = 'none';
            }}
          >
            <span class="dock-icon">📏</span>
            <span class="dock-label">Measure</span>
          </button>

          <div class="dock-divider"></div>

          <button
            class="dock-btn ${this.activeMobileSheet === 'palette' ? 'active' : ''}"
            @click=${() => {
              this.activeMobileSheet =
                this.activeMobileSheet === 'palette' ? 'none' : 'palette';
            }}
          >
            <span class="dock-icon">+</span>
            <span class="dock-label">Add</span>
          </button>
          <button
            class="dock-btn ${this.activeMobileSheet === 'inspector' ? 'active' : ''}"
            @click=${() => {
              this.activeMobileSheet =
                this.activeMobileSheet === 'inspector' ? 'none' : 'inspector';
            }}
          >
            <span class="dock-icon">⚙</span>
            <span class="dock-label">Props</span>
          </button>
        </div>

        <!-- Slide-Up Bottom Sheets -->
        ${this.activeMobileSheet !== 'none'
          ? html`
              <div
                class="mobile-sheet-backdrop"
                @click=${() => (this.activeMobileSheet = 'none')}
              ></div>
              <div class="mobile-sheet-drawer">
                <div class="mobile-sheet-header">
                  <span class="sheet-title">
                    ${this.activeMobileSheet === 'palette'
                      ? 'Entities & Furniture Catalog'
                      : 'Property Inspector'}
                  </span>
                  <button
                    class="sheet-close-btn"
                    aria-label="Close sheet"
                    @click=${() => (this.activeMobileSheet = 'none')}
                  >
                    ✕
                  </button>
                </div>
                <div class="mobile-sheet-content">
                  ${this.activeMobileSheet === 'palette'
                    ? html`
                        <floorplan-entity-palette
                          ?mobile=${true}
                          .hass=${this.hass}
                          .activeFloor=${activeFloor}
                          .selectedRoomAreaId=${selectedRoomAreaId}
                          @palette-place=${this.handlePalettePlace}
                        ></floorplan-entity-palette>
                      `
                    : html`
                        <floorplan-property-inspector
                          ?mobile=${true}
                          .hass=${this.hass}
                          .document=${this.currentDocument}
                          .floor=${activeFloor}
                          .selection=${this.selection}
                          @document-mutate=${this.handleDocumentMutate}
                          @delete-selected=${() => this.deleteSelection()}
                          @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
                        ></floorplan-property-inspector>
                      `}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-editor-panel': FloorplanEditorPanel;
  }
}
