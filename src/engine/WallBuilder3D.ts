import * as THREE from 'three';
import type {
  AmbientConfig,
  FloorLevel,
  Point2D,
  WallDisplayMode,
  WallEdge,
  WallOpening
} from '../types/floorplan';
import type {
  BoundingBox2D,
  WallMiterFootprint,
  WallSegmentInterval
} from './contracts';
import {
  computeFloorBoundingBox2D,
  midpoint2D,
  solveWallMiterFootprints,
  splitWallIntervalsForOpenings
} from '../utils/geometry2d';

/**
 * Wall container userData contract
 */
export interface WallContainerUserData {
  wallId: string;
  isExterior: boolean;
  wallHeight: number;
  midpoint2D: Point2D;
  normal2D: Point2D;
  currentScaleY: number;
  targetScaleY: number;
}

/**
 * Linearly interpolates between two 2D points.
 */
function lerpPoint2D(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

/**
 * Builds a 3D non-indexed buffer geometry for a vertical quadrilateral prism.
 *
 * Base quad is defined by 4 2D points [p0, p1, p2, p3] representing:
 * - p0: startLeft
 * - p1: endLeft
 * - p2: endRight
 * - p3: startRight
 *
 * 2D (x, y) coordinates map to 3D world space (x, elevation + y_3d, z) where +Y_3D is vertical up.
 * Height spans from yMin to yMax along local +Y.
 */
function buildPrismGeometry(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  yMin: number,
  yMax: number,
  bbox: BoundingBox2D
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // Bottom vertices (y = yMin)
  const b0: [number, number, number] = [p0.x, yMin, p0.y];
  const b1: [number, number, number] = [p1.x, yMin, p1.y];
  const b2: [number, number, number] = [p2.x, yMin, p2.y];
  const b3: [number, number, number] = [p3.x, yMin, p3.y];

  // Top vertices (y = yMax)
  const t0: [number, number, number] = [p0.x, yMax, p0.y];
  const t1: [number, number, number] = [p1.x, yMax, p1.y];
  const t2: [number, number, number] = [p2.x, yMax, p2.y];
  const t3: [number, number, number] = [p3.x, yMax, p3.y];

  // 12 outward-facing CCW triangles (36 vertices total)
  const triangles: [number, number, number][] = [
    // Top face (+Y)
    t0, t3, t2,
    t0, t2, t1,
    // Bottom face (-Y)
    b0, b1, b2,
    b0, b2, b3,
    // Left face (along p0 -> p1)
    b0, t0, t1,
    b0, t1, b1,
    // End face (along p1 -> p2)
    b1, t1, t2,
    b1, t2, b2,
    // Right face (along p2 -> p3)
    b2, t2, t3,
    b2, t3, b3,
    // Start face (along p3 -> p0)
    b3, t3, t0,
    b3, t0, b0
  ];

  const vertexCount = triangles.length;
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = triangles[i][0];
    positions[i * 3 + 1] = triangles[i][1];
    positions[i * 3 + 2] = triangles[i][2];
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  // World-space planar UVs normalized to bounding box
  const uvs = new Float32Array(vertexCount * 2);
  const minX = bbox.minX;
  const minY = bbox.minY;
  const width = Math.max(0.1, bbox.width);
  const height = Math.max(0.1, bbox.height);

  for (let i = 0; i < vertexCount; i++) {
    const vx = positions[i * 3];
    const vz = positions[i * 3 + 2];
    uvs[i * 2] = (vx - minX) / width;
    uvs[i * 2 + 1] = 1.0 - (vz - minY) / height;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('uv2', new THREE.BufferAttribute(uvs.slice(), 2));

  return geom;
}

/**
 * WallBuilder3D
 *
 * Parametric 3D architectural wall mesh generator featuring:
 * - Exact corner miter joint quad extrusion (zero CSG boolean overhead)
 * - Parametric interval splitting for doors and windows (sill and lintel blocks)
 * - Sims-style view-dependent dynamic wall cutaway with 0-FPS idle settling
 * - Strict WebGL resource management and disposal
 */
export class WallBuilder3D {
  /**
   * Generates a 3D wall mesh group for a given floor level.
   *
   * @param floor Current floor level containing nodes, walls, openings, and rooms
   * @param ambient Ambient lighting configuration for base wall color
   * @param lightmapTexture Optional 2D baked lightmap texture
   * @param bbox Optional 2D floor bounding box for planar UV coordinates
   * @returns THREE.Group positioned at (0, 0, 0) containing child wall containers at floor.elevation
   */
  static buildFloorWalls(
    floor: FloorLevel,
    ambient: AmbientConfig,
    lightmapTexture?: THREE.Texture | null,
    bbox?: BoundingBox2D
  ): THREE.Group {
    const wallGroup = new THREE.Group();
    wallGroup.name = `floor-walls-${floor.id}`;

    if (!floor.walls || floor.walls.length === 0 || !floor.nodes || floor.nodes.length === 0) {
      return wallGroup;
    }

    const floorBbox = bbox ?? computeFloorBoundingBox2D(floor);
    const miterFootprints = solveWallMiterFootprints(floor.nodes, floor.walls, floor.rooms);
    const openingsByWall = new Map<string, WallOpening[]>();

    for (const opening of floor.openings ?? []) {
      const list = openingsByWall.get(opening.wall_id) ?? [];
      list.push(opening);
      openingsByWall.set(opening.wall_id, list);
    }

    const elevation = floor.elevation ?? 0.0;
    const defaultWallHeight = floor.wall_height ?? 2.6;

    for (const wall of floor.walls) {
      const footprint = miterFootprints.get(wall.id);
      if (!footprint || footprint.length < 1e-4) {
        continue;
      }

      const wallHeight = wall.height_override ?? defaultWallHeight;
      const wallContainer = new THREE.Group();
      wallContainer.name = `wall-${wall.id}`;
      wallContainer.position.set(0, elevation, 0);

      const userData: WallContainerUserData = {
        wallId: wall.id,
        isExterior: wall.is_exterior,
        wallHeight,
        midpoint2D: midpoint2D(footprint.startPoint, footprint.endPoint),
        normal2D: footprint.normal,
        currentScaleY: 1.0,
        targetScaleY: 1.0
      };
      wallContainer.userData = userData;

      const wallMaterial = new THREE.MeshStandardMaterial({
        color: wall.color_override ?? ambient.wall_color ?? '#cbd5e1',
        roughness: 0.82,
        metalness: 0.05,
        ...(lightmapTexture ? { lightMap: lightmapTexture, lightMapIntensity: 0.8 } : {})
      });

      const wallOpenings = openingsByWall.get(wall.id) ?? [];

      if (wallOpenings.length === 0) {
        // Solid wall with no openings: single prism from footprint quad
        const [startLeft, endLeft, endRight, startRight] = footprint.quad;
        const geom = buildPrismGeometry(
          startLeft,
          endLeft,
          endRight,
          startRight,
          0,
          wallHeight,
          floorBbox
        );
        const mesh = new THREE.Mesh(geom, wallMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = `wall-mesh-${wall.id}`;
        wallContainer.add(mesh);
      } else {
        // Wall has openings: split intervals for solid sections, sills, and lintels
        const intervals = splitWallIntervalsForOpenings(footprint.length, wallOpenings);
        const [startLeft, endLeft, endRight, startRight] = footprint.quad;

        let intervalIdx = 0;
        for (const interval of intervals) {
          const p0 = lerpPoint2D(startLeft, endLeft, interval.tStart);
          const p1 = lerpPoint2D(startLeft, endLeft, interval.tEnd);
          const p2 = lerpPoint2D(startRight, endRight, interval.tEnd);
          const p3 = lerpPoint2D(startRight, endRight, interval.tStart);

          if (interval.kind === 'solid') {
            const geom = buildPrismGeometry(p0, p1, p2, p3, 0, wallHeight, floorBbox);
            const mesh = new THREE.Mesh(geom, wallMaterial);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.name = `wall-solid-${wall.id}-${intervalIdx}`;
            wallContainer.add(mesh);
          } else if (interval.kind === 'opening' && interval.opening) {
            const op = interval.opening;
            const sillHeight = Math.max(0, Math.min(wallHeight, op.sill_height ?? 0));
            const headHeight = Math.max(sillHeight, Math.min(wallHeight, op.head_height ?? wallHeight));

            // Extrude sill block under opening
            if (sillHeight > 0.01) {
              const sillGeom = buildPrismGeometry(p0, p1, p2, p3, 0, sillHeight, floorBbox);
              const sillMesh = new THREE.Mesh(sillGeom, wallMaterial);
              sillMesh.castShadow = true;
              sillMesh.receiveShadow = true;
              sillMesh.name = `wall-sill-${wall.id}-${intervalIdx}`;
              wallContainer.add(sillMesh);
            }

            // Extrude lintel/header block above opening
            if (headHeight < wallHeight - 0.01) {
              const lintelGeom = buildPrismGeometry(p0, p1, p2, p3, headHeight, wallHeight, floorBbox);
              const lintelMesh = new THREE.Mesh(lintelGeom, wallMaterial);
              lintelMesh.castShadow = true;
              lintelMesh.receiveShadow = true;
              lintelMesh.name = `wall-lintel-${wall.id}-${intervalIdx}`;
              wallContainer.add(lintelMesh);
            }
          }
          intervalIdx++;
        }
      }

      wallGroup.add(wallContainer);
    }

    return wallGroup;
  }

  /**
   * Updates dynamic view-dependent wall cutaways based on camera position and target.
   *
   * @param wallGroup Group containing wallContainers produced by buildFloorWalls
   * @param cameraPosition Current camera position in 3D world space
   * @param cameraTarget Current camera look-at target in 3D world space
   * @param mode Cutaway display mode ('full', 'half', 'auto_cutaway')
   * @param dtSec Elapsed delta time in seconds (default 0.016)
   * @returns true if any wall is still actively animating; false once settled (0 FPS idle)
   */
  static updateCutaway(
    wallGroup: THREE.Group,
    cameraPosition: THREE.Vector3,
    cameraTarget: THREE.Vector3,
    mode: WallDisplayMode,
    dtSec = 0.016
  ): boolean {
    let stillAnimating = false;
    const speed = Math.min(1.0, dtSec * 12);

    // Precalculate view vector from camera to target in horizontal plane (X, Z)
    const viewRayX = cameraTarget.x - cameraPosition.x;
    const viewRayZ = cameraTarget.z - cameraPosition.z;
    const targetDist = Math.hypot(viewRayX, viewRayZ);

    for (const child of wallGroup.children) {
      const userData = child.userData as WallContainerUserData;
      if (!userData || typeof userData.wallHeight !== 'number') {
        continue;
      }

      const wallHeight = userData.wallHeight;
      let targetScaleY = 1.0;

      if (mode === 'full') {
        targetScaleY = 1.0;
      } else if (mode === 'half') {
        targetScaleY = Math.min(1.0, 1.15 / Math.max(0.5, wallHeight));
      } else if (mode === 'auto_cutaway') {
        const mid = userData.midpoint2D;
        const norm = userData.normal2D;

        // Horizontal vector from wall midpoint to camera
        const vx = cameraPosition.x - mid.x;
        const vz = cameraPosition.z - mid.y;
        const distToCam = Math.hypot(vx, vz);
        const dirX = distToCam > 1e-6 ? vx / distToCam : 0;
        const dirZ = distToCam > 1e-6 ? vz / distToCam : 0;

        // Dot product: > 0 means outward normal faces camera
        const dot = norm.x * dirX + norm.y * dirZ;

        // Verify wall midpoint is in front of camera and not behind cameraTarget along the view ray
        let isForeground = true;
        if (targetDist > 1e-6) {
          const camToMidX = mid.x - cameraPosition.x;
          const camToMidZ = mid.y - cameraPosition.z;
          const projDist = (camToMidX * viewRayX + camToMidZ * viewRayZ) / targetDist;
          // Wall is between camera and target (with 0.2m margin)
          isForeground = projDist < targetDist + 0.2 && projDist > -0.5;
        }

        if (dot > 0.18 && isForeground) {
          targetScaleY = Math.min(1.0, 0.35 / Math.max(0.5, wallHeight));
        } else {
          targetScaleY = 1.0;
        }
      }

      userData.targetScaleY = targetScaleY;
      const currentScaleY = userData.currentScaleY ?? 1.0;
      const diff = targetScaleY - currentScaleY;

      if (Math.abs(diff) > 0.002) {
        const nextScaleY = currentScaleY + diff * speed;
        userData.currentScaleY = nextScaleY;
        child.scale.y = nextScaleY;
        stillAnimating = true;
      } else {
        userData.currentScaleY = targetScaleY;
        child.scale.y = targetScaleY;
      }
    }

    return stillAnimating;
  }

  /**
   * Traverses group and disposes all geometries and materials.
   * Does NOT dispose shared lightmap texture.
   */
  static disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            for (const mat of obj.material) {
              mat.dispose();
            }
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    group.clear();
  }

  // Instance methods delegating to static methods for interface flexibility
  buildFloorWalls(
    floor: FloorLevel,
    ambient: AmbientConfig,
    lightmapTexture?: THREE.Texture | null,
    bbox?: BoundingBox2D
  ): THREE.Group {
    return WallBuilder3D.buildFloorWalls(floor, ambient, lightmapTexture, bbox);
  }

  updateCutaway(
    wallGroup: THREE.Group,
    cameraPosition: THREE.Vector3,
    cameraTarget: THREE.Vector3,
    mode: WallDisplayMode,
    dtSec = 0.016
  ): boolean {
    return WallBuilder3D.updateCutaway(wallGroup, cameraPosition, cameraTarget, mode, dtSec);
  }

  disposeGroup(group: THREE.Group): void {
    WallBuilder3D.disposeGroup(group);
  }
}
