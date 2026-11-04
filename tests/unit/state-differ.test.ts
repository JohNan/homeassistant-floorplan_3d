import { describe, expect, it, vi } from 'vitest';
import {
  extractEntityLightColorAndBrightness,
  hexToNormalizedRgb,
  hsToRgb,
  kelvinToRgb,
  lerpRgb,
  miredsToKelvin,
  normalizedRgbToHex,
  rgbToHex
} from '../../src/utils/color';
import {
  executeHassAction,
  getEntitiesForArea,
  isOpeningContactOpen,
  resolveEntityAreaId,
  resolveEntityVisualState,
  resolveLightState,
  resolveRoomSummary,
  WatchedEntityDiffer
} from '../../src/utils/ha-registry';
import type {
  FloorLevel,
  FloorplanDocument,
  RoomPolygon,
  WallOpening
} from '../../src/types/floorplan';
import { createDefaultFloorplanDocument } from '../../src/types/floorplan';
import type { HassEntity, HomeAssistant } from '../../src/types/ha';

describe('Color Math (src/utils/color.ts)', () => {
  it('kelvinToRgb converts temperature with Tanner Helland algorithm and clamps to [1500, 10000]', () => {
    // 2700K (Warm White)
    const warm = kelvinToRgb(2700);
    expect(warm[0]).toBe(255);
    expect(warm[1]).toBeGreaterThan(150);
    expect(warm[1]).toBeLessThan(190);
    expect(warm[2]).toBeGreaterThan(70);
    expect(warm[2]).toBeLessThan(120);

    // 6500K (Daylight)
    const daylight = kelvinToRgb(6500);
    expect(daylight[0]).toBe(255);
    expect(daylight[1]).toBeGreaterThanOrEqual(250);
    expect(daylight[2]).toBeGreaterThanOrEqual(245);

    // Clamping: < 1500 matches 1500
    const clampedLow = kelvinToRgb(1000);
    const low1500 = kelvinToRgb(1500);
    expect(clampedLow).toEqual(low1500);

    // Clamping: > 10000 matches 10000
    const clampedHigh = kelvinToRgb(15000);
    const high10000 = kelvinToRgb(10000);
    expect(clampedHigh).toEqual(high10000);
  });

  it('miredsToKelvin converts correctly with division safeguards', () => {
    expect(miredsToKelvin(200)).toBe(5000);
    expect(miredsToKelvin(500)).toBe(2000);
    expect(miredsToKelvin(0)).toBe(1_000_000);
  });

  it('hsToRgb converts hue and saturation (V=100%) to RGB [0..255]', () => {
    // Red: 0°, 100%
    expect(hsToRgb(0, 100)).toEqual([255, 0, 0]);

    // Green: 120°, 100%
    expect(hsToRgb(120, 100)).toEqual([0, 255, 0]);

    // Blue: 240°, 100%
    expect(hsToRgb(240, 100)).toEqual([0, 0, 255]);

    // Yellow: 60°, 100%
    expect(hsToRgb(60, 100)).toEqual([255, 255, 0]);

    // Saturation 0% -> White [255, 255, 255]
    expect(hsToRgb(0, 0)).toEqual([255, 255, 255]);
  });

  it('hexToNormalizedRgb parses #rgb and #rrggbb to [0..1]', () => {
    expect(hexToNormalizedRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToNormalizedRgb('#00ff00')).toEqual([0, 1, 0]);
    expect(hexToNormalizedRgb('#0000ff')).toEqual([0, 0, 1]);
    expect(hexToNormalizedRgb('#fff')).toEqual([1, 1, 1]);
    expect(hexToNormalizedRgb('000000')).toEqual([0, 0, 0]);
    expect(hexToNormalizedRgb('invalid')).toEqual([1, 1, 1]);
  });

  it('rgbToHex and normalizedRgbToHex convert to lowercase #rrggbb', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 128)).toBe('#00ff80');
    expect(normalizedRgbToHex([1, 0, 0])).toBe('#ff0000');
    expect(normalizedRgbToHex([0, 0.5, 1])).toBe('#0080ff');
  });

  it('lerpRgb linearly interpolates color vectors', () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [1, 1, 1];
    expect(lerpRgb(a, b, 0)).toEqual([0, 0, 0]);
    expect(lerpRgb(a, b, 1)).toEqual([1, 1, 1]);
    expect(lerpRgb(a, b, 0.5)).toEqual([0.5, 0.5, 0.5]);
  });

  it('extractEntityLightColorAndBrightness extracts properties with correct priorities', () => {
    // When entity is undefined or off
    expect(extractEntityLightColorAndBrightness(undefined)).toEqual({
      isOn: false,
      rgb: [1, 0.72, 0.3],
      hexColor: '#ffb74d',
      brightness: 0
    });

    const offLight: HassEntity = {
      entity_id: 'light.desk',
      state: 'off',
      attributes: { brightness: 255 },
      last_changed: '',
      last_updated: '',
      context: { id: '1', parent_id: null, user_id: null }
    };
    expect(extractEntityLightColorAndBrightness(offLight).isOn).toBe(false);

    // When entity is ON with rgb_color
    const rgbLight: HassEntity = {
      entity_id: 'light.living_room',
      state: 'on',
      attributes: {
        brightness: 255,
        rgb_color: [255, 0, 0]
      },
      last_changed: '',
      last_updated: '',
      context: { id: '1', parent_id: null, user_id: null }
    };
    const rgbRes = extractEntityLightColorAndBrightness(rgbLight);
    expect(rgbRes.isOn).toBe(true);
    expect(rgbRes.rgb).toEqual([1, 0, 0]);
    expect(rgbRes.hexColor).toBe('#ff0000');
    expect(rgbRes.brightness).toBe(1.0);

    // When entity is ON with hs_color
    const hsLight: HassEntity = {
      entity_id: 'light.strip',
      state: 'on',
      attributes: {
        brightness: 128,
        hs_color: [120, 100]
      },
      last_changed: '',
      last_updated: '',
      context: { id: '1', parent_id: null, user_id: null }
    };
    const hsRes = extractEntityLightColorAndBrightness(hsLight);
    expect(hsRes.isOn).toBe(true);
    expect(hsRes.rgb).toEqual([0, 1, 0]);
    expect(hsRes.hexColor).toBe('#00ff00');
    expect(hsRes.brightness).toBeCloseTo(128 / 255, 2);

    // When entity is ON with color_temp_kelvin
    const kelvinLight: HassEntity = {
      entity_id: 'light.bulb',
      state: 'on',
      attributes: {
        color_temp_kelvin: 3000
      },
      last_changed: '',
      last_updated: '',
      context: { id: '1', parent_id: null, user_id: null }
    };
    const kelvinRes = extractEntityLightColorAndBrightness(kelvinLight);
    expect(kelvinRes.isOn).toBe(true);
    expect(kelvinRes.brightness).toBe(1.0);

    // Fallback to default warm white #ffb74d
    const noColorLight: HassEntity = {
      entity_id: 'light.simple',
      state: 'on',
      attributes: {},
      last_changed: '',
      last_updated: '',
      context: { id: '1', parent_id: null, user_id: null }
    };
    const noColorRes = extractEntityLightColorAndBrightness(noColorLight);
    expect(noColorRes.hexColor).toBe('#ffb74d');
  });
});

describe('HA Registry & Area Resolution (src/utils/ha-registry.ts)', () => {
  const mockHass: HomeAssistant = {
    states: {
      'light.living_room': {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: { brightness: 255 },
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null }
      },
      'sensor.living_room_temp': {
        entity_id: 'sensor.living_room_temp',
        state: '21.5',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null }
      },
      'binary_sensor.living_room_motion': {
        entity_id: 'binary_sensor.living_room_motion',
        state: 'on',
        attributes: { device_class: 'motion' },
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null }
      },
      'light.kitchen_strip': {
        entity_id: 'light.kitchen_strip',
        state: 'off',
        attributes: {},
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null }
      }
    },
    entities: {
      'light.living_room': {
        entity_id: 'light.living_room',
        area_id: 'living_room'
      },
      'sensor.living_room_temp': {
        entity_id: 'sensor.living_room_temp',
        device_id: 'dev_temp_1'
      },
      'binary_sensor.living_room_motion': {
        entity_id: 'binary_sensor.living_room_motion',
        area_id: 'living_room'
      },
      'light.kitchen_strip': {
        entity_id: 'light.kitchen_strip',
        area_id: 'kitchen'
      }
    },
    devices: {
      dev_temp_1: {
        id: 'dev_temp_1',
        area_id: 'living_room',
        name: 'Temp Sensor Device',
        name_by_user: null
      }
    },
    areas: {
      living_room: {
        area_id: 'living_room',
        name: 'Living Room',
        floor_id: 'ground_floor',
        icon: null,
        picture: null,
        aliases: []
      }
    },
    language: 'en',
    connection: {
      subscribeMessage: vi.fn(),
      sendMessagePromise: vi.fn()
    },
    callService: vi.fn().mockResolvedValue(true),
    callWS: vi.fn()
  };

  it('resolveEntityAreaId resolves via entity_registry and device_registry fallback', () => {
    expect(resolveEntityAreaId('light.living_room', mockHass)).toBe('living_room');
    // via device_id -> device.area_id
    expect(resolveEntityAreaId('sensor.living_room_temp', mockHass)).toBe('living_room');
    expect(resolveEntityAreaId('light.kitchen_strip', mockHass)).toBe('kitchen');
    expect(resolveEntityAreaId('non.existent', mockHass)).toBeNull();
  });

  it('getEntitiesForArea filters entities by resolved area and domains', () => {
    const allLivingRoom = getEntitiesForArea('living_room', mockHass);
    expect(allLivingRoom.length).toBe(3);

    const lightsOnly = getEntitiesForArea('living_room', mockHass, ['light']);
    expect(lightsOnly.length).toBe(1);
    expect(lightsOnly[0].entity_id).toBe('light.living_room');

    const sensorsOnly = getEntitiesForArea('living_room', mockHass, ['sensor', 'binary_sensor']);
    expect(sensorsOnly.length).toBe(2);
  });
});

describe('WatchedEntityDiffer (src/utils/ha-registry.ts)', () => {
  it('rebuildWatchedSet populates entities from floorplan document and bound areas', () => {
    const doc = createDefaultFloorplanDocument();
    doc.floors[0].rooms[0].ha_area_id = 'living_room';
    doc.floors[0].entities.push({
      id: 'p1',
      entity_id: 'light.living_room',
      domain: 'light',
      room_id: 'r1',
      x: 0,
      y: 0,
      z_elevation: 2.5,
      rotation_deg: 0,
      mesh_type: 'ceiling_light',
      mesh_scale: [1, 1, 1],
      badge: { visible: true, style: 'compact_pill', label_override: null, icon_override: null },
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' },
      double_tap_action: { action: 'none' }
    });

    const mockHass: HomeAssistant = {
      states: {
        'light.living_room': {
          entity_id: 'light.living_room',
          state: 'on',
          attributes: { brightness: 255 },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        },
        'sensor.living_room_temp': {
          entity_id: 'sensor.living_room_temp',
          state: '21.5',
          attributes: { device_class: 'temperature' },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        },
        'sun.sun': {
          entity_id: 'sun.sun',
          state: 'above_horizon',
          attributes: { elevation: 25.4 },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        }
      },
      entities: {
        'sensor.living_room_temp': {
          entity_id: 'sensor.living_room_temp',
          area_id: 'living_room'
        }
      },
      language: 'en',
      connection: {
        subscribeMessage: vi.fn(),
        sendMessagePromise: vi.fn()
      },
      callService: vi.fn(),
      callWS: vi.fn()
    };

    const differ = new WatchedEntityDiffer();
    const watched = differ.rebuildWatchedSet(doc, mockHass);

    expect(watched.has('light.living_room')).toBe(true);
    expect(watched.has('sun.sun')).toBe(true);
    // Auto-discovered area sensor
    expect(watched.has('sensor.living_room_temp')).toBe(true);
  });

  it('diffStates achieves O(1) performance by ignoring 500 unwatched smart home entities', () => {
    const doc = createDefaultFloorplanDocument();
    doc.floors[0].entities = [
      {
        id: 'p_light',
        entity_id: 'light.kitchen_island',
        domain: 'light',
        room_id: null,
        x: 1,
        y: 1,
        z_elevation: 2.4,
        rotation_deg: 0,
        mesh_type: 'ceiling_light',
        mesh_scale: [1, 1, 1],
        badge: { visible: true, style: 'compact_pill', label_override: null, icon_override: null },
        tap_action: { action: 'toggle' },
        hold_action: { action: 'more-info' },
        double_tap_action: { action: 'none' }
      }
    ];

    // Build 500 unwatched entities + 1 watched entity
    const states: Record<string, HassEntity> = {
      'light.kitchen_island': {
        entity_id: 'light.kitchen_island',
        state: 'off',
        attributes: { brightness: 0 },
        last_changed: '2026-01-01T00:00:00Z',
        last_updated: '2026-01-01T00:00:00Z',
        context: { id: '1', parent_id: null, user_id: null }
      }
    };

    for (let i = 1; i <= 500; i++) {
      states[`sensor.unwatched_${i}`] = {
        entity_id: `sensor.unwatched_${i}`,
        state: `${i}`,
        attributes: { value: i },
        last_changed: '2026-01-01T00:00:00Z',
        last_updated: '2026-01-01T00:00:00Z',
        context: { id: `${i}`, parent_id: null, user_id: null }
      };
    }

    const mockHass: HomeAssistant = {
      states,
      language: 'en',
      connection: {
        subscribeMessage: vi.fn(),
        sendMessagePromise: vi.fn()
      },
      callService: vi.fn(),
      callWS: vi.fn()
    };

    const differ = new WatchedEntityDiffer();
    differ.rebuildWatchedSet(doc, mockHass);

    // Initial diff should return empty because states were seeded
    expect(differ.diffStates(mockHass)).toEqual([]);

    // Mutate 500 unwatched entities
    for (let i = 1; i <= 500; i++) {
      states[`sensor.unwatched_${i}`] = {
        ...states[`sensor.unwatched_${i}`],
        state: `${i * 10}`,
        last_updated: '2026-01-01T00:01:00Z'
      };
    }

    // Must still return [] because none of the 500 entities are watched!
    const diffAfterNoise = differ.diffStates(mockHass);
    expect(diffAfterNoise).toEqual([]);

    // Now mutate the watched entity
    states['light.kitchen_island'] = {
      ...states['light.kitchen_island'],
      state: 'on',
      attributes: { brightness: 255 }
    };

    const diffAfterWatchedChange = differ.diffStates(mockHass);
    expect(diffAfterWatchedChange).toEqual(['light.kitchen_island']);

    // Calling diff again with no changes returns empty array
    expect(differ.diffStates(mockHass)).toEqual([]);
  });
});

describe('Room & Opening State Resolution (src/utils/ha-registry.ts)', () => {
  it('isOpeningContactOpen evaluates binary_sensor state correctly', () => {
    const opening: WallOpening = {
      id: 'o1',
      wall_id: 'w1',
      type: 'door_single',
      t: 0.5,
      width: 0.9,
      sill_height: 0,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: 'binary_sensor.front_door'
    };

    const hass: HomeAssistant = {
      states: {
        'binary_sensor.front_door': {
          entity_id: 'binary_sensor.front_door',
          state: 'on',
          attributes: {},
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        }
      },
      language: 'en',
      connection: { subscribeMessage: vi.fn(), sendMessagePromise: vi.fn() },
      callService: vi.fn(),
      callWS: vi.fn()
    };

    expect(isOpeningContactOpen(opening, hass)).toBe(true);

    hass.states['binary_sensor.front_door'].state = 'off';
    expect(isOpeningContactOpen(opening, hass)).toBe(false);

    // Unbound opening
    expect(isOpeningContactOpen({ ...opening, bound_entity_id: null }, hass)).toBe(false);
  });

  it('resolveRoomSummary computes area, climate metrics, light counts and motion', () => {
    const room: RoomPolygon = {
      id: 'r_living',
      name: 'Living Room',
      ha_area_id: 'living_room',
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 5 },
        { x: 0, y: 5 }
      ],
      floor_material: 'wood_oak',
      floor_color: '#8b6f4e',
      show_label: true,
      temp_entity_id: 'sensor.temp_direct',
      humidity_entity_id: null,
      motion_entity_id: 'binary_sensor.motion_direct',
      room_tap_action: { action: 'toggle' }
    };

    const floor: FloorLevel = {
      id: 'f1',
      name: 'Ground',
      level_index: 0,
      elevation: 0,
      wall_height: 2.6,
      slab_thickness: 0.15,
      ha_floor_id: null,
      blueprint: null,
      default_camera: null,
      nodes: [],
      walls: [],
      openings: [],
      rooms: [room],
      furniture: [],
      entities: [
        {
          id: 'p1',
          entity_id: 'light.spot_1',
          domain: 'light',
          room_id: 'r_living',
          x: 2,
          y: 2,
          z_elevation: 2.5,
          rotation_deg: 0,
          mesh_type: 'ceiling_light',
          mesh_scale: [1, 1, 1],
          badge: { visible: true, style: 'compact_pill', label_override: null, icon_override: null },
          tap_action: { action: 'toggle' },
          hold_action: { action: 'more-info' },
          double_tap_action: { action: 'none' }
        }
      ]
    };

    const hass: HomeAssistant = {
      states: {
        'sensor.temp_direct': {
          entity_id: 'sensor.temp_direct',
          state: '22.1',
          attributes: { unit_of_measurement: '°C' },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        },
        'binary_sensor.motion_direct': {
          entity_id: 'binary_sensor.motion_direct',
          state: 'on',
          attributes: {},
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        },
        'light.spot_1': {
          entity_id: 'light.spot_1',
          state: 'on',
          attributes: { brightness: 255 },
          last_changed: '',
          last_updated: '',
          context: { id: '1', parent_id: null, user_id: null }
        }
      },
      language: 'en',
      connection: { subscribeMessage: vi.fn(), sendMessagePromise: vi.fn() },
      callService: vi.fn(),
      callWS: vi.fn()
    };

    const summary = resolveRoomSummary(room, floor, hass);
    // Area: 4 * 5 = 20 m²
    expect(summary.areaSqM).toBe(20);
    expect(summary.temperatureText).toBe('22.1°C');
    expect(summary.activeLightCount).toBe(1);
    expect(summary.totalLightCount).toBe(1);
    expect(summary.motionDetected).toBe(true);
  });

  it('executeHassAction dispatches custom events and calls HA services', () => {
    const el = document.createElement('div');
    const callServiceMock = vi.fn().mockResolvedValue(true);
    const hass: HomeAssistant = {
      states: {},
      language: 'en',
      connection: { subscribeMessage: vi.fn(), sendMessagePromise: vi.fn() },
      callService: callServiceMock,
      callWS: vi.fn()
    };

    // 1. more-info event dispatch
    const moreInfoListener = vi.fn();
    el.addEventListener('hass-more-info', moreInfoListener);
    executeHassAction(el, hass, {
      entityId: 'light.lamp',
      trigger: 'tap',
      actionConfig: { action: 'more-info' }
    });
    expect(moreInfoListener).toHaveBeenCalled();

    // 2. toggle service call
    executeHassAction(el, hass, {
      entityId: 'light.lamp',
      trigger: 'tap',
      actionConfig: { action: 'toggle' }
    });
    expect(callServiceMock).toHaveBeenCalledWith('light', 'toggle', {}, { entity_id: 'light.lamp' });

    // 3. zoom-room event dispatch
    const zoomListener = vi.fn();
    el.addEventListener('floorplan-zoom-room', zoomListener);
    executeHassAction(el, hass, {
      room: { id: 'r1' } as RoomPolygon,
      trigger: 'tap',
      actionConfig: { action: 'zoom-room' }
    });
    expect(zoomListener).toHaveBeenCalled();
  });
});
