import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/card/floorplan-3d-card';
import '../../src/editor/floorplan-editor-panel';
import { Floorplan3DCard } from '../../src/card/floorplan-3d-card';
import { FloorplanEditorPanel } from '../../src/editor/floorplan-editor-panel';
import type { HomeAssistant } from '../../src/types/ha';

describe('Wave 3 UI Components (<floorplan-3d-card> & <floorplan-editor-panel>)', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers <floorplan-3d-card> and returns valid stub config and config element', async () => {
    const stub = Floorplan3DCard.getStubConfig();
    expect(stub.type).toBe('custom:floorplan-3d-card');
    expect(stub.floorplan_id).toBe('main_house');
    expect(stub.wall_mode).toBe('auto_cutaway');

    const editorEl = await Floorplan3DCard.getConfigElement();
    expect(editorEl.tagName.toLowerCase()).toBe('floorplan-3d-card-editor');
  });

  it('throws on invalid missing floorplan_id in <floorplan-3d-card>.setConfig', () => {
    const card = document.createElement('floorplan-3d-card') as Floorplan3DCard;
    expect(() => card.setConfig({ type: 'custom:floorplan-3d-card', floorplan_id: '' })).toThrow();
  });

  it('cascade-deletes incident walls and openings when deleting a WallNode in <floorplan-editor-panel>', () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);

    const anyPanel = panel as unknown as {
      currentDocument: {
        floors: Array<{
          nodes: Array<{ id: string }>;
          walls: Array<{ id: string; start_node_id: string; end_node_id: string }>;
          openings: Array<{ id: string; wall_id: string }>;
        }>;
      };
      selection: { kind: string; id: string | null };
      deleteSelection: () => void;
    };

    expect(anyPanel.currentDocument.floors[0].nodes.length).toBe(4);
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(4);

    // Select node 'n1' (connected to walls 'w1' and 'w4') and delete it
    anyPanel.selection = { kind: 'node', id: 'n1' };
    anyPanel.deleteSelection();

    const floorAfter = anyPanel.currentDocument.floors[0];
    expect(floorAfter.nodes.map((n) => n.id)).toEqual(['n2', 'n3', 'n4']);
    expect(floorAfter.walls.map((w) => w.id)).toEqual(['w2', 'w3']);
  });

  it('ignores single-key tool shortcuts when keydown originates from a nested Shadow DOM <input>', () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);

    const anyPanel = panel as unknown as { activeTool: string };
    expect(anyPanel.activeTool).toBe('select');

    const fakeInput = document.createElement('input');
    const keyEvent = new KeyboardEvent('keydown', { key: 'w', bubbles: true, composed: true });
    vi.spyOn(keyEvent, 'composedPath').mockReturnValue([fakeInput, panel, document.body, window]);

    window.dispatchEvent(keyEvent);
    // Should still be 'select', not switched to 'draw_wall'
    expect(anyPanel.activeTool).toBe('select');

    // Now dispatch directly on window without an input in composedPath
    const canvasKeyEvent = new KeyboardEvent('keydown', { key: 'w', bubbles: true });
    window.dispatchEvent(canvasKeyEvent);
    expect(anyPanel.activeTool).toBe('draw_wall');
  });

  it('filters unrelated Home Assistant state churn in <floorplan-editor-panel> via WatchedEntityDiffer', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const baseHass: HomeAssistant = {
      language: 'en',
      states: {
        'sensor.unrelated_power': {
          entity_id: 'sensor.unrelated_power',
          state: '15.2',
          attributes: {},
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        }
      },
      connection: {
        subscribeMessage: async () => async () => {},
        sendMessagePromise: async () => ({}) as never
      },
      callService: async () => ({}),
      callWS: async () => [] as never
    };

    panel.hass = baseHass;
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      scene3d: { updateHassStates: (...args: unknown[]) => void } | null;
    };
    if (anyPanel.scene3d) {
      const spy = vi.spyOn(anyPanel.scene3d, 'updateHassStates');
      // Mutate only the unwatched sensor
      panel.hass = {
        ...baseHass,
        states: {
          'sensor.unrelated_power': {
            ...baseHass.states['sensor.unrelated_power'],
            state: '99.9'
          }
        }
      };
      await panel.updateComplete;
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('switches to mobile layout when narrow=true, dispatches hass-toggle-menu once, and places items at viewport center', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    panel.narrow = true;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      viewLayout: string;
      activeMobileSheet: string;
      currentDocument: {
        floors: Array<{
          entities: Array<{ entity_id: string; x: number; y: number }>;
        }>;
      };
    };

    // Split mode automatically collapses to single 2d viewport on mobile
    expect(anyPanel.viewLayout).toBe('2d');

    // Bottom CAD dock is rendered
    const bottomDock = panel.shadowRoot?.querySelector('.mobile-bottom-dock');
    expect(bottomDock).not.toBeNull();

    // Hamburger menu button in toolbar dispatches hass-toggle-menu exactly once
    const toolbar = panel.shadowRoot?.querySelector('floorplan-editor-toolbar');
    expect(toolbar).not.toBeNull();
    await toolbar?.updateComplete;

    let toggleMenuCount = 0;
    panel.addEventListener('hass-toggle-menu', () => {
      toggleMenuCount++;
    });

    const menuBtn = toolbar?.shadowRoot?.querySelector('.ha-menu-btn') as HTMLButtonElement | null;
    expect(menuBtn).not.toBeNull();
    menuBtn?.click();
    expect(toggleMenuCount).toBe(1);

    // Pan 2D canvas to (2.5, -1.5) and place an entity from palette while sheet is open
    anyPanel.activeMobileSheet = 'palette';
    await panel.updateComplete;

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as {
      panX: number;
      panY: number;
      zoomIn: () => void;
      zoomOut: () => void;
      getViewportCenterWorld: () => { x: number; y: number };
    };
    expect(canvas2d).not.toBeNull();
    canvas2d.panX = 2.5;
    canvas2d.panY = -1.5;
    expect(canvas2d.getViewportCenterWorld()).toEqual({ x: 2.5, y: -1.5 });
    canvas2d.zoomIn();
    canvas2d.zoomOut();

    panel.renderRoot
      .querySelector('floorplan-entity-palette')
      ?.dispatchEvent(
        new CustomEvent('palette-place', {
          bubbles: true,
          composed: true,
          detail: { kind: 'entity', entityId: 'light.kitchen_spot', domain: 'light' }
        })
      );

    // Sheet auto-closes and entity spawns at (2.5, -1.5)
    expect(anyPanel.activeMobileSheet).toBe('none');
    const placed = anyPanel.currentDocument.floors[0].entities.find(
      (e) => e.entity_id === 'light.kitchen_spot'
    );
    expect(placed).toBeDefined();
    expect(placed?.x).toBe(2.5);
    expect(placed?.y).toBe(-1.5);
  });
});
