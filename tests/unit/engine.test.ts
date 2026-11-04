import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createDefaultFloorplanDocument } from '../../src/types/floorplan';
import type { HomeAssistant } from '../../src/types/ha';
import { FloorplanScene3D } from '../../src/engine/FloorplanScene3D';
import { RenderLoopController } from '../../src/engine/RenderLoopController';
import { WallBuilder3D } from '../../src/engine/WallBuilder3D';
import { RoomBuilder3D } from '../../src/engine/RoomBuilder3D';
import { ProceduralCatalog3D } from '../../src/engine/ProceduralCatalog3D';

function createMockHass(): HomeAssistant {
  return {
    language: 'en',
    states: {
      'sun.sun': {
        entity_id: 'sun.sun',
        state: 'above_horizon',
        attributes: { elevation: 35, azimuth: 180 },
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null }
      },
      'light.living_room': {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: {
          friendly_name: 'Living Room Ceiling',
          brightness: 204,
          rgb_color: [255, 180, 90]
        },
        last_changed: '',
        last_updated: '',
        context: { id: '2', parent_id: null, user_id: null }
      },
      'binary_sensor.front_door': {
        entity_id: 'binary_sensor.front_door',
        state: 'off',
        attributes: { device_class: 'door' },
        last_changed: '',
        last_updated: '',
        context: { id: '3', parent_id: null, user_id: null }
      },
      'fan.ceiling': {
        entity_id: 'fan.ceiling',
        state: 'on',
        attributes: { percentage: 66 },
        last_changed: '',
        last_updated: '',
        context: { id: '4', parent_id: null, user_id: null }
      }
    },
    connection: {
      subscribeMessage: async () => async () => {},
      sendMessagePromise: async () => ({}) as never
    },
    callService: async () => ({}),
    callWS: async () => ({}) as never
  };
}

describe('Shared 3D Engine & FloorplanScene3D Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 960, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('builds a complete 3D floorplan scene with walls, openings, furniture, lights, and badges', () => {
    const doc = createDefaultFloorplanDocument('test_house', 'Test House');
    const floor = doc.floors[0];

    floor.openings.push(
      {
        id: 'op_door_1',
        wall_id: 'w1',
        type: 'door_single',
        t: 0.5,
        width: 0.9,
        sill_height: 0,
        head_height: 2.1,
        swing_direction: 'left_in',
        bound_entity_id: 'binary_sensor.front_door'
      },
      {
        id: 'op_win_1',
        wall_id: 'w2',
        type: 'window_standard',
        t: 0.5,
        width: 1.4,
        sill_height: 0.9,
        head_height: 2.1,
        swing_direction: 'left_in',
        bound_entity_id: null
      }
    );

    floor.furniture.push(
      {
        id: 'furn_sofa',
        catalog_type: 'sofa_l_shape',
        label: 'Sectional Sofa',
        x: -1.5,
        y: 0.5,
        z_elevation: 0,
        width: 2.4,
        depth: 1.6,
        height: 0.85,
        rotation_deg: 90,
        color: '#475569'
      },
      {
        id: 'furn_plant',
        catalog_type: 'potted_plant',
        label: 'Monstera',
        x: 2.8,
        y: -2.0,
        z_elevation: 0,
        width: 0.6,
        depth: 0.6,
        height: 1.2,
        rotation_deg: 0,
        color: null
      }
    );

    floor.entities.push(
      {
        id: 'ent_light_1',
        entity_id: 'light.living_room',
        domain: 'light',
        room_id: 'r1',
        x: 0,
        y: 0,
        z_elevation: 2.5,
        rotation_deg: 0,
        light_config: {
          kind: 'point',
          radius_m: 5.0,
          intensity_multiplier: 1.2,
          cast_real_point_light: true
        },
        mesh_type: 'ceiling_light',
        mesh_scale: [1, 1, 1],
        badge: {
          visible: true,
          style: 'icon_only',
          label_override: null,
          icon_override: null
        },
        tap_action: { action: 'toggle' },
        hold_action: { action: 'more-info' },
        double_tap_action: { action: 'none' }
      },
      {
        id: 'ent_fan_1',
        entity_id: 'fan.ceiling',
        domain: 'fan',
        room_id: 'r1',
        x: 1.5,
        y: 1.0,
        z_elevation: 2.45,
        rotation_deg: 0,
        mesh_type: 'ceiling_fan',
        mesh_scale: [1, 1, 1],
        badge: {
          visible: true,
          style: 'compact_pill',
          label_override: null,
          icon_override: null
        },
        tap_action: { action: 'toggle' },
        hold_action: { action: 'more-info' },
        double_tap_action: { action: 'none' }
      }
    );

    const hass = createMockHass();
    const scene3d = new FloorplanScene3D(container, {
      qualityTier: 'tablet',
      wallMode: 'auto_cutaway',
      projection: 'perspective'
    });

    scene3d.setDocument(doc, 'ground_floor', hass);
    expect(scene3d.getActiveFloorId()).toBe('ground_floor');

    // Step render loop manually
    scene3d.getRenderLoop().stepManual(1000);

    // Trigger door contact open & light color update
    hass.states['binary_sensor.front_door'] = {
      ...hass.states['binary_sensor.front_door'],
      state: 'on'
    };
    hass.states['light.living_room'] = {
      ...hass.states['light.living_room'],
      attributes: {
        ...hass.states['light.living_room'].attributes,
        brightness: 120,
        rgb_color: [60, 140, 255]
      }
    };
    scene3d.updateHassStates(hass, ['binary_sensor.front_door', 'light.living_room']);

    // Advance tweens
    scene3d.getRenderLoop().stepManual(1200);
    scene3d.getRenderLoop().stepManual(1500);

    // Switch camera projection and wall modes
    scene3d.setProjection('orthographic');
    expect(scene3d.getProjection()).toBe('orthographic');
    scene3d.setWallMode('half');
    expect(scene3d.getWallMode()).toBe('half');
    scene3d.focusOnRoom('r1', false);

    const bookmark = scene3d.getCurrentCameraBookmark();
    expect(bookmark.projection).toBe('orthographic');
    expect(bookmark.target[0]).toBeCloseTo(0, 1);

    scene3d.dispose();
  });

  it('sleeps at 0 FPS when scene is clean and no tweens or continuous animations are active', () => {
    let frameCount = 0;
    const loop = new RenderLoopController(() => {
      frameCount++;
      return false; // settled
    });

    expect(loop.isIdle).toBe(true);
    loop.stepManual(100);
    expect(frameCount).toBe(0);

    loop.markDirty();
    expect(loop.isIdle).toBe(false);
    loop.stepManual(200);
    expect(frameCount).toBe(1);
    expect(loop.isIdle).toBe(true);
    loop.dispose();
  });

  it('generates all 19 procedural furniture catalog types without geometry errors', () => {
    const types = [
      'sofa_straight',
      'sofa_l_shape',
      'bed_double',
      'bed_single',
      'dining_table',
      'desk',
      'chair',
      'tv_stand',
      'kitchen_counter',
      'refrigerator',
      'stove',
      'sink_cabinet',
      'bathtub',
      'shower_enclosure',
      'toilet',
      'wardrobe',
      'bookcase',
      'potted_plant',
      'rug'
    ] as const;

    for (const catalogType of types) {
      const group = ProceduralCatalog3D.buildFurnitureMesh(
        {
          id: `item_${catalogType}`,
          catalog_type: catalogType,
          label: catalogType,
          x: 1,
          y: 2,
          z_elevation: 0,
          width: 1.5,
          depth: 0.9,
          height: 0.85,
          rotation_deg: 45,
          color: null
        },
        0
      );
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.children.length).toBeGreaterThan(0);
      ProceduralCatalog3D.disposeObject3D(group);
    }
  });
});
