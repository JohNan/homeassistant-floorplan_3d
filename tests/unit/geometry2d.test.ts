import { describe, expect, it } from 'vitest';
import type {
  FloorLevel,
  Point2D,
  RoomPolygon,
  WallEdge,
  WallNode,
  WallOpening
} from '../../src/types/floorplan';
import {
  computeCalibrationMetersPerPixel,
  computeFloorBoundingBox2D,
  distance2D,
  findPolygonLabelCenter2D,
  lineIntersection2D,
  midpoint2D,
  pointInPolygon2D,
  polygonArea2D,
  polygonCentroid2D,
  polygonSignedArea2D,
  projectPointOntoSegment,
  segmentIntersection2D,
  snapPoint2D,
  snapToGrid,
  solveWallMiterFootprints,
  splitWallIntervalsForOpenings,
  syncAutoDetectedRoomsFromWalls
} from '../../src/utils/geometry2d';

describe('geometry2d: Basic vector and calibration math', () => {
  it('computes 2D distance and midpoint correctly', () => {
    const a: Point2D = { x: 1, y: 2 };
    const b: Point2D = { x: 4, y: 6 };
    expect(distance2D(a, b)).toBe(5);

    const mid = midpoint2D(a, b);
    expect(mid.x).toBe(2.5);
    expect(mid.y).toBe(4);

    // Negative coordinates
    const c: Point2D = { x: -3, y: -4 };
    const d: Point2D = { x: 0, y: 0 };
    expect(distance2D(c, d)).toBe(5);
    expect(midpoint2D(c, d)).toEqual({ x: -1.5, y: -2 });
  });

  it('computes blueprint calibration scale correctly', () => {
    const p1: Point2D = { x: 100, y: 100 };
    const p2: Point2D = { x: 400, y: 500 }; // distance = 500 px
    const realDist = 10.0; // 10 meters
    const scale = computeCalibrationMetersPerPixel(p1, p2, realDist);
    expect(scale).toBeCloseTo(0.02, 5); // 10 / 500 = 0.02 m/px

    // Fallback on zero / tiny distance
    expect(computeCalibrationMetersPerPixel(p1, p1, 10)).toBe(0.01);
    expect(computeCalibrationMetersPerPixel(p1, p2, 0)).toBe(0.01);
    expect(computeCalibrationMetersPerPixel(p1, p2, -5)).toBe(0.01);
  });

  it('snaps scalar to grid', () => {
    expect(snapToGrid(1.234, 0.1)).toBe(1.2);
    expect(snapToGrid(1.26, 0.1)).toBe(1.3);
    expect(snapToGrid(2.45, 0.5)).toBe(2.5);
    expect(snapToGrid(-1.74, 0.5)).toBe(-1.5);
    expect(snapToGrid(2.45, 0)).toBe(2.45);
    expect(snapToGrid(2.45, -1)).toBe(2.45);
  });

  it('projects point onto segment correctly', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 10, y: 0 };

    // Point above segment
    const res1 = projectPointOntoSegment({ x: 5, y: 3 }, a, b);
    expect(res1.point.x).toBe(5);
    expect(res1.point.y).toBe(0);
    expect(res1.t).toBe(0.5);
    expect(res1.distance).toBe(3);

    // Point before start
    const res2 = projectPointOntoSegment({ x: -2, y: 0 }, a, b);
    expect(res2.point.x).toBe(0);
    expect(res2.point.y).toBe(0);
    expect(res2.t).toBe(0);
    expect(res2.distance).toBe(2);

    // Point beyond end
    const res3 = projectPointOntoSegment({ x: 12, y: 0 }, a, b);
    expect(res3.point.x).toBe(10);
    expect(res3.point.y).toBe(0);
    expect(res3.t).toBe(1);
    expect(res3.distance).toBe(2);

    // Degenerate segment a == b
    const resDeg = projectPointOntoSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(resDeg.point).toEqual({ x: 0, y: 0 });
    expect(resDeg.t).toBe(0);
    expect(resDeg.distance).toBe(5);
  });
});

describe('geometry2d: snapPoint2D', () => {
  const nodes: WallNode[] = [
    { id: 'n1', x: 0, y: 0 },
    { id: 'n2', x: 5, y: 0 },
    { id: 'n3', x: 10, y: 0 }
  ];
  const walls: WallEdge[] = [
    {
      id: 'w1',
      start_node_id: 'n1',
      end_node_id: 'n2',
      thickness: 0.2,
      height_override: null,
      is_exterior: true,
      color_override: null
    },
    {
      id: 'w2',
      start_node_id: 'n2',
      end_node_id: 'n3',
      thickness: 0.2,
      height_override: null,
      is_exterior: true,
      color_override: null
    }
  ];

  it('snaps to node within radius (Priority 1)', () => {
    const res = snapPoint2D({ x: 0.1, y: 0.1 }, {
      gridSize: 0.5,
      snapToGrid: true,
      nodes,
      walls,
      nodeSnapRadius: 0.25
    });
    expect(res.snappedNodeId).toBe('n1');
    expect(res.point).toEqual({ x: 0, y: 0 });
  });

  it('picks closest node when multiple nodes are within radius', () => {
    const res = snapPoint2D({ x: 4.9, y: 0.05 }, {
      gridSize: 0.1,
      snapToGrid: false,
      nodes,
      nodeSnapRadius: 0.3
    });
    expect(res.snappedNodeId).toBe('n2');
    expect(res.point).toEqual({ x: 5, y: 0 });
  });

  it('excludes specified node IDs and their incident walls from self-snapping', () => {
    const res = snapPoint2D({ x: 0.1, y: 0.1 }, {
      gridSize: 0.1,
      snapToGrid: false,
      nodes,
      walls,
      nodeSnapRadius: 0.25,
      excludeNodeIds: new Set(['n1'])
    });
    // Should exclude both node n1 and its incident wall w1 so dragging n1 does not self-snap
    expect(res.snappedNodeId).toBeNull();
    expect(res.snappedWallId).toBeNull();
    expect(res.point).toEqual({ x: 0.1, y: 0.1 });
  });

  it('snaps to wall edge within radius (Priority 2)', () => {
    const res = snapPoint2D({ x: 2.5, y: 0.15 }, {
      gridSize: 0.5,
      snapToGrid: true,
      nodes,
      walls,
      nodeSnapRadius: 0.25
    });
    expect(res.snappedNodeId).toBeNull();
    expect(res.snappedWallId).toBe('w1');
    expect(res.point.x).toBe(2.5);
    expect(res.point.y).toBe(0);
    expect(res.wallT).toBeCloseTo(0.5, 3);
  });

  it('snaps angle relative to anchor point (Priority 3)', () => {
    const anchor = { x: 0, y: 0 };
    // Vector at approx 42 degrees, should snap to 45 degrees
    const res = snapPoint2D({ x: 2.0, y: 1.8 }, {
      gridSize: 0.1,
      snapToGrid: false,
      anchorPoint: anchor,
      snapAngleDeg: 45
    });
    expect(res.snappedNodeId).toBeNull();
    expect(res.snappedWallId).toBeNull();
    // Angle should be 45 deg (x == y)
    expect(res.point.x).toBeCloseTo(res.point.y, 4);
  });

  it('snaps angle with snapToGrid distance', () => {
    const anchor = { x: 0, y: 0 };
    // Point at distance ~2.1 along 0 deg
    const res = snapPoint2D({ x: 2.14, y: 0.05 }, {
      gridSize: 0.5,
      snapToGrid: true,
      anchorPoint: anchor,
      snapAngleDeg: 90
    });
    expect(res.point.x).toBeCloseTo(2.0, 3);
    expect(res.point.y).toBeCloseTo(0, 3);
  });

  it('snaps to grid (Priority 4)', () => {
    const res = snapPoint2D({ x: 1.23, y: 4.88 }, {
      gridSize: 0.25,
      snapToGrid: true
    });
    expect(res.point.x).toBe(1.25);
    expect(res.point.y).toBe(5.0);
  });

  it('returns untouched point if snapping is disabled', () => {
    const res = snapPoint2D({ x: 1.234, y: 4.876 }, {
      gridSize: 0.1,
      snapToGrid: false
    });
    expect(res.point).toEqual({ x: 1.234, y: 4.876 });
  });
});

describe('geometry2d: Intersections and Polygon math', () => {
  it('computes infinite line intersection', () => {
    // Line 1: (0, 0) direction (1, 0) -> y = 0
    // Line 2: (2, -2) direction (0, 1) -> x = 2
    const p = lineIntersection2D({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: -2 }, { x: 0, y: 1 });
    expect(p).toEqual({ x: 2, y: 0 });

    // Parallel lines return null
    const parallel = lineIntersection2D({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 });
    expect(parallel).toBeNull();
  });

  it('computes finite segment intersection', () => {
    const a1 = { x: 0, y: 2 };
    const a2 = { x: 4, y: 2 };
    const b1 = { x: 2, y: 0 };
    const b2 = { x: 2, y: 4 };

    const res = segmentIntersection2D(a1, a2, b1, b2);
    expect(res).not.toBeNull();
    expect(res!.point.x).toBe(2);
    expect(res!.point.y).toBe(2);
    expect(res!.t).toBe(0.5);
    expect(res!.u).toBe(0.5);

    // Disjoint segments return null
    const nonRes = segmentIntersection2D(a1, a2, { x: 5, y: 0 }, { x: 5, y: 4 });
    expect(nonRes).toBeNull();
  });

  it('computes polygon area and centroid', () => {
    // 4x4 square centered at (2, 2)
    const square: Point2D[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 }
    ];

    expect(polygonArea2D(square)).toBe(16);
    expect(polygonSignedArea2D(square)).toBe(16);

    const c = polygonCentroid2D(square);
    expect(c.x).toBeCloseTo(2, 4);
    expect(c.y).toBeCloseTo(2, 4);

    expect(pointInPolygon2D({ x: 2, y: 2 }, square)).toBe(true);
    expect(pointInPolygon2D({ x: 5, y: 2 }, square)).toBe(false);

    // Degenerate polygons
    expect(polygonArea2D([])).toBe(0);
    expect(polygonArea2D([{ x: 0, y: 0 }])).toBe(0);
    expect(polygonCentroid2D([])).toEqual({ x: 0, y: 0 });
  });

  it('finds label center inside concave L-shaped polygon where naive bounding box center is outside', () => {
    // L-shaped room:
    // (0, 0) to (6, 0) to (6, 2) to (2, 2) to (2, 6) to (0, 6)
    // Bounding box center is (3, 3), which is in the missing corner (OUTSIDE the room!)
    const lShape: Point2D[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 6 },
      { x: 0, y: 6 }
    ];

    // Confirm that bbox center (3, 3) is outside the polygon
    expect(pointInPolygon2D({ x: 3, y: 3 }, lShape)).toBe(false);

    // polylabel must find a point strictly inside the room
    const labelCenter = findPolygonLabelCenter2D(lShape);
    expect(pointInPolygon2D(labelCenter, lShape)).toBe(true);

    // Distance to edge should be significantly positive (> 0.5m clearance)
    expect(labelCenter.x).toBeGreaterThan(0.5);
    expect(labelCenter.y).toBeGreaterThan(0.5);
  });

  it('finds label center inside concave U-shaped polygon', () => {
    // U-shaped room:
    // (0, 0) to (6, 0) to (6, 6) to (4, 6) to (4, 2) to (2, 2) to (2, 6) to (0, 6)
    // Courtyard between x=2..4 and y=2..6 is empty (outside the room).
    const uShape: Point2D[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 6 },
      { x: 0, y: 6 }
    ];

    // Courtyard center (3, 4) is outside the room
    expect(pointInPolygon2D({ x: 3, y: 4 }, uShape)).toBe(false);

    const labelCenter = findPolygonLabelCenter2D(uShape);
    expect(pointInPolygon2D(labelCenter, uShape)).toBe(true);
  });
});

describe('geometry2d: computeFloorBoundingBox2D', () => {
  it('computes floor bounding box including padding', () => {
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
        { id: 'n1', x: -2, y: -1 },
        { id: 'n2', x: 6, y: 5 }
      ],
      walls: [],
      openings: [],
      rooms: [],
      furniture: [],
      entities: []
    };

    const bbox = computeFloorBoundingBox2D(floor, 2.0);
    expect(bbox.minX).toBe(-4.0);
    expect(bbox.minY).toBe(-3.0);
    expect(bbox.maxX).toBe(8.0);
    expect(bbox.maxY).toBe(7.0);
    expect(bbox.width).toBe(12.0);
    expect(bbox.height).toBe(10.0);
    expect(bbox.centerX).toBe(2.0);
    expect(bbox.centerY).toBe(2.0);
  });

  it('returns default box with padding when floor is empty', () => {
    const floor: FloorLevel = {
      id: 'f_empty',
      name: 'Empty',
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
      rooms: [],
      furniture: [],
      entities: []
    };
    const bbox = computeFloorBoundingBox2D(floor, 1.0);
    expect(bbox.minX).toBe(-6.0);
    expect(bbox.maxX).toBe(6.0);
    expect(bbox.minY).toBe(-6.0);
    expect(bbox.maxY).toBe(6.0);
  });
});

describe('geometry2d: solveWallMiterFootprints', () => {
  it('solves 90-degree L-corner mitering', () => {
    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: 4, y: 0 },
      { id: 'n3', x: 4, y: 4 }
    ];
    const walls: WallEdge[] = [
      {
        id: 'w1',
        start_node_id: 'n1',
        end_node_id: 'n2',
        thickness: 0.2,
        height_override: null,
        is_exterior: true,
        color_override: null
      },
      {
        id: 'w2',
        start_node_id: 'n2',
        end_node_id: 'n3',
        thickness: 0.2,
        height_override: null,
        is_exterior: true,
        color_override: null
      }
    ];

    const footprints = solveWallMiterFootprints(nodes, walls);
    expect(footprints.has('w1')).toBe(true);
    expect(footprints.has('w2')).toBe(true);

    const fp1 = footprints.get('w1')!;
    const fp2 = footprints.get('w2')!;

    expect(fp1.quad).toHaveLength(4);
    expect(fp2.quad).toHaveLength(4);
  });

  it('solves isolated single wall with square ends', () => {
    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: 5, y: 0 }
    ];
    const walls: WallEdge[] = [
      {
        id: 'w_iso',
        start_node_id: 'n1',
        end_node_id: 'n2',
        thickness: 0.2,
        height_override: null,
        is_exterior: false,
        color_override: null
      }
    ];

    const fps = solveWallMiterFootprints(nodes, walls);
    const fp = fps.get('w_iso')!;
    expect(fp.quad[0]).toEqual({ x: 0, y: -0.1 }); // startLeft
    expect(fp.quad[1]).toEqual({ x: 5, y: -0.1 }); // endLeft
    expect(fp.quad[2]).toEqual({ x: 5, y: 0.1 });  // endRight
    expect(fp.quad[3]).toEqual({ x: 0, y: 0.1 });  // startRight
  });

  it('solves T-junction mitering with flat through-wall', () => {
    const nodes: WallNode[] = [
      { id: 'n_center', x: 0, y: 0 },
      { id: 'n_west', x: -4, y: 0 },
      { id: 'n_east', x: 4, y: 0 },
      { id: 'n_south', x: 0, y: 4 }
    ];
    const walls: WallEdge[] = [
      {
        id: 'w_west',
        start_node_id: 'n_west',
        end_node_id: 'n_center',
        thickness: 0.2,
        height_override: null,
        is_exterior: false,
        color_override: null
      },
      {
        id: 'w_east',
        start_node_id: 'n_center',
        end_node_id: 'n_east',
        thickness: 0.2,
        height_override: null,
        is_exterior: false,
        color_override: null
      },
      {
        id: 'w_south',
        start_node_id: 'n_center',
        end_node_id: 'n_south',
        thickness: 0.2,
        height_override: null,
        is_exterior: false,
        color_override: null
      }
    ];

    const footprints = solveWallMiterFootprints(nodes, walls);
    expect(footprints.size).toBe(3);

    const fpWest = footprints.get('w_west')!;
    const fpEast = footprints.get('w_east')!;

    // North edge across west and east walls should be continuous and flat at y = -0.1
    expect(fpWest.quad[1].y).toBeCloseTo(-0.1, 3); // endLeft of w_west
    expect(fpEast.quad[0].y).toBeCloseTo(-0.1, 3); // startLeft of w_east
  });

  it('clamps acute angle (<20 deg) miters to prevent spikes', () => {
    const nodes: WallNode[] = [
      { id: 'n0', x: 0, y: 0 },
      { id: 'n1', x: 10, y: 0 },
      { id: 'n2', x: 10, y: 2 } // angle = atan2(2, 10) = ~11.3 deg
    ];
    const walls: WallEdge[] = [
      {
        id: 'w1',
        start_node_id: 'n0',
        end_node_id: 'n1',
        thickness: 0.2,
        height_override: null,
        is_exterior: true,
        color_override: null
      },
      {
        id: 'w2',
        start_node_id: 'n0',
        end_node_id: 'n2',
        thickness: 0.2,
        height_override: null,
        is_exterior: true,
        color_override: null
      }
    ];

    const footprints = solveWallMiterFootprints(nodes, walls);
    const fp1 = footprints.get('w1')!;

    // Without miter clamping, the corner vertex at n0 would spike out far.
    // With clamping, vertex distance from n0 must be <= 2.5 * max(w1, w2) = 0.5m
    for (const pt of fp1.quad) {
      if (distance2D(pt, nodes[0]) < 2) {
        expect(distance2D(pt, nodes[0])).toBeLessThanOrEqual(0.55);
      }
    }
  });

  it('orients wall normal outward away from room centroid', () => {
    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: 4, y: 0 },
      { id: 'n3', x: 4, y: 4 },
      { id: 'n4', x: 0, y: 4 }
    ];
    const walls: WallEdge[] = [
      {
        id: 'w_north',
        start_node_id: 'n1',
        end_node_id: 'n2',
        thickness: 0.2,
        height_override: null,
        is_exterior: true,
        color_override: null
      }
    ];
    const room: RoomPolygon = {
      id: 'r1',
      name: 'Room',
      ha_area_id: null,
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 }
      ],
      floor_material: 'wood_oak',
      floor_color: '#ffffff',
      show_label: true,
      temp_entity_id: null,
      humidity_entity_id: null,
      motion_entity_id: null,
      room_tap_action: { action: 'toggle' }
    };

    const footprints = solveWallMiterFootprints(nodes, walls, [room]);
    const fp = footprints.get('w_north')!;

    // North wall is at y = 0. Room centroid is at (2, 2).
    // Outward normal pointing AWAY from room must point North (-Y)
    expect(fp.normal.y).toBeLessThan(0);
  });
});

describe('geometry2d: splitWallIntervalsForOpenings', () => {
  it('returns single solid interval when wall has no openings', () => {
    const intervals = splitWallIntervalsForOpenings(5.0, []);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]).toEqual({
      kind: 'solid',
      distStart: 0,
      distEnd: 5.0,
      tStart: 0,
      tEnd: 1
    });
  });

  it('splits wall for a single centered door', () => {
    const wallLength = 4.0;
    const opening: WallOpening = {
      id: 'd1',
      wall_id: 'w1',
      type: 'door_single',
      t: 0.5, // center at 2.0m
      width: 0.9, // from 1.55m to 2.45m
      sill_height: 0,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: null
    };

    const intervals = splitWallIntervalsForOpenings(wallLength, [opening]);
    expect(intervals).toHaveLength(3);

    // Segment 1: Solid [0, 1.55]
    expect(intervals[0].kind).toBe('solid');
    expect(intervals[0].distStart).toBe(0);
    expect(intervals[0].distEnd).toBeCloseTo(1.55, 3);

    // Segment 2: Opening [1.55, 2.45]
    expect(intervals[1].kind).toBe('opening');
    expect(intervals[1].distStart).toBeCloseTo(1.55, 3);
    expect(intervals[1].distEnd).toBeCloseTo(2.45, 3);
    expect(intervals[1].opening?.id).toBe('d1');

    // Segment 3: Solid [2.45, 4.0]
    expect(intervals[2].kind).toBe('solid');
    expect(intervals[2].distStart).toBeCloseTo(2.45, 3);
    expect(intervals[2].distEnd).toBe(4.0);
  });

  it('handles multiple openings, sorting and clamping to boundary [0.02, length - 0.02]', () => {
    const wallLength = 6.0;
    const o1: WallOpening = {
      id: 'w_win',
      wall_id: 'w1',
      type: 'window_standard',
      t: 0.8, // center at 4.8m, width 1.2 -> [4.2, 5.4]
      width: 1.2,
      sill_height: 0.9,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: null
    };
    const o2: WallOpening = {
      id: 'd_door',
      wall_id: 'w1',
      type: 'door_single',
      t: 0.0, // center at 0m, width 1.0 -> should clamp start to 0.02
      width: 1.0,
      sill_height: 0,
      head_height: 2.1,
      swing_direction: 'left_in',
      bound_entity_id: null
    };

    const intervals = splitWallIntervalsForOpenings(wallLength, [o1, o2]);

    // First interval must be solid or opening starting at min 0.02
    expect(intervals[0].kind).toBe('solid');
    expect(intervals[0].distStart).toBe(0);
    expect(intervals[0].distEnd).toBe(0.02);

    expect(intervals[1].kind).toBe('opening');
    expect(intervals[1].opening?.id).toBe('d_door');

    // Intervals must be contiguous from 0 to 6.0
    for (let i = 0; i < intervals.length - 1; i++) {
      expect(intervals[i].distEnd).toBeCloseTo(intervals[i + 1].distStart, 5);
    }
    expect(intervals[intervals.length - 1].distEnd).toBe(6.0);
  });

  it('handles degenerate wall length (<= 0 or < 0.04)', () => {
    expect(splitWallIntervalsForOpenings(0, [])).toHaveLength(1);
    expect(splitWallIntervalsForOpenings(-2, [])).toHaveLength(1);
    const shortWall = splitWallIntervalsForOpenings(0.03, [
      {
        id: 'd_tiny',
        wall_id: 'w',
        type: 'door_single',
        t: 0.5,
        width: 0.8,
        sill_height: 0,
        head_height: 2.1,
        swing_direction: 'left_in',
        bound_entity_id: null
      }
    ]);
    expect(shortWall).toHaveLength(1);
    expect(shortWall[0].kind).toBe('solid');
  });

  it('auto-detects closed rooms from walls and splits rooms when an interior wall is added', () => {
    const floor: FloorLevel = {
      id: 'f1',
      name: 'Ground',
      level_index: 0,
      elevation: 0,
      wall_height: 2.6,
      slab_thickness: 0.2,
      ha_floor_id: null,
      blueprint: null,
      default_camera: null,
      nodes: [
        { id: 'n1', x: 0, y: 0 },
        { id: 'n2', x: 6, y: 0 },
        { id: 'n3', x: 6, y: 4 },
        { id: 'n4', x: 0, y: 4 },
        { id: 'n5', x: 3, y: 0 },
        { id: 'n6', x: 3, y: 4 }
      ],
      walls: [
        { id: 'w1', start_node_id: 'n1', end_node_id: 'n5', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        { id: 'w2', start_node_id: 'n5', end_node_id: 'n2', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        { id: 'w3', start_node_id: 'n2', end_node_id: 'n3', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        { id: 'w4', start_node_id: 'n3', end_node_id: 'n6', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        { id: 'w5', start_node_id: 'n6', end_node_id: 'n4', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        { id: 'w6', start_node_id: 'n4', end_node_id: 'n1', thickness: 0.15, height_override: null, is_exterior: true, color_override: null },
        // Dividing interior wall splitting the 6x4 floor into two 3x4 rooms
        { id: 'w_div', start_node_id: 'n5', end_node_id: 'n6', thickness: 0.15, height_override: null, is_exterior: false, color_override: null }
      ],
      openings: [],
      rooms: [],
      furniture: [],
      entities: []
    };

    const detected = syncAutoDetectedRoomsFromWalls(floor);
    expect(detected).toHaveLength(2);
    expect(polygonArea2D(detected[0].points)).toBeCloseTo(12, 3);
    expect(polygonArea2D(detected[1].points)).toBeCloseTo(12, 3);
  });
});
