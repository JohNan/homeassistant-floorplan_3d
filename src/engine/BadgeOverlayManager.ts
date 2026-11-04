import * as THREE from 'three';
import {
  CSS2DObject,
  CSS2DRenderer
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type {
  ActionConfig,
  FloorLevel,
  Point2D,
  RoomPolygon,
  EntityPlacement
} from '../types/floorplan';
import type {
  EntityActionDispatchDetail,
  ResolvedEntityVisualState,
  ResolvedRoomSummary
} from './contracts';

interface RoomLabelEntry {
  roomId: string;
  room: RoomPolygon;
  summary: ResolvedRoomSummary;
  element: HTMLElement;
  motionDot: HTMLElement;
  nameSpan: HTMLElement;
  climateSpan: HTMLElement;
  lightsSpan: HTMLElement;
  object: CSS2DObject;
  dispose: () => void;
}

interface EntityBadgeEntry {
  placementId: string;
  entityId: string;
  placement: EntityPlacement;
  visualState?: ResolvedEntityVisualState;
  element: HTMLElement;
  iconSpan: HTMLElement;
  stateSpan?: HTMLElement;
  object: CSS2DObject;
  dispose: () => void;
}

const BADGE_STYLES_ID = 'fp3d-badge-styles';

const BADGE_CSS = `
.fp3d-room-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  user-select: none;
  pointer-events: auto;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.fp3d-room-label:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(1.04);
}
.fp3d-room-label:active {
  transform: translate(-50%, -50%) scale(0.96);
}

.fp3d-motion-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  display: inline-block;
  animation: fp3d-pulse 1.4s infinite ease-in-out;
}
@keyframes fp3d-pulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

.fp3d-entity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 40px;
  min-height: 40px;
  padding: 6px 10px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  user-select: none;
  pointer-events: auto;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.15s ease;
  outline: none;
  box-sizing: border-box;
}
.fp3d-entity-badge:hover {
  transform: translate(-50%, -50%) scale(1.06);
  border-color: rgba(255, 255, 255, 0.35);
}
.fp3d-entity-badge:active {
  transform: translate(-50%, -50%) scale(0.94);
}
.fp3d-entity-badge.active {
  border-color: rgba(56, 189, 248, 0.85);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4), 0 4px 14px rgba(0, 0, 0, 0.4);
}
.fp3d-badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}
.fp3d-badge-state {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: #cbd5e1;
}
`;

/**
 * CSS2D Badge & Room Label Overlay Manager (`src/engine/BadgeOverlayManager.ts`)
 *
 * Coordinates high-performance HTML overlay pills anchored in 3D world space:
 * - Touch-friendly gesture recognizer (short tap <250ms, double tap <260ms, 500ms long press with 8px drag cancellation).
 * - Room labels with temperature/humidity, light count, and live motion pulse.
 * - Entity badges with domain icons, state formatting, and active glow rings.
 * - In-place O(1) DOM updates during state transitions without recreating nodes.
 */
export class BadgeOverlayManager {
  private readonly container: HTMLElement;
  private readonly onAction: (detail: EntityActionDispatchDetail) => void;
  private readonly labelRenderer: CSS2DRenderer;

  private rootGroup: THREE.Group | null = null;
  private roomLabelsGroup = new THREE.Group();
  private entityBadgesGroup = new THREE.Group();

  private showRoomLabels = true;
  private showEntityBadges = true;

  private roomEntries = new Map<string, RoomLabelEntry>();
  private entityEntries = new Map<string, EntityBadgeEntry>();

  constructor(
    container: HTMLElement,
    onAction: (detail: EntityActionDispatchDetail) => void
  ) {
    this.container = container;
    this.onAction = onAction;

    this.labelRenderer = new CSS2DRenderer();
    const el = this.labelRenderer.domElement;
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden';
    el.style.zIndex = '2';

    this.container.appendChild(el);
    this.injectStyles();
  }

  // ---------------------------------------------------------------------------
  // SIZING & VISIBILITY
  // ---------------------------------------------------------------------------

  public setSize(width: number, height: number): void {
    this.labelRenderer.setSize(width, height);
  }

  public setVisibility(options: {
    showRoomLabels?: boolean;
    showEntityBadges?: boolean;
  }): void {
    if (options.showRoomLabels !== undefined) {
      this.showRoomLabels = options.showRoomLabels;
      this.roomLabelsGroup.visible = this.showRoomLabels;
      for (const entry of this.roomEntries.values()) {
        entry.element.style.display = this.showRoomLabels ? 'inline-flex' : 'none';
      }
    }
    if (options.showEntityBadges !== undefined) {
      this.showEntityBadges = options.showEntityBadges;
      this.entityBadgesGroup.visible = this.showEntityBadges;
      for (const entry of this.entityEntries.values()) {
        entry.element.style.display = this.showEntityBadges ? 'inline-flex' : 'none';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // OVERLAY REBUILD & SYNC
  // ---------------------------------------------------------------------------

  /**
   * Cleans up existing overlays and builds new CSS2D objects for rooms and entities.
   */
  public rebuildFloorOverlays(
    floor: FloorLevel,
    roomSummaries: ResolvedRoomSummary[],
    entityStates: Map<string, ResolvedEntityVisualState>
  ): THREE.Group {
    this.disposeCurrentOverlays();

    this.rootGroup = new THREE.Group();
    this.roomLabelsGroup = new THREE.Group();
    this.entityBadgesGroup = new THREE.Group();

    this.roomLabelsGroup.visible = this.showRoomLabels;
    this.entityBadgesGroup.visible = this.showEntityBadges;

    this.rootGroup.add(this.roomLabelsGroup);
    this.rootGroup.add(this.entityBadgesGroup);

    // 1. Build Room Labels
    const summaryMap = new Map<string, ResolvedRoomSummary>();
    for (const s of roomSummaries) {
      summaryMap.set(s.roomId, s);
    }

    for (const room of floor.rooms || []) {
      if (room.show_label === false) continue;
      const summary = summaryMap.get(room.id);
      if (!summary) continue;

      const entry = this.createRoomLabel(room, summary, floor.elevation);
      this.roomEntries.set(room.id, entry);
      this.roomLabelsGroup.add(entry.object);
    }

    // 2. Build Entity Badges
    for (const placement of floor.entities || []) {
      if (placement.badge?.visible === false) continue;
      const visualState = entityStates.get(placement.entity_id);

      const entry = this.createEntityBadge(
        placement,
        visualState,
        floor.elevation
      );
      this.entityEntries.set(placement.id, entry);
      this.entityBadgesGroup.add(entry.object);
    }

    return this.rootGroup;
  }

  /**
   * In-place O(1) DOM updates for live Home Assistant state changes without rebuilding.
   */
  public updateFloorOverlays(
    roomSummaries: ResolvedRoomSummary[],
    entityStates: Map<string, ResolvedEntityVisualState>
  ): void {
    // 1. Update Rooms
    for (const summary of roomSummaries) {
      const entry = this.roomEntries.get(summary.roomId);
      if (!entry) continue;

      entry.summary = summary;
      entry.nameSpan.textContent = summary.name;

      const climate = [summary.temperatureText, summary.humidityText]
        .filter(Boolean)
        .join(' • ');
      entry.climateSpan.textContent = climate;
      entry.climateSpan.style.display = climate ? 'inline' : 'none';

      if (summary.totalLightCount > 0) {
        entry.lightsSpan.textContent = `💡 ${summary.activeLightCount}`;
        entry.lightsSpan.style.display = 'inline';
      } else {
        entry.lightsSpan.style.display = 'none';
      }

      entry.motionDot.style.display = summary.motionDetected
        ? 'inline-block'
        : 'none';
    }

    // 2. Update Entity Badges
    for (const entry of this.entityEntries.values()) {
      const visualState = entityStates.get(entry.entityId);
      if (!visualState) continue;

      entry.visualState = visualState;
      const badgeStyle = entry.placement.badge?.style ?? 'compact_pill';

      if (visualState.isActive) {
        entry.element.classList.add('active');
        const r = Math.round(visualState.rgb[0] * 255);
        const g = Math.round(visualState.rgb[1] * 255);
        const b = Math.round(visualState.rgb[2] * 255);
        entry.element.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
        entry.element.style.boxShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.45), 0 4px 14px rgba(0, 0, 0, 0.4)`;
      } else {
        entry.element.classList.remove('active');
        entry.element.style.borderColor = 'rgba(255, 255, 255, 0.16)';
        entry.element.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
      }

      const icon = BadgeOverlayManager.resolveDomainIcon(
        entry.placement.domain,
        visualState.state,
        visualState.icon || entry.placement.badge?.icon_override
      );
      entry.iconSpan.textContent = icon;

      if (entry.stateSpan && badgeStyle !== 'icon_only') {
        entry.stateSpan.textContent = visualState.formattedState;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER & DISPOSAL
  // ---------------------------------------------------------------------------

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.labelRenderer.render(scene, camera);
  }

  public dispose(): void {
    this.disposeCurrentOverlays();
    if (this.labelRenderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.labelRenderer.domElement);
    }
    const styleEl = this.getRootNode().getElementById(BADGE_STYLES_ID);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  private disposeCurrentOverlays(): void {
    for (const entry of this.roomEntries.values()) {
      entry.dispose();
      this.roomLabelsGroup.remove(entry.object);
    }
    this.roomEntries.clear();

    for (const entry of this.entityEntries.values()) {
      entry.dispose();
      this.entityBadgesGroup.remove(entry.object);
    }
    this.entityEntries.clear();

    if (this.rootGroup) {
      this.rootGroup.remove(this.roomLabelsGroup);
      this.rootGroup.remove(this.entityBadgesGroup);
      this.rootGroup = null;
    }
  }

  // ---------------------------------------------------------------------------
  // DOM ELEMENT BUILDERS & GESTURE RECOGNIZERS
  // ---------------------------------------------------------------------------

  private createRoomLabel(
    room: RoomPolygon,
    summary: ResolvedRoomSummary,
    floorElevation: number
  ): RoomLabelEntry {
    const el = document.createElement('div');
    el.className = 'fp3d-room-label';
    if (!this.showRoomLabels) {
      el.style.display = 'none';
    }

    const motionDot = document.createElement('span');
    motionDot.className = 'fp3d-motion-dot';
    motionDot.style.display = summary.motionDetected ? 'inline-block' : 'none';
    el.appendChild(motionDot);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'fp3d-room-name';
    nameSpan.textContent = summary.name;
    el.appendChild(nameSpan);

    const climateSpan = document.createElement('span');
    climateSpan.className = 'fp3d-room-climate';
    const climate = [summary.temperatureText, summary.humidityText]
      .filter(Boolean)
      .join(' • ');
    climateSpan.textContent = climate;
    climateSpan.style.display = climate ? 'inline' : 'none';
    el.appendChild(climateSpan);

    const lightsSpan = document.createElement('span');
    lightsSpan.className = 'fp3d-room-lights';
    if (summary.totalLightCount > 0) {
      lightsSpan.textContent = `💡 ${summary.activeLightCount}`;
      lightsSpan.style.display = 'inline';
    } else {
      lightsSpan.style.display = 'none';
    }
    el.appendChild(lightsSpan);

    // Gestures
    const cleanupGestures = this.attachGestureRecognizer(el, (trigger) => {
      this.onAction({
        room,
        trigger,
        actionConfig: room.room_tap_action || { action: 'toggle' }
      });
    });

    const object = new CSS2DObject(el);
    object.position.set(
      summary.labelPosition2D.x,
      floorElevation + 0.08,
      summary.labelPosition2D.y
    );

    return {
      roomId: room.id,
      room,
      summary,
      element: el,
      motionDot,
      nameSpan,
      climateSpan,
      lightsSpan,
      object,
      dispose: cleanupGestures
    };
  }

  private createEntityBadge(
    placement: EntityPlacement,
    visualState: ResolvedEntityVisualState | undefined,
    floorElevation: number
  ): EntityBadgeEntry {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'fp3d-entity-badge';
    el.setAttribute('data-entity-id', placement.entity_id);
    if (!this.showEntityBadges) {
      el.style.display = 'none';
    }

    const badgeStyle = placement.badge?.style ?? 'compact_pill';
    const isActive = visualState?.isActive ?? false;

    if (isActive) {
      el.classList.add('active');
      if (visualState) {
        const r = Math.round(visualState.rgb[0] * 255);
        const g = Math.round(visualState.rgb[1] * 255);
        const b = Math.round(visualState.rgb[2] * 255);
        el.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
        el.style.boxShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.45), 0 4px 14px rgba(0, 0, 0, 0.4)`;
      }
    }

    const iconSpan = document.createElement('span');
    iconSpan.className = 'fp3d-badge-icon';
    iconSpan.textContent = BadgeOverlayManager.resolveDomainIcon(
      placement.domain,
      visualState?.state,
      visualState?.icon || placement.badge?.icon_override
    );
    el.appendChild(iconSpan);

    let stateSpan: HTMLElement | undefined;
    if (badgeStyle !== 'icon_only') {
      stateSpan = document.createElement('span');
      stateSpan.className = 'fp3d-badge-state';
      stateSpan.textContent =
        visualState?.formattedState || visualState?.state || '';
      el.appendChild(stateSpan);
    }

    // Gestures
    const cleanupGestures = this.attachGestureRecognizer(el, (trigger) => {
      let actionConfig: ActionConfig;
      switch (trigger) {
        case 'double_tap':
          actionConfig = placement.double_tap_action || { action: 'none' };
          break;
        case 'hold':
          actionConfig = placement.hold_action || { action: 'more-info' };
          break;
        case 'tap':
        default:
          actionConfig = placement.tap_action || { action: 'toggle' };
          break;
      }

      this.onAction({
        entityId: placement.entity_id,
        placement,
        trigger,
        actionConfig
      });
    });

    const object = new CSS2DObject(el);
    object.position.set(
      placement.x,
      floorElevation + placement.z_elevation + 0.25,
      placement.y
    );

    return {
      placementId: placement.id,
      entityId: placement.entity_id,
      placement,
      visualState,
      element: el,
      iconSpan,
      stateSpan,
      object,
      dispose: cleanupGestures
    };
  }

  /**
   * Attaches touch-friendly gesture recognizer:
   * - Short tap (<250ms, pointer drag <8px)
   * - Double tap (<260ms interval between short taps)
   * - 500ms hold (cancelled if dragged >8px)
   */
  private attachGestureRecognizer(
    element: HTMLElement,
    onTrigger: (trigger: 'tap' | 'double_tap' | 'hold') => void
  ): () => void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isDragged = false;
    let isHeld = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTapTime = 0;

    const onPointerDown = (e: PointerEvent): void => {
      // Prevent Three.js OrbitControls from catching the pointer down on badges
      e.stopPropagation();

      startX = e.clientX;
      startY = e.clientY;
      startTime = performance.now();
      isDragged = false;
      isHeld = false;

      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      holdTimer = setTimeout(() => {
        if (!isDragged) {
          isHeld = true;
          onTrigger('hold');
        }
      }, 500);
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (isDragged) return;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 8) {
        isDragged = true;
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
      }
    };

    const onPointerUp = (e: PointerEvent): void => {
      e.stopPropagation();

      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }

      if (isDragged || isHeld) return;

      const duration = performance.now() - startTime;
      if (duration < 250) {
        const now = performance.now();
        if (now - lastTapTime < 260) {
          // Double-tap detected
          if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
          lastTapTime = 0;
          onTrigger('double_tap');
        } else {
          lastTapTime = now;
          tapTimer = setTimeout(() => {
            lastTapTime = 0;
            tapTimer = null;
            onTrigger('tap');
          }, 260);
        }
      }
    };

    const onPointerCancel = (): void => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      isDragged = true;
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerCancel);

    return () => {
      if (holdTimer) clearTimeout(holdTimer);
      if (tapTimer) clearTimeout(tapTimer);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private getRootNode(): Document | ShadowRoot {
    const root = this.container.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      return root;
    }
    return document;
  }

  private injectStyles(): void {
    const root = this.getRootNode();
    if (root.getElementById(BADGE_STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = BADGE_STYLES_ID;
    style.textContent = BADGE_CSS;

    if (root instanceof ShadowRoot) {
      root.appendChild(style);
    } else {
      document.head.appendChild(style);
    }
  }

  public static resolveDomainIcon(
    domain: string,
    state?: string,
    customIcon?: string | null
  ): string {
    if (customIcon) {
      const lower = customIcon.toLowerCase();
      if (lower.includes('light')) return '💡';
      if (lower.includes('fan')) return '💨';
      if (lower.includes('therm')) return '🌡️';
      if (lower.includes('power') || lower.includes('switch')) return '🔌';
      if (lower.includes('lock')) return state === 'unlocked' ? '🔓' : '🔒';
      if (lower.includes('door')) return '🚪';
      if (lower.includes('window')) return '🪟';
      if (lower.includes('motion')) return '🚶';
      if (lower.includes('tv') || lower.includes('cast')) return '📺';
    }

    switch (domain) {
      case 'light':
        return '💡';
      case 'switch':
        return '🔌';
      case 'fan':
        return '💨';
      case 'climate':
        return '🌡️';
      case 'media_player':
        return state === 'playing' ? '▶️' : '📺';
      case 'cover':
        return '🪟';
      case 'lock':
        return state === 'unlocked' ? '🔓' : '🔒';
      case 'binary_sensor':
        return '🚪';
      case 'sensor':
        return '📊';
      case 'camera':
        return '📷';
      case 'vacuum':
        return '🤖';
      case 'alarm_control_panel':
        return '🛡️';
      case 'button':
        return '🔘';
      default:
        return '⚡';
    }
  }
}
