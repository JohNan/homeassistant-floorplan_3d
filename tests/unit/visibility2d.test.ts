import { describe, expect, it } from 'vitest';
import type { FloorLevel } from '../../src/types/floorplan';
import { distance2D, pointInPolygon2D } from '../../src/utils/geometry2d';
import {
  computeVisibilityPolygon2D,
  extractFloorBlockerSegments,
  VisibilityPolygonCache
} from '../../src/utils/visibility2d';

describe('visibility2d: extractFloorBlockerSegments', () => {
  const createFloor = (isOpenDoor = false): { floor: FloorLevel; openDoors: Set<string> } => {
    const openDoors = new Set<string>();
    if (isOpenDoor) {
      openDoors.add('door_1');
      openDoors.add('door_sliding');
    }

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
      nodes: [
        { id: 'n1', x: 0, y: 0 },
        { id: 'n2', x: 10, y: 0 },
        { id: 'n3', x: 10, y: 10 }
      ],
      walls: [
        {
          id: 'w1',
          start_node_id: 'n1',
          end_node_id: 'n2',
          thickness: 0.2,
          height_override: null,
          is_exterior: false,
          color_override: null
        },
        {
          id: 'w2',
          start_node_id: 'n2',
          end_node_id: 'n3',
          thickness: 0.2,
          height_override: null,
          is_exterior: false,
          color_override: null
        }
      ],
      openings: [
        {
          id: 'door_1',
          wall_id: 'w1',
          type: 'door_single',
          t: 0.3, // centered at 3m
          width: 0.9,
          sill_height: 0,
          head_height: 2.1,
          swing_direction: 'left_in',
          bound_entity_id: 'binary_sensor.front_door'
        },
        {
          id: 'win_1',
          wall_id: 'w1',
          type: 'window_standard',
          t: 0.7, // centered at 7m
          width: 1.2,
          sill_height: 0.9,
          head_height: 2.1,
          swing_direction: 'left_in',
          bound_entity_id: null
        },
        {
          id: 'door_sliding',
          wall_id: 'w2',
          type: 'door_sliding',
          t: 0.5,
          width: 2.0,
          sill_height: 0,
          head_height: 2.1,
          swing_direction: 'left_in',
          bound_entity_id: null
        },
        {
          id: 'arch_1',
          wall_id: 'w2',
          type: 'archway',
          t: 0.85,
          width: 1.0,
          sill_height: 0,
          head_height: 2.4,
          swing_direction: 'left_in',
          bound_entity_id: null
        }
      ],
      rooms: [],
      furniture: [],
      entities: []
    };

    return { floor, openDoors };
  };

  it('treats closed doors as blockers and windows/archways as transparent', () => {
    const { floor, openDoors } = createFloor(false);
    const blockers = extractFloorBlockerSegments(floor, openDoors);

    // Should contain solid segments + closed doors
    const door1Blocker = blockers.find(b => b.openingId === 'door_1');
    expect(door1Blocker).toBeDefined();
    expect(door1Blocker?.isClosedDoor).toBe(true);

    const doorSlidingBlocker = blockers.find(b => b.openingId === 'door_sliding');
    expect(doorSlidingBlocker).toBeDefined();

    // Window and archway are transparent
    expect(blockers.find(b => b.openingId === 'win_1')).toBeUndefined();
    expect(blockers.find(b => b.openingId === 'arch_1')).toBeUndefined();
  });

  it('removes door blockers when doors are in openDoorOpeningIds', () => {
    const { floor, openDoors } = createFloor(true);
    const blockers = extractFloorBlockerSegments(floor, openDoors);

    expect(blockers.find(b => b.openingId === 'door_1')).toBeUndefined();
    expect(blockers.find(b => b.openingId === 'door_sliding')).toBeUndefined();
  });
});

describe('visibility2d: computeVisibilityPolygon2D and wall occlusion', () => {
  it('computes regular circular boundary polygon when no blockers exist', () => {
    const origin = { x: 0, y: 0 };
    const radiusM = 4.0;
    const poly = computeVisibilityPolygon2D(origin, radiusM, []);

    expect(poly.length).toBeGreaterThanOrEqual(12);
    // Every vertex should be exactly distance 4.0 from origin
    for (const v of poly) {
      expect(distance2D(origin, v)).toBeCloseTo(4.0, 3);
    }

    // Inside point
    expect(pointInPolygon2D({ x: 2, y: 2 }, poly)).toBe(true);
    // Outside point
    expect(pointInPolygon2D({ x: 4.5, y: 0 }, poly)).toBe(false);
  });

  it('handles degenerate radius <= 0', () => {
    const origin = { x: 3, y: 4 };
    const poly = computeVisibilityPolygon2D(origin, 0, []);
    expect(poly).toEqual([{ x: 3, y: 4 }]);
  });

  it('blocks light from crossing solid wall segment and prevents light bleed', () => {
    const origin = { x: 0, y: 0 };
    const radiusM = 5.0;

    // Blocker wall segment at x = 1, extending from y = -3 to y = 3
    const blockers = [
      { ax: 1.0, ay: -3.0, bx: 1.0, by: 3.0 }
    ];

    const poly = computeVisibilityPolygon2D(origin, radiusM, blockers);
    expect(poly.length).toBeGreaterThan(10);

    // Point on light side of wall: (0.5, 0) -> must be visible
    expect(pointInPolygon2D({ x: 0.5, y: 0 }, poly)).toBe(true);

    // Point in opposite direction (negative X): (-2, 0) -> must be visible
    expect(pointInPolygon2D({ x: -2, y: 0 }, poly)).toBe(true);

    // Point behind wall: (3, 0) -> must be occluded (NOT visible)
    expect(pointInPolygon2D({ x: 3, y: 0 }, poly)).toBe(false);

    // Point behind wall at (2, 1) -> must be occluded
    expect(pointInPolygon2D({ x: 2, y: 1 }, poly)).toBe(false);

    // Point past wall ends: (1.0, 3.5) -> slope 3.5 > 3.0, passes above wall end at (1.0, 3.0)
    expect(pointInPolygon2D({ x: 1.0, y: 3.5 }, poly)).toBe(true);
  });

  it('allows light through doorway when door is open', () => {
    const origin = { x: 0, y: 0 };
    const radiusM = 5.0;

    // Wall with a doorway gap in the middle:
    // Segment 1: from y = -3 to y = -0.5
    // Doorway gap: from y = -0.5 to y = 0.5 (open)
    // Segment 2: from y = 0.5 to y = 3
    const blockers = [
      { ax: 1.0, ay: -3.0, bx: 1.0, by: -0.5 },
      { ax: 1.0, ay: 0.5, bx: 1.0, by: 3.0 }
    ];

    const poly = computeVisibilityPolygon2D(origin, radiusM, blockers);

    // Point (3, 0) is directly aligned with the open doorway at (1, 0)
    // Light rays along y = 0 should pass through the doorway gap to x = 5!
    expect(pointInPolygon2D({ x: 3, y: 0 }, poly)).toBe(true);

    // Point (3, 2) is blocked by the upper wall segment
    expect(pointInPolygon2D({ x: 3, y: 2 }, poly)).toBe(false);
  });
});

describe('visibility2d: VisibilityPolygonCache', () => {
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
    nodes: [
      { id: 'n1', x: 2, y: -2 },
      { id: 'n2', x: 2, y: 2 }
    ],
    walls: [
      {
        id: 'w1',
        start_node_id: 'n1',
        end_node_id: 'n2',
        thickness: 0.2,
        height_override: null,
        is_exterior: false,
        color_override: null
      }
    ],
    openings: [
      {
        id: 'door_main',
        wall_id: 'w1',
        type: 'door_single',
        t: 0.5,
        width: 1.0,
        sill_height: 0,
        head_height: 2.1,
        swing_direction: 'left_in',
        bound_entity_id: 'binary_sensor.main_door'
      }
    ],
    rooms: [],
    furniture: [],
    entities: []
  };

  it('caches precomputed polygon and updates on door open', () => {
    const cache = new VisibilityPolygonCache();
    const origin = { x: 0, y: 0 };
    const radiusM = 5.0;

    // 1. Initial compute with door closed
    const poly1 = cache.getOrCompute('light_1', origin, radiusM, floor);
    expect(pointInPolygon2D({ x: 3.5, y: 0 }, poly1)).toBe(false);

    // 2. Fetch again with same closed state -> exact same cached instance
    const polyCached = cache.getOrCompute('light_1', origin, radiusM, floor);
    expect(polyCached).toBe(poly1);

    // 3. Open door -> cache should recompute and return new polygon
    const openDoors = new Set(['door_main']);
    const polyOpen = cache.getOrCompute('light_1', origin, radiusM, floor, openDoors);
    expect(polyOpen).not.toBe(poly1);
    expect(pointInPolygon2D({ x: 3.5, y: 0 }, polyOpen)).toBe(true);

    // 4. Invalidate specific light
    cache.invalidate('light_1');
    const polyRecomputed = cache.getOrCompute('light_1', origin, radiusM, floor, openDoors);
    expect(polyRecomputed).not.toBe(polyOpen); // New instance after cache flush
    expect(polyRecomputed).toEqual(polyOpen);

    // 5. Invalidate all
    cache.getOrCompute('light_2', { x: -1, y: 0 }, 3, floor);
    cache.invalidate();
    const polyRecomputedAll = cache.getOrCompute('light_1', origin, radiusM, floor, openDoors);
    expect(polyRecomputedAll).not.toBe(polyRecomputed);
  });
});
