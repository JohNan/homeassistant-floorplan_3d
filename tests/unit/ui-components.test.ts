import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/card/floorplan-3d-card';
import '../../src/editor/floorplan-editor-panel';
import { Floorplan3DCard } from '../../src/card/floorplan-3d-card';
import { FloorplanEditorPanel } from '../../src/editor/floorplan-editor-panel';
import type { HomeAssistant } from '../../src/types/ha';
import type { FloorplanDocument } from '../../src/types/floorplan';

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
    expect(panel.hasAttribute('mobile')).toBe(true);
    expect(panel.style.height).toBe(`${window.innerHeight}px`);
    expect(panel.style.maxHeight).toBe(`${window.innerHeight}px`);

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

  it('moves both endpoints and attached room vertices when dragging a wall edge in <floorplan-canvas-2d>', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      activeFloorId: string;
    };

    const origN1 = { ...anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')! };
    const origN2 = { ...anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n2')! };
    const origN3 = { ...anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n3')! };

    // Link room polygon vertices to n1 and n2
    anyPanel.currentDocument.floors[0].rooms[0].points[0].node_id = 'n1';
    anyPanel.currentDocument.floors[0].rooms[0].points[1].node_id = 'n2';
    panel.requestUpdate();
    await panel.updateComplete;

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      panX: number;
      panY: number;
      pixelsPerMeter: number;
      canvasWidth: number;
      canvasHeight: number;
      stage: { find: (selector: string) => Array<{ id: () => string }> } | null;
      moveWallByDelta: (wallId: string, dx: number, dy: number, commit?: boolean) => void;
      updateComplete: Promise<boolean>;
    };
    expect(canvas2d).not.toBeNull();
    canvas2d.panX = 0;
    canvas2d.panY = 0;
    canvas2d.pixelsPerMeter = 100;
    canvas2d.canvasWidth = 800;
    canvas2d.canvasHeight = 600;
    await canvas2d.updateComplete;

    const wallGroups = canvas2d.stage?.find('.wall-group') ?? [];
    expect(wallGroups.length).toBe(4);

    // Drag wall w1 (n1 -> n2) down by +1.0m in Y
    canvas2d.moveWallByDelta('w1', 0, 1.0, true);
    await panel.updateComplete;

    const updatedFloor = anyPanel.currentDocument.floors[0];
    const n1 = updatedFloor.nodes.find((n) => n.id === 'n1');
    const n2 = updatedFloor.nodes.find((n) => n.id === 'n2');
    const n3 = updatedFloor.nodes.find((n) => n.id === 'n3');
    expect(n1).toEqual({ id: 'n1', x: origN1.x, y: origN1.y + 1 });
    expect(n2).toEqual({ id: 'n2', x: origN2.x, y: origN2.y + 1 });
    expect(n3).toEqual(origN3);

    // Attached room polygon vertices for n1 and n2 also moved in lockstep via auto-room sync
    const roomPts = updatedFloor.rooms[0].points;
    expect(roomPts.find((p) => p.node_id === 'n1')).toEqual({
      x: origN1.x,
      y: origN1.y + 1,
      node_id: 'n1'
    });
    expect(roomPts.find((p) => p.node_id === 'n2')).toEqual({
      x: origN2.x,
      y: origN2.y + 1,
      node_id: 'n2'
    });
  });

  it('supports collapsing and restoring desktop left palette, right inspector, top toolbar, and focus mode', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector('floorplan-entity-palette')).not.toBeNull();
    expect(panel.shadowRoot?.querySelector('floorplan-property-inspector')).not.toBeNull();

    // Collapse left palette via '[' shortcut
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true }));
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector('floorplan-entity-palette')).toBeNull();
    expect(panel.shadowRoot?.querySelector('.pane-expand-tab.left')).not.toBeNull();

    // Expand left palette via edge tab click
    (panel.shadowRoot?.querySelector('.pane-expand-tab.left') as HTMLButtonElement)?.click();
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector('floorplan-entity-palette')).not.toBeNull();

    // Toggle Focus Mode via 'f' shortcut (collapses both left and right panes)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector('floorplan-entity-palette')).toBeNull();
    expect(panel.shadowRoot?.querySelector('floorplan-property-inspector')).toBeNull();

    // Restore from Focus Mode via 'f' shortcut
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector('floorplan-entity-palette')).not.toBeNull();
    expect(panel.shadowRoot?.querySelector('floorplan-property-inspector')).not.toBeNull();
  });

  it('selects a wall anchor on tap without jitter and moves it smoothly without self-snapping onto incident walls', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      selection: { kind: string; id: string | null };
    };

    const origN1 = { ...anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')! };

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      panX: number;
      panY: number;
      pixelsPerMeter: number;
      canvasWidth: number;
      canvasHeight: number;
      snapToGrid: boolean;
      stage: {
        find: (selector: string) => Array<{
          id: () => string;
          fire: (eventType: string, evt?: unknown) => void;
        }>;
      } | null;
      moveNodeTo: (nodeId: string, pt: { x: number; y: number }, commit?: boolean) => void;
      updateComplete: Promise<boolean>;
    };
    canvas2d.panX = 0;
    canvas2d.panY = 0;
    canvas2d.pixelsPerMeter = 100;
    canvas2d.canvasWidth = 800;
    canvas2d.canvasHeight = 600;
    canvas2d.snapToGrid = false;
    await canvas2d.updateComplete;

    const nodeGroups = canvas2d.stage?.find('.wall-node') ?? [];
    expect(nodeGroups.length).toBe(4);
    const n1Group = nodeGroups.find((g) => g.id() === 'n1')!;
    expect(n1Group).toBeDefined();

    // 1. Tap on Konva wall-node selects n1 without altering its coordinates
    n1Group.fire('tap', { cancelBubble: false });
    await panel.updateComplete;
    expect(anyPanel.selection).toEqual({ kind: 'node', id: 'n1' });
    expect(anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')).toEqual(origN1);

    // 2. Move n1 by (+0.2m, +0.2m) (inside the 0.25m nodeSnapRadius)
    // Verifies it does not self-snap onto its own incident walls w1/w4 and updates room polygon
    canvas2d.moveNodeTo('n1', { x: origN1.x + 0.2, y: origN1.y + 0.2 }, true);
    await panel.updateComplete;

    const movedN1 = anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')!;
    expect(movedN1.x).toBeCloseTo(origN1.x + 0.2, 5);
    expect(movedN1.y).toBeCloseTo(origN1.y + 0.2, 5);
  });

  it('draws a wall chain, finishes on endpoint click, and splits existing walls at T-junctions to form connected rooms', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      activeTool: string;
    };

    // Switch to draw_wall tool
    anyPanel.activeTool = 'draw_wall';
    panel.requestUpdate();
    await panel.updateComplete;

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      panX: number;
      panY: number;
      pixelsPerMeter: number;
      canvasWidth: number;
      canvasHeight: number;
      updateCursorAndSnap: (pt: { x: number; y: number }) => void;
      handleDrawingToolClick: () => void;
      wallChainStart: { point: { x: number; y: number } } | null;
      updateComplete: Promise<boolean>;
    };
    canvas2d.panX = 0;
    canvas2d.panY = 0;
    canvas2d.pixelsPerMeter = 100;
    canvas2d.canvasWidth = 800;
    canvas2d.canvasHeight = 600;
    await canvas2d.updateComplete;

    // 1. Draw a connected dividing wall from top wall w1 midpoint (0, -3) to bottom wall w3 midpoint (0, 3)
    canvas2d.updateCursorAndSnap({ x: 0, y: -3 });
    canvas2d.handleDrawingToolClick();
    expect(canvas2d.wallChainStart).not.toBeNull();

    canvas2d.updateCursorAndSnap({ x: 0, y: 3 });
    canvas2d.handleDrawingToolClick();
    await panel.updateComplete;

    // Connecting onto existing wall w3 splits the room into 2 rooms while keeping chain active at (0, 3)
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 0, y: 3 });
    expect(anyPanel.currentDocument.floors[0].rooms.length).toBe(2);

    // Clicking the active endpoint (0, 3) again finishes the first chain
    canvas2d.updateCursorAndSnap({ x: 0, y: 3 });
    canvas2d.handleDrawingToolClick();
    expect(canvas2d.wallChainStart).toBeNull();

    // 2. Start an open wall chain at (5, 0) -> (7, 0), then click (7, 0) again to finish the chain
    canvas2d.updateCursorAndSnap({ x: 5, y: 0 });
    canvas2d.handleDrawingToolClick();
    expect(canvas2d.wallChainStart).not.toBeNull();

    canvas2d.updateCursorAndSnap({ x: 7, y: 0 });
    canvas2d.handleDrawingToolClick();
    // Chain continues from new corner (7, 0)
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 7, y: 0 });

    // Clicking the current endpoint (7, 0) again finishes the wall chain cleanly
    canvas2d.updateCursorAndSnap({ x: 7, y: 0 });
    canvas2d.handleDrawingToolClick();
    expect(canvas2d.wallChainStart).toBeNull();
  });

  it('supports mobile touch-drag-release wall drawing, connected walls at mobile zoom (24 px/m), crossing X-junctions, and Done Drawing Walls action bar', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    panel.narrow = true;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      activeTool: string;
    };

    // Switch to draw_wall tool
    anyPanel.activeTool = 'draw_wall';
    panel.requestUpdate();
    await panel.updateComplete;

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      panX: number;
      panY: number;
      pixelsPerMeter: number;
      canvasWidth: number;
      canvasHeight: number;
      konvaMountEl?: HTMLDivElement;
      wallChainStart: { point: { x: number; y: number } } | null;
      worldToScreen: (pt: { x: number; y: number }) => { x: number; y: number };
      onMountPointerDown: (ev: PointerEvent) => void;
      onMountPointerMove: (ev: PointerEvent) => void;
      onMountPointerUp: (ev: PointerEvent) => void;
      onMountPointerCancel: (ev: PointerEvent) => void;
      updateComplete: Promise<boolean>;
    };

    // Simulate a 360px mobile screen at 24 px/m zoom
    canvas2d.panX = 0;
    canvas2d.panY = 0;
    canvas2d.pixelsPerMeter = 24;
    canvas2d.canvasWidth = 360;
    canvas2d.canvasHeight = 640;
    await canvas2d.updateComplete;

    // 1. Touch-Drag-Release wall #1 from (5, -2) to (5, 0)
    const start1 = canvas2d.worldToScreen({ x: 5, y: -2 });
    const end1 = canvas2d.worldToScreen({ x: 5, y: 0 });
    canvas2d.onMountPointerDown({
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: start1.x,
      clientY: start1.y
    } as PointerEvent);
    canvas2d.onMountPointerMove({
      pointerId: 1,
      pointerType: 'touch',
      clientX: end1.x,
      clientY: end1.y
    } as PointerEvent);
    canvas2d.onMountPointerUp({
      pointerId: 1,
      pointerType: 'touch',
      clientX: end1.x,
      clientY: end1.y
    } as PointerEvent);
    await panel.updateComplete;

    // Wall #1 committed and chain continues at (5, 0)
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 5, y: 0 });
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(5);

    // 2. Touch-Drag-Release connected wall #2 starting slightly off (5, 0) by 0.6m (~14px on mobile)
    // Verifies adaptive snap radius (28px / 24 px/m = 1.05m) snaps onto (5, 0) and drags to (7, 0)
    const nearEnd1 = canvas2d.worldToScreen({ x: 5.6, y: 0 });
    const end2 = canvas2d.worldToScreen({ x: 7, y: 0 });
    canvas2d.onMountPointerDown({
      pointerId: 2,
      pointerType: 'touch',
      button: 0,
      clientX: nearEnd1.x,
      clientY: nearEnd1.y
    } as PointerEvent);
    canvas2d.onMountPointerMove({
      pointerId: 2,
      pointerType: 'touch',
      clientX: end2.x,
      clientY: end2.y
    } as PointerEvent);
    canvas2d.onMountPointerUp({
      pointerId: 2,
      pointerType: 'touch',
      clientX: end2.x,
      clientY: end2.y
    } as PointerEvent);
    await panel.updateComplete;

    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(6);
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 7, y: 0 });

    // 3. Tap "✓ Done Drawing Walls" button in floating action bar switches tool back to 'select'
    await canvas2d.updateComplete;
    const doneBtn = canvas2d.shadowRoot?.querySelector(
      '.touch-pill.touch-pill-success'
    ) as HTMLButtonElement | null;
    expect(doneBtn).not.toBeNull();
    doneBtn?.click();
    await panel.updateComplete;
    expect(anyPanel.activeTool).toBe('select');
  });

  it('chains multiple walls via consecutive taps (Tap 1 = start, Tap 2 = end, Tap 3 = next end, Tap 4 = next end) even with mobile thumb roll', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    panel.narrow = true;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      activeTool: string;
    };

    anyPanel.activeTool = 'draw_wall';
    panel.requestUpdate();
    await panel.updateComplete;

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      panX: number;
      panY: number;
      pixelsPerMeter: number;
      canvasWidth: number;
      canvasHeight: number;
      wallChainStart: { point: { x: number; y: number } } | null;
      worldToScreen: (pt: { x: number; y: number }) => { x: number; y: number };
      onMountPointerDown: (ev: PointerEvent) => void;
      onMountPointerMove: (ev: PointerEvent) => void;
      onMountPointerUp: (ev: PointerEvent) => void;
      onMountPointerCancel: (ev: PointerEvent) => void;
      updateComplete: Promise<boolean>;
    };

    canvas2d.panX = 0;
    canvas2d.panY = 0;
    canvas2d.pixelsPerMeter = 24;
    canvas2d.canvasWidth = 360;
    canvas2d.canvasHeight = 640;
    await canvas2d.updateComplete;

    const tapWithThumbRoll = (pointerId: number, worldPt: { x: number; y: number }, rollPx = 14) => {
      const s = canvas2d.worldToScreen(worldPt);
      canvas2d.onMountPointerDown({
        pointerId,
        pointerType: 'touch',
        button: 0,
        clientX: s.x,
        clientY: s.y
      } as PointerEvent);
      // Simulate 14px natural thumb roll during tap (> old 10px bug threshold, < 24px drag threshold)
      canvas2d.onMountPointerMove({
        pointerId,
        pointerType: 'touch',
        clientX: s.x + rollPx,
        clientY: s.y
      } as PointerEvent);
      canvas2d.onMountPointerUp({
        pointerId,
        pointerType: 'touch',
        clientX: s.x,
        clientY: s.y
      } as PointerEvent);
    };

    // Tap 1: Set start at (5, -2)
    tapWithThumbRoll(10, { x: 5, y: -2 });
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 5, y: -2 });
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(4);

    // Tap 2: Set end of wall #1 at (5, 1) -> commits (5, -2) -> (5, 1) and advances start to (5, 1)
    tapWithThumbRoll(11, { x: 5, y: 1 });
    await panel.updateComplete;
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(5);
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 5, y: 1 });

    // Tap 3: Set next end at (8, 1) -> commits (5, 1) -> (8, 1) (does NOT move previous end!)
    tapWithThumbRoll(12, { x: 8, y: 1 });
    await panel.updateComplete;
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(6);
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 8, y: 1 });

    // Tap 4: Set next end at (8, -2) -> commits (8, 1) -> (8, -2)
    tapWithThumbRoll(13, { x: 8, y: -2 });
    await panel.updateComplete;
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(7);
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 8, y: -2 });

    // Cancelled touch press at (10, -2) restores wallChainStart to (8, -2) without adding a wall
    const cancelScreen = canvas2d.worldToScreen({ x: 10, y: -2 });
    canvas2d.onMountPointerDown({
      pointerId: 14,
      pointerType: 'touch',
      button: 0,
      clientX: cancelScreen.x,
      clientY: cancelScreen.y
    } as PointerEvent);
    canvas2d.onMountPointerCancel({
      pointerId: 14,
      pointerType: 'touch'
    } as PointerEvent);
    expect(canvas2d.wallChainStart?.point).toEqual({ x: 8, y: -2 });
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(7);

    // Tap 5 on active endpoint (8, -2) finishes the chain without adding a wall
    tapWithThumbRoll(15, { x: 8, y: -2 }, 0);
    await panel.updateComplete;
    expect(canvas2d.wallChainStart).toBeNull();
    expect(anyPanel.currentDocument.floors[0].walls.length).toBe(7);
  });

  it('prioritizes light entities (including light-classified switches and hass.entities registry entries) ahead of media_player and sensor in <floorplan-entity-palette>', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const mockHass: HomeAssistant = {
      language: 'en',
      states: {
        'media_player.living_room_tv': {
          entity_id: 'media_player.living_room_tv',
          state: 'playing',
          attributes: { friendly_name: 'Living Room TV' },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        },
        'sensor.outdoor_temperature': {
          entity_id: 'sensor.outdoor_temperature',
          state: '18.4',
          attributes: { friendly_name: 'Outdoor Temperature' },
          last_changed: '',
          last_updated: '',
          context: { id: '2', parent_id: null, user_id: null }
        },
        'light.kitchen_ceiling': {
          entity_id: 'light.kitchen_ceiling',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Ceiling' },
          last_changed: '',
          last_updated: '',
          context: { id: '3', parent_id: null, user_id: null }
        },
        'switch.hallway_sconce': {
          entity_id: 'switch.hallway_sconce',
          state: 'off',
          attributes: { friendly_name: 'Hallway Sconce', device_class: 'light' },
          last_changed: '',
          last_updated: '',
          context: { id: '4', parent_id: null, user_id: null }
        }
      },
      entities: {
        'light.bedroom_strip': {
          entity_id: 'light.bedroom_strip',
          name: 'Bedroom LED Strip',
          platform: 'hue'
        }
      },
      connection: {
        subscribeMessage: async () => async () => {},
        sendMessagePromise: async () => [] as never
      },
      callService: async () => ({}),
      callWS: async () => [] as never
    };

    panel.hass = mockHass;
    await panel.updateComplete;

    const palette = panel.shadowRoot?.querySelector('floorplan-entity-palette') as unknown as HTMLElement & {
      selectedDomain: string;
      getFilteredEntities: () => Array<{ entity_id: string }>;
      updateComplete: Promise<boolean>;
    };
    expect(palette).not.toBeNull();
    await palette.updateComplete;

    const allFiltered = palette.getFilteredEntities();
    // All 3 light entities (light.bedroom_strip, switch.hallway_sconce [device_class=light], light.kitchen_ceiling)
    // appear first in the list ahead of media_player and sensor
    expect(allFiltered.slice(0, 3).map((e) => e.entity_id)).toEqual([
      'light.bedroom_strip',
      'switch.hallway_sconce',
      'light.kitchen_ceiling'
    ]);

    // Selecting the 'light' domain chip returns all 3 light entities (including the light-classified switch and registry light)
    palette.selectedDomain = 'light';
    await palette.updateComplete;
    const onlyLights = palette.getFilteredEntities();
    expect(onlyLights.map((e) => e.entity_id)).toEqual([
      'light.bedroom_strip',
      'switch.hallway_sconce',
      'light.kitchen_ceiling'
    ]);
  });

  it('locks wall editing via L shortcut or toolbar toggle so walls/corners cannot be moved or deleted while objects remain movable', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      wallsLocked: boolean;
      currentDocument: FloorplanDocument;
      selection: { kind: string; id: string | null };
      deleteSelection: () => void;
    };

    // Place a light entity right on top of corner n1 (-4, -3)
    const origN1 = { ...anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')! };
    panel.renderRoot.querySelector('floorplan-entity-palette')?.dispatchEvent(
      new CustomEvent('palette-place', {
        bubbles: true,
        composed: true,
        detail: {
          kind: 'entity',
          entityId: 'light.corner_lamp',
          domain: 'light',
          dropPoint: { x: origN1.x, y: origN1.y }
        }
      })
    );
    await panel.updateComplete;

    const placedEntity = anyPanel.currentDocument.floors[0].entities[0]!;
    expect(placedEntity.x).toBe(origN1.x);
    expect(placedEntity.y).toBe(origN1.y);

    // Press 'l' to lock walls
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
    await panel.updateComplete;
    expect(anyPanel.wallsLocked).toBe(true);

    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as HTMLElement & {
      wallsLocked: boolean;
      moveNodeTo: (nodeId: string, pt: { x: number; y: number }, commit?: boolean) => void;
      moveWallByDelta: (wallId: string, dx: number, dy: number, commit?: boolean) => void;
      hitTestSceneItem: (pt: { x: number; y: number }) => { kind: string; id: string | null };
      updateComplete: Promise<boolean>;
    };
    await canvas2d.updateComplete;
    expect(canvas2d.wallsLocked).toBe(true);

    // Attempt to move node n1 or wall w1 while locked -> no-op
    canvas2d.moveNodeTo('n1', { x: -10, y: -10 }, true);
    canvas2d.moveWallByDelta('w1', 0, -5, true);
    expect(anyPanel.currentDocument.floors[0].nodes.find((n) => n.id === 'n1')).toEqual(origN1);

    // Hit-testing at corner n1 hits the placed entity instead of the locked corner node
    expect(canvas2d.hitTestSceneItem({ x: origN1.x, y: origN1.y })).toEqual({
      kind: 'entity',
      id: placedEntity.id
    });

    // Hit-testing on bare wall w2 (4, 0) skips the locked wall edge and returns room
    expect(canvas2d.hitTestSceneItem({ x: 4, y: 0 }).kind).not.toBe('wall');

    // Attempting to delete a wall while locked is blocked
    anyPanel.selection = { kind: 'wall', id: 'w1' };
    anyPanel.deleteSelection();
    expect(anyPanel.currentDocument.floors[0].walls.some((w) => w.id === 'w1')).toBe(true);
  });

  it('places doors/windows on the selected wall and supports moving a door across to another wall via drag or PropertyInspector', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      selection: { kind: string; id: string | null };
    };

    // Select wall w2 (East wall) and place a door from the palette
    anyPanel.selection = { kind: 'wall', id: 'w2' };
    panel.requestUpdate();
    await panel.updateComplete;

    panel.renderRoot.querySelector('floorplan-entity-palette')?.dispatchEvent(
      new CustomEvent('palette-place', {
        bubbles: true,
        composed: true,
        detail: {
          kind: 'opening',
          openingType: 'door_single',
          label: 'Single Door',
          defaultWidth: 0.9
        }
      })
    );
    await panel.updateComplete;

    const openings = anyPanel.currentDocument.floors[0].openings;
    expect(openings.length).toBe(1);
    const door = openings[0]!;
    // Placed on selected wall w2 instead of hardcoded w1
    expect(door.wall_id).toBe('w2');

    // Move the door across the room onto South wall w3 (midpoint (0, 3)) via canvas2d.moveOpeningTo
    const canvas2d = panel.shadowRoot?.querySelector('floorplan-canvas-2d') as unknown as {
      moveOpeningTo: (openingId: string, pt: { x: number; y: number }, commit?: boolean) => void;
    };
    canvas2d.moveOpeningTo(door.id, { x: 0, y: 3 }, true);
    await panel.updateComplete;

    const movedDoor = anyPanel.currentDocument.floors[0].openings[0]!;
    expect(movedDoor.wall_id).toBe('w3');
    expect(movedDoor.t).toBeCloseTo(0.5, 2);

    // Reassign host wall to w4 via PropertyInspector Host Wall dropdown
    const inspector = panel.shadowRoot?.querySelector('floorplan-property-inspector');
    expect(inspector).not.toBeNull();
    await inspector?.updateComplete;

    const selects = Array.from(inspector?.shadowRoot?.querySelectorAll('select') ?? []);
    const hostWallSelect = selects.find((s) =>
      Array.from(s.options).some((opt) => opt.value === 'w4')
    );
    expect(hostWallSelect).toBeDefined();
    hostWallSelect!.value = 'w4';
    hostWallSelect!.dispatchEvent(new Event('change'));
    await panel.updateComplete;

    expect(anyPanel.currentDocument.floors[0].openings[0]?.wall_id).toBe('w4');
  });

  it('allows deleting the only floorplan (or an unsaved floorplan) via the in-editor confirmation modal and resets to a fresh plan', async () => {
    const panel = document.createElement('floorplan-editor-panel') as FloorplanEditorPanel;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const anyPanel = panel as unknown as {
      currentDocument: FloorplanDocument;
      confirmDialog: { title: string; onConfirm: () => void } | null;
    };

    // Add a custom entity to the current floorplan so we can verify reset
    panel.renderRoot.querySelector('floorplan-entity-palette')?.dispatchEvent(
      new CustomEvent('palette-place', {
        bubbles: true,
        composed: true,
        detail: { kind: 'entity', entityId: 'light.test_bulb', domain: 'light' }
      })
    );
    await panel.updateComplete;
    expect(anyPanel.currentDocument.floors[0].entities.length).toBe(1);

    // Trigger floorplan-delete from toolbar even when floorplans.length <= 1
    const toolbar = panel.shadowRoot?.querySelector('floorplan-editor-toolbar');
    toolbar?.dispatchEvent(new CustomEvent('floorplan-delete', { bubbles: true, composed: true }));
    await panel.updateComplete;

    // In-editor confirmation dialog opens
    expect(anyPanel.confirmDialog).not.toBeNull();
    const confirmDangerBtn = panel.shadowRoot?.querySelector(
      '.btn-confirm-danger'
    ) as HTMLButtonElement | null;
    expect(confirmDangerBtn).not.toBeNull();

    confirmDangerBtn?.click();
    await panel.updateComplete;

    expect(anyPanel.confirmDialog).toBeNull();
    expect(anyPanel.currentDocument.floors[0].entities.length).toBe(0);
    expect(anyPanel.currentDocument.name).toBe('Main House');
  });
});
