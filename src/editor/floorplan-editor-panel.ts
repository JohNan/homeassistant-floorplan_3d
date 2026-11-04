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
 */
@customElement('floorplan-editor-panel')
export class FloorplanEditorPanel extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;

  @state() private floorplans: FloorplanSummary[] = [];
  @state() private activeFloorplanId = '';
  @state() private activeFloorId = '';
  @state() private activeTool: EditorToolMode = 'select';
  @state() private viewLayout: EditorViewLayout = 'split';
  @state() private gridSize = 0.1;
  @state() private snapToGrid = true;
  @state() private onionSkin = false;
  @state() private selection: EditorSelection = { kind: 'none', id: null };
  @state() private isBlueprintModalOpen = false;
  @state() private isDirty = false;
  @state() private canUndo = false;
  @state() private canRedo = false;
  @state() private toastMessage: string | null = null;

  private history!: EditorHistory<FloorplanDocument>;
  private wsClient!: FloorplanWsClient;
  private stateDiffer = new WatchedEntityDiffer();
  private scene3d: FloorplanScene3D | null = null;
  private sceneContainerEl: HTMLElement | null = null;
  private toastTimer: number | null = null;
  private isWsInitialized = false;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      background: #090d16;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }

    .editor-body {
      display: flex;
      flex: 1;
      min-height: 0;
      position: relative;
    }

    .center-viewport {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
      background: #090d16;
      position: relative;
    }

    .viewport-pane {
      flex: 1;
      height: 100%;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }

    .viewport-pane.hidden {
      display: none;
    }

    .viewport-divider {
      width: 4px;
      background: #1e293b;
      border-left: 1px solid #334155;
      border-right: 1px solid #334155;
      cursor: col-resize;
      flex-shrink: 0;
    }

    .scene-3d-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #0f172a;
    }

    .toast-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #3b82f6;
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

    /* Narrow mode styling */
    :host([narrow]) .editor-body {
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
    this.scene3d?.dispose();
    this.scene3d = null;
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
        onCameraChanged: (bookmark) => {
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

    if (payload.kind === 'entity' && payload.entityId) {
      const newEntity = {
        id: `ent_${Math.random().toString(36).substring(2, 9)}`,
        entity_id: payload.entityId,
        domain: payload.domain || payload.entityId.split('.')[0] || 'sensor',
        room_id: null,
        x: 0,
        y: 0,
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
        x: 0,
        y: 0,
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

    return html`
      <!-- Top CAD Command Bar -->
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
        @save-camera=${this.handleSaveCamera}
        @import-json=${this.handleImportJsonClick}
        @export-json=${this.handleExportJson}
        @save-floorplan=${this.handleSaveFloorplan}
      ></floorplan-editor-toolbar>

      <!-- Main Editor Body -->
      <div class="editor-body">
        <!-- Left Dock: Entity & Catalog Palette -->
        <floorplan-entity-palette
          .hass=${this.hass}
          .activeFloor=${activeFloor}
          .selectedRoomAreaId=${selectedRoomAreaId}
          @palette-place=${this.handlePalettePlace}
        ></floorplan-entity-palette>

        <!-- Center Viewport: 2D CAD Canvas + Split/3D Live Preview -->
        <div class="center-viewport">
          <!-- 2D Viewport Pane -->
          <div class="viewport-pane ${this.viewLayout === '3d' ? 'hidden' : ''}">
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${activeFloor}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .onionSkinFloor=${this.onionSkin ? floorBelow : null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
              @palette-place=${this.handlePalettePlace}
            ></floorplan-canvas-2d>
          </div>

          ${this.viewLayout === 'split'
            ? html`<div class="viewport-divider"></div>`
            : ''}

          <!-- 3D Preview Pane -->
          <div class="viewport-pane ${this.viewLayout === '2d' ? 'hidden' : ''}">
            <div class="scene-3d-container" id="scene-3d-root"></div>
          </div>
        </div>

        <!-- Right Dock: Context-Sensitive Property Inspector -->
        <floorplan-property-inspector
          .hass=${this.hass}
          .document=${this.currentDocument}
          .floor=${activeFloor}
          .selection=${this.selection}
          @document-mutate=${this.handleDocumentMutate}
          @delete-selected=${() => this.deleteSelection()}
          @open-blueprint-modal=${() => (this.isBlueprintModalOpen = true)}
        ></floorplan-property-inspector>
      </div>

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
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-editor-panel': FloorplanEditorPanel;
  }
}
