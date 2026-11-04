import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  AmbientMode,
  DoorSwingDirection,
  EntityMeshType,
  FloorLevel,
  FloorMaterialType,
  FloorplanDocument,
  FurnitureCatalogType,
  LightFixtureKind,
  OpeningType
} from '../../types/floorplan';
import type { HomeAssistant } from '../../types/ha';
import type { EditorSelection } from '../editor-contracts';

const AMBIENT_MODES: { value: AmbientMode; label: string }[] = [
  { value: 'adaptive_contrast', label: 'Adaptive Contrast (Recommended)' },
  { value: 'sun_sync', label: 'Sun Synchronization' },
  { value: 'dark', label: 'Dark Mode' },
  { value: 'daylight', label: 'Daylight Mode' }
];

const FLOOR_MATERIALS: { value: FloorMaterialType; label: string }[] = [
  { value: 'wood_oak', label: 'Natural Oak Wood' },
  { value: 'wood_walnut', label: 'Dark Walnut Wood' },
  { value: 'tile_slate', label: 'Slate Tile' },
  { value: 'tile_marble', label: 'Marble Tile' },
  { value: 'carpet', label: 'Soft Carpet' },
  { value: 'concrete', label: 'Polished Concrete' },
  { value: 'custom', label: 'Custom Tint Color' }
];

const OPENING_TYPES: { value: OpeningType; label: string }[] = [
  { value: 'door_single', label: 'Single Door' },
  { value: 'door_double', label: 'Double Door' },
  { value: 'door_sliding', label: 'Sliding Door' },
  { value: 'archway', label: 'Archway / Portal' },
  { value: 'window_standard', label: 'Standard Window' },
  { value: 'window_floor_to_ceiling', label: 'Floor-to-Ceiling Window' }
];

const SWING_DIRECTIONS: { value: DoorSwingDirection; label: string }[] = [
  { value: 'left_in', label: 'Left Inward' },
  { value: 'left_out', label: 'Left Outward' },
  { value: 'right_in', label: 'Right Inward' },
  { value: 'right_out', label: 'Right Outward' }
];

const MESH_TYPES: { value: EntityMeshType; label: string }[] = [
  { value: 'none', label: 'None (Icon / Badge Only)' },
  { value: 'ceiling_light', label: 'Ceiling Pendant Light' },
  { value: 'wall_sconce', label: 'Wall Sconce' },
  { value: 'led_strip', label: 'LED Strip Fixture' },
  { value: 'tv_screen', label: 'Smart TV Screen' },
  { value: 'ceiling_fan', label: 'Ceiling Fan (Animated)' },
  { value: 'thermostat', label: 'Wall Thermostat' },
  { value: 'speaker', label: 'Smart Speaker' }
];

const LIGHT_KINDS: { value: LightFixtureKind; label: string }[] = [
  { value: 'point', label: 'Point Light (Omnidirectional)' },
  { value: 'spot', label: 'Spotlight' },
  { value: 'strip', label: 'LED Strip' },
  { value: 'wall_sconce', label: 'Wall Sconce' }
];

const FURNITURE_TYPES: { value: FurnitureCatalogType; label: string }[] = [
  { value: 'sofa_straight', label: 'Sofa (Straight)' },
  { value: 'sofa_l_shape', label: 'Sofa (L-Shape)' },
  { value: 'bed_double', label: 'Double Bed' },
  { value: 'bed_single', label: 'Single Bed' },
  { value: 'dining_table', label: 'Dining Table' },
  { value: 'desk', label: 'Work Desk' },
  { value: 'chair', label: 'Chair' },
  { value: 'tv_stand', label: 'TV Stand' },
  { value: 'kitchen_counter', label: 'Kitchen Counter' },
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'stove', label: 'Stove & Range' },
  { value: 'sink_cabinet', label: 'Sink Cabinet' },
  { value: 'bathtub', label: 'Bathtub' },
  { value: 'shower_enclosure', label: 'Shower Enclosure' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'bookcase', label: 'Bookcase' },
  { value: 'potted_plant', label: 'Potted Plant' },
  { value: 'rug', label: 'Area Rug' }
];

/**
 * Context-sensitive Right Sidebar Property Inspector (`floorplan-property-inspector`).
 */
@customElement('floorplan-property-inspector')
export class PropertyInspector extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public document?: FloorplanDocument;
  @property({ attribute: false }) public floor?: FloorLevel;
  @property({ attribute: false }) public selection: EditorSelection = { kind: 'none', id: null };
  @property({ type: Boolean, reflect: true }) public mobile = false;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 320px;
      height: 100%;
      background: var(--card-background-color, #0f172a);
      border-left: 1px solid var(--divider-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    :host([mobile]) {
      width: 100%;
      border: none;
      height: auto;
      max-height: 100%;
    }

    .inspector-header {
      padding: 12px 14px;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .inspector-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-text-color, #f8fafc);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-kind {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--primary-color, #3b82f6);
      color: #ffffff;
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
    }

    .inspector-body::-webkit-scrollbar {
      width: 4px;
    }

    .inspector-body::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .section-card {
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color, #94a3b8);
      border-bottom: 1px solid var(--divider-color, #334155);
      padding-bottom: 6px;
      margin-bottom: 2px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    label {
      font-size: 11px;
      font-weight: 500;
      color: var(--secondary-text-color, #94a3b8);
    }

    input[type='text'],
    input[type='number'],
    select {
      background: var(--primary-background-color, #0f172a);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--primary-text-color, #f8fafc);
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      width: 100%;
      min-height: 36px;
    }

    input[type='text']:focus,
    input[type='number']:focus,
    select:focus {
      border-color: var(--primary-color, #3b82f6);
    }

    input[type='color'] {
      background: transparent;
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      width: 44px;
      height: 36px;
      cursor: pointer;
      padding: 0;
    }

    input[type='range'] {
      width: 100%;
      accent-color: var(--primary-color, #3b82f6);
      cursor: pointer;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--primary-text-color, #cbd5e1);
      cursor: pointer;
      min-height: 32px;
    }

    .checkbox-row input[type='checkbox'] {
      accent-color: var(--primary-color, #3b82f6);
      cursor: pointer;
      width: 18px;
      height: 18px;
    }

    .slider-val {
      font-size: 11px;
      font-weight: 600;
      color: var(--primary-color, #38bdf8);
      min-width: 42px;
      text-align: right;
    }

    .btn {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn:hover {
      background: var(--primary-background-color, #475569);
    }

    .btn-danger {
      background: var(--error-color, #7f1d1d);
      color: #fecaca;
      border-color: var(--error-color, #991b1b);
    }

    .btn-danger:hover {
      filter: brightness(1.1);
    }

    .btn-primary {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .btn-primary:hover {
      filter: brightness(1.1);
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .grid-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    .entity-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--primary-background-color, #0f172a);
      padding: 8px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 12px;
      min-height: 36px;
      box-sizing: border-box;
    }

    .state-badge {
      font-weight: 700;
      color: var(--primary-color, #38bdf8);
    }
  `;

  private mutate(
    description: string,
    updater: (doc: FloorplanDocument, floor: FloorLevel) => void
  ): void {
    if (!this.document) return;
    const clone = structuredClone(this.document);
    const targetFloor =
      clone.floors.find((f) => f.id === this.floor?.id) ?? clone.floors[0];
    if (!targetFloor) return;

    updater(clone, targetFloor);

    this.dispatchEvent(
      new CustomEvent('document-mutate', {
        bubbles: true,
        composed: true,
        detail: { document: clone, description }
      })
    );
  }

  private handleDeleteSelected(): void {
    if (!this.selection || this.selection.kind === 'none' || !this.selection.id) return;
    const { kind, id } = this.selection;

    this.mutate(`Delete ${kind}`, (_doc, floor) => {
      switch (kind) {
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
    });

    this.dispatchEvent(
      new CustomEvent('delete-selected', {
        bubbles: true,
        composed: true,
        detail: this.selection
      })
    );
  }

  render() {
    const { kind } = this.selection;

    return html`
      <div class="inspector-header">
        <div class="inspector-title">
          <span>Properties</span>
          <span class="badge-kind">${kind === 'none' ? 'Global / Floor' : kind}</span>
        </div>
      </div>

      <div class="inspector-body">
        ${kind === 'none' ? this.renderGlobalAndFloorInspector() : ''}
        ${kind === 'wall' ? this.renderWallInspector() : ''}
        ${kind === 'room' ? this.renderRoomInspector() : ''}
        ${kind === 'opening' ? this.renderOpeningInspector() : ''}
        ${kind === 'furniture' ? this.renderFurnitureInspector() : ''}
        ${kind === 'entity' ? this.renderEntityInspector() : ''}
      </div>
    `;
  }

  // 1. None: Floor & Global Settings
  private renderGlobalAndFloorInspector() {
    if (!this.document || !this.floor) return html``;
    const doc = this.document;
    const fl = this.floor;
    const ambient = doc.ambient_config;

    return html`
      <!-- Global Floorplan Settings -->
      <div class="section-card">
        <div class="section-header">Floorplan Global Settings</div>

        <div class="form-group">
          <label>Floorplan Name</label>
          <input
            type="text"
            .value=${doc.name}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change floorplan name', (d) => {
                d.name = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Ambient Lighting Mode</label>
          <select
            .value=${ambient.mode}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as AmbientMode;
              this.mutate('Change ambient lighting mode', (d) => {
                d.ambient_config.mode = val;
              });
            }}
          >
            ${AMBIENT_MODES.map(
              (m) => html`<option value=${m.value}>${m.label}</option>`
            )}
          </select>
        </div>

        <div class="form-row">
          <label>Wall Paint Color</label>
          <input
            type="color"
            .value=${ambient.wall_color || '#e2e8f0'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change wall color', (d) => {
                d.ambient_config.wall_color = val;
              });
            }}
          />
        </div>

        <div class="form-row">
          <label>Base Floor Color</label>
          <input
            type="color"
            .value=${ambient.floor_color || '#334155'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change floor base color', (d) => {
                d.ambient_config.floor_color = val;
              });
            }}
          />
        </div>

        <div class="form-row">
          <label>3D Sky / Background</label>
          <input
            type="color"
            .value=${ambient.background_color || '#0f172a'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change background color', (d) => {
                d.ambient_config.background_color = val;
              });
            }}
          />
        </div>
      </div>

      <!-- Active Floor Level Settings -->
      <div class="section-card">
        <div class="section-header">Active Floor Level (${fl.name})</div>

        <div class="form-group">
          <label>Floor Level Name</label>
          <input
            type="text"
            .value=${fl.name}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change floor level name', (_d, f) => {
                f.name = val;
              });
            }}
          />
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Level Index</label>
            <input
              type="number"
              step="1"
              .value=${String(fl.level_index)}
              @change=${(ev: Event) => {
                const val = parseInt((ev.target as HTMLInputElement).value, 10);
                this.mutate('Change floor level index', (_d, f) => {
                  f.level_index = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Elevation (m)</label>
            <input
              type="number"
              step="0.1"
              .value=${String(fl.elevation)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change floor elevation', (_d, f) => {
                  f.elevation = val;
                });
              }}
            />
          </div>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Wall Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="6.0"
              .value=${String(fl.wall_height)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change floor wall height', (_d, f) => {
                  f.wall_height = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Slab Thick (m)</label>
            <input
              type="number"
              step="0.01"
              min="0.05"
              max="0.5"
              .value=${String(fl.slab_thickness || 0.15)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change floor slab thickness', (_d, f) => {
                  f.slab_thickness = val;
                });
              }}
            />
          </div>
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Floor</label>
          <select
            .value=${fl.ha_floor_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value || null;
              this.mutate('Bind HA floor ID', (_d, f) => {
                f.ha_floor_id = val;
              });
            }}
          >
            <option value="">None (Unbound)</option>
            ${Object.values(this.hass?.floors ?? {}).map(
              (hf) => html`<option value=${hf.floor_id}>${hf.name}</option>`
            )}
          </select>
        </div>
      </div>

      <!-- Blueprint Calibration & Overlay -->
      <div class="section-card">
        <div class="section-header">Blueprint Reference Image</div>
        ${fl.blueprint
          ? html`
              <div class="form-row">
                <label>Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  .value=${String(fl.blueprint.opacity)}
                  @input=${(ev: Event) => {
                    const val = parseFloat((ev.target as HTMLInputElement).value);
                    this.mutate('Update blueprint opacity', (_d, f) => {
                      if (f.blueprint) f.blueprint.opacity = val;
                    });
                  }}
                />
                <span class="slider-val">${Math.round(fl.blueprint.opacity * 100)}%</span>
              </div>

              <div class="grid-2col">
                <div class="form-group">
                  <label>X Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(fl.blueprint.offset_x)}
                    @change=${(ev: Event) => {
                      const val = parseFloat((ev.target as HTMLInputElement).value);
                      this.mutate('Update blueprint offset X', (_d, f) => {
                        if (f.blueprint) f.blueprint.offset_x = val;
                      });
                    }}
                  />
                </div>
                <div class="form-group">
                  <label>Y Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(fl.blueprint.offset_y)}
                    @change=${(ev: Event) => {
                      const val = parseFloat((ev.target as HTMLInputElement).value);
                      this.mutate('Update blueprint offset Y', (_d, f) => {
                        if (f.blueprint) f.blueprint.offset_y = val;
                      });
                    }}
                  />
                </div>
              </div>

              <div class="grid-2col">
                <div class="form-group">
                  <label>Rotation (°)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="360"
                    .value=${String(fl.blueprint.rotation_deg)}
                    @change=${(ev: Event) => {
                      const val = parseFloat((ev.target as HTMLInputElement).value);
                      this.mutate('Update blueprint rotation', (_d, f) => {
                        if (f.blueprint) f.blueprint.rotation_deg = val;
                      });
                    }}
                  />
                </div>
                <div class="form-group">
                  <label>Scale (m/px)</label>
                  <input
                    type="number"
                    step="0.001"
                    .value=${String(fl.blueprint.meters_per_pixel.toFixed(4))}
                    disabled
                  />
                </div>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${fl.blueprint.locked}
                  @change=${(ev: Event) => {
                    const val = (ev.target as HTMLInputElement).checked;
                    this.mutate('Toggle blueprint locked', (_d, f) => {
                      if (f.blueprint) f.blueprint.locked = val;
                    });
                  }}
                />
                <span>Lock Blueprint Position & Scale</span>
              </label>

              <button
                class="btn btn-primary"
                @click=${() => this.dispatchEvent(new CustomEvent('open-blueprint-modal', { bubbles: true, composed: true }))}
              >
                Recalibrate 2-Point Scale
              </button>

              <button
                class="btn btn-danger"
                @click=${() => {
                  this.mutate('Remove blueprint', (_d, f) => {
                    f.blueprint = null;
                  });
                }}
              >
                Remove Blueprint
              </button>
            `
          : html`
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                No blueprint reference image uploaded for this floor.
              </p>
              <button
                class="btn btn-primary"
                @click=${() => this.dispatchEvent(new CustomEvent('open-blueprint-modal', { bubbles: true, composed: true }))}
              >
                Upload & Calibrate Blueprint
              </button>
            `}
      </div>
    `;
  }

  // 2. Wall Inspector
  private renderWallInspector() {
    if (!this.floor) return html``;
    const wall = this.floor.walls.find((w) => w.id === this.selection.id);
    if (!wall) return html`<div class="section-card">Wall not found.</div>`;

    return html`
      <div class="section-card">
        <div class="section-header">Wall Segment (${wall.id})</div>

        <div class="form-group">
          <label>Thickness (m)</label>
          <input
            type="number"
            step="0.01"
            min="0.05"
            max="1.0"
            .value=${String(wall.thickness)}
            @change=${(ev: Event) => {
              const val = parseFloat((ev.target as HTMLInputElement).value);
              this.mutate('Change wall thickness', (_d, f) => {
                const target = f.walls.find((w) => w.id === wall.id);
                if (target) target.thickness = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Height Override (m, null for floor wall height)</label>
          <input
            type="number"
            step="0.05"
            min="0.2"
            max="6.0"
            placeholder="Default (use floor height)"
            .value=${wall.height_override !== null ? String(wall.height_override) : ''}
            @change=${(ev: Event) => {
              const input = ev.target as HTMLInputElement;
              const val = input.value === '' ? null : parseFloat(input.value);
              this.mutate('Change wall height override', (_d, f) => {
                const target = f.walls.find((w) => w.id === wall.id);
                if (target) target.height_override = val;
              });
            }}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${wall.is_exterior}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).checked;
              this.mutate('Toggle exterior wall', (_d, f) => {
                const target = f.walls.find((w) => w.id === wall.id);
                if (target) target.is_exterior = val;
              });
            }}
          />
          <span>Exterior Wall (Affects Sims-style Cutaway)</span>
        </label>

        <div class="form-row">
          <label>Custom Paint Color</label>
          <input
            type="color"
            .value=${wall.color_override || '#e2e8f0'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change wall color', (_d, f) => {
                const target = f.walls.find((w) => w.id === wall.id);
                if (target) target.color_override = val;
              });
            }}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Wall
        </button>
      </div>
    `;
  }

  // 3. Room Inspector
  private renderRoomInspector() {
    if (!this.floor) return html``;
    const room = this.floor.rooms.find((r) => r.id === this.selection.id);
    if (!room) return html`<div class="section-card">Room not found.</div>`;

    return html`
      <div class="section-card">
        <div class="section-header">Room Polygon (${room.name})</div>

        <div class="form-group">
          <label>Room Name</label>
          <input
            type="text"
            .value=${room.name}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change room name', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.name = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Area</label>
          <select
            .value=${room.ha_area_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value || null;
              this.mutate('Bind HA area', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.ha_area_id = val;
              });
            }}
          >
            <option value="">None (Unbound Area)</option>
            ${Object.values(this.hass?.areas ?? {}).map(
              (ar) => html`<option value=${ar.area_id}>${ar.name}</option>`
            )}
          </select>
        </div>

        <div class="form-group">
          <label>Floor Material Surface</label>
          <select
            .value=${room.floor_material}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as FloorMaterialType;
              this.mutate('Change room floor material', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.floor_material = val;
              });
            }}
          >
            ${FLOOR_MATERIALS.map(
              (m) => html`<option value=${m.value}>${m.label}</option>`
            )}
          </select>
        </div>

        <div class="form-row">
          <label>Floor Tint Color</label>
          <input
            type="color"
            .value=${room.floor_color || '#8b6f4e'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change room floor color', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.floor_color = val;
              });
            }}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${room.show_label}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).checked;
              this.mutate('Toggle room label visibility', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.show_label = val;
              });
            }}
          />
          <span>Show Floating 3D Room Label</span>
        </label>
      </div>

      <!-- Sensor Overrides -->
      <div class="section-card">
        <div class="section-header">Sensor Overrides (Optional)</div>

        <div class="form-group">
          <label>Temperature Sensor</label>
          <input
            type="text"
            placeholder="sensor.living_room_temperature"
            .value=${room.temp_entity_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value.trim() || null;
              this.mutate('Set room temperature sensor', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.temp_entity_id = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Humidity Sensor</label>
          <input
            type="text"
            placeholder="sensor.living_room_humidity"
            .value=${room.humidity_entity_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value.trim() || null;
              this.mutate('Set room humidity sensor', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.humidity_entity_id = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Motion / Occupancy Sensor</label>
          <input
            type="text"
            placeholder="binary_sensor.living_room_motion"
            .value=${room.motion_entity_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value.trim() || null;
              this.mutate('Set room motion sensor', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.motion_entity_id = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Room Tap Action</label>
          <select
            .value=${room.room_tap_action.action}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as any;
              this.mutate('Change room tap action', (_d, f) => {
                const target = f.rooms.find((r) => r.id === room.id);
                if (target) target.room_tap_action.action = val;
              });
            }}
          >
            <option value="toggle">Toggle Room Lights</option>
            <option value="zoom-room">Zoom Camera to Room</option>
            <option value="none">None (Disabled)</option>
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Room
        </button>
      </div>
    `;
  }

  // 4. Opening Inspector
  private renderOpeningInspector() {
    if (!this.floor) return html``;
    const opening = this.floor.openings.find((o) => o.id === this.selection.id);
    if (!opening) return html`<div class="section-card">Opening not found.</div>`;

    const binarySensors = Object.keys(this.hass?.states ?? {}).filter((id) =>
      id.startsWith('binary_sensor.')
    );

    return html`
      <div class="section-card">
        <div class="section-header">Wall Opening (${opening.type})</div>

        <div class="form-group">
          <label>Opening Type</label>
          <select
            .value=${opening.type}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as OpeningType;
              this.mutate('Change opening type', (_d, f) => {
                const target = f.openings.find((o) => o.id === opening.id);
                if (target) target.type = val;
              });
            }}
          >
            ${OPENING_TYPES.map(
              (o) => html`<option value=${o.value}>${o.label}</option>`
            )}
          </select>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Width (m)</label>
            <input
              type="number"
              step="0.05"
              min="0.5"
              max="5.0"
              .value=${String(opening.width)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change opening width', (_d, f) => {
                  const target = f.openings.find((o) => o.id === opening.id);
                  if (target) target.width = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Sill Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="0.0"
              max="3.0"
              .value=${String(opening.sill_height)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change opening sill height', (_d, f) => {
                  const target = f.openings.find((o) => o.id === opening.id);
                  if (target) target.sill_height = val;
                });
              }}
            />
          </div>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Head Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="5.0"
              .value=${String(opening.head_height)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change opening head height', (_d, f) => {
                  const target = f.openings.find((o) => o.id === opening.id);
                  if (target) target.head_height = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Swing Direction</label>
            <select
              .value=${opening.swing_direction}
              @change=${(ev: Event) => {
                const val = (ev.target as HTMLSelectElement).value as DoorSwingDirection;
                this.mutate('Change opening swing direction', (_d, f) => {
                  const target = f.openings.find((o) => o.id === opening.id);
                  if (target) target.swing_direction = val;
                });
              }}
            >
              ${SWING_DIRECTIONS.map(
                (s) => html`<option value=${s.value}>${s.label}</option>`
              )}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Bound Contact Sensor (Door/Window)</label>
          <select
            .value=${opening.bound_entity_id || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value || null;
              this.mutate('Bind opening contact sensor', (_d, f) => {
                const target = f.openings.find((o) => o.id === opening.id);
                if (target) target.bound_entity_id = val;
              });
            }}
          >
            <option value="">None (Static Position)</option>
            ${binarySensors.map(
              (id) => html`<option value=${id}>${id}</option>`
            )}
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Opening
        </button>
      </div>
    `;
  }

  // 5. Furniture Inspector
  private renderFurnitureInspector() {
    if (!this.floor) return html``;
    const item = this.floor.furniture.find((f) => f.id === this.selection.id);
    if (!item) return html`<div class="section-card">Furniture not found.</div>`;

    return html`
      <div class="section-card">
        <div class="section-header">Furniture Item (${item.label})</div>

        <div class="form-group">
          <label>Label</label>
          <input
            type="text"
            .value=${item.label}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change furniture label', (_d, f) => {
                const target = f.furniture.find((fi) => fi.id === item.id);
                if (target) target.label = val;
              });
            }}
          />
        </div>

        <div class="form-group">
          <label>Catalog Model</label>
          <select
            .value=${item.catalog_type}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as FurnitureCatalogType;
              this.mutate('Change furniture type', (_d, f) => {
                const target = f.furniture.find((fi) => fi.id === item.id);
                if (target) target.catalog_type = val;
              });
            }}
          >
            ${FURNITURE_TYPES.map(
              (t) => html`<option value=${t.value}>${t.label}</option>`
            )}
          </select>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>X (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.x.toFixed(2))}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture X', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.x = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Y (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.y.toFixed(2))}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture Y', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.y = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Elev (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.z_elevation.toFixed(2))}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture Z elevation', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.z_elevation = val;
                });
              }}
            />
          </div>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>Width (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.width)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture width', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.width = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Depth (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.depth)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture depth', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.depth = val;
                });
              }}
            />
          </div>

          <div class="form-group">
            <label>Height (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(item.height)}
              @change=${(ev: Event) => {
                const val = parseFloat((ev.target as HTMLInputElement).value);
                this.mutate('Change furniture height', (_d, f) => {
                  const target = f.furniture.find((fi) => fi.id === item.id);
                  if (target) target.height = val;
                });
              }}
            />
          </div>
        </div>

        <div class="form-row">
          <label>Rotation (°)</label>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            .value=${String(item.rotation_deg)}
            @input=${(ev: Event) => {
              const val = parseFloat((ev.target as HTMLInputElement).value);
              this.mutate('Rotate furniture', (_d, f) => {
                const target = f.furniture.find((fi) => fi.id === item.id);
                if (target) target.rotation_deg = val;
              });
            }}
          />
          <span class="slider-val">${item.rotation_deg}°</span>
        </div>

        <div class="form-row">
          <label>Color Override</label>
          <input
            type="color"
            .value=${item.color || '#94a3b8'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value;
              this.mutate('Change furniture color', (_d, f) => {
                const target = f.furniture.find((fi) => fi.id === item.id);
                if (target) target.color = val;
              });
            }}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Furniture
        </button>
      </div>
    `;
  }

  // 6. Entity Inspector
  private renderEntityInspector() {
    if (!this.floor) return html``;
    const placement = this.floor.entities.find((e) => e.id === this.selection.id);
    if (!placement) return html`<div class="section-card">Entity placement not found.</div>`;

    const stateObj = this.hass?.states[placement.entity_id];
    const isLightDomain = placement.domain === 'light' || !!placement.light_config;

    return html`
      <div class="section-card">
        <div class="section-header">Entity Placement</div>

        <div class="entity-preview">
          <span>${stateObj?.attributes.friendly_name || placement.entity_id}</span>
          <span class="state-badge">${stateObj?.state ?? 'unavailable'}</span>
        </div>

        <div class="form-group">
          <label>Entity ID</label>
          <input
            type="text"
            .value=${placement.entity_id}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value.trim();
              this.mutate('Change placed entity ID', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) {
                  target.entity_id = val;
                  target.domain = val.split('.')[0] || 'sensor';
                }
              });
            }}
          />
        </div>

        <div class="form-row">
          <label>Z Elevation (m)</label>
          <input
            type="range"
            min="0"
            max="3.5"
            step="0.05"
            .value=${String(placement.z_elevation)}
            @input=${(ev: Event) => {
              const val = parseFloat((ev.target as HTMLInputElement).value);
              this.mutate('Change entity elevation', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.z_elevation = val;
              });
            }}
          />
          <span class="slider-val">${placement.z_elevation.toFixed(2)}m</span>
        </div>

        <div class="form-row">
          <label>Rotation (°)</label>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            .value=${String(placement.rotation_deg)}
            @input=${(ev: Event) => {
              const val = parseFloat((ev.target as HTMLInputElement).value);
              this.mutate('Rotate entity', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.rotation_deg = val;
              });
            }}
          />
          <span class="slider-val">${placement.rotation_deg}°</span>
        </div>

        <div class="form-group">
          <label>3D Mesh Coupling</label>
          <select
            .value=${placement.mesh_type}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as EntityMeshType;
              this.mutate('Change entity 3D mesh type', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.mesh_type = val;
              });
            }}
          >
            ${MESH_TYPES.map(
              (m) => html`<option value=${m.value}>${m.label}</option>`
            )}
          </select>
        </div>
      </div>

      <!-- Light Fixture 3D Config -->
      ${isLightDomain
        ? html`
            <div class="section-card">
              <div class="section-header">Light Fixture 3D Settings</div>

              <div class="form-group">
                <label>Fixture Kind</label>
                <select
                  .value=${placement.light_config?.kind || 'point'}
                  @change=${(ev: Event) => {
                    const val = (ev.target as HTMLSelectElement).value as LightFixtureKind;
                    this.mutate('Change light fixture kind', (_d, f) => {
                      const target = f.entities.find((e) => e.id === placement.id);
                      if (target) {
                        target.light_config = {
                          kind: val,
                          radius_m: target.light_config?.radius_m ?? 4.5,
                          intensity_multiplier:
                            target.light_config?.intensity_multiplier ?? 1.0,
                          cast_real_point_light:
                            target.light_config?.cast_real_point_light ?? true
                        };
                      }
                    });
                  }}
                >
                  ${LIGHT_KINDS.map(
                    (k) => html`<option value=${k.value}>${k.label}</option>`
                  )}
                </select>
              </div>

              <div class="form-row">
                <label>Falloff Radius (m)</label>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.25"
                  .value=${String(placement.light_config?.radius_m ?? 4.5)}
                  @input=${(ev: Event) => {
                    const val = parseFloat((ev.target as HTMLInputElement).value);
                    this.mutate('Change light radius', (_d, f) => {
                      const target = f.entities.find((e) => e.id === placement.id);
                      if (target?.light_config) target.light_config.radius_m = val;
                    });
                  }}
                />
                <span class="slider-val">
                  ${(placement.light_config?.radius_m ?? 4.5).toFixed(1)}m
                </span>
              </div>

              <div class="form-row">
                <label>Intensity Mult</label>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  .value=${String(placement.light_config?.intensity_multiplier ?? 1.0)}
                  @input=${(ev: Event) => {
                    const val = parseFloat((ev.target as HTMLInputElement).value);
                    this.mutate('Change light intensity multiplier', (_d, f) => {
                      const target = f.entities.find((e) => e.id === placement.id);
                      if (target?.light_config)
                        target.light_config.intensity_multiplier = val;
                    });
                  }}
                />
                <span class="slider-val">
                  ${(placement.light_config?.intensity_multiplier ?? 1.0).toFixed(1)}x
                </span>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${placement.light_config?.cast_real_point_light ?? true}
                  @change=${(ev: Event) => {
                    const val = (ev.target as HTMLInputElement).checked;
                    this.mutate('Toggle real point light pool', (_d, f) => {
                      const target = f.entities.find((e) => e.id === placement.id);
                      if (target?.light_config)
                        target.light_config.cast_real_point_light = val;
                    });
                  }}
                />
                <span>Eligible for Three.js PointLight Pool</span>
              </label>
            </div>
          `
        : ''}

      <!-- Floating Touch Badge -->
      <div class="section-card">
        <div class="section-header">Floating Touch Badge</div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${placement.badge?.visible ?? true}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).checked;
              this.mutate('Toggle badge visibility', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.badge.visible = val;
              });
            }}
          />
          <span>Show 3D Floating Badge</span>
        </label>

        <div class="form-group">
          <label>Badge Style</label>
          <select
            .value=${placement.badge?.style || 'icon_only'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as any;
              this.mutate('Change badge style', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.badge.style = val;
              });
            }}
          >
            <option value="icon_only">Icon Only</option>
            <option value="icon_and_state">Icon & State</option>
            <option value="compact_pill">Compact Pill</option>
          </select>
        </div>

        <div class="form-group">
          <label>Label Override</label>
          <input
            type="text"
            placeholder="Default entity friendly name"
            .value=${placement.badge?.label_override || ''}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLInputElement).value.trim() || null;
              this.mutate('Set badge label override', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.badge.label_override = val;
              });
            }}
          />
        </div>
      </div>

      <!-- Touch Actions -->
      <div class="section-card">
        <div class="section-header">Touch Actions</div>

        <div class="form-group">
          <label>Tap Action</label>
          <select
            .value=${placement.tap_action?.action || 'default'}
            @change=${(ev: Event) => {
              const val = (ev.target as HTMLSelectElement).value as any;
              this.mutate('Change entity tap action', (_d, f) => {
                const target = f.entities.find((e) => e.id === placement.id);
                if (target) target.tap_action.action = val;
              });
            }}
          >
            <option value="default">Default (Toggle light/switch or More Info)</option>
            <option value="toggle">Toggle</option>
            <option value="more-info">More Info Dialog</option>
            <option value="none">None</option>
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Placement
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-property-inspector': PropertyInspector;
  }
}
