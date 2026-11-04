import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FloorLevel, FloorplanSummary } from '../../types/floorplan';
import type { EditorToolMode, EditorViewLayout } from '../editor-contracts';

/**
 * Top CAD Command Bar for the 2D/3D Floorplan Editor (`floorplan-editor-toolbar`).
 */
@customElement('floorplan-editor-toolbar')
export class EditorToolbar extends LitElement {
  @property({ type: Array }) public floorplans: FloorplanSummary[] = [];
  @property({ type: String }) public activeFloorplanId = '';
  @property({ type: Array }) public floors: FloorLevel[] = [];
  @property({ type: String }) public activeFloorId = '';
  @property({ type: String }) public activeTool: EditorToolMode = 'select';
  @property({ type: Number }) public gridSize = 0.1;
  @property({ type: Boolean }) public snapToGrid = true;
  @property({ type: Boolean }) public canUndo = false;
  @property({ type: Boolean }) public canRedo = false;
  @property({ type: String }) public viewLayout: EditorViewLayout = 'split';
  @property({ type: Boolean }) public isDirty = false;
  @property({ type: Boolean }) public onionSkin = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      padding: 0 12px;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      user-select: none;
      box-sizing: border-box;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
    }

    :host::-webkit-scrollbar {
      height: 4px;
    }

    :host::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }

    .toolbar-section {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .separator {
      width: 1px;
      height: 22px;
      background: #334155;
      margin: 0 4px;
      flex-shrink: 0;
    }

    select {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
      height: 28px;
    }

    select:focus {
      border-color: #3b82f6;
    }

    button {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    button:hover:not(:disabled) {
      background: #334155;
      color: #ffffff;
      border-color: #64748b;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
    }

    button.danger:hover:not(:disabled) {
      background: #991b1b;
      border-color: #ef4444;
      color: #fecaca;
    }

    .btn-group {
      display: inline-flex;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #475569;
    }

    .btn-group button {
      border: none;
      border-radius: 0;
      border-right: 1px solid #475569;
      margin: 0;
    }

    .btn-group button:last-child {
      border-right: none;
    }

    .save-button {
      background: #15803d;
      color: #ffffff;
      border-color: #22c55e;
      font-weight: 600;
    }

    .save-button:hover:not(:disabled) {
      background: #16a34a;
      border-color: #4ade80;
    }

    .dirty-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .dirty-pill.unsaved {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .dirty-pill.saved {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.4);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .dirty-pill.unsaved .status-dot {
      background: #fbbf24;
    }

    .dirty-pill.saved .status-dot {
      background: #4ade80;
    }

    .icon {
      font-size: 14px;
      line-height: 1;
    }
  `;

  private handleFloorplanSelect(ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('floorplan-change', {
        bubbles: true,
        composed: true,
        detail: { floorplanId: select.value }
      })
    );
  }

  private handleFloorSelect(ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('floor-change', {
        bubbles: true,
        composed: true,
        detail: { floorId: select.value }
      })
    );
  }

  private handleToolSelect(tool: EditorToolMode): void {
    this.dispatchEvent(
      new CustomEvent('tool-change', {
        bubbles: true,
        composed: true,
        detail: { tool }
      })
    );
  }

  private handleGridSizeSelect(ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    const size = parseFloat(select.value);
    this.dispatchEvent(
      new CustomEvent('grid-size-change', {
        bubbles: true,
        composed: true,
        detail: { gridSize: size }
      })
    );
  }

  private handleSnapToggle(): void {
    this.dispatchEvent(
      new CustomEvent('snap-toggle', {
        bubbles: true,
        composed: true,
        detail: { snap: !this.snapToGrid }
      })
    );
  }

  private handleOnionSkinToggle(): void {
    this.dispatchEvent(
      new CustomEvent('toggle-onion-skin', {
        bubbles: true,
        composed: true,
        detail: { onionSkin: !this.onionSkin }
      })
    );
  }

  private handleLayoutSelect(layout: EditorViewLayout): void {
    this.dispatchEvent(
      new CustomEvent('layout-change', {
        bubbles: true,
        composed: true,
        detail: { layout }
      })
    );
  }

  private handleSaveCamera(): void {
    this.dispatchEvent(
      new CustomEvent('save-camera', {
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <!-- 1. Floorplan Switcher -->
      <div class="toolbar-section">
        <select
          aria-label="Floorplan selector"
          .value=${this.activeFloorplanId}
          @change=${this.handleFloorplanSelect}
        >
          ${this.floorplans.length === 0
            ? html`<option value="">Default Floorplan</option>`
            : this.floorplans.map(
                (fp) => html`<option value=${fp.id}>${fp.name}</option>`
              )}
        </select>
        <button
          title="Create New Floorplan"
          @click=${() => this.dispatchEvent(new CustomEvent('floorplan-new', { bubbles: true, composed: true }))}
        >
          <span class="icon">+</span> New
        </button>
        <button
          class="danger"
          title="Delete Active Floorplan"
          ?disabled=${this.floorplans.length <= 1}
          @click=${() => this.dispatchEvent(new CustomEvent('floorplan-delete', { bubbles: true, composed: true }))}
        >
          Delete
        </button>
      </div>

      <div class="separator"></div>

      <!-- 2. Floor Selector & Level Management -->
      <div class="toolbar-section">
        <select
          aria-label="Floor level selector"
          .value=${this.activeFloorId}
          @change=${this.handleFloorSelect}
        >
          ${this.floors.map(
            (fl) => html`<option value=${fl.id}>${fl.name} (L${fl.level_index})</option>`
          )}
        </select>
        <button
          title="Add New Floor Above"
          @click=${() => this.dispatchEvent(new CustomEvent('floor-add', { bubbles: true, composed: true }))}
        >
          + Add Floor
        </button>
        <button
          title="Duplicate Exterior Perimeter Walls from Floor Below"
          @click=${() => this.dispatchEvent(new CustomEvent('duplicate-perimeter', { bubbles: true, composed: true }))}
        >
          Duplicate Perimeter
        </button>
        <button
          class=${this.onionSkin ? 'active' : ''}
          title="Toggle Onion-Skin Ghost Trace from Floor Below"
          @click=${this.handleOnionSkinToggle}
        >
          Ghost Trace
        </button>
      </div>

      <div class="separator"></div>

      <!-- 3. Tool Mode Buttons -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            class=${this.activeTool === 'select' ? 'active' : ''}
            title="Select & Move [V]"
            @click=${() => this.handleToolSelect('select')}
          >
            Select [V]
          </button>
          <button
            class=${this.activeTool === 'draw_wall' ? 'active' : ''}
            title="Draw Wall [W]"
            @click=${() => this.handleToolSelect('draw_wall')}
          >
            Wall [W]
          </button>
          <button
            class=${this.activeTool === 'draw_room' ? 'active' : ''}
            title="Draw Room Polygon [R]"
            @click=${() => this.handleToolSelect('draw_room')}
          >
            Room [R]
          </button>
          <button
            class=${this.activeTool === 'add_opening' ? 'active' : ''}
            title="Add Door / Window [O]"
            @click=${() => this.handleToolSelect('add_opening')}
          >
            Opening [O]
          </button>
          <button
            class=${this.activeTool === 'measure' ? 'active' : ''}
            title="Measure Distance [M]"
            @click=${() => this.handleToolSelect('measure')}
          >
            Measure [M]
          </button>
        </div>
        <button
          title="Calibrate 2-Point Blueprint Scale"
          @click=${() => this.dispatchEvent(new CustomEvent('calibrate-blueprint', { bubbles: true, composed: true }))}
        >
          Calibrate Blueprint
        </button>
      </div>

      <div class="separator"></div>

      <!-- 4. Grid Size & Magnetic Snapping -->
      <div class="toolbar-section">
        <button
          class=${this.snapToGrid ? 'active' : ''}
          title="Toggle Snap to Grid"
          @click=${this.handleSnapToggle}
        >
          Snap
        </button>
        <select
          aria-label="Grid snap size"
          .value=${String(this.gridSize)}
          @change=${this.handleGridSizeSelect}
        >
          <option value="0.05">0.05m</option>
          <option value="0.1">0.1m</option>
          <option value="0.25">0.25m</option>
          <option value="0.5">0.5m</option>
        </select>
      </div>

      <div class="separator"></div>

      <!-- 5. History Controls (Undo / Redo) -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            title="Undo (Ctrl+Z)"
            ?disabled=${!this.canUndo}
            @click=${() => this.dispatchEvent(new CustomEvent('undo', { bubbles: true, composed: true }))}
          >
            Undo
          </button>
          <button
            title="Redo (Ctrl+Y)"
            ?disabled=${!this.canRedo}
            @click=${() => this.dispatchEvent(new CustomEvent('redo', { bubbles: true, composed: true }))}
          >
            Redo
          </button>
        </div>
      </div>

      <div class="separator"></div>

      <!-- 6. View Layout Mode & Camera Bookmark -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            class=${this.viewLayout === '2d' ? 'active' : ''}
            title="2D CAD Viewport Only"
            @click=${() => this.handleLayoutSelect('2d')}
          >
            2D Only
          </button>
          <button
            class=${this.viewLayout === 'split' ? 'active' : ''}
            title="Split 2D Viewport + 3D Live Preview"
            @click=${() => this.handleLayoutSelect('split')}
          >
            Split 2D + 3D
          </button>
          <button
            class=${this.viewLayout === '3d' ? 'active' : ''}
            title="3D Preview Only"
            @click=${() => this.handleLayoutSelect('3d')}
          >
            3D Preview
          </button>
        </div>
        ${this.viewLayout !== '2d'
          ? html`
              <button
                title="Save 3D Camera as Floor Default"
                @click=${this.handleSaveCamera}
              >
                Save 3D Camera
              </button>
            `
          : ''}
      </div>

      <div class="separator"></div>

      <!-- 7. Document Import / Export & Save -->
      <div class="toolbar-section">
        <button
          title="Import Floorplan JSON"
          @click=${() => this.dispatchEvent(new CustomEvent('import-json', { bubbles: true, composed: true }))}
        >
          Import JSON
        </button>
        <button
          title="Export Floorplan JSON"
          @click=${() => this.dispatchEvent(new CustomEvent('export-json', { bubbles: true, composed: true }))}
        >
          Export JSON
        </button>

        <div class="dirty-pill ${this.isDirty ? 'unsaved' : 'saved'}">
          <span class="status-dot"></span>
          ${this.isDirty ? 'Unsaved' : 'Saved'}
        </div>

        <button
          class="save-button"
          title="Save Floorplan to Home Assistant Storage"
          @click=${() => this.dispatchEvent(new CustomEvent('save-floorplan', { bubbles: true, composed: true }))}
        >
          Save
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floorplan-editor-toolbar': EditorToolbar;
  }
}
