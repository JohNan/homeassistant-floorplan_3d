import * as THREE from 'three';
import type { AmbientConfig } from '../types/floorplan';
import type { HassEntity } from '../types/ha';
import type {
  BoundingBox2D,
  QualityProfile,
  ResolvedLightState
} from './contracts';

/**
 * Lighting Subsystem & PointLight Pool Manager (`LightPoolManager`)
 *
 * Manages:
 * 1. Global HemisphereLight for ambient sky/ground bounce
 * 2. Key DirectionalLight for architectural shadows (with cached shadow map)
 * 3. Fixed pool of dynamic non-shadow THREE.PointLight instances capped by QualityTier
 *    (High=8, Tablet=4, Low=0) to prevent WebGL uniform exhaustion on wall tablets.
 */
export class LightPoolManager {
  public rootGroup: THREE.Group;
  public lightGroup: THREE.Group;
  public profile: QualityProfile;

  public ambientLight: THREE.HemisphereLight;
  public keyDirectionalLight: THREE.DirectionalLight;
  public pointLights: THREE.PointLight[] = [];

  constructor(rootGroup: THREE.Group, profile: QualityProfile) {
    this.rootGroup = rootGroup;
    this.profile = profile;

    this.lightGroup = new THREE.Group();
    this.lightGroup.name = 'LightPoolGroup';
    this.rootGroup.add(this.lightGroup);

    // 1. Ambient hemisphere light (cool sky, warm/dark ground bounce)
    this.ambientLight = new THREE.HemisphereLight(0x8fa8c4, 0x252830, 0.25);
    this.ambientLight.name = 'AmbientHemisphereLight';
    this.lightGroup.add(this.ambientLight);

    // 2. Key directional light with cached architectural shadow map
    this.keyDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
    this.keyDirectionalLight.name = 'KeyDirectionalLight';
    this.keyDirectionalLight.position.set(15, 25, 20);

    // Ensure directional light target is part of the scene graph
    this.lightGroup.add(this.keyDirectionalLight.target);
    this.lightGroup.add(this.keyDirectionalLight);

    this._configureShadows();
    this._rebuildPointLightPool();
  }

  /**
   * Reconfigures light pool and shadow maps when quality profile changes.
   */
  public setQualityProfile(profile: QualityProfile): void {
    this.profile = profile;
    this._configureShadows();
    this._rebuildPointLightPool();
  }

  /**
   * Sets key directional light's cached shadow map dirty for re-render.
   */
  public markShadowMapDirty(): void {
    if (this.profile.shadowsEnabled) {
      this.keyDirectionalLight.shadow.needsUpdate = true;
    }
  }

  /**
   * Updates ambient hemisphere lighting and sun position/intensity according to AmbientMode.
   */
  public updateAmbientAndSun(
    ambient: AmbientConfig,
    sunEntity?: HassEntity,
    bbox?: BoundingBox2D
  ): void {
    const cx = bbox ? bbox.centerX : 0;
    const cy = bbox ? bbox.centerY : 0;

    // Update directional shadow camera bounds if bounding box is provided
    if (bbox && this.profile.shadowsEnabled) {
      const radius = Math.max(bbox.width, bbox.height, 10) * 0.75;
      const cam = this.keyDirectionalLight.shadow.camera;
      cam.left = -radius;
      cam.right = radius;
      cam.top = radius;
      cam.bottom = -radius;
      cam.near = 0.5;
      cam.far = Math.max(100, radius * 4);
      cam.updateProjectionMatrix();
    }

    switch (ambient.mode) {
      case 'dark': {
        // Deep night ambient mode
        this.ambientLight.color.setHex(0x182030);
        this.ambientLight.groundColor.setHex(0x080c14);
        this.ambientLight.intensity = 0.12;

        this.keyDirectionalLight.color.setHex(0x607090);
        this.keyDirectionalLight.intensity = 0.08;
        this.keyDirectionalLight.position.set(cx + 10, 20, cy + 10);
        this.keyDirectionalLight.target.position.set(cx, 0, cy);
        break;
      }

      case 'daylight': {
        // Bright natural daylight mode
        this.ambientLight.color.setHex(0xeef5ff);
        this.ambientLight.groundColor.setHex(0xd8dfd0);
        this.ambientLight.intensity = 0.85;

        this.keyDirectionalLight.color.setHex(0xfffbf0);
        this.keyDirectionalLight.intensity = 1.1;
        this.keyDirectionalLight.position.set(cx + 15, 30, cy + 20);
        this.keyDirectionalLight.target.position.set(cx, 0, cy);
        break;
      }

      case 'sun_sync': {
        // Sun-synchronized dynamic lighting from sun.sun elevation & azimuth
        const rawElevation =
          typeof sunEntity?.attributes?.elevation === 'number'
            ? sunEntity.attributes.elevation
            : 25;
        const rawAzimuth =
          typeof sunEntity?.attributes?.azimuth === 'number'
            ? sunEntity.attributes.azimuth
            : 180;

        const elevation = Math.max(-20, Math.min(70, rawElevation));
        const azimuth = ((rawAzimuth % 360) + 360) % 360;

        const azRad = THREE.MathUtils.degToRad(azimuth);
        const elRad = THREE.MathUtils.degToRad(Math.max(-5, elevation));
        const distance = 35;

        // Position directional light according to solar azimuth/elevation
        const sunX = Math.sin(azRad) * Math.cos(elRad) * distance;
        const sunY = Math.max(2.0, Math.sin(elRad) * distance);
        const sunZ = Math.cos(azRad) * Math.cos(elRad) * distance;

        this.keyDirectionalLight.position.set(cx + sunX, sunY, cy + sunZ);
        this.keyDirectionalLight.target.position.set(cx, 0, cy);

        if (elevation <= 0) {
          // Night twilight (-20° to 0°)
          const t = Math.max(0, Math.min(1, (elevation + 20) / 20));
          this.ambientLight.color.setHex(0x121b2d);
          this.ambientLight.groundColor.setHex(0x080d18);
          this.ambientLight.intensity = THREE.MathUtils.lerp(0.08, 0.15, t);

          this.keyDirectionalLight.color.setHex(0x7088b0);
          this.keyDirectionalLight.intensity = THREE.MathUtils.lerp(
            0.02,
            0.1,
            t
          );
        } else if (elevation <= 15) {
          // Golden hour / sunrise / sunset (0° to 15°)
          const t = Math.max(0, Math.min(1, elevation / 15));
          const skyColor = new THREE.Color(0xff7a40).lerp(
            new THREE.Color(0x8ab4f8),
            t
          );
          this.ambientLight.color.copy(skyColor);
          this.ambientLight.groundColor.setHex(0x281e18);
          this.ambientLight.intensity = THREE.MathUtils.lerp(0.15, 0.5, t);

          const sunColor = new THREE.Color(0xff7e33).lerp(
            new THREE.Color(0xffdf88),
            t
          );
          this.keyDirectionalLight.color.copy(sunColor);
          this.keyDirectionalLight.intensity = THREE.MathUtils.lerp(
            0.1,
            0.85,
            t
          );
        } else {
          // High sun daylight (15° to 70°)
          const t = Math.max(0, Math.min(1, (elevation - 15) / 55));
          const skyColor = new THREE.Color(0x8ab4f8).lerp(
            new THREE.Color(0xeaf2ff),
            t
          );
          this.ambientLight.color.copy(skyColor);
          this.ambientLight.groundColor.setHex(0xd0d8c8);
          this.ambientLight.intensity = THREE.MathUtils.lerp(0.5, 0.85, t);

          const sunColor = new THREE.Color(0xffdf88).lerp(
            new THREE.Color(0xfffaee),
            t
          );
          this.keyDirectionalLight.color.copy(sunColor);
          this.keyDirectionalLight.intensity = THREE.MathUtils.lerp(
            0.85,
            1.2,
            t
          );
        }
        break;
      }

      case 'adaptive_contrast':
      default: {
        // Dimmed cool-slate ambient so active smart lights pop vividly
        const intensity = ambient.base_ambient_intensity ?? 0.25;
        this.ambientLight.color.setHex(0x8fa8c4);
        this.ambientLight.groundColor.setHex(0x252830);
        this.ambientLight.intensity = intensity;

        this.keyDirectionalLight.color.setHex(0xf0f4f8);
        this.keyDirectionalLight.intensity = 0.35;
        this.keyDirectionalLight.position.set(cx + 15, 25, cy + 20);
        this.keyDirectionalLight.target.position.set(cx, 0, cy);
        break;
      }
    }

    if (this.profile.shadowsEnabled) {
      this.keyDirectionalLight.shadow.needsUpdate = true;
    }
  }

  /**
   * Dynamically assigns the top K brightest active lights to the pooled PointLight objects.
   */
  public syncPointLights(
    lights: ResolvedLightState[],
    floorElevation: number,
    cameraTarget?: THREE.Vector3
  ): void {
    const candidateLights = lights.filter(
      l => l.isOn && l.brightness > 0.01 && l.castRealPointLight !== false
    );

    // Sort active lights by intensity and proximity to camera target
    candidateLights.sort((a, b) => {
      const priorityA = a.brightness * a.intensityMultiplier;
      const priorityB = b.brightness * b.intensityMultiplier;

      if (!cameraTarget) {
        return priorityB - priorityA;
      }

      const distA = Math.hypot(
        a.x - cameraTarget.x,
        floorElevation + a.zElevation - cameraTarget.y,
        a.y - cameraTarget.z
      );
      const distB = Math.hypot(
        b.x - cameraTarget.x,
        floorElevation + b.zElevation - cameraTarget.y,
        b.y - cameraTarget.z
      );

      const scoreA = priorityA * (1.0 + 1.0 / (1.0 + distA * 0.1));
      const scoreB = priorityB * (1.0 + 1.0 / (1.0 + distB * 0.1));
      return scoreB - scoreA;
    });

    const poolSize = this.pointLights.length;
    for (let i = 0; i < poolSize; i++) {
      const pl = this.pointLights[i];
      if (i < candidateLights.length) {
        const l = candidateLights[i];
        pl.visible = true;
        pl.position.set(l.x, floorElevation + l.zElevation, l.y);
        pl.color.setRGB(l.rgb[0], l.rgb[1], l.rgb[2]);
        pl.intensity = l.brightness * l.intensityMultiplier * 2.2;
        pl.distance = l.radiusM * 1.4;
        pl.decay = 1.8;
      } else {
        pl.visible = false;
        pl.intensity = 0;
      }
    }
  }

  /**
   * Disposes all lights and removes them from the scene graph.
   */
  public dispose(): void {
    for (const pl of this.pointLights) {
      pl.visible = false;
      this.lightGroup.remove(pl);
      pl.dispose();
    }
    this.pointLights = [];

    this.lightGroup.remove(this.ambientLight);
    this.ambientLight.dispose();

    this.lightGroup.remove(this.keyDirectionalLight.target);
    this.lightGroup.remove(this.keyDirectionalLight);
    this.keyDirectionalLight.dispose();

    this.rootGroup.remove(this.lightGroup);
  }

  private _configureShadows(): void {
    if (this.profile.shadowsEnabled) {
      this.keyDirectionalLight.castShadow = true;
      this.keyDirectionalLight.shadow.mapSize.width =
        this.profile.shadowMapSize;
      this.keyDirectionalLight.shadow.mapSize.height =
        this.profile.shadowMapSize;
      this.keyDirectionalLight.shadow.bias = -0.0005;
      this.keyDirectionalLight.shadow.normalBias = 0.02;
      // Cached shadow map: autoUpdate is disabled, refreshed only on demand
      this.keyDirectionalLight.shadow.autoUpdate = false;
      this.keyDirectionalLight.shadow.needsUpdate = true;
    } else {
      this.keyDirectionalLight.castShadow = false;
    }
  }

  private _rebuildPointLightPool(): void {
    const targetCount = this.profile.maxPointLights;

    while (this.pointLights.length < targetCount) {
      const pl = new THREE.PointLight(0xffffff, 0, 10, 1.8);
      // Non-shadow casting to protect mobile GPUs
      pl.castShadow = false;
      pl.visible = false;
      this.lightGroup.add(pl);
      this.pointLights.push(pl);
    }

    while (this.pointLights.length > targetCount) {
      const pl = this.pointLights.pop();
      if (pl) {
        pl.visible = false;
        this.lightGroup.remove(pl);
        pl.dispose();
      }
    }
  }
}
