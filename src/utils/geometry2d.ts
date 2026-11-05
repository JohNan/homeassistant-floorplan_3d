import type {
  FloorLevel,
  Point2D,
  RoomPolygon,
  WallEdge,
  WallNode,
  WallOpening
} from '../types/floorplan';
import type {
  BoundingBox2D,
  WallMiterFootprint,
  WallSegmentInterval
} from '../engine/contracts';

/**
 * 2D Euclidean distance between two points.
 */
export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Midpoint between two 2D points.
 */
export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

/**
 * Computes blueprint meters_per_pixel scale calibration from 2 clicked reference pixel points
 * and known real-world distance in meters.
 *
 * Formula: realDistanceMeters / hypot(p2Px.x - p1Px.x, p2Px.y - p1Px.y)
 * Fallback to 0.01 if pixel distance <= 1e-6 or realDistanceMeters <= 0.
 */
export function computeCalibrationMetersPerPixel(
  p1Px: Point2D,
  p2Px: Point2D,
  realDistanceMeters: number
): number {
  const pixelDist = Math.hypot(p2Px.x - p1Px.x, p2Px.y - p1Px.y);
  if (pixelDist <= 1e-6 || realDistanceMeters <= 0) {
    return 0.01;
  }
  return realDistanceMeters / pixelDist;
}

/**
 * Snaps a scalar value to a regular grid size.
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) {
    return value;
  }
  const snapped = Math.round(value / gridSize) * gridSize;
  return Number(snapped.toFixed(6));
}

/**
 * Orthogonal projection of a 2D point onto a finite line segment AB.
 * Clamps t to [0, 1].
 */
export function projectPointOntoSegment(
  pt: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-12) {
    return {
      point: { x: a.x, y: a.y },
      t: 0,
      distance: Math.hypot(pt.x - a.x, pt.y - a.y)
    };
  }

  const rawT = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));
  const projPoint = {
    x: a.x + t * dx,
    y: a.y + t * dy
  };
  const distance = Math.hypot(pt.x - projPoint.x, pt.y - projPoint.y);

  return { point: projPoint, t, distance };
}

export interface SnapOptions {
  gridSize: number;
  snapToGrid: boolean;
  nodes?: WallNode[];
  walls?: WallEdge[];
  nodeSnapRadius?: number;
  anchorPoint?: Point2D;
  snapAngleDeg?: number;
  excludeNodeIds?: Set<string>;
}

export interface SnapResult {
  point: Point2D;
  snappedNodeId: string | null;
  snappedWallId: string | null;
  wallT?: number;
}

/**
 * Snaps a 2D point based on hierarchical priorities:
 * (1) Snap to existing WallNode within nodeSnapRadius (default 0.25m)
 * (2) Snap onto existing WallEdge segment within nodeSnapRadius
 * (3) Snap angle relative to anchorPoint if anchorPoint and snapAngleDeg are provided
 * (4) Snap to grid if snapToGrid is true
 */
export function snapPoint2D(pt: Point2D, options: SnapOptions): SnapResult {
  const snapRadius = options.nodeSnapRadius ?? 0.25;

  // (1) Snap to existing WallNode
  if (options.nodes && options.nodes.length > 0) {
    let bestNode: WallNode | null = null;
    let minNodeDist = Infinity;

    for (const node of options.nodes) {
      if (options.excludeNodeIds?.has(node.id)) {
        continue;
      }
      const d = Math.hypot(node.x - pt.x, node.y - pt.y);
      if (d <= snapRadius && d < minNodeDist) {
        minNodeDist = d;
        bestNode = node;
      }
    }

    if (bestNode) {
      return {
        point: { x: bestNode.x, y: bestNode.y },
        snappedNodeId: bestNode.id,
        snappedWallId: null
      };
    }
  }

  // (2) Snap onto existing WallEdge segment
  if (options.walls && options.walls.length > 0 && options.nodes) {
    const nodeMap = new Map<string, WallNode>();
    for (const n of options.nodes) {
      nodeMap.set(n.id, n);
    }

    let bestWall: WallEdge | null = null;
    let bestProj: { point: Point2D; t: number; distance: number } | null = null;
    let minWallDist = Infinity;

    for (const wall of options.walls) {
      if (
        options.excludeNodeIds?.has(wall.start_node_id) ||
        options.excludeNodeIds?.has(wall.end_node_id)
      ) {
        continue;
      }
      const a = nodeMap.get(wall.start_node_id);
      const b = nodeMap.get(wall.end_node_id);
      if (!a || !b) continue;

      const proj = projectPointOntoSegment(pt, a, b);
      if (proj.distance <= snapRadius && proj.distance < minWallDist) {
        minWallDist = proj.distance;
        bestWall = wall;
        bestProj = proj;
      }
    }

    if (bestWall && bestProj) {
      return {
        point: bestProj.point,
        snappedNodeId: null,
        snappedWallId: bestWall.id,
        wallT: bestProj.t
      };
    }
  }

  // (3) Snap angle relative to anchorPoint
  if (options.anchorPoint && options.snapAngleDeg && options.snapAngleDeg > 0) {
    const dx = pt.x - options.anchorPoint.x;
    const dy = pt.y - options.anchorPoint.y;
    let dist = Math.hypot(dx, dy);

    if (dist > 1e-6) {
      const rawAngle = Math.atan2(dy, dx);
      const stepRad = (options.snapAngleDeg * Math.PI) / 180;
      const snappedAngle = Math.round(rawAngle / stepRad) * stepRad;

      if (options.snapToGrid && options.gridSize > 0) {
        dist = Math.round(dist / options.gridSize) * options.gridSize;
      }

      return {
        point: {
          x: Number((options.anchorPoint.x + dist * Math.cos(snappedAngle)).toFixed(6)),
          y: Number((options.anchorPoint.y + dist * Math.sin(snappedAngle)).toFixed(6))
        },
        snappedNodeId: null,
        snappedWallId: null
      };
    }
  }

  // (4) Snap to grid
  if (options.snapToGrid && options.gridSize > 0) {
    return {
      point: {
        x: snapToGrid(pt.x, options.gridSize),
        y: snapToGrid(pt.y, options.gridSize)
      },
      snappedNodeId: null,
      snappedWallId: null
    };
  }

  return {
    point: { x: pt.x, y: pt.y },
    snappedNodeId: null,
    snappedWallId: null
  };
}

/**
 * Infinite line intersection between P1 + s*d1 and P2 + u*d2.
 * Returns null if parallel (|cross| < 10^-8).
 */
export function lineIntersection2D(
  p1: Point2D,
  d1: Point2D,
  p2: Point2D,
  d2: Point2D
): Point2D | null {
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-8) {
    return null;
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const s = (dx * d2.y - dy * d2.x) / cross;
  return {
    x: p1.x + s * d1.x,
    y: p1.y + s * d1.y
  };
}

/**
 * Finite segment intersection between segment A1-A2 and B1-B2.
 * Returns intersection point and parameters t, u in [0, 1], or null if disjoint/parallel.
 */
export function segmentIntersection2D(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): { point: Point2D; t: number; u: number } | null {
  const daX = a2.x - a1.x;
  const daY = a2.y - a1.y;
  const dbX = b2.x - b1.x;
  const dbY = b2.y - b1.y;
  const cross = daX * dbY - daY * dbX;

  if (Math.abs(cross) < 1e-8) {
    return null;
  }

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  const t = (dx * dbY - dy * dbX) / cross;
  const u = (dx * daY - dy * daX) / cross;

  const eps = 1e-7;
  if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
    const clampedT = Math.max(0, Math.min(1, t));
    const clampedU = Math.max(0, Math.min(1, u));
    return {
      point: {
        x: a1.x + clampedT * daX,
        y: a1.y + clampedT * daY
      },
      t: clampedT,
      u: clampedU
    };
  }

  return null;
}

/**
 * Point in polygon test using ray casting even-odd algorithm.
 */
export function pointInPolygon2D(pt: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Signed area of a 2D polygon using the Shoelace formula.
 * Positive for counter-clockwise orientation in standard Cartesian coordinates.
 */
export function polygonSignedArea2D(polygon: Point2D[]): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  return sum / 2;
}

/**
 * Unsigned area of a 2D polygon in square meters.
 */
export function polygonArea2D(polygon: Point2D[]): number {
  return Math.abs(polygonSignedArea2D(polygon));
}

/**
 * Centroid of a 2D polygon.
 */
export function polygonCentroid2D(polygon: Point2D[]): Point2D {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { x: polygon[0].x, y: polygon[0].y };
  if (n === 2) return midpoint2D(polygon[0], polygon[1]);

  const signedArea = polygonSignedArea2D(polygon);
  if (Math.abs(signedArea) < 1e-9) {
    let sumX = 0;
    let sumY = 0;
    for (const p of polygon) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / n, y: sumY / n };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const factor = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    cx += (polygon[i].x + polygon[j].x) * factor;
    cy += (polygon[i].y + polygon[j].y) * factor;
  }

  const factor = 1 / (6 * signedArea);
  return {
    x: cx * factor,
    y: cy * factor
  };
}

/**
 * Distance from point to polygon perimeter.
 * Returns positive if inside, negative if outside.
 */
function pointToPolygonDistance(pt: Point2D, polygon: Point2D[]): number {
  const inside = pointInPolygon2D(pt, polygon);
  let minDistanceSq = Infinity;

  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[j];
    const b = polygon[i];
    const proj = projectPointOntoSegment(pt, a, b);
    const dSq = (pt.x - proj.point.x) ** 2 + (pt.y - proj.point.y) ** 2;
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
    }
  }

  const d = Math.sqrt(minDistanceSq);
  return inside ? d : -d;
}

interface PolylabelCell {
  x: number;
  y: number;
  h: number;
  d: number;
  max: number;
}

/**
 * Finds the pole-of-inaccessibility (polylabel algorithm) of a polygon.
 * Ensures the returned label center point is strictly inside concave (L-shape, U-shape) rooms.
 */
export function findPolygonLabelCenter2D(polygon: Point2D[], precision = 0.05): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };
  if (polygon.length === 1) return { x: polygon[0].x, y: polygon[0].y };
  if (polygon.length === 2) return midpoint2D(polygon[0], polygon[1]);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);

  if (cellSize <= 0) {
    return { x: minX, y: minY };
  }

  // Initial candidate: Centroid
  const centroid = polygonCentroid2D(polygon);
  let bestCell: PolylabelCell = {
    x: centroid.x,
    y: centroid.y,
    h: 0,
    d: pointToPolygonDistance(centroid, polygon),
    max: 0
  };

  // If centroid is outside, check bounding box center
  const bboxCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const bboxDist = pointToPolygonDistance(bboxCenter, polygon);
  if (bboxDist > bestCell.d) {
    bestCell = {
      x: bboxCenter.x,
      y: bboxCenter.y,
      h: 0,
      d: bboxDist,
      max: 0
    };
  }

  const queue: PolylabelCell[] = [];
  const h = cellSize / 2;

  // Cover bounding box with initial cells
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      const cx = x + h;
      const cy = y + h;
      const d = pointToPolygonDistance({ x: cx, y: cy }, polygon);
      const cell: PolylabelCell = {
        x: cx,
        y: cy,
        h,
        d,
        max: d + h * Math.SQRT2
      };
      if (d > bestCell.d) {
        bestCell = cell;
      }
      queue.push(cell);
    }
  }

  // Sort cells descending by max possible distance
  queue.sort((a, b) => b.max - a.max);

  let iterations = 0;
  const maxIterations = 2000;

  while (queue.length > 0 && iterations++ < maxIterations) {
    // Pop highest potential cell
    const cell = queue.shift()!;

    if (cell.max - bestCell.d <= precision) {
      continue;
    }

    // Subdivide into 4 quadrants
    const h2 = cell.h / 2;
    const subCells: PolylabelCell[] = [
      { x: cell.x - h2, y: cell.y - h2, h: h2, d: 0, max: 0 },
      { x: cell.x + h2, y: cell.y - h2, h: h2, d: 0, max: 0 },
      { x: cell.x - h2, y: cell.y + h2, h: h2, d: 0, max: 0 },
      { x: cell.x + h2, y: cell.y + h2, h: h2, d: 0, max: 0 }
    ];

    for (const sub of subCells) {
      sub.d = pointToPolygonDistance({ x: sub.x, y: sub.y }, polygon);
      sub.max = sub.d + sub.h * Math.SQRT2;

      if (sub.d > bestCell.d) {
        bestCell = sub;
      }
      if (sub.max > bestCell.d) {
        // Binary insert or push and keep queue sorted
        let low = 0;
        let high = queue.length;
        while (low < high) {
          const mid = (low + high) >>> 1;
          if (queue[mid].max > sub.max) low = mid + 1;
          else high = mid;
        }
        queue.splice(low, 0, sub);
      }
    }
  }

  return { x: bestCell.x, y: bestCell.y };
}

/**
 * Computes axis-aligned 2D bounding box covering all nodes, rooms, furniture, and entities of a floor level.
 */
export function computeFloorBoundingBox2D(
  floor: FloorLevel,
  paddingMeters = 2.0
): BoundingBox2D {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  // 1. Nodes
  for (const n of floor.nodes ?? []) {
    updateBounds(n.x, n.y);
  }

  // 2. Room points
  for (const r of floor.rooms ?? []) {
    for (const pt of r.points ?? []) {
      updateBounds(pt.x, pt.y);
    }
  }

  // 3. Furniture
  for (const f of floor.furniture ?? []) {
    const hw = (f.width ?? 1) / 2;
    const hd = (f.depth ?? 1) / 2;
    updateBounds(f.x - hw, f.y - hd);
    updateBounds(f.x + hw, f.y + hd);
  }

  // 4. Entities
  for (const e of floor.entities ?? []) {
    updateBounds(e.x, e.y);
  }

  if (minX === Infinity) {
    minX = -5;
    minY = -5;
    maxX = 5;
    maxY = 5;
  }

  minX -= paddingMeters;
  minY -= paddingMeters;
  maxX += paddingMeters;
  maxY += paddingMeters;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

interface IncidentWallConnection {
  wallId: string;
  isStart: boolean;
  thickness: number;
  angle: number;
  dirX: number;
  dirY: number;
  normX: number;
  normY: number;
  leftVertex?: Point2D;
  rightVertex?: Point2D;
}

/**
 * Solves miter joints for every wall in the floorplan graph.
 * At every node, adjacent incident walls are sorted counter-clockwise and their offset lines are intersected.
 * Miters are clamped to prevent spikes at acute angles (< 30°).
 * Outward normal is computed pointing away from adjacent room centroid or floor centroid.
 */
export function solveWallMiterFootprints(
  nodes: WallNode[],
  walls: WallEdge[],
  rooms?: RoomPolygon[]
): Map<string, WallMiterFootprint> {
  const nodeMap = new Map<string, WallNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Group incident walls by node ID
  const nodeConnections = new Map<string, IncidentWallConnection[]>();
  for (const n of nodes) {
    nodeConnections.set(n.id, []);
  }

  const wallMap = new Map<string, WallEdge>();
  for (const wall of walls) {
    wallMap.set(wall.id, wall);
    const startNode = nodeMap.get(wall.start_node_id);
    const endNode = nodeMap.get(wall.end_node_id);
    if (!startNode || !endNode) continue;

    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;

    const ux = dx / length;
    const uy = dy / length;

    // In 2D floorplan space (+X East, +Y South):
    // Left normal to (ux, uy) is (uy, -ux) pointing North when facing East
    const nx = uy;
    const ny = -ux;

    // Outgoing from startNode towards endNode
    // CCW angle in Cartesian space where North is +Y (-dy): atan2(-uy, ux)
    const startConn: IncidentWallConnection = {
      wallId: wall.id,
      isStart: true,
      thickness: wall.thickness,
      angle: Math.atan2(-uy, ux),
      dirX: ux,
      dirY: uy,
      normX: nx,
      normY: ny
    };
    nodeConnections.get(startNode.id)?.push(startConn);

    // Outgoing from endNode towards startNode
    const endConn: IncidentWallConnection = {
      wallId: wall.id,
      isStart: false,
      thickness: wall.thickness,
      angle: Math.atan2(uy, -ux),
      dirX: -ux,
      dirY: -uy,
      normX: -nx,
      normY: -ny
    };
    nodeConnections.get(endNode.id)?.push(endConn);
  }

  // Process miter joints at each node
  for (const [nodeId, conns] of nodeConnections.entries()) {
    const node = nodeMap.get(nodeId);
    if (!node || conns.length === 0) continue;

    if (conns.length === 1) {
      // Dead end: square termination perpendicular to wall
      const c = conns[0];
      const halfW = c.thickness / 2;
      c.leftVertex = {
        x: node.x + c.normX * halfW,
        y: node.y + c.normY * halfW
      };
      c.rightVertex = {
        x: node.x - c.normX * halfW,
        y: node.y - c.normY * halfW
      };
      continue;
    }

    // Sort incident walls counter-clockwise by outgoing angle
    conns.sort((a, b) => a.angle - b.angle);
    const k = conns.length;

    for (let i = 0; i < k; i++) {
      const nextIdx = (i + 1) % k;
      const cCurr = conns[i];
      const cNext = conns[nextIdx];

      const halfWCurr = cCurr.thickness / 2;
      const halfWNext = cNext.thickness / 2;
      const maxW = Math.max(cCurr.thickness, cNext.thickness);

      // Left offset line of cCurr: passes through node + halfWCurr * normCurr, direction dirCurr
      const p1 = {
        x: node.x + cCurr.normX * halfWCurr,
        y: node.y + cCurr.normY * halfWCurr
      };
      const d1 = { x: cCurr.dirX, y: cCurr.dirY };

      // Right offset line of cNext: passes through node - halfWNext * normNext, direction dirNext
      const p2 = {
        x: node.x - cNext.normX * halfWNext,
        y: node.y - cNext.normY * halfWNext
      };
      const d2 = { x: cNext.dirX, y: cNext.dirY };

      const inter = lineIntersection2D(p1, d1, p2, d2);

      let miterPt: Point2D;
      const miterLimit = 2.5 * maxW;
      const clampDist = (2.5 * maxW) / 2;

      if (inter) {
        const d = Math.hypot(inter.x - node.x, inter.y - node.y);
        if (d > miterLimit) {
          // Clamp along ray from node to intersection
          const dirToInterX = (inter.x - node.x) / d;
          const dirToInterY = (inter.y - node.y) / d;
          miterPt = {
            x: node.x + dirToInterX * clampDist,
            y: node.y + dirToInterY * clampDist
          };
        } else {
          miterPt = inter;
        }
      } else {
        // Parallel or collinear fallback
        // Bisector of cCurr.norm and -cNext.norm
        let bx = cCurr.normX - cNext.normX;
        let by = cCurr.normY - cNext.normY;
        const bLen = Math.hypot(bx, by);
        if (bLen > 1e-6) {
          bx /= bLen;
          by /= bLen;
        } else {
          bx = cCurr.normX;
          by = cCurr.normY;
        }
        miterPt = {
          x: node.x + bx * (maxW / 2),
          y: node.y + by * (maxW / 2)
        };
      }

      cCurr.leftVertex = miterPt;
      cNext.rightVertex = miterPt;
    }
  }

  // Precompute floor centroid for exterior/fallback normal calculation
  let floorCentroid = { x: 0, y: 0 };
  if (nodes.length > 0) {
    let sumX = 0;
    let sumY = 0;
    for (const n of nodes) {
      sumX += n.x;
      sumY += n.y;
    }
    floorCentroid = { x: sumX / nodes.length, y: sumY / nodes.length };
  }

  // Precompute room centroids
  const roomCentroids: Array<{ room: RoomPolygon; centroid: Point2D }> = [];
  for (const r of rooms ?? []) {
    if (r.points && r.points.length >= 3) {
      roomCentroids.push({
        room: r,
        centroid: polygonCentroid2D(r.points)
      });
    }
  }

  const results = new Map<string, WallMiterFootprint>();

  // Assemble WallMiterFootprint for each wall
  for (const wall of walls) {
    const startNode = nodeMap.get(wall.start_node_id);
    const endNode = nodeMap.get(wall.end_node_id);
    if (!startNode || !endNode) continue;

    const startConns = nodeConnections.get(startNode.id) ?? [];
    const endConns = nodeConnections.get(endNode.id) ?? [];

    const startConn = startConns.find(c => c.wallId === wall.id && c.isStart);
    const endConn = endConns.find(c => c.wallId === wall.id && !c.isStart);

    const halfW = wall.thickness / 2;
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;

    const ux = dx / length;
    const uy = dy / length;
    const nx = uy;
    const ny = -ux;

    const startLeft = startConn?.leftVertex ?? {
      x: startNode.x + nx * halfW,
      y: startNode.y + ny * halfW
    };
    const startRight = startConn?.rightVertex ?? {
      x: startNode.x - nx * halfW,
      y: startNode.y - ny * halfW
    };

    // For end node, looking outgoing from end to start:
    // Left vertex looking backwards is on the right of start->end (endRight)
    // Right vertex looking backwards is on the left of start->end (endLeft)
    const endLeft = endConn?.rightVertex ?? {
      x: endNode.x + nx * halfW,
      y: endNode.y + ny * halfW
    };
    const endRight = endConn?.leftVertex ?? {
      x: endNode.x - nx * halfW,
      y: endNode.y - ny * halfW
    };

    // Compute outward normal
    const midX = (startNode.x + endNode.x) / 2;
    const midY = (startNode.y + endNode.y) / 2;

    let outwardNormal: Point2D = { x: nx, y: ny };

    // Check if any room borders this wall
    let borderingRoomCentroid: Point2D | null = null;
    let minRoomDist = Infinity;

    for (const rc of roomCentroids) {
      // Check distance from wall midpoint to room edges
      for (let i = 0, j = rc.room.points.length - 1; i < rc.room.points.length; j = i++) {
        const pa = rc.room.points[j];
        const pb = rc.room.points[i];
        const proj = projectPointOntoSegment({ x: midX, y: midY }, pa, pb);
        if (proj.distance < 0.25 && proj.distance < minRoomDist) {
          minRoomDist = proj.distance;
          borderingRoomCentroid = rc.centroid;
        }
      }
    }

    const refCentroid = borderingRoomCentroid ?? floorCentroid;
    const awayX = midX - refCentroid.x;
    const awayY = midY - refCentroid.y;

    // Normal should point away from reference centroid
    if (outwardNormal.x * awayX + outwardNormal.y * awayY < 0) {
      outwardNormal = { x: -outwardNormal.x, y: -outwardNormal.y };
    }

    results.set(wall.id, {
      wallId: wall.id,
      quad: [startLeft, endLeft, endRight, startRight],
      startPoint: { x: startNode.x, y: startNode.y },
      endPoint: { x: endNode.x, y: endNode.y },
      length,
      thickness: wall.thickness,
      angleRad: Math.atan2(dy, dx),
      normal: outwardNormal
    });
  }

  return results;
}

/**
 * Splits a wall edge into solid wall intervals and opening intervals for door/window placement.
 * Ensures non-overlapping intervals, clamps to bounds [0.02, wallLength - 0.02], and covers [0, wallLength].
 */
export function splitWallIntervalsForOpenings(
  wallLength: number,
  openings: WallOpening[]
): WallSegmentInterval[] {
  if (wallLength <= 0) {
    return [
      {
        kind: 'solid',
        tStart: 0,
        tEnd: 1,
        distStart: 0,
        distEnd: 0
      }
    ];
  }

  if (!openings || openings.length === 0 || wallLength < 0.04) {
    return [
      {
        kind: 'solid',
        tStart: 0,
        tEnd: 1,
        distStart: 0,
        distEnd: wallLength
      }
    ];
  }

  const sortedOpenings = [...openings].sort((a, b) => a.t - b.t);

  interface RawInterval {
    start: number;
    end: number;
    opening: WallOpening;
  }

  const validIntervals: RawInterval[] = [];
  const minBound = 0.02;
  const maxBound = wallLength - 0.02;

  for (const op of sortedOpenings) {
    const center = op.t * wallLength;
    const halfW = op.width / 2;
    let start = Math.max(minBound, center - halfW);
    let end = Math.min(maxBound, center + halfW);

    if (start >= end) continue;

    // Prevent overlap with previously placed opening
    if (validIntervals.length > 0) {
      const prev = validIntervals[validIntervals.length - 1];
      if (start < prev.end) {
        start = prev.end;
        if (start >= end) continue;
      }
    }

    validIntervals.push({ start, end, opening: op });
  }

  const intervals: WallSegmentInterval[] = [];
  let cursor = 0;

  for (const item of validIntervals) {
    if (item.start > cursor) {
      intervals.push({
        kind: 'solid',
        distStart: cursor,
        distEnd: item.start,
        tStart: cursor / wallLength,
        tEnd: item.start / wallLength
      });
    }

    intervals.push({
      kind: 'opening',
      distStart: item.start,
      distEnd: item.end,
      tStart: item.start / wallLength,
      tEnd: item.end / wallLength,
      opening: item.opening
    });

    cursor = item.end;
  }

  if (cursor < wallLength) {
    intervals.push({
      kind: 'solid',
      distStart: cursor,
      distEnd: wallLength,
      tStart: cursor / wallLength,
      tEnd: 1.0
    });
  }

  return intervals;
}
