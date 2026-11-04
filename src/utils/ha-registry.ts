import type {
  EntityPlacement,
  FloorLevel,
  FloorplanDocument,
  Point2D,
  RoomPolygon,
  WallOpening
} from '../types/floorplan';
import type { HomeAssistant, HassEntity } from '../types/ha';
import type {
  EntityActionDispatchDetail,
  ResolvedEntityVisualState,
  ResolvedLightState,
  ResolvedRoomSummary
} from '../engine/contracts';
import { extractEntityLightColorAndBrightness } from './color';

/**
 * Resolves the area_id for an entity using Home Assistant's entity and device registries.
 */
export function resolveEntityAreaId(
  entityId: string,
  hass?: HomeAssistant
): string | null {
  if (!hass) return null;

  // 1. Check entity registry entry directly
  const entityEntry = hass.entities?.[entityId];
  if (entityEntry?.area_id) {
    return entityEntry.area_id;
  }

  // 2. Check device registry if entity is linked to a device
  const deviceId = entityEntry?.device_id;
  if (deviceId && hass.devices?.[deviceId]?.area_id) {
    return hass.devices[deviceId].area_id;
  }

  // 3. Fallback to state attributes if present in non-standard or mock states
  const stateObj = hass.states?.[entityId];
  if (stateObj) {
    const raw = stateObj as unknown as Record<string, unknown>;
    if (typeof raw.area_id === 'string') {
      return raw.area_id;
    }
    if (typeof stateObj.attributes?.area_id === 'string') {
      return stateObj.attributes.area_id as string;
    }
  }

  return null;
}

/**
 * Returns all HassEntity objects in hass.states whose resolved area matches areaId.
 * Optionally filtered by domains (e.g. ['light', 'sensor']).
 */
export function getEntitiesForArea(
  areaId: string,
  hass?: HomeAssistant,
  domains?: string[]
): HassEntity[] {
  if (!hass?.states || !areaId) return [];
  const results: HassEntity[] = [];
  const domainSet = domains && domains.length > 0 ? new Set(domains) : null;

  for (const [entityId, entity] of Object.entries(hass.states)) {
    if (domainSet) {
      const domain = entityId.split('.')[0];
      if (!domainSet.has(domain)) {
        continue;
      }
    }

    const resolvedArea = resolveEntityAreaId(entityId, hass);
    if (resolvedArea === areaId) {
      results.push(entity);
    }
  }

  return results;
}

interface EntitySnapshot {
  entityRef: HassEntity;
  state: string;
  brightness?: number;
  rgbColor: string;
  hsColor: string;
  colorTempKelvin?: number;
  percentage?: number;
  currentTemperature?: number;
  temperature?: number;
  elevation?: number;
}

/**
 * O(1) Watched-Entity Differ.
 * Inspects strictly the Set of entity IDs referenced by the active floorplan
 * and its bound Home Assistant areas.
 */
export class WatchedEntityDiffer {
  private watchedIds = new Set<string>();
  private cache = new Map<string, EntitySnapshot>();

  /**
   * Rebuilds the watched set of entities from a FloorplanDocument.
   * If hass is supplied, initializes the state cache so subsequent diffs report changes.
   */
  rebuildWatchedSet(
    doc: FloorplanDocument,
    hass?: HomeAssistant
  ): ReadonlySet<string> {
    this.watchedIds.clear();

    for (const floor of doc.floors || []) {
      for (const placement of floor.entities || []) {
        if (placement.entity_id) {
          this.watchedIds.add(placement.entity_id);
        }
      }

      for (const opening of floor.openings || []) {
        if (opening.bound_entity_id) {
          this.watchedIds.add(opening.bound_entity_id);
        }
      }

      for (const room of floor.rooms || []) {
        if (room.temp_entity_id) this.watchedIds.add(room.temp_entity_id);
        if (room.humidity_entity_id) this.watchedIds.add(room.humidity_entity_id);
        if (room.motion_entity_id) this.watchedIds.add(room.motion_entity_id);

        if (room.ha_area_id && hass) {
          const areaEntities = getEntitiesForArea(room.ha_area_id, hass, [
            'light',
            'sensor',
            'binary_sensor'
          ]);
          for (const ent of areaEntities) {
            this.watchedIds.add(ent.entity_id);
          }
        }
      }
    }

    if (doc.ambient_config?.sun_entity_id) {
      this.watchedIds.add(doc.ambient_config.sun_entity_id);
    }

    // Seed cache snapshot if hass is provided
    this.cache.clear();
    if (hass?.states) {
      for (const id of this.watchedIds) {
        const entity = hass.states[id];
        if (entity) {
          this.cache.set(id, this.createSnapshot(entity));
        }
      }
    }

    return this.watchedIds;
  }

  getWatchedEntityIds(): ReadonlySet<string> {
    return this.watchedIds;
  }

  /**
   * Diff current hass.states against cached snapshot.
   * Loops strictly over this.watchedIds (O(1) relative to total smart home size).
   * Returns array of changed entity_ids and updates internal cache.
   */
  diffStates(hass?: HomeAssistant): string[] {
    const changedIds: string[] = [];
    if (!hass?.states) {
      return changedIds;
    }

    for (const id of this.watchedIds) {
      const current = hass.states[id];
      const prev = this.cache.get(id);

      if (!prev && current) {
        changedIds.push(id);
        this.cache.set(id, this.createSnapshot(current));
      } else if (prev && !current) {
        changedIds.push(id);
        this.cache.delete(id);
      } else if (prev && current) {
        if (this.hasEntityChanged(prev, current)) {
          changedIds.push(id);
          this.cache.set(id, this.createSnapshot(current));
        }
      }
    }

    return changedIds;
  }

  reset(): void {
    this.watchedIds.clear();
    this.cache.clear();
  }

  private hasEntityChanged(prev: EntitySnapshot, current: HassEntity): boolean {
    if (prev.state !== current.state) return true;

    const attrs = current.attributes || {};
    if (prev.brightness !== attrs.brightness) return true;

    const rgbStr = attrs.rgb_color ? attrs.rgb_color.join(',') : '';
    if (prev.rgbColor !== rgbStr) return true;

    const hsStr = attrs.hs_color ? attrs.hs_color.join(',') : '';
    if (prev.hsColor !== hsStr) return true;

    if (prev.colorTempKelvin !== attrs.color_temp_kelvin) return true;
    if (prev.percentage !== attrs.percentage) return true;
    if (prev.currentTemperature !== attrs.current_temperature) return true;
    if (prev.temperature !== attrs.temperature) return true;
    if (prev.elevation !== attrs.elevation) return true;

    return false;
  }

  private createSnapshot(entity: HassEntity): EntitySnapshot {
    const attrs = entity.attributes || {};
    return {
      entityRef: entity,
      state: entity.state,
      brightness: attrs.brightness,
      rgbColor: attrs.rgb_color ? attrs.rgb_color.join(',') : '',
      hsColor: attrs.hs_color ? attrs.hs_color.join(',') : '',
      colorTempKelvin: attrs.color_temp_kelvin,
      percentage: attrs.percentage,
      currentTemperature: attrs.current_temperature,
      temperature: attrs.temperature,
      elevation: attrs.elevation
    };
  }
}

/**
 * Resolves 3D light runtime state from an EntityPlacement and HomeAssistant.
 */
export function resolveLightState(
  placement: EntityPlacement,
  hass?: HomeAssistant
): ResolvedLightState | null {
  if (placement.domain !== 'light' && !placement.light_config) {
    return null;
  }

  const entity = hass?.states?.[placement.entity_id];
  const lightData = extractEntityLightColorAndBrightness(entity);

  const kind = placement.light_config?.kind ?? 'point';
  const radiusM = placement.light_config?.radius_m ?? 4.5;
  const intensityMultiplier = placement.light_config?.intensity_multiplier ?? 1.0;
  const castRealPointLight = placement.light_config?.cast_real_point_light ?? true;
  const stripPoints = placement.light_config?.strip_points;

  return {
    placementId: placement.id,
    entityId: placement.entity_id,
    isOn: lightData.isOn,
    rgb: lightData.rgb,
    hexColor: lightData.hexColor,
    brightness: lightData.brightness,
    x: placement.x,
    y: placement.y,
    zElevation: placement.z_elevation,
    radiusM,
    intensityMultiplier,
    kind,
    stripPoints,
    castRealPointLight
  };
}

/**
 * Resolves high-level visual state for entity meshes and 2D/3D badge overlays.
 */
export function resolveEntityVisualState(
  placement: EntityPlacement,
  hass?: HomeAssistant
): ResolvedEntityVisualState {
  const entityId = placement.entity_id;
  const domain = placement.domain || entityId.split('.')[0] || 'sensor';
  const entity = hass?.states?.[entityId];
  const state = entity ? entity.state : 'unavailable';

  let isActive = false;
  if (domain === 'light' || domain === 'switch' || domain === 'input_boolean' || domain === 'fan') {
    isActive = state === 'on';
  } else if (domain === 'binary_sensor') {
    isActive = state === 'on';
  } else if (domain === 'media_player') {
    isActive = state === 'playing';
  } else if (domain === 'climate') {
    isActive = state !== 'off' && state !== 'unavailable';
  } else {
    isActive = state !== 'off' && state !== 'unavailable' && state !== 'idle';
  }

  const friendlyName =
    placement.badge?.label_override ||
    entity?.attributes.friendly_name ||
    entityId;
  const icon = placement.badge?.icon_override || entity?.attributes.icon;
  const unit = entity?.attributes.unit_of_measurement;

  let formattedState = state;
  if (domain === 'light' && state === 'on') {
    const bri = entity?.attributes.brightness;
    if (typeof bri === 'number') {
      formattedState = `${Math.round((bri / 255) * 100)}%`;
    }
  } else if (domain === 'climate') {
    const curTemp =
      entity?.attributes.current_temperature ?? entity?.attributes.temperature;
    if (curTemp !== undefined) {
      formattedState = `${curTemp}${unit ?? '°C'}`;
    }
  } else if (unit && state !== 'unavailable' && state !== 'unknown') {
    formattedState = `${state} ${unit}`;
  }

  let rgb: [number, number, number] = [0.8, 0.8, 0.8];
  let brightness = 0;

  if (domain === 'light') {
    const lightData = extractEntityLightColorAndBrightness(entity);
    rgb = lightData.rgb;
    brightness = lightData.brightness;
  } else if (isActive) {
    rgb = [0.2, 0.6, 1.0];
    brightness = 1.0;
  } else {
    rgb = [0.4, 0.4, 0.4];
    brightness = 0;
  }

  const fanPercentage =
    typeof entity?.attributes.percentage === 'number'
      ? entity.attributes.percentage
      : domain === 'fan' && state === 'on'
        ? 100
        : 0;

  const mediaPlaying = domain === 'media_player' && state === 'playing';
  const mediaPictureUrl = entity?.attributes.entity_picture;

  return {
    placementId: placement.id,
    entityId,
    domain,
    state,
    isActive,
    friendlyName,
    formattedState,
    unit,
    icon,
    rgb,
    brightness,
    fanPercentage,
    mediaPlaying,
    mediaPictureUrl
  };
}

/**
 * Resolves Room summary metrics (Area sq.m, Temperature, Humidity, Light counts, Motion).
 */
export function resolveRoomSummary(
  room: RoomPolygon,
  floor: FloorLevel,
  hass?: HomeAssistant,
  labelCenter2D?: Point2D
): ResolvedRoomSummary {
  // Label position
  let labelPosition2D: Point2D;
  if (labelCenter2D) {
    labelPosition2D = { x: labelCenter2D.x, y: labelCenter2D.y };
  } else if (room.points && room.points.length > 0) {
    let sumX = 0;
    let sumY = 0;
    for (const p of room.points) {
      sumX += p.x;
      sumY += p.y;
    }
    labelPosition2D = {
      x: sumX / room.points.length,
      y: sumY / room.points.length
    };
  } else {
    labelPosition2D = { x: 0, y: 0 };
  }

  // Area calculation via Shoelace formula
  let areaSqM = 0;
  const pts = room.points || [];
  const n = pts.length;
  if (n >= 3) {
    let cross = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      cross += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    areaSqM = Math.round((Math.abs(cross) / 2) * 10) / 10;
  }

  // Temperature
  let temperatureText: string | null = null;
  if (room.temp_entity_id && hass?.states?.[room.temp_entity_id]) {
    const e = hass.states[room.temp_entity_id];
    temperatureText = `${e.state}${e.attributes.unit_of_measurement ?? '°C'}`;
  } else if (room.ha_area_id && hass?.states) {
    const areaMeta = hass.areas?.[room.ha_area_id];
    if (areaMeta?.temperature_entity_id && hass.states[areaMeta.temperature_entity_id]) {
      const e = hass.states[areaMeta.temperature_entity_id];
      temperatureText = `${e.state}${e.attributes.unit_of_measurement ?? '°C'}`;
    } else {
      const areaSensors = getEntitiesForArea(room.ha_area_id, hass, ['sensor', 'climate']);
      const tempEnt = areaSensors.find(
        (s) =>
          s.attributes.device_class === 'temperature' ||
          s.entity_id.includes('temperature') ||
          s.entity_id.startsWith('climate.')
      );
      if (tempEnt) {
        const val =
          tempEnt.attributes.current_temperature ?? tempEnt.state;
        temperatureText = `${val}${tempEnt.attributes.unit_of_measurement ?? '°C'}`;
      }
    }
  }

  // Humidity
  let humidityText: string | null = null;
  if (room.humidity_entity_id && hass?.states?.[room.humidity_entity_id]) {
    const e = hass.states[room.humidity_entity_id];
    humidityText = `${e.state}${e.attributes.unit_of_measurement ?? '%'}`;
  } else if (room.ha_area_id && hass?.states) {
    const areaMeta = hass.areas?.[room.ha_area_id];
    if (areaMeta?.humidity_entity_id && hass.states[areaMeta.humidity_entity_id]) {
      const e = hass.states[areaMeta.humidity_entity_id];
      humidityText = `${e.state}${e.attributes.unit_of_measurement ?? '%'}`;
    } else {
      const areaSensors = getEntitiesForArea(room.ha_area_id, hass, ['sensor']);
      const humEnt = areaSensors.find(
        (s) =>
          s.attributes.device_class === 'humidity' ||
          s.entity_id.includes('humidity')
      );
      if (humEnt) {
        humidityText = `${humEnt.state}${humEnt.attributes.unit_of_measurement ?? '%'}`;
      }
    }
  }

  // Light counts (placed in room + bound area lights)
  const roomLightIds = new Set<string>();
  for (const p of floor.entities || []) {
    if (p.room_id === room.id && (p.domain === 'light' || p.light_config)) {
      roomLightIds.add(p.entity_id);
    }
  }
  if (room.ha_area_id && hass) {
    const areaLights = getEntitiesForArea(room.ha_area_id, hass, ['light']);
    for (const l of areaLights) {
      roomLightIds.add(l.entity_id);
    }
  }

  const totalLightCount = roomLightIds.size;
  let activeLightCount = 0;
  for (const lid of roomLightIds) {
    if (hass?.states?.[lid]?.state === 'on') {
      activeLightCount++;
    }
  }

  // Motion detection
  let motionDetected = false;
  if (room.motion_entity_id && hass?.states?.[room.motion_entity_id]) {
    motionDetected = hass.states[room.motion_entity_id].state === 'on';
  } else if (room.ha_area_id && hass) {
    const areaBinarySensors = getEntitiesForArea(room.ha_area_id, hass, ['binary_sensor']);
    const motionEnt = areaBinarySensors.find(
      (s) =>
        (s.attributes.device_class === 'motion' ||
          s.attributes.device_class === 'occupancy') &&
        s.state === 'on'
    );
    if (motionEnt) {
      motionDetected = true;
    }
  }

  return {
    roomId: room.id,
    name: room.name,
    areaId: room.ha_area_id,
    labelPosition2D,
    areaSqM,
    temperatureText,
    humidityText,
    activeLightCount,
    totalLightCount,
    motionDetected
  };
}

/**
 * Returns true if an opening has a bound door/window binary_sensor that is open.
 */
export function isOpeningContactOpen(
  opening: WallOpening,
  hass?: HomeAssistant
): boolean {
  if (!opening.bound_entity_id || !hass?.states) return false;
  const state = hass.states[opening.bound_entity_id]?.state;
  return state === 'on' || state === 'open';
}

/**
 * Dispatches or executes an action configured on a 3D floorplan entity or room.
 */
export function executeHassAction(
  element: HTMLElement,
  hass: HomeAssistant | undefined,
  detail: EntityActionDispatchDetail
): void {
  const { actionConfig, entityId: explicitEntityId, placement, room } = detail;
  const targetEntityId = explicitEntityId ?? placement?.entity_id;
  const action = actionConfig?.action || 'default';

  if (action === 'none') {
    return;
  }

  if (action === 'zoom-room') {
    element.dispatchEvent(
      new CustomEvent('floorplan-zoom-room', {
        bubbles: true,
        composed: true,
        detail: { roomId: room?.id, room }
      })
    );
    return;
  }

  if (action === 'navigate') {
    if (actionConfig.navigation_path) {
      window.history.pushState(null, '', actionConfig.navigation_path);
      window.dispatchEvent(
        new CustomEvent('location-changed', { bubbles: true, composed: true })
      );
    }
    return;
  }

  if (action === 'more-info') {
    if (targetEntityId) {
      element.dispatchEvent(
        new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: targetEntityId }
        })
      );
    }
    return;
  }

  if (action === 'call-service') {
    if (actionConfig.service && hass) {
      const parts = actionConfig.service.split('.');
      const domain = parts[0];
      const service = parts.slice(1).join('.');
      hass.callService(
        domain,
        service,
        actionConfig.service_data,
        actionConfig.target
      );
    }
    return;
  }

  if (action === 'toggle') {
    if (room && !targetEntityId) {
      toggleRoomLights(room, hass);
      return;
    }
    if (targetEntityId && hass) {
      const domain = targetEntityId.split('.')[0];
      hass.callService(domain, 'toggle', {}, { entity_id: targetEntityId });
      return;
    }
  }

  if (action === 'default') {
    if (room && !targetEntityId) {
      toggleRoomLights(room, hass);
      return;
    }
    if (targetEntityId && hass) {
      const domain = targetEntityId.split('.')[0];
      if (['light', 'switch', 'input_boolean', 'fan'].includes(domain)) {
        hass.callService(domain, 'toggle', {}, { entity_id: targetEntityId });
      } else {
        element.dispatchEvent(
          new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: targetEntityId }
          })
        );
      }
    }
  }
}

function toggleRoomLights(room: RoomPolygon, hass?: HomeAssistant): void {
  if (!hass) return;
  if (room.ha_area_id) {
    hass.callService('light', 'toggle', {}, { area_id: room.ha_area_id });
  } else if (hass.states) {
    // If no area_id bound, find all lights belonging to room's entities if possible
    const lightIds = Object.keys(hass.states).filter(
      (id) => id.startsWith('light.') && resolveEntityAreaId(id, hass) === room.ha_area_id
    );
    if (lightIds.length > 0) {
      hass.callService('light', 'toggle', {}, { entity_id: lightIds });
    }
  }
}
