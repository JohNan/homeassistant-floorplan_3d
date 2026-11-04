import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  FloorLevel,
  FurnitureCatalogType,
  OpeningType
} from '../../types/floorplan';
import type { HomeAssistant, HassEntity } from '../../types/ha';
import type { PaletteDragPayload } from '../editor-contracts';
import { resolveEntityAreaId } from '../../utils/ha-registry';

interface OpeningCatalogEntry {
  type: OpeningType;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  icon: string;
}

interface FurnitureCatalogEntry {
  type: FurnitureCatalogType;
  label: string;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
  category: string;
  icon: string;
}

const OPENING_CATALOG: OpeningCatalogEntry[] = [
  { type: 'door_single', label: 'Single Door', defaultWidth: 0.9, defaultHeight: 2.1, icon: '🚪' },
  { type: 'door_double', label: 'Double Door', defaultWidth: 1.8, defaultHeight: 2.1, icon: '🚪🚪' },
  { type: 'door_sliding', label: 'Sliding Door', defaultWidth: 1.8, defaultHeight: 2.1, icon: '↔️' },
  { type: 'archway', label: 'Archway / Portal', defaultWidth: 1.2, defaultHeight: 2.1, icon: '🏛️' },
  { type: 'window_standard', label: 'Standard Window', defaultWidth: 1.2, defaultHeight: 1.2, icon: '🪟' },
  { type: 'window_floor_to_ceiling', label: 'Floor-to-Ceiling Window', defaultWidth: 2.0, defaultHeight: 2.4, icon: '🪟' }
];

const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  { type: 'sofa_straight', label: 'Sofa (Straight)', defaultWidth: 2.0, defaultDepth: 0.9, defaultHeight: 0.85, category: 'Living', icon: '🛋️' },
  { type: 'sofa_l_shape', label: 'Sofa (L-Shape)', defaultWidth: 2.4, defaultDepth: 1.8, defaultHeight: 0.85, category: 'Living', icon: '🛋️' },
  { type: 'bed_double', label: 'Double Bed', defaultWidth: 1.8, defaultDepth: 2.1, defaultHeight: 0.9, category: 'Bedroom', icon: '🛏️' },
  { type: 'bed_single', label: 'Single Bed', defaultWidth: 1.0, defaultDepth: 2.0, defaultHeight: 0.85, category: 'Bedroom', icon: '🛏️' },
  { type: 'dining_table', label: 'Dining Table', defaultWidth: 1.6, defaultDepth: 0.9, defaultHeight: 0.75, category: 'Dining', icon: '🪑' },
  { type: 'desk', label: 'Work Desk', defaultWidth: 1.4, defaultDepth: 0.7, defaultHeight: 0.75, category: 'Office', icon: '🖥️' },
  { type: 'chair', label: 'Chair', defaultWidth: 0.5, defaultDepth: 0.5, defaultHeight: 0.85, category: 'Dining', icon: '🪑' },
  { type: 'tv_stand', label: 'Media / TV Stand', defaultWidth: 1.6, defaultDepth: 0.45, defaultHeight: 0.5, category: 'Living', icon: '📺' },
  { type: 'kitchen_counter', label: 'Kitchen Counter', defaultWidth: 1.8, defaultDepth: 0.65, defaultHeight: 0.9, category: 'Kitchen', icon: '🍳' },
  { type: 'refrigerator', label: 'Refrigerator', defaultWidth: 0.8, defaultDepth: 0.75, defaultHeight: 1.85, category: 'Kitchen', icon: '🧊' },
  { type: 'stove', label: 'Stove & Range', defaultWidth: 0.75, defaultDepth: 0.65, defaultHeight: 0.9, category: 'Kitchen', icon: '🔥' },
  { type: 'sink_cabinet', label: 'Sink Cabinet', defaultWidth: 1.0, defaultDepth: 0.65, defaultHeight: 0.9, category: 'Kitchen', icon: '🚰' },
  { type: 'bathtub', label: 'Bathtub', defaultWidth: 1.7, defaultDepth: 0.8, defaultHeight: 0.55, category: 'Bathroom', icon: '🛁' },
  { type: 'shower_enclosure', label: 'Shower Enclosure', defaultWidth: 1.0, defaultDepth: 1.0, defaultHeight: 2.0, category: 'Bathroom', icon: '🚿' },
  { type: 'toilet', label: 'Toilet', defaultWidth: 0.45, defaultDepth: 0.65, defaultHeight: 0.8, category: 'Bathroom', icon: '🚽' },
  { type: 'wardrobe', label: 'Wardrobe / Closet', defaultWidth: 1.2, defaultDepth: 0.6, defaultHeight: 2.1, category: 'Bedroom', icon: '🚪' },
  { type: 'bookcase', label: 'Bookcase', defaultWidth: 1.0, defaultDepth: 0.35, defaultHeight: 1.9, category: 'Living', icon: '📚' },
  { type: 'potted_plant', label: 'Potted Plant', defaultWidth: 0.5, defaultDepth: 0.5, defaultHeight: 0.9, category: 'Decor', icon: '🪴' },
  { type: 'rug', label: 'Area Rug', defaultWidth: 2.4, defaultDepth: 1.6, defaultHeight: 0.02, category: 'Decor', icon: '🪡' }
];

const DOMAIN_FILTERS = [
  'all',
  'light',
  'switch',
  'binary_sensor',
  'sensor',
  'media_player',
  'climate',
  'fan',
  'button'
];

/**
 * Left-dock Palette for Home Assistant Entities, Openings & Procedural 3D Furniture.
 */
@customElement('floorplan-entity-palette')
export class EntityPalette extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public activeFloor?: FloorLevel;
  @property({ type: String }) public selectedRoomAreaId: string | null = null;

  @state() private activeTab: 'entities' | 'catalog' = 'entities';
  @state() private searchQuery = '';
  @state() private selectedDomain = 'all';
  @state() private filterByArea = false;
  @state() private unplacedOnly = false;
  @state() private furnitureCategoryFilter = 'all';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 320px;
      height: 100%;
      background: #0f172a;
      border-right: 1px solid #334155;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    .tabs-header {
      display: flex;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .tab-button {
      flex: 1;
      padding: 10px 8px;
      text-align: center;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }

    .tab-button:hover {
      color: #f8fafc;
    }

    .tab-button.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }

    .tab-content::-webkit-scrollbar {
      width: 4px;
    }

    .tab-content::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }

    .search-box {
      position: relative;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 7px 10px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
    }

    .search-box input:focus {
      border-color: #3b82f6;
    }

    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .chip {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .chip:hover {
      color: #f8fafc;
      border-color: #64748b;
    }

    .chip.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
    }

    .toggles-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #1e293b;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
      cursor: pointer;
    }

    .toggle-row input[type='checkbox'] {
      cursor: pointer;
      accent-color: #3b82f6;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-top: 4px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 10px;
      cursor: grab;
      transition: border-color 0.15s, background 0.15s;
    }

    .item-row:hover {
      background: #273549;
      border-color: #475569;
    }

    .item-row:active {
      cursor: grabbing;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      font-size: 16px;
      flex-shrink: 0;
      width: 22px;
      text-align: center;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .item-name {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtext {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .place-btn {
      background: #334155;
      color: #f8fafc;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s;
    }

    .place-btn:hover {
      background: #2563eb;
    }

    .placed-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.4);
      padding: 1px 5px;
      border-radius: 8px;
      margin-left: 4px;
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  `;

  private handleDragStart(ev: DragEvent, payload: PaletteDragPayload): void {
    if (ev.dataTransfer) {
      ev.dataTransfer.setData('application/x-floorplan-palette', JSON.stringify(payload));
      ev.dataTransfer.effectAllowed = 'copy';
    }
  }

  private handlePlaceItem(payload: PaletteDragPayload): void {
    this.dispatchEvent(
      new CustomEvent('palette-place', {
        bubbles: true,
        composed: true,
        detail: payload
      })
    );
  }

  private getFilteredEntities(): HassEntity[] {
    if (!this.hass?.states) return [];

    const query = this.searchQuery.trim().toLowerCase();
    const placedSet = new Set(
      this.activeFloor?.entities.map((e) => e.entity_id) ?? []
    );

    return Object.values(this.hass.states).filter((entity) => {
      const entityId = entity.entity_id;
      const domain = entityId.split('.')[0];
      const friendlyName = entity.attributes.friendly_name || '';

      // 1. Domain filter
      if (this.selectedDomain !== 'all' && domain !== this.selectedDomain) {
        return false;
      }

      // 2. Search query filter
      if (query && !entityId.toLowerCase().includes(query) && !friendlyName.toLowerCase().includes(query)) {
        return false;
      }

      // 3. Unplaced filter
      if (this.unplacedOnly && placedSet.has(entityId)) {
        return false;
      }

      // 4. HA Area filter (if selected room area is active)
      if (this.filterByArea && this.selectedRoomAreaId) {
        const areaId = resolveEntityAreaId(entityId, this.hass);
        if (areaId !== this.selectedRoomAreaId) {
          return false;
        }
      }

      return true;
    });
  }

  private getDomainIcon(domain: string): string {
    switch (domain) {
      case 'light': return '💡';
      case 'switch': return '🔌';
      case 'binary_sensor': return '🔔';
      case 'sensor': return '🌡️';
      case 'media_player': return '📻';
      case 'climate': return '❄️';
      case 'fan': return '🌀';
      case 'button': return '🔘';
      default: return '⚙️';
    }
  }

  render() {
    const selectedAreaName =
      this.selectedRoomAreaId && this.hass?.areas?.[this.selectedRoomAreaId]
        ? this.hass.areas[this.selectedRoomAreaId].name
        : this.selectedRoomAreaId;

    return html`
      <!-- Header Tabs -->
      <div class="tabs-header">
        <button
          class="tab-button ${this.activeTab === 'entities' ? 'active' : ''}"
          @click=${() => (this.activeTab = 'entities')}
        >
          Entities
        </button>
        <button
          class="tab-button ${this.activeTab === 'catalog' ? 'active' : ''}"
          @click=${() => (this.activeTab = 'catalog')}
        >
          Catalog & Furniture
        </button>
      </div>

      <!-- Tab 1: HA Entities -->
      ${this.activeTab === 'entities'
        ? html`
            <div class="tab-content">
              <!-- Search box -->
              <div class="search-box">
                <input
                  type="text"
                  placeholder="Search entities..."
                  .value=${this.searchQuery}
                  @input=${(ev: InputEvent) =>
                    (this.searchQuery = (ev.target as HTMLInputElement).value)}
                />
              </div>

              <!-- Domain pills -->
              <div class="chips-bar">
                ${DOMAIN_FILTERS.map(
                  (dom) => html`
                    <div
                      class="chip ${this.selectedDomain === dom ? 'active' : ''}"
                      @click=${() => (this.selectedDomain = dom)}
                    >
                      ${dom}
                    </div>
                  `
                )}
              </div>

              <!-- Filter Toggles -->
              <div class="toggles-bar">
                <label class="toggle-row">
                  <input
                    type="checkbox"
                    .checked=${this.filterByArea}
                    ?disabled=${!this.selectedRoomAreaId}
                    @change=${(ev: Event) =>
                      (this.filterByArea = (ev.target as HTMLInputElement).checked)}
                  />
                  <span>
                    Filter by Selected Room's HA Area
                    ${selectedAreaName ? html`<b>(${selectedAreaName})</b>` : ''}
                  </span>
                </label>
                <label class="toggle-row">
                  <input
                    type="checkbox"
                    .checked=${this.unplacedOnly}
                    @change=${(ev: Event) =>
                      (this.unplacedOnly = (ev.target as HTMLInputElement).checked)}
                  />
                  <span>Unplaced Only</span>
                </label>
              </div>

              <!-- Entities List -->
              <div class="section-title">
                Entities (${this.getFilteredEntities().length})
              </div>
              <div class="items-list">
                ${this.getFilteredEntities().length === 0
                  ? html`<div class="empty-state">No entities match filters.</div>`
                  : this.getFilteredEntities().map((entity) => {
                      const domain = entity.entity_id.split('.')[0];
                      const isPlaced = this.activeFloor?.entities.some(
                        (e) => e.entity_id === entity.entity_id
                      );
                      const payload: PaletteDragPayload = {
                        kind: 'entity',
                        entityId: entity.entity_id,
                        domain,
                        label: entity.attributes.friendly_name || entity.entity_id
                      };
                      return html`
                        <div
                          class="item-row"
                          draggable="true"
                          @dragstart=${(ev: DragEvent) => this.handleDragStart(ev, payload)}
                        >
                          <div class="item-left">
                            <span class="item-icon">${this.getDomainIcon(domain)}</span>
                            <div class="item-details">
                              <span class="item-name">
                                ${entity.attributes.friendly_name || entity.entity_id}
                                ${isPlaced ? html`<span class="placed-pill">Placed</span>` : ''}
                              </span>
                              <span class="item-subtext">
                                ${entity.entity_id} • ${entity.state}
                              </span>
                            </div>
                          </div>
                          <button
                            class="place-btn"
                            title="Place in center of active floor"
                            @click=${() => this.handlePlaceItem(payload)}
                          >
                            + Place
                          </button>
                        </div>
                      `;
                    })}
              </div>
            </div>
          `
        : html`
            <!-- Tab 2: Catalog & Furniture -->
            <div class="tab-content">
              <!-- Openings & Portals -->
              <div class="section-title">Openings & Portals</div>
              <div class="items-list">
                ${OPENING_CATALOG.map((opening) => {
                  const payload: PaletteDragPayload = {
                    kind: 'opening',
                    openingType: opening.type,
                    defaultWidth: opening.defaultWidth,
                    defaultHeight: opening.defaultHeight,
                    label: opening.label
                  };
                  return html`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${(ev: DragEvent) => this.handleDragStart(ev, payload)}
                    >
                      <div class="item-left">
                        <span class="item-icon">${opening.icon}</span>
                        <div class="item-details">
                          <span class="item-name">${opening.label}</span>
                          <span class="item-subtext">
                            ${opening.defaultWidth}m × ${opening.defaultHeight}m
                          </span>
                        </div>
                      </div>
                      <button
                        class="place-btn"
                        title="Add to wall or center of floor"
                        @click=${() => this.handlePlaceItem(payload)}
                      >
                        + Add
                      </button>
                    </div>
                  `;
                })}
              </div>

              <!-- Procedural Furniture -->
              <div class="section-title">Procedural Furniture (19 Models)</div>
              <div class="chips-bar">
                ${['all', 'Living', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining', 'Office', 'Decor'].map(
                  (cat) => html`
                    <div
                      class="chip ${this.furnitureCategoryFilter === cat ? 'active' : ''}"
                      @click=${() => (this.furnitureCategoryFilter = cat)}
                    >
                      ${cat}
                    </div>
                  `
                )}
              </div>

              <div class="items-list">
                ${FURNITURE_CATALOG.filter(
                  (item) =>
                    this.furnitureCategoryFilter === 'all' ||
                    item.category === this.furnitureCategoryFilter
                ).map((item) => {
                  const payload: PaletteDragPayload = {
                    kind: 'furniture',
                    furnitureType: item.type,
                    defaultWidth: item.defaultWidth,
                    defaultDepth: item.defaultDepth,
                    defaultHeight: item.defaultHeight,
                    label: item.label
                  };
                  return html`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${(ev: DragEvent) => this.handleDragStart(ev, payload)}
                    >
                      <div class="item-left">
                        <span class="item-icon">${item.icon}</span>
                        <div class="item-details">
                          <span class="item-name">${item.label}</span>
                          <span class="item-subtext">
                            ${item.defaultWidth}m × ${item.defaultDepth}m × ${item.defaultHeight}m
                          </span>
                        </div>
                      </div>
                      <button
                        class="place-btn"
                        title="Place in center of floor"
                        @click=${() => this.handlePlaceItem(payload)}
                      >
                        + Add
                      </button>
                    </div>
                  `;
                })}
              </div>
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-entity-palette': EntityPalette;
  }
}
