import * as THREE from 'three';
import type { AmbientConfig, FloorLevel } from '../types/floorplan';
import type { BoundingBox2D, ResolvedLightState } from './contracts';
import { VisibilityPolygonCache } from '../utils/visibility2d';
import { computeFloorBoundingBox2D } from '../utils/geometry2d';

/**
 * Dynamic 2D Wall-Occluded Floor Lightmap Synthesizer (`LightmapBaker2D`)
 *
 * Synthesizes an additive world-space canvas lightmap texture for a floor level.
 * Light cones and gradients are clipped by 2D rotational-sweep visibility polygons,
 * guaranteeing zero light bleed across walls and closed doors on mobile/tablet GPUs.
 */
export class LightmapBaker2D {
  public size: number;
  public canvas: HTMLCanvasElement | OffscreenCanvas | any;
  public texture: THREE.CanvasTexture;
  public visibilityCache: VisibilityPolygonCache;

  constructor(size = 512) {
    this.size = size;
    this.visibilityCache = new VisibilityPolygonCache();

    if (
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function'
    ) {
      const el = document.createElement('canvas');
      el.width = size;
      el.height = size;
      this.canvas = el;
    } else if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(size, size);
    } else {
      this.canvas = { width: size, height: size };
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  /**
   * Returns the synthesized Three.js CanvasTexture for material binding.
   */
  public getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  /**
   * Resizes the canvas lightmap texture (e.g. 512 on high/tablet, 256 on low tier).
   */
  public setSize(size: number): void {
    if (this.size === size) return;
    this.size = size;
    if (this.canvas) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
    this.texture.needsUpdate = true;
  }

  /**
   * Invalidates precomputed visibility polygons for one or all lights.
   */
  public invalidateVisibilityCache(lightId?: string): void {
    this.visibilityCache.invalidate(lightId);
  }

  /**
   * Bakes floor lightmap texture by clipping active light gradients to 2D visibility polygons.
   */
  public bakeFloorLightmap(
    floor: FloorLevel,
    activeLights: ResolvedLightState[],
    openDoorIds: ReadonlySet<string>,
    ambient: AmbientConfig,
    bbox?: BoundingBox2D
  ): THREE.CanvasTexture {
    const floorBbox = bbox ?? computeFloorBoundingBox2D(floor);
    const width = Math.max(floorBbox.width, 0.001);
    const height = Math.max(floorBbox.height, 0.001);

    const filteredLights = activeLights.filter(
      l => l.isOn && l.brightness > 0.01
    );

    // Always run visibility cache calculation so tests & spatial queries work
    // even in headless environments where 2D canvas context is unavailable
    const cachedPolygons: Array<{
      light: ResolvedLightState;
      polygon: Array<{ x: number; y: number }>;
    }> = [];

    for (const light of filteredLights) {
      const visPoly = this.visibilityCache.getOrCompute(
        light.placementId,
        { x: light.x, y: light.y },
        light.radiusM,
        floor,
        openDoorIds
      );
      cachedPolygons.push({ light, polygon: visPoly });
    }

    let ctx: CanvasRenderingContext2D | null = null;
    if (this.canvas && typeof this.canvas.getContext === 'function') {
      try {
        ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
      } catch {
        ctx = null;
      }
    }

    if (ctx) {
      ctx.save();

      // Base ambient floor clear (dark navy/charcoal base)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, this.size, this.size);

      // Additive blending for overlapping light sources
      ctx.globalCompositeOperation = 'lighter';

      const scaleX = this.size / width;
      const scaleY = this.size / height;
      const scaleAvg = (scaleX + scaleY) / 2;

      for (const { light, polygon } of cachedPolygons) {
        const px = ((light.x - floorBbox.minX) / width) * this.size;
        const py = ((light.y - floorBbox.minY) / height) * this.size;
        const radiusPx = Math.max(1, light.radiusM * scaleAvg);

        const r = Math.round(
          Math.max(0, Math.min(1, light.rgb[0])) * 255
        );
        const g = Math.round(
          Math.max(0, Math.min(1, light.rgb[1])) * 255
        );
        const b = Math.round(
          Math.max(0, Math.min(1, light.rgb[2])) * 255
        );
        const effectiveIntensity = Math.min(
          1.0,
          Math.max(0.0, light.brightness * light.intensityMultiplier)
        );

        ctx.save();

        // 1. Build clipping path from 2D visibility polygon
        if (polygon.length >= 3) {
          ctx.beginPath();
          const startPx = ((polygon[0].x - floorBbox.minX) / width) * this.size;
          const startPy =
            ((polygon[0].y - floorBbox.minY) / height) * this.size;
          ctx.moveTo(startPx, startPy);

          for (let i = 1; i < polygon.length; i++) {
            const pxi =
              ((polygon[i].x - floorBbox.minX) / width) * this.size;
            const pyi =
              ((polygon[i].y - floorBbox.minY) / height) * this.size;
            ctx.lineTo(pxi, pyi);
          }
          ctx.closePath();
          ctx.clip();
        }

        // 2. Render light glow within clipped area
        if (
          light.kind === 'strip' &&
          light.stripPoints &&
          light.stripPoints.length >= 2
        ) {
          const stripCanvasPoints = light.stripPoints.map(pt => ({
            x: ((pt.x - floorBbox.minX) / width) * this.size,
            y: ((pt.y - floorBbox.minY) / height) * this.size
          }));

          const passes = [
            { width: radiusPx * 0.9, alpha: 0.12 * effectiveIntensity },
            { width: radiusPx * 0.5, alpha: 0.28 * effectiveIntensity },
            {
              width: Math.max(2, radiusPx * 0.2),
              alpha: 0.65 * effectiveIntensity
            },
            {
              width: Math.max(1, radiusPx * 0.08),
              alpha: 0.95 * effectiveIntensity
            }
          ];

          for (const pass of passes) {
            ctx.beginPath();
            ctx.moveTo(stripCanvasPoints[0].x, stripCanvasPoints[0].y);
            for (let i = 1; i < stripCanvasPoints.length; i++) {
              ctx.lineTo(stripCanvasPoints[i].x, stripCanvasPoints[i].y);
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = pass.width;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pass.alpha.toFixed(3)})`;
            ctx.stroke();
          }
        } else {
          // Radial gradient with smooth cubic falloff
          const grad = ctx.createRadialGradient(
            px,
            py,
            0,
            px,
            py,
            radiusPx
          );
          grad.addColorStop(
            0.0,
            `rgba(${r}, ${g}, ${b}, ${effectiveIntensity.toFixed(3)})`
          );
          grad.addColorStop(
            0.2,
            `rgba(${r}, ${g}, ${b}, ${(effectiveIntensity * 0.72).toFixed(3)})`
          );
          grad.addColorStop(
            0.5,
            `rgba(${r}, ${g}, ${b}, ${(effectiveIntensity * 0.35).toFixed(3)})`
          );
          grad.addColorStop(
            0.8,
            `rgba(${r}, ${g}, ${b}, ${(effectiveIntensity * 0.1).toFixed(3)})`
          );
          grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();
    }

    this.texture.needsUpdate = true;
    return this.texture;
  }

  /**
   * Disposes the canvas texture and frees visibility polygon cache.
   */
  public dispose(): void {
    this.texture.dispose();
    this.visibilityCache.invalidate();
  }
}
