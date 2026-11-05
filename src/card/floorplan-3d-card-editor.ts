import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type {
  FloorplanCardConfig,
  FloorplanSummary,
  CameraProjection,
  WallDisplayMode,
  AmbientMode,
  QualityTier
} from '../types/floorplan';
import type { HomeAssistant, LovelaceCardEditor } from '../types/ha';
import { FloorplanWsClient } from '../api/ws-client';

/**
 * Visual Configuration UI Editor for `<floorplan-3d-card>`.
 * Enables configuration of floorplan selection, dimensions, camera mode,
 * ambient lighting, quality tier, and overlay visibility without editing raw YAML.
 */
export class Floorplan3DCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false })
  public set hass(newHass: HomeAssistant) {
    this._hass = newHass;
    if (!this._floorplansLoaded && !this._loadingFloorplans) {
      this._fetchFloorplans();
    }
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  @state() private _config?: FloorplanCardConfig;
  @state() private _floorplans: FloorplanSummary[] = [];
  @state() private _loadingFloorplans = false;
  @state() private _floorplansLoaded = false;

  private _hass?: HomeAssistant;

  public setConfig(config: FloorplanCardConfig): void {
    this._config = { ...config };
    if (this._hass && !this._floorplansLoaded && !this._loadingFloorplans) {
      this._fetchFloorplans();
    }
  }

  private async _fetchFloorplans(): Promise<void> {
    if (!this._hass) return;
    this._loadingFloorplans = true;
    try {
      const client = new FloorplanWsClient(() => this._hass);
      this._floorplans = await client.listFloorplans();
      this._floorplansLoaded = true;
    } catch (err) {
      console.warn('[floorplan-3d-card-editor] Could not list floorplans:', err);
    } finally {
      this._loadingFloorplans = false;
      this.requestUpdate();
    }
  }

  private _valueChanged(ev: Event): void {
    if (!this._config) return;
    const target = ev.target as HTMLInputElement | HTMLSelectElement;
    const field = target.dataset.field as keyof FloorplanCardConfig;
    if (!field) return;

    let value: unknown;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = target.checked;
    } else if (target instanceof HTMLInputElement && target.type === 'number') {
      value = target.value ? Number(target.value) : undefined;
    } else {
      value = target.value;
    }

    const nextConfig: FloorplanCardConfig = {
      ...this._config,
      [field]: value
    };

    if (value === undefined || value === '') {
      delete (nextConfig as unknown as Record<string, unknown>)[field];
    }

    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true
      })
    );
  }

  protected override render() {
    if (!this._config) {
      return nothing;
    }

    const currentFloorplanId = this._config.floorplan_id || '';
    const selectedPlan = this._floorplans.find((p) => p.id === currentFloorplanId);
    const availableFloors = selectedPlan?.floors || [];

    return html`
      <div class="editor-container">
        <!-- Section: Floorplan Source -->
        <div class="form-section">
          <div class="section-header">Floorplan Source</div>

          <div class="form-group">
            <label class="form-label" for="floorplan_id">Floorplan Model</label>
            <select
              id="floorplan_id"
              class="form-control"
              data-field="floorplan_id"
              .value=${currentFloorplanId}
              @change=${this._valueChanged}
            >
              ${this._floorplans.length === 0
                ? html`
                    <option value="${currentFloorplanId || 'main_house'}">
                      ${currentFloorplanId || 'main_house (custom)'}
                    </option>
                  `
                : this._floorplans.map(
                    (plan) => html`
                      <option
                        value="${plan.id}"
                        ?selected=${plan.id === currentFloorplanId}
                      >
                        ${plan.name || plan.id} (rev ${plan.revision})
                      </option>
                    `
                  )}
            </select>
            <div class="helper-text">
              Select a floorplan authored in the sidebar 2D Floorplan Editor.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="default_floor_id">Default Starting Floor</label>
            <select
              id="default_floor_id"
              class="form-control"
              data-field="default_floor_id"
              .value=${this._config.default_floor_id || ''}
              @change=${this._valueChanged}
            >
              <option value="">Auto (Ground Floor / Index 0)</option>
              ${availableFloors.map(
                (floor) => html`
                  <option
                    value="${floor.id}"
                    ?selected=${floor.id === this._config?.default_floor_id}
                  >
                    ${floor.name || floor.id} (Level ${floor.level_index})
                  </option>
                `
              )}
            </select>
            <div class="helper-text">
              The initial floor active when the card loads.
            </div>
          </div>
        </div>

        <!-- Section: Dimensions & Presentation -->
        <div class="form-section">
          <div class="section-header">Dimensions & Camera</div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="height">Card Height (px)</label>
              <input
                id="height"
                type="number"
                class="form-control"
                data-field="height"
                min="240"
                max="1600"
                step="20"
                .value=${String(this._config.height ?? 520)}
                @input=${this._valueChanged}
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="camera_projection">Camera Projection</label>
              <select
                id="camera_projection"
                class="form-control"
                data-field="camera_projection"
                .value=${this._config.camera_projection ?? 'perspective'}
                @change=${this._valueChanged}
              >
                <option value="perspective">Perspective (True 3D)</option>
                <option value="orthographic">Orthographic (Isometric)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="wall_mode">Wall Cutaway Mode</label>
            <select
              id="wall_mode"
              class="form-control"
              data-field="wall_mode"
              .value=${this._config.wall_mode ?? 'auto_cutaway'}
              @change=${this._valueChanged}
            >
              <option value="auto_cutaway">Auto Cutaway (Sims-Style Camera Facing)</option>
              <option value="half">Half Walls (Low Architectural Cross-Section)</option>
              <option value="full">Full Walls (Full Height Room Enclosure)</option>
            </select>
          </div>
        </div>

        <!-- Section: Environment & Performance -->
        <div class="form-section">
          <div class="section-header">Environment & Performance</div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="ambient_mode">Ambient Lighting</label>
              <select
                id="ambient_mode"
                class="form-control"
                data-field="ambient_mode"
                .value=${this._config.ambient_mode ?? 'adaptive_contrast'}
                @change=${this._valueChanged}
              >
                <option value="adaptive_contrast">Adaptive Contrast (Recommended)</option>
                <option value="sun_sync">Sun Sync (Tracks sun.sun elevation)</option>
                <option value="dark">Dark Theme / Night Mode</option>
                <option value="daylight">Daylight Mode</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="quality_tier">Performance Tier</label>
              <select
                id="quality_tier"
                class="form-control"
                data-field="quality_tier"
                .value=${this._config.quality_tier ?? 'auto'}
                @change=${this._valueChanged}
              >
                <option value="auto">Auto (Detect Platform & DPR)</option>
                <option value="tablet">Wall Tablet (Optimized 0-FPS)</option>
                <option value="high">High (Desktop / MSAA / 8 PointLights)</option>
                <option value="low">Low (Legacy / 256px Lightmap)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section: HUD & Interactivity Toggles -->
        <div class="form-section">
          <div class="section-header">Overlay Controls & Gestures</div>

          <div class="switch-row">
            <label class="switch-label" for="show_floor_selector">
              <span class="switch-title">Floor Switcher & Dollhouse Bar</span>
              <span class="switch-description">Show floor selector pills in top-left</span>
            </label>
            <input
              id="show_floor_selector"
              type="checkbox"
              class="switch-control"
              data-field="show_floor_selector"
              ?checked=${this._config.show_floor_selector ?? true}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_wall_mode_toggle">
              <span class="switch-title">Wall Cutaway Button</span>
              <span class="switch-description">Allow toggling cutaway / half / full walls</span>
            </label>
            <input
              id="show_wall_mode_toggle"
              type="checkbox"
              class="switch-control"
              data-field="show_wall_mode_toggle"
              ?checked=${this._config.show_wall_mode_toggle ?? true}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_reset_camera">
              <span class="switch-title">Reset Camera Button</span>
              <span class="switch-description">Allow quick camera return to saved default bookmark</span>
            </label>
            <input
              id="show_reset_camera"
              type="checkbox"
              class="switch-control"
              data-field="show_reset_camera"
              ?checked=${this._config.show_reset_camera ?? true}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_room_labels">
              <span class="switch-title">Floating Room Labels</span>
              <span class="switch-description">Show room titles and area sensor metrics</span>
            </label>
            <input
              id="show_room_labels"
              type="checkbox"
              class="switch-control"
              data-field="show_room_labels"
              ?checked=${this._config.show_room_labels ?? true}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_entity_badges">
              <span class="switch-title">Floating Entity Badges</span>
              <span class="switch-description">Display touch-interactive entity icons & status pills</span>
            </label>
            <input
              id="show_entity_badges"
              type="checkbox"
              class="switch-control"
              data-field="show_entity_badges"
              ?checked=${this._config.show_entity_badges ?? true}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="enable_room_zoom_on_tap">
              <span class="switch-title">Room Zoom on Tap</span>
              <span class="switch-description">Smoothly center camera when tapping a room floor or label</span>
            </label>
            <input
              id="enable_room_zoom_on_tap"
              type="checkbox"
              class="switch-control"
              data-field="enable_room_zoom_on_tap"
              ?checked=${this._config.enable_room_zoom_on_tap ?? false}
              @change=${this._valueChanged}
            />
          </div>
        </div>
      </div>
    `;
  }

  public static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      padding: 16px 0;
      color: var(--primary-text-color, #f1f5f9);
      font-family: inherit;
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-section {
      background: var(--card-background-color, rgba(30, 41, 59, 0.45));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-header {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary-color, #3b82f6);
      margin-bottom: 2px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 500px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #e2e8f0);
    }

    .form-control {
      appearance: none;
      background: var(--input-fill-color, rgba(15, 23, 42, 0.7));
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.14));
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }

    .form-control:focus {
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 1px var(--primary-color, #3b82f6);
    }

    select.form-control {
      cursor: pointer;
      background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E');
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 32px;
    }

    .helper-text {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      line-height: 1.3;
    }

    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
    }

    .switch-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .switch-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
    }

    .switch-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #e2e8f0);
    }

    .switch-description {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
    }

    .switch-control {
      appearance: none;
      width: 38px;
      height: 22px;
      background: rgba(148, 163, 184, 0.3);
      border-radius: 9999px;
      position: relative;
      cursor: pointer;
      outline: none;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .switch-control::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switch-control:checked {
      background: var(--primary-color, #3b82f6);
    }

    .switch-control:checked::after {
      transform: translateX(16px);
    }
  `;
}

if (!customElements.get('floorplan-3d-card-editor')) {
  customElements.define('floorplan-3d-card-editor', Floorplan3DCardEditor);
}
