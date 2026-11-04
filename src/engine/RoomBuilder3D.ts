import * as THREE from 'three';
import type {
  AmbientConfig,
  FloorLevel,
  FloorMaterialType,
  Point2D,
  RoomPolygon
} from '../types/floorplan';
import type { BoundingBox2D } from './contracts';
import { computeFloorBoundingBox2D } from '../utils/geometry2d';

/**
 * Room container userData contract
 */
export interface RoomContainerUserData {
  roomId: string;
  areaId: string | null;
  motionActive: boolean;
  motionPhase: number;
}

/**
 * Maps FloorMaterialType to calibrated surface roughness.
 */
export function getRoughnessForMaterial(type: FloorMaterialType): number {
  switch (type) {
    case 'tile_marble':
      return 0.3;
    case 'wood_oak':
    case 'wood_walnut':
      return 0.55;
    case 'tile_slate':
      return 0.7;
    case 'concrete':
      return 0.85;
    case 'carpet':
      return 0.9;
    case 'custom':
    default:
      return 0.6;
  }
}

/**
 * Maps FloorMaterialType to calibrated surface metalness.
 */
export function getMetalnessForMaterial(type: FloorMaterialType): number {
  switch (type) {
    case 'tile_slate':
    case 'concrete':
      return 0.05;
    case 'tile_marble':
      return 0.04;
    case 'wood_oak':
    case 'wood_walnut':
      return 0.02;
    case 'carpet':
      return 0.0;
    default:
      return 0.02;
  }
}

/**
 * Renders procedural architectural patterns onto a 2D canvas context.
 */
function drawProceduralPattern(
  ctx: CanvasRenderingContext2D,
  materialType: FloorMaterialType,
  width: number,
  height: number
): void {
  switch (materialType) {
    case 'wood_oak': {
      ctx.fillStyle = '#d7b385';
      ctx.fillRect(0, 0, width, height);

      // 4 horizontal wood planks
      const plankCount = 4;
      const plankH = height / plankCount;
      for (let i = 0; i < plankCount; i++) {
        const y = i * plankH;
        // Subtle plank tone variation
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, y, width, plankH);

        // Plank joint line
        ctx.strokeStyle = '#936639';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Longitudinal grain lines
        ctx.strokeStyle = 'rgba(147, 102, 57, 0.12)';
        ctx.lineWidth = 1.0;
        for (let g = 0; g < 3; g++) {
          const gy = y + 4 + g * 8;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }
      }
      break;
    }

    case 'wood_walnut': {
      ctx.fillStyle = '#543d2b';
      ctx.fillRect(0, 0, width, height);

      const plankCount = 4;
      const plankH = height / plankCount;
      for (let i = 0; i < plankCount; i++) {
        const y = i * plankH;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, y, width, plankH);

        // Dark walnut plank joint
        ctx.strokeStyle = '#322216';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(30, 20, 10, 0.16)';
        ctx.lineWidth = 1.0;
        for (let g = 0; g < 3; g++) {
          const gy = y + 4 + g * 8;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }
      }
      break;
    }

    case 'tile_slate': {
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, width, height);

      // 4x4 tile grid
      const cols = 4;
      const rows = 4;
      const tileW = width / cols;
      const tileH = height / rows;

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * tileH);
        ctx.lineTo(width, r * tileH);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * tileW, 0);
        ctx.lineTo(c * tileW, height);
        ctx.stroke();
      }

      // Subtle slate surface speckling
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 37) % width);
        const sy = ((i * 53) % height);
        ctx.fillRect(sx, sy, 2, 2);
      }
      break;
    }

    case 'tile_marble': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // 2x2 large marble tiles
      const cols = 2;
      const rows = 2;
      const tileW = width / cols;
      const tileH = height / rows;

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.0;

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * tileH);
        ctx.lineTo(width, r * tileH);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * tileW, 0);
        ctx.lineTo(c * tileW, height);
        ctx.stroke();
      }

      // Subtle organic marble veining
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, 12);
      ctx.bezierCurveTo(40, 28, 70, 18, 120, 56);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(20, 80);
      ctx.bezierCurveTo(55, 95, 85, 75, 116, 110);
      ctx.stroke();
      break;
    }

    case 'carpet': {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, width, height);

      // Dense stippled carpet fiber noise
      ctx.fillStyle = 'rgba(100, 116, 139, 0.16)';
      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
          if ((x + y) % 8 === 0) {
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      for (let y = 2; y < height; y += 4) {
        for (let x = 2; x < width; x += 4) {
          if ((x + y) % 8 === 0) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }

    case 'concrete': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, width, height);

      // Subtle micro-aggregate flecks
      ctx.fillStyle = 'rgba(51, 65, 85, 0.08)';
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 29) % width);
        const sy = ((i * 47) % height);
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 41) % width);
        const sy = ((i * 31) % height);
        ctx.fillRect(sx, sy, 1, 1);
      }
      break;
    }

    case 'custom':
    default: {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(0, 0, width, height);
      break;
    }
  }
}

/**
 * Creates a procedural CanvasTexture with safe fallback if Canvas 2D is unavailable (jsdom).
 */
export function createProceduralTexture(
  materialType: FloorMaterialType,
  floorBbox?: BoundingBox2D
): THREE.CanvasTexture | null {
  try {
    if (typeof document === 'undefined') {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    drawProceduralPattern(ctx, materialType, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    if (floorBbox) {
      // Repeat texture at approximately 2 tiles per meter (0.5m x 0.5m repeat)
      const repX = Math.max(1, Math.round(floorBbox.width * 2));
      const repY = Math.max(1, Math.round(floorBbox.height * 2));
      texture.repeat.set(repX, repY);
    }
    texture.needsUpdate = true;
    return texture;
  } catch {
    return null;
  }
}

/**
 * Generates calibrated MeshStandardMaterial for room floor slab with baked lightmap support.
 */
export function createRoomMaterial(
  room: RoomPolygon,
  lightmapTexture?: THREE.Texture | null,
  floorBbox?: BoundingBox2D,
  ambient?: AmbientConfig
): THREE.MeshStandardMaterial {
  const proceduralTexture = createProceduralTexture(room.floor_material, floorBbox);
  const roughness = getRoughnessForMaterial(room.floor_material);
  const metalness = getMetalnessForMaterial(room.floor_material);
  const baseColor = room.floor_color || ambient?.floor_color || '#e2e8f0';

  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness,
    metalness,
    map: proceduralTexture ?? null,
    emissiveMap: lightmapTexture ?? null,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: lightmapTexture ? 1.15 : 0.0
  });

  return material;
}

/**
 * RoomBuilder3D
 *
 * Parametric 3D architectural room floor slab generator featuring:
 * - Triangulated floor slab extrusion with configurable slab thickness
 * - Normalized world-space planar UVs mapped to both `uv` and `uv2` for pixel-perfect 2D lightmap baking
 * - Procedural surface material patterns with safe jsdom fallback
 * - Motion-sensor pulsating highlight border and overlay mesh
 * - Zero-leak WebGL resource disposal
 */
export class RoomBuilder3D {
  /**
   * Generates a 3D rooms group containing floor slabs and motion highlights for a floor level.
   *
   * @param floor FloorLevel document containing rooms and elevations
   * @param ambient AmbientConfig defining fallback floor color
   * @param lightmapTexture Optional world-space baked 2D lightmap texture
   * @param bbox Optional 2D floor bounding box for planar UV normalization
   * @returns THREE.Group positioned at (0, 0, 0) containing child room containers at floor.elevation
   */
  static buildFloorRooms(
    floor: FloorLevel,
    ambient: AmbientConfig,
    lightmapTexture?: THREE.Texture | null,
    bbox?: BoundingBox2D
  ): THREE.Group {
    const roomsGroup = new THREE.Group();
    roomsGroup.name = `floor-rooms-${floor.id}`;

    if (!floor.rooms || floor.rooms.length === 0) {
      return roomsGroup;
    }

    const floorBbox = bbox ?? computeFloorBoundingBox2D(floor);
    const elevation = floor.elevation ?? 0.0;
    const slabThickness = floor.slab_thickness || 0.12;
    const minX = floorBbox.minX;
    const minY = floorBbox.minY;
    const bboxWidth = Math.max(0.1, floorBbox.width);
    const bboxHeight = Math.max(0.1, floorBbox.height);

    for (const room of floor.rooms) {
      if (!room.points || room.points.length < 3) {
        continue;
      }

      const roomContainer = new THREE.Group();
      roomContainer.name = `room-${room.id}`;
      roomContainer.position.set(0, elevation, 0);

      const userData: RoomContainerUserData = {
        roomId: room.id,
        areaId: room.ha_area_id,
        motionActive: false,
        motionPhase: 0
      };
      roomContainer.userData = userData;

      // 1. Build 2D shape in floorplan coordinates
      const shape = new THREE.Shape();
      const pts = room.points;
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i].x, pts[i].y);
      }
      shape.closePath();

      // 2. Extrude slab downward along +Z by slabThickness, then rotate onto XZ plane
      // Top surface aligns with local y = 0 (world elevation); bottom extends to local y = -slabThickness
      const slabGeom = new THREE.ExtrudeGeometry(shape, {
        depth: slabThickness,
        bevelEnabled: false
      });
      slabGeom.rotateX(Math.PI / 2);

      // 3. Compute world-space planar UVs normalized to floorBbox for BOTH uv and uv2
      const posAttr = slabGeom.attributes.position;
      const count = posAttr.count;
      const uvs = new Float32Array(count * 2);

      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i); // corresponds to 2D floorplan y
        uvs[i * 2] = (x - minX) / bboxWidth;
        uvs[i * 2 + 1] = 1.0 - (z - minY) / bboxHeight;
      }
      slabGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      slabGeom.setAttribute('uv2', new THREE.BufferAttribute(uvs.slice(), 2));

      // 4. Create calibrated floor surface material
      const material = createRoomMaterial(room, lightmapTexture, floorBbox, ambient);
      const slabMesh = new THREE.Mesh(slabGeom, material);
      slabMesh.name = `room-slab-${room.id}`;
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = false;
      roomContainer.add(slabMesh);

      // 5. Motion sensor highlight overlay mesh (2mm above floor slab)
      const highlightGeom = new THREE.ShapeGeometry(shape);
      highlightGeom.rotateX(Math.PI / 2);
      const highlightMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const highlightMesh = new THREE.Mesh(highlightGeom, highlightMat);
      highlightMesh.name = 'motionHighlight';
      highlightMesh.position.set(0, 0.002, 0);
      highlightMesh.visible = false;
      roomContainer.add(highlightMesh);

      // 6. Motion sensor highlight perimeter border (3mm above floor slab)
      const borderPoints: THREE.Vector3[] = [];
      for (const pt of room.points) {
        borderPoints.push(new THREE.Vector3(pt.x, 0.003, pt.y));
      }
      const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
      const borderMat = new THREE.LineBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const borderLine = new THREE.LineLoop(borderGeom, borderMat);
      borderLine.name = 'motionBorder';
      borderLine.visible = false;
      roomContainer.add(borderLine);

      roomsGroup.add(roomContainer);
    }

    return roomsGroup;
  }

  /**
   * Activates or deactivates pulsating motion-sensor highlights for a specific room.
   *
   * @param roomsGroup Group containing roomContainers
   * @param roomId Target RoomPolygon ID
   * @param active Whether motion is actively detected
   */
  static triggerMotionPulse(roomsGroup: THREE.Group, roomId: string, active: boolean): void {
    for (const child of roomsGroup.children) {
      const userData = child.userData as RoomContainerUserData;
      if (userData && userData.roomId === roomId) {
        userData.motionActive = active;
        if (active) {
          userData.motionPhase = 0;
          const hl = child.getObjectByName('motionHighlight') as THREE.Mesh<
            THREE.BufferGeometry,
            THREE.MeshBasicMaterial
          > | null;
          const bd = child.getObjectByName('motionBorder') as THREE.LineLoop<
            THREE.BufferGeometry,
            THREE.LineBasicMaterial
          > | null;
          if (hl) hl.visible = true;
          if (bd) bd.visible = true;
        }
        break;
      }
    }
  }

  /**
   * Ticks motion sensor pulsating highlights across all active rooms.
   *
   * @param roomsGroup Group containing roomContainers
   * @param dtSec Elapsed delta time in seconds
   * @returns true if any room is actively pulsating or fading; false once settled (0 FPS idle)
   */
  static tickMotionPulses(roomsGroup: THREE.Group, dtSec: number): boolean {
    let anyActive = false;

    for (const child of roomsGroup.children) {
      const userData = child.userData as RoomContainerUserData;
      if (!userData || !userData.roomId) {
        continue;
      }

      const hl = child.getObjectByName('motionHighlight') as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
      > | null;
      const bd = child.getObjectByName('motionBorder') as THREE.LineLoop<
        THREE.BufferGeometry,
        THREE.LineBasicMaterial
      > | null;

      if (userData.motionActive) {
        anyActive = true;
        userData.motionPhase = (userData.motionPhase ?? 0) + dtSec * 3.5;
        const pulse = 0.22 + 0.14 * Math.sin(userData.motionPhase);

        if (hl) {
          hl.visible = true;
          hl.material.opacity = pulse;
        }
        if (bd) {
          bd.visible = true;
          bd.material.opacity = Math.min(1.0, pulse * 2.5);
        }
      } else {
        let stillFading = false;
        if (hl && hl.visible) {
          hl.material.opacity = Math.max(0, hl.material.opacity - dtSec * 4.0);
          if (hl.material.opacity <= 0) {
            hl.visible = false;
          } else {
            stillFading = true;
          }
        }
        if (bd && bd.visible) {
          bd.material.opacity = Math.max(0, bd.material.opacity - dtSec * 6.0);
          if (bd.material.opacity <= 0) {
            bd.visible = false;
          } else {
            stillFading = true;
          }
        }
        if (stillFading) {
          anyActive = true;
        } else {
          userData.motionPhase = 0;
        }
      }
    }

    return anyActive;
  }

  /**
   * Traverses group and disposes all geometries, materials, and procedural pattern textures.
   * Preserves shared lightmap texture.
   */
  static disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.LineLoop ||
        obj instanceof THREE.Line
      ) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) {
            if (mat instanceof THREE.MeshStandardMaterial) {
              if (mat.map) {
                mat.map.dispose();
              }
            }
            mat.dispose();
          }
        }
      }
    });
    group.clear();
  }

  // Instance methods delegating to static methods for interface flexibility
  buildFloorRooms(
    floor: FloorLevel,
    ambient: AmbientConfig,
    lightmapTexture?: THREE.Texture | null,
    bbox?: BoundingBox2D
  ): THREE.Group {
    return RoomBuilder3D.buildFloorRooms(floor, ambient, lightmapTexture, bbox);
  }

  triggerMotionPulse(roomsGroup: THREE.Group, roomId: string, active: boolean): void {
    RoomBuilder3D.triggerMotionPulse(roomsGroup, roomId, active);
  }

  tickMotionPulses(roomsGroup: THREE.Group, dtSec: number): boolean {
    return RoomBuilder3D.tickMotionPulses(roomsGroup, dtSec);
  }

  disposeGroup(group: THREE.Group): void {
    RoomBuilder3D.disposeGroup(group);
  }
}
