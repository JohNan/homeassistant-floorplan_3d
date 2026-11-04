import type { FloorLevel, Point2D, WallNode } from '../types/floorplan';
import {
  projectPointOntoSegment,
  splitWallIntervalsForOpenings
} from './geometry2d';

export interface BlockerSegment2D {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  openingId?: string;
  isClosedDoor?: boolean;
}

/**
 * Extracts 2D opaque light blocker segments from floor level walls and openings.
 * - Solid wall segments block light.
 * - Door openings block light UNLESS included in openDoorOpeningIds.
 * - Windows and archways do not block light.
 */
export function extractFloorBlockerSegments(
  floor: FloorLevel,
  openDoorOpeningIds?: ReadonlySet<string>
): BlockerSegment2D[] {
  const nodeMap = new Map<string, WallNode>();
  for (const node of floor.nodes ?? []) {
    nodeMap.set(node.id, node);
  }

  const blockers: BlockerSegment2D[] = [];

  for (const wall of floor.walls ?? []) {
    const startNode = nodeMap.get(wall.start_node_id);
    const endNode = nodeMap.get(wall.end_node_id);
    if (!startNode || !endNode) continue;

    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;

    const dirX = dx / length;
    const dirY = dy / length;

    const openings = (floor.openings ?? []).filter(o => o.wall_id === wall.id);
    const intervals = splitWallIntervalsForOpenings(length, openings);

    for (const interval of intervals) {
      const ax = startNode.x + dirX * interval.distStart;
      const ay = startNode.y + dirY * interval.distStart;
      const bx = startNode.x + dirX * interval.distEnd;
      const by = startNode.y + dirY * interval.distEnd;

      if (interval.kind === 'solid') {
        blockers.push({ ax, ay, bx, by });
      } else if (interval.kind === 'opening' && interval.opening) {
        const op = interval.opening;
        const isDoor =
          op.type === 'door_single' ||
          op.type === 'door_double' ||
          op.type === 'door_sliding';

        if (isDoor) {
          const isOpen = openDoorOpeningIds?.has(op.id) ?? false;
          if (!isOpen) {
            blockers.push({
              ax,
              ay,
              bx,
              by,
              openingId: op.id,
              isClosedDoor: true
            });
          }
        }
      }
    }
  }

  return blockers;
}

/**
 * Normalizes an angle in radians to [-Math.PI, Math.PI].
 */
function normalizeAngle(angle: number): number {
  let a = angle;
  while (a <= -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

/**
 * Computes a closed 2D star-shaped visibility polygon around origin bounded by radiusM
 * and clipped by blocker segments within radiusM.
 */
export function computeVisibilityPolygon2D(
  origin: Point2D,
  radiusM: number,
  segments: BlockerSegment2D[],
  boundarySides = 48
): Point2D[] {
  if (radiusM <= 0) {
    return [{ x: origin.x, y: origin.y }];
  }

  // 1. Filter segments within radiusM
  const relevantSegments: BlockerSegment2D[] = [];
  for (const s of segments) {
    const proj = projectPointOntoSegment(
      origin,
      { x: s.ax, y: s.ay },
      { x: s.bx, y: s.by }
    );
    if (proj.distance <= radiusM) {
      relevantSegments.push(s);
    }
  }

  // 2. Collect candidate ray angles
  const rawAngles: number[] = [];
  const sides = Math.max(12, boundarySides);

  // Boundary circular rays
  for (let i = 0; i < sides; i++) {
    rawAngles.push((2 * Math.PI * i) / sides - Math.PI);
  }

  // Endpoint rays with +/- 1e-4 radian epsilon
  const eps = 1e-4;
  for (const s of relevantSegments) {
    for (const pt of [
      { x: s.ax, y: s.ay },
      { x: s.bx, y: s.by }
    ]) {
      const dx = pt.x - origin.x;
      const dy = pt.y - origin.y;
      if (Math.hypot(dx, dy) > 1e-6) {
        const theta = Math.atan2(dy, dx);
        rawAngles.push(normalizeAngle(theta - eps));
        rawAngles.push(normalizeAngle(theta));
        rawAngles.push(normalizeAngle(theta + eps));
      }
    }
  }

  // 3. Sort and deduplicate angles
  rawAngles.sort((a, b) => a - b);
  const angles: number[] = [];
  for (const a of rawAngles) {
    if (angles.length === 0 || Math.abs(a - angles[angles.length - 1]) > 1e-6) {
      angles.push(a);
    }
  }

  // 4. Ray-cast along each angle to find closest intersection
  const polygon: Point2D[] = [];

  for (const alpha of angles) {
    const rx = Math.cos(alpha);
    const ry = Math.sin(alpha);

    let minT = radiusM;

    for (const s of relevantSegments) {
      const vx = s.bx - s.ax;
      const vy = s.by - s.ay;

      const cross = rx * vy - ry * vx;
      if (Math.abs(cross) < 1e-9) continue;

      const dx = s.ax - origin.x;
      const dy = s.ay - origin.y;

      const t = (dx * vy - dy * vx) / cross;
      const u = (dx * ry - dy * rx) / cross;

      if (t > 1e-5 && u >= -1e-6 && u <= 1 + 1e-6) {
        if (t < minT) {
          minT = t;
        }
      }
    }

    const vx = origin.x + minT * rx;
    const vy = origin.y + minT * ry;

    // Avoid duplicate vertices
    if (polygon.length > 0) {
      const last = polygon[polygon.length - 1];
      if (Math.hypot(vx - last.x, vy - last.y) < 1e-5) {
        continue;
      }
    }

    polygon.push({
      x: Number(vx.toFixed(5)),
      y: Number(vy.toFixed(5))
    });
  }

  return polygon;
}

interface CachedPolygonEntry {
  signature: string;
  polygon: Point2D[];
}

/**
 * High-performance LRU / map cache for precomputed 2D visibility polygons.
 * Prevents redundant ray-sweeps when scene geometry is static.
 */
export class VisibilityPolygonCache {
  private _cache = new Map<string, CachedPolygonEntry>();

  public getOrCompute(
    lightId: string,
    origin: Point2D,
    radiusM: number,
    floor: FloorLevel,
    openDoorOpeningIds?: ReadonlySet<string>
  ): Point2D[] {
    const signature = this._computeSignature(
      origin,
      radiusM,
      floor,
      openDoorOpeningIds
    );
    const entry = this._cache.get(lightId);

    if (entry && entry.signature === signature) {
      return entry.polygon;
    }

    const segments = extractFloorBlockerSegments(floor, openDoorOpeningIds);
    const polygon = computeVisibilityPolygon2D(origin, radiusM, segments);

    this._cache.set(lightId, { signature, polygon });
    return polygon;
  }

  public invalidate(lightId?: string): void {
    if (lightId !== undefined) {
      this._cache.delete(lightId);
    } else {
      this._cache.clear();
    }
  }

  private _computeSignature(
    origin: Point2D,
    radiusM: number,
    floor: FloorLevel,
    openDoorOpeningIds?: ReadonlySet<string>
  ): string {
    const openDoors = openDoorOpeningIds
      ? Array.from(openDoorOpeningIds).sort().join(',')
      : '';
    const wallCount = floor.walls?.length ?? 0;
    const nodeCount = floor.nodes?.length ?? 0;
    const openingCount = floor.openings?.length ?? 0;

    let geomHash = 0;
    if (floor.nodes) {
      for (const n of floor.nodes) {
        geomHash =
          (geomHash * 31 + Math.round(n.x * 100) + Math.round(n.y * 100)) | 0;
      }
    }

    return `${origin.x.toFixed(3)},${origin.y.toFixed(3)},${radiusM.toFixed(3)}|w${wallCount}n${nodeCount}o${openingCount}|gh${geomHash}|od:${openDoors}`;
  }
}
