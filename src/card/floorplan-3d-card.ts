import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type {
  FloorplanCardConfig,
  FloorplanDocument,
  FloorLevel,
  WallDisplayMode,
  CameraProjection,
  AmbientMode,
  QualityTier
} from '../types/floorplan';
import type { HomeAssistant, LovelaceCard } from '../types/ha';
import { FloorplanScene3D } from '../engine/FloorplanScene3D';
import { WatchedEntityDiffer, executeHassAction } from '../utils/ha-registry';
import { FloorplanWsClient } from '../api/ws-client';
import type { EntityActionDispatchDetail } from '../engine/contracts';
import './floorplan-3d-card-editor';

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'floorplan-3d-card')) {
  window.customCards.push({
    type: 'floorplan-3d-card',
    name: '3D Floorplan Card',
    description: "Interactive 3D bird's-eye floorplan with dynamic lighting and live Home Assistant entities",
    preview: true
  });
}

/**
 * Wall-Tablet Optimized Three.js 3D Floorplan Lovelace Card.
 * Features 0-FPS idle render loop, O(1) state diffing, and glassmorphic HUD.
 */
@customElement('floorplan-3d-card')
export class Floorplan3DCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<HTMLElement> {
    await import('./floorplan-3d-card-editor');
    return document.createElement('floorplan-3d-card-editor');
  }

  public static getStubConfig(): FloorplanCardConfig {
    return {
      type: 'custom:floorplan-3d-card',
      floorplan_id: 'main_house',
      wall_mode: 'auto_cutaway',
      camera_projection: 'perspective',
      ambient_mode: 'adaptive_contrast',
      quality_tier: 'auto',
      show_floor_selector: true,
      show_wall_mode_toggle: true,
      show_reset_camera: true,
      show_room_labels: true,
      show_entity_badges: true
    };
  }

  @property({ attribute: false })
  public set hass(newHass: HomeAssistant) {
    const isFirstHass = !this._hass;
    this._hass = newHass;

    if (!this._config) return;

    if (!this._document && !this._loading) {
      this._loadFloorplan();
      return;
    }

    if (this._document) {
      if (isFirstHass) {
        this._stateDiffer.rebuildWatchedSet(this._document, newHass);
      }
      const changed = this._stateDiffer.diffStates(newHass);
      if (changed.length > 0 && this._scene3d) {
        this._scene3d.updateHassStates(newHass, changed);
      }
    }
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  @state() private _config!: FloorplanCardConfig;
  @state() private _document: FloorplanDocument | null = null;
  @state() private _activeFloorId: string | null = null;
  @state() private _isDollhouse = false;
  @state() private _currentWallMode: WallDisplayMode = 'auto_cutaway';
  @state() private _currentProjection: CameraProjection = 'perspective';
  @state() private _loading = false;
  @state() private _errorMessage: string | null = null;

  @query('.viewport-container')
  private _viewportContainer?: HTMLDivElement;

  private _hass?: HomeAssistant;
  private _scene3d: FloorplanScene3D | null = null;
  private _stateDiffer = new WatchedEntityDiffer();
  private _wsClient: FloorplanWsClient | null = null;
  private _unsubscribeWs?: () => Promise<void>;

  public setConfig(config: FloorplanCardConfig): void {
    if (!config || !config.floorplan_id) {
      throw new Error('Please define floorplan_id in your 3D Floorplan Card configuration.');
    }

    const previousId = this._config?.floorplan_id;
    this._config = { ...config };
    this._currentWallMode = config.wall_mode ?? 'auto_cutaway';
    this._currentProjection = config.camera_projection ?? 'perspective';

    if (this._scene3d) {
      this._scene3d.setWallMode(this._currentWallMode);
      this._scene3d.setProjection(this._currentProjection);
      if (config.ambient_mode) {
        this._scene3d.setAmbientMode(config.ambient_mode);
      }
      if (config.quality_tier) {
        this._scene3d.setQualityTier(config.quality_tier);
      }
      this._scene3d.setOverlayVisibility({
        showRoomLabels: config.show_room_labels ?? true,
        showEntityBadges: config.show_entity_badges ?? true
      });
    }

    if (previousId && previousId !== config.floorplan_id) {
      this._teardownWs();
      this._document = null;
      if (this._hass) {
        this._loadFloorplan();
      }
    }
  }

  public getCardSize(): number {
    return Math.max(1, Math.round((this._config?.height ?? 520) / 50));
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (!this._scene3d && this._document && this._viewportContainer) {
      this._initScene();
    }
  }

  public override disconnectedCallback(): void {
    this._teardownWs();
    if (this._scene3d) {
      this._scene3d.dispose();
      this._scene3d = null;
    }
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    if (this._viewportContainer && this._document && !this._scene3d) {
      this._initScene();
    }
  }

  private async _loadFloorplan(): Promise<void> {
    if (!this._hass || !this._config?.floorplan_id || this._loading) return;

    this._loading = true;
    this._errorMessage = null;
    this.requestUpdate();

    try {
      this._wsClient = new FloorplanWsClient(() => this._hass);
      const doc = await this._wsClient.getFloorplan(this._config.floorplan_id);

      this._document = doc;
      this._stateDiffer.rebuildWatchedSet(doc, this._hass);

      // Select default floor: config.default_floor_id -> level_index 0 -> first floor
      let targetFloor = doc.floors.find((f) => f.id === this._config.default_floor_id);
      if (!targetFloor) {
        targetFloor = doc.floors.find((f) => f.level_index === 0) ?? doc.floors[0];
      }
      this._activeFloorId = targetFloor?.id ?? null;

      // Subscribe to real-time saves from the 2D Sidebar Editor
      if (!this._unsubscribeWs) {
        try {
          this._unsubscribeWs = await this._wsClient.subscribeFloorplan(
            this._config.floorplan_id,
            (event) => {
              if (event.event === 'updated' && event.floorplan) {
                this._onFloorplanHotReload(event.floorplan);
              } else if (event.event === 'deleted') {
                this._errorMessage = `Floorplan '${this._config.floorplan_id}' was deleted.`;
                this._document = null;
                this.requestUpdate();
              }
            }
          );
        } catch (err) {
          console.warn('[floorplan-3d-card] Real-time WS subscription notice:', err);
        }
      }

      this._loading = false;
      this.requestUpdate();

      await this.updateComplete;
      this._initScene();
    } catch (err: unknown) {
      this._loading = false;
      this._errorMessage =
        err instanceof Error ? err.message : `Failed to load floorplan '${this._config.floorplan_id}'.`;
      this.requestUpdate();
    }
  }

  private _onFloorplanHotReload(updatedDoc: FloorplanDocument): void {
    this._document = updatedDoc;
    this._stateDiffer.rebuildWatchedSet(updatedDoc, this._hass);

    if (this._activeFloorId && !updatedDoc.floors.some((f) => f.id === this._activeFloorId)) {
      this._activeFloorId = updatedDoc.floors[0]?.id ?? null;
    }

    if (this._scene3d) {
      this._scene3d.setDocument(updatedDoc, this._activeFloorId ?? undefined, this._hass);
    }
    this.requestUpdate();
  }

  private _initScene(): void {
    if (!this._viewportContainer || !this._document) return;

    if (this._scene3d) {
      this._scene3d.dispose();
      this._scene3d = null;
    }

    this._scene3d = new FloorplanScene3D(this._viewportContainer, {
      qualityTier: this._config.quality_tier ?? 'auto',
      wallMode: this._currentWallMode,
      projection: this._currentProjection,
      ambientMode: this._config.ambient_mode,
      showRoomLabels: this._config.show_room_labels ?? true,
      showEntityBadges: this._config.show_entity_badges ?? true,
      onEntityAction: (detail: EntityActionDispatchDetail) => {
        executeHassAction(this, this._hass, detail);
        if (this._config.enable_room_zoom_on_tap && detail.room) {
          this._scene3d?.focusOnRoom(detail.room.id, true);
        }
      }
    });

    this._scene3d.setDocument(
      this._document,
      this._activeFloorId ?? undefined,
      this._hass
    );

    if (this._isDollhouse) {
      this._scene3d.setStackedDollhouse(true);
    }
  }

  private _teardownWs(): void {
    if (this._unsubscribeWs) {
      this._unsubscribeWs().catch(() => {});
      this._unsubscribeWs = undefined;
    }
  }

  private _handleFloorSelect(floorId: string): void {
    if (this._activeFloorId === floorId) return;
    this._activeFloorId = floorId;
    this._scene3d?.setActiveFloor(floorId, this._isDollhouse);
    this.requestUpdate();
  }

  private _handleToggleDollhouse(): void {
    this._isDollhouse = !this._isDollhouse;
    this._scene3d?.setStackedDollhouse(this._isDollhouse);
    this.requestUpdate();
  }

  private _handleCycleWallMode(): void {
    const cycle: Record<WallDisplayMode, WallDisplayMode> = {
      auto_cutaway: 'half',
      half: 'full',
      full: 'auto_cutaway'
    };
    const nextMode = cycle[this._currentWallMode] ?? 'auto_cutaway';
    this._currentWallMode = nextMode;
    this._scene3d?.setWallMode(nextMode);
    this.requestUpdate();
  }

  private _handleToggleProjection(): void {
    const nextProj: CameraProjection =
      this._currentProjection === 'orthographic' ? 'perspective' : 'orthographic';
    this._currentProjection = nextProj;
    this._scene3d?.setProjection(nextProj);
    this.requestUpdate();
  }

  private _handleResetCamera(): void {
    this._scene3d?.resetCameraToDefault(true);
  }

  private _getHeightStyle(): string {
    if (this._config?.height) {
      return `${this._config.height}px`;
    }
    return '520px';
  }

  private _getWallModeLabel(): string {
    switch (this._currentWallMode) {
      case 'auto_cutaway':
        return 'Cutaway';
      case 'half':
        return 'Half';
      case 'full':
        return 'Full';
      default:
        return 'Walls';
    }
  }

  protected override render() {
    const heightStyle = this._getHeightStyle();
    const sortedFloors = [...(this._document?.floors || [])].sort(
      (a, b) => a.level_index - b.level_index
    );

    const showFloorSelector = (this._config?.show_floor_selector ?? true) && sortedFloors.length > 0;
    const showWallModeToggle = this._config?.show_wall_mode_toggle ?? true;
    const showResetCamera = this._config?.show_reset_camera ?? true;

    return html`
      <div class="card-root" style="height: ${heightStyle};">
        <!-- 3D Three.js WebGL & CSS2D Container -->
        <div class="viewport-container"></div>

        <!-- Top-Left Overlay: Floor Switcher & Dollhouse Mode -->
        ${showFloorSelector
          ? html`
              <div class="hud-overlay hud-top-left">
                <div class="glass-pill-bar">
                  ${sortedFloors.map(
                    (floor) => html`
                      <button
                        type="button"
                        class="pill-btn ${this._activeFloorId === floor.id ? 'active' : ''}"
                        @click=${() => this._handleFloorSelect(floor.id)}
                        title="${floor.name} (Level ${floor.level_index})"
                      >
                        ${floor.name || `Level ${floor.level_index}`}
                      </button>
                    `
                  )}
                  ${sortedFloors.length > 1
                    ? html`
                        <button
                          type="button"
                          class="pill-btn icon-pill ${this._isDollhouse ? 'active' : ''}"
                          @click=${this._handleToggleDollhouse}
                          title="Dollhouse View (Stacked Floors)"
                        >
                          <svg viewBox="0 0 24 24" class="hud-icon">
                            <path
                              fill="currentColor"
                              d="M12 3L2 9l10 6 10-6-10-6zm0 8.5L4.5 7.5 12 4.5l7.5 3L12 11.5zM2 13l10 6 10-6v2l-10 6-10-6v-2zm0 4l10 6 10-6v2l-10 6-10-6v-2z"
                            />
                          </svg>
                          <span>Dollhouse</span>
                        </button>
                      `
                    : nothing}
                </div>
              </div>
            `
          : nothing}

        <!-- Top-Right Overlay: Wall Cutaway, Camera Projection, Reset View -->
        <div class="hud-overlay hud-top-right">
          <div class="glass-pill-bar">
            ${showWallModeToggle
              ? html`
                  <button
                    type="button"
                    class="pill-btn icon-pill"
                    @click=${this._handleCycleWallMode}
                    title="Wall Display Mode (${this._getWallModeLabel()})"
                  >
                    <svg viewBox="0 0 24 24" class="hud-icon">
                      <path
                        fill="currentColor"
                        d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4h-6V6h6v2zm-8-2v2H5V6h6zm-6 4h6v2H5v-2zm8 0h6v2h-6v-2zm6 4h-6v2h6v-2zm-8 2H5v-2h6v2z"
                      />
                    </svg>
                    <span>${this._getWallModeLabel()}</span>
                  </button>
                `
              : nothing}

            <button
              type="button"
              class="pill-btn icon-pill"
              @click=${this._handleToggleProjection}
              title="Camera Projection (${this._currentProjection === 'orthographic' ? 'Isometric' : '3D Perspective'})"
            >
              <svg viewBox="0 0 24 24" class="hud-icon">
                <path
                  fill="currentColor"
                  d="M21 16.5l-9 5.25-9-5.25V7.5L12 2.25l9 5.25v9zM12 4.15L5.05 8.2 12 12.25l6.95-4.05L12 4.15zM4.5 9.87v5.52l6.75 3.94v-5.52L4.5 9.87zm15 0l-6.75 3.94v5.52l6.75-3.94V9.87z"
                />
              </svg>
              <span>${this._currentProjection === 'orthographic' ? 'Iso' : '3D'}</span>
            </button>

            ${showResetCamera
              ? html`
                  <button
                    type="button"
                    class="pill-btn icon-only"
                    @click=${this._handleResetCamera}
                    title="Reset Camera to Saved Default Bookmark"
                  >
                    <svg viewBox="0 0 24 24" class="hud-icon">
                      <path
                        fill="currentColor"
                        d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.16 5.44-5 5.92v2.02c3.95-.49 7-3.85 7-7.94 0-4.42-3.58-8-8-8zm-6 8c0-1.66.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.09 3.05 7.45 7 7.94v-2.02c-2.84-.48-5-2.95-5-5.92z"
                      />
                    </svg>
                  </button>
                `
              : nothing}
          </div>
        </div>

        <!-- Loading State Overlay -->
        ${this._loading
          ? html`
              <div class="status-overlay">
                <div class="spinner"></div>
                <div class="status-text">Loading 3D Floorplan...</div>
              </div>
            `
          : nothing}

        <!-- Error State Overlay -->
        ${this._errorMessage
          ? html`
              <div class="status-overlay error">
                <div class="error-card">
                  <div class="error-title">Floorplan Unavailable</div>
                  <div class="error-detail">${this._errorMessage}</div>
                  <button type="button" class="retry-btn" @click=${this._loadFloorplan}>
                    Retry
                  </button>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  public static override styles = css`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      width: 100%;
    }

    .card-root {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: #0f172a;
      box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0, 0, 0, 0.25));
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, rgba(255, 255, 255, 0.08));
    }

    .viewport-container {
      width: 100%;
      height: 100%;
      display: block;
      overflow: hidden;
      touch-action: none;
    }

    /* Floating Glassmorphic HUD */
    .hud-overlay {
      position: absolute;
      top: 12px;
      z-index: 10;
      pointer-events: none;
    }

    .hud-top-left {
      left: 12px;
      max-width: 60%;
    }

    .hud-top-right {
      right: 12px;
    }

    .glass-pill-bar {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      background: rgba(15, 23, 42, 0.76);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      pointer-events: auto;
      user-select: none;
    }

    .pill-btn {
      appearance: none;
      border: none;
      outline: none;
      background: transparent;
      color: #94a3b8;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.18s ease;
      min-height: 28px;
    }

    .pill-btn:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.08);
    }

    .pill-btn.active {
      color: #ffffff;
      background: var(--primary-color, #3b82f6);
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    }

    .pill-btn.icon-only {
      padding: 6px 8px;
    }

    .hud-icon {
      width: 14px;
      height: 14px;
      display: block;
    }

    /* Loading and Error Overlays */
    .status-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 20;
      color: #f8fafc;
      gap: 12px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--primary-color, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: #cbd5e1;
    }

    .error-card {
      max-width: 380px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .error-title {
      font-size: 15px;
      font-weight: 600;
      color: #f87171;
      margin-bottom: 8px;
    }

    .error-detail {
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .retry-btn {
      appearance: none;
      border: none;
      background: var(--primary-color, #3b82f6);
      color: white;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .retry-btn:hover {
      opacity: 0.9;
    }
  `;
}