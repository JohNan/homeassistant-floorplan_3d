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
  'climate',
  'fan',
  'cover',
  'lock',
  'media_player',
  'binary_sensor',
  'sensor',
  'camera',
  'scene',
  'button'
];

const DOMAIN_SORT_PRIORITY: Record<string, number> = {
  light: 0,
  switch: 1,
  climate: 2,
  fan: 3,
  cover: 4,
  lock: 5,
  media_player: 6,
  binary_sensor: 7,
  sensor: 8,
  camera: 9,
  scene: 10,
  button: 11
};

const CORE_DOMAINS = new Set([
  'all',
  'light',
  'switch',
  'climate',
  'media_player',
  'binary_sensor',
  'sensor'
]);

/**
 * Left-dock Palette for Home Assistant Entities, Openings & Procedural 3D Furniture.
 * Adapts to desktop sidebar and mobile slide-up bottom sheets.
 */
@customElement('floorplan-entity-palette')
export class EntityPalette extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public activeFloor?: FloorLevel;
  @property({ type: String }) public selectedRoomAreaId: string | null = null;
  @property({ type: Boolean, reflect: true }) public mobile = false;

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
      width: 260px;
      flex-shrink: 0;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: var(--card-background-color, #0f172a);
      border-right: 1px solid var(--divider-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    :host([mobile]) {
      width: 100%;
      border: none;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
    }

    .tabs-header {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
    }

    .pane-collapse-btn {
      background: transparent;
      border: none;
      border-left: 1px solid var(--divider-color, #334155);
      color: var(--secondary-text-color, #94a3b8);
      padding: 0 10px;
      height: 44px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .pane-collapse-btn:hover {
      color: var(--primary-text-color, #f8fafc);
      background: rgba(255, 255, 255, 0.08);
    }

    .tab-button {
      flex: 1;
      padding: 12px 8px;
      min-height: 44px;
      text-align: center;
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      box-sizing: border-box;
    }

    .tab-button:hover {
      color: var(--primary-text-color, #f8fafc);
    }

    .tab-button.active {
      color: var(--primary-color, #3b82f6);
      border-bottom-color: var(--primary-color, #3b82f6);
      background: rgba(59, 130, 246, 0.05);
    }

    .tab-content {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-sizing: border-box;
    }

    .tab-content::-webkit-scrollbar {
      width: 4px;
    }

    .tab-content::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .entities-tab-layout {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }

    .palette-controls {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px 6px 12px;
      border-bottom: 1px solid var(--divider-color, #334155);
    }

    .items-scroll-region {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      padding: 8px 12px 16px 12px;
    }

    .items-scroll-region::-webkit-scrollbar {
      width: 4px;
    }

    .items-scroll-region::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .search-box {
      position: relative;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--primary-text-color, #f8fafc);
      font-size: 13px;
      outline: none;
      min-height: 38px;
    }

    .search-box input:focus {
      border-color: var(--primary-color, #3b82f6);
    }

    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 76px;
      overflow-y: auto;
    }

    .chips-bar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    .chips-bar::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .chip {
      background: var(--secondary-background-color, #1e293b);
      color: var(--secondary-text-color, #94a3b8);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 16px;
      padding: 4px 8px;
      font-size: 11px;
      font-family: inherit;
      min-height: 26px;
      cursor: pointer;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .chip:hover {
      color: var(--primary-text-color, #f8fafc);
      border-color: var(--divider-color, #64748b);
    }

    .chip.active {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .toggles-bar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--secondary-background-color, #1e293b);
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--primary-text-color, #cbd5e1);
      cursor: pointer;
      min-height: 30px;
    }

    .toggle-row input[type='checkbox'] {
      cursor: pointer;
      accent-color: var(--primary-color, #3b82f6);
      width: 18px;
      height: 18px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color, #64748b);
      margin-top: 4px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      touch-action: pan-y;
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 6px;
      padding: 8px 12px;
      cursor: grab;
      min-height: 44px;
      box-sizing: border-box;
      transition: border-color 0.15s, background 0.15s;
    }

    .item-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--divider-color, #475569);
    }

    .item-row:active {
      cursor: grabbing;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      font-size: 18px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .item-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #f8fafc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtext {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .place-btn {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      min-height: 34px;
      transition: background 0.15s;
    }

    .place-btn:hover {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .placed-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(34, 197, 94, 0.2);
      color: var(--success-color, #4ade80);
      border: 1px solid rgba(34, 197, 94, 0.4);
      padding: 1px 5px;
      border-radius: 8px;
      margin-left: 4px;
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: var(--secondary-text-color, #64748b);
      font-size: 13px;
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

  private isLightEntity(entity: HassEntity): boolean {
    return (
      entity.entity_id.startsWith('light.') ||
      (entity.entity_id.startsWith('switch.') && entity.attributes?.device_class === 'light')
    );
  }

  private getEffectiveDomain(entity: HassEntity): string {
    if (this.isLightEntity(entity)) {
      return 'light';
    }
    return entity.entity_id.split('.')[0] || 'sensor';
  }

  private getAllEntities(): HassEntity[] {
    if (!this.hass?.states && !this.hass?.entities) {
      return [];
    }

    const map = new Map<string, HassEntity>();

    for (const entity of Object.values(this.hass?.states ?? {})) {
      if (!entity || !entity.entity_id) continue;
      const reg = this.hass?.entities?.[entity.entity_id];
      const entityToStore: HassEntity = (!entity.attributes?.friendly_name && reg?.name)
        ? {
            ...entity,
            attributes: { ...entity.attributes, friendly_name: reg.name }
          }
        : entity;
      map.set(entity.entity_id, entityToStore);
    }

    for (const reg of Object.values(this.hass?.entities ?? {})) {
      if (!reg?.entity_id || map.has(reg.entity_id) || reg.hidden) continue;
      map.set(reg.entity_id, {
        entity_id: reg.entity_id,
        state: 'unknown',
        attributes: {
          friendly_name: reg.name || reg.entity_id,
          icon: reg.icon,
          area_id: reg.area_id
        },
        last_changed: '',
        last_updated: '',
        context: { id: '', parent_id: null, user_id: null }
      });
    }

    return Array.from(map.values());
  }

  private getBaseMatchingEntities(): HassEntity[] {
    const all = this.getAllEntities();
    const query = this.searchQuery.trim().toLowerCase();
    const placedSet = new Set(
      this.activeFloor?.entities.map((e) => e.entity_id) ?? []
    );

    return all.filter((entity) => {
      const entityId = entity.entity_id;
      const friendlyName = String(entity.attributes?.friendly_name ?? '');
      const effectiveDomain = this.getEffectiveDomain(entity);

      // 1. Search query filter
      if (query) {
        const matchesQuery =
          entityId.toLowerCase().includes(query) ||
          friendlyName.toLowerCase().includes(query) ||
          effectiveDomain.toLowerCase().includes(query);
        if (!matchesQuery) {
          return false;
        }
      }

      // 2. Unplaced filter
      if (this.unplacedOnly && placedSet.has(entityId)) {
        return false;
      }

      // 3. HA Area filter (if selected room area is active)
      if (this.filterByArea && this.selectedRoomAreaId) {
        const areaId = resolveEntityAreaId(entityId, this.hass);
        if (areaId !== this.selectedRoomAreaId) {
          return false;
        }
      }

      return true;
    });
  }

  private getFilteredEntities(baseEntities?: HassEntity[]): HassEntity[] {
    const source = baseEntities ?? this.getBaseMatchingEntities();

    const filtered = source.filter((entity) => {
      if (this.selectedDomain === 'all') {
        return true;
      }
      if (this.selectedDomain === 'light') {
        return this.isLightEntity(entity);
      }
      return entity.entity_id.split('.')[0] === this.selectedDomain;
    });

    return filtered.sort((a, b) => {
      const prioA = DOMAIN_SORT_PRIORITY[this.getEffectiveDomain(a)] ?? 12;
      const prioB = DOMAIN_SORT_PRIORITY[this.getEffectiveDomain(b)] ?? 12;
      if (prioA !== prioB) {
        return prioA - prioB;
      }
      const nameA = String(a.attributes?.friendly_name || a.entity_id);
      const nameB = String(b.attributes?.friendly_name || b.entity_id);
      return nameA.localeCompare(nameB);
    });
  }

  private getDomainCounts(baseEntities: HassEntity[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const dom of DOMAIN_FILTERS) {
      counts.set(dom, 0);
    }
    counts.set('all', baseEntities.length);

    for (const e of baseEntities) {
      const rawDom = e.entity_id.split('.')[0] || 'sensor';
      counts.set(rawDom, (counts.get(rawDom) ?? 0) + 1);
      if (rawDom !== 'light' && this.isLightEntity(e)) {
        counts.set('light', (counts.get('light') ?? 0) + 1);
      }
    }

    return counts;
  }

  private getDomainIcon(domain: string): string {
    switch (domain) {
      case 'light': return '💡';
      case 'switch': return '🔌';
      case 'climate': return '❄️';
      case 'fan': return '🌀';
      case 'cover': return '🪟';
      case 'lock': return '🔒';
      case 'media_player': return '📻';
      case 'binary_sensor': return '🔔';
      case 'sensor': return '🌡️';
      case 'camera': return '📷';
      case 'scene': return '🎬';
      case 'button': return '🔘';
      default: return '⚙️';
    }
  }

  render() {
    const selectedAreaName =
      this.selectedRoomAreaId && this.hass?.areas?.[this.selectedRoomAreaId]
        ? this.hass.areas[this.selectedRoomAreaId].name
        : this.selectedRoomAreaId;

    const baseEntities = this.getBaseMatchingEntities();
    const filteredEntities = this.getFilteredEntities(baseEntities);
    const domainCounts = this.getDomainCounts(baseEntities);
    const placedSet = new Set(
      this.activeFloor?.entities.map((e) => e.entity_id) ?? []
    );

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
          Catalog
        </button>
        ${!this.mobile
          ? html`
              <button
                class="pane-collapse-btn"
                title="Collapse Left Panel ["
                aria-label="Collapse left panel"
                @click=${() =>
                  this.dispatchEvent(
                    new CustomEvent('collapse-pane', { bubbles: true, composed: true })
                  )}
              >
                ◀
              </button>
            `
          : ''}
      </div>

      <!-- Tab 1: HA Entities -->
      ${this.activeTab === 'entities'
        ? html`
            <div class="entities-tab-layout">
              <div class="palette-controls">
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
                  ${DOMAIN_FILTERS.filter(
                    (dom) =>
                      CORE_DOMAINS.has(dom) ||
                      (domainCounts.get(dom) ?? 0) > 0 ||
                      this.selectedDomain === dom
                  ).map(
                    (dom) => {
                      const count = domainCounts.get(dom) ?? 0;
                      return html`
                        <button
                          type="button"
                          class="chip ${this.selectedDomain === dom ? 'active' : ''}"
                          @click=${() => (this.selectedDomain = dom)}
                        >
                          ${dom === 'all' ? 'All' : `${this.getDomainIcon(dom)} ${dom}`} (${count})
                        </button>
                      `;
                    }
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

                <!-- Section title -->
                <div class="section-title">
                  Entities (${filteredEntities.length})
                </div>
              </div>

              <!-- Entities List (Scrollable) -->
              <div class="items-scroll-region">
                <div class="items-list">
                  ${filteredEntities.length === 0
                    ? html`<div class="empty-state">No entities match filters.</div>`
                    : filteredEntities.map((entity) => {
                        const isLight = this.isLightEntity(entity);
                        const rawDomain = entity.entity_id.split('.')[0] || 'sensor';
                        const domain = isLight ? 'light' : rawDomain;
                        const isPlaced = placedSet.has(entity.entity_id);
                        const payload: PaletteDragPayload = {
                          kind: 'entity',
                          entityId: entity.entity_id,
                          domain,
                          label: entity.attributes.friendly_name || entity.entity_id
                        };
                        return html`
                          <div
                            class="item-row"
                            draggable=${this.mobile ? 'false' : 'true'}
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
                      draggable=${this.mobile ? 'false' : 'true'}
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
                    <button
                      type="button"
                      class="chip ${this.furnitureCategoryFilter === cat ? 'active' : ''}"
                      @click=${() => (this.furnitureCategoryFilter = cat)}
                    >
                      ${cat}
                    </button>
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
                      draggable=${this.mobile ? 'false' : 'true'}
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
