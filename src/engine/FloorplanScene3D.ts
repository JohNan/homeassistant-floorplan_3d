import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  AmbientConfig,
  AmbientMode,
  CameraBookmark,
  CameraProjection,
  EntityPlacement,
  FloorLevel,
  FloorplanDocument,
  QualityTier,
  RoomPolygon,
  WallDisplayMode,
  WallOpening
} from '../types/floorplan';
import type { HomeAssistant } from '../types/ha';
import type {
  BoundingBox2D,
  EntityActionDispatchDetail,
  QualityProfile,
  ResolvedEntityVisualState,
  ResolvedLightState,
  ResolvedRoomSummary
} from './contracts';
import {
  computeFloorBoundingBox2D,
  findPolygonLabelCenter2D,
  pointInPolygon2D,
  polygonCentroid2D
} from '../utils/geometry2d';
import { lerpRgb, normalizedRgbToHex } from '../utils/color';
import {
  isOpeningContactOpen,
  resolveEntityVisualState,
  resolveLightState,
  resolveRoomSummary
} from '../utils/ha-registry';
import { RenderLoopController } from './RenderLoopController';
import { WallBuilder3D } from './WallBuilder3D';
import { RoomBuilder3D } from './RoomBuilder3D';
import { LightmapBaker2D } from './LightmapBaker2D';
import { LightPoolManager } from './LightPoolManager';
import { ProceduralCatalog3D } from './ProceduralCatalog3D';
import { BadgeOverlayManager } from './BadgeOverlayManager';

export interface FloorplanSceneOptions {
  qualityTier?: QualityTier;
  wallMode?: WallDisplayMode;
  projection?: CameraProjection;
  ambientMode?: AmbientMode;
  showRoomLabels?: boolean;
  showEntityBadges?: boolean;
  onEntityAction?: (detail: EntityActionDispatchDetail) => void;
  onCameraChanged?: (bookmark: CameraBookmark) => void;
}

interface FloorSceneRecord {
  floor: FloorLevel;
  bbox: BoundingBox2D;
  rootGroup: THREE.Group;
  roomsGroup: THREE.Group;
  wallsGroup: THREE.Group;
  openingsGroup: THREE.Group;
  furnitureGroup: THREE.Group;
  entitiesGroup: THREE.Group;
  overlaysGroup: THREE.Group;
  lightmapBaker: LightmapBaker2D;
  openingGroupsById: Map<string, THREE.Group>;
  entityGroupsById: Map<string, THREE.Group>;
  lightStatesById: Map<string, ResolvedLightState>;
  entityVisualStatesById: Map<string, ResolvedEntityVisualState>;
  openDoorIds: Set<string>;
}

/**
 * Central Three.js 3D Scene Orchestrator shared by `<floorplan-3d-card>` and `<floorplan-editor-panel>`.
 */
export class FloorplanScene3D {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly rootWorldGroup: THREE.Group;
  private renderer: THREE.WebGLRenderer | null = null;
  private perspectiveCamera: THREE.PerspectiveCamera;
  private orthoCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private qualityProfile: QualityProfile;
  private readonly renderLoop: RenderLoopController;
  private readonly lightPool: LightPoolManager;
  private readonly badgeOverlay: BadgeOverlayManager;

  private document: FloorplanDocument | null = null;
  private hass: HomeAssistant | undefined;
  private activeFloorId: string | null = null;
  private stackedDollhouse = false;
  private wallMode: WallDisplayMode;
  private projection: CameraProjection;
  private ambientModeOverride: AmbientMode | null = null;
  private showRoomLabels: boolean;
  private showEntityBadges: boolean;

  private readonly floorRecords = new Map<string, FloorSceneRecord>();
  private readonly onEntityAction?: (detail: EntityActionDispatchDetail) => void;
  private readonly onCameraChanged?: (bookmark: CameraBookmark) => void;
  private readonly pointerDownPos = { x: 0, y: 0 };
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();

  constructor(container: HTMLElement, options: FloorplanSceneOptions = {}) {
    this.container = container;
    this.wallMode = options.wallMode ?? 'auto_cutaway';
    this.projection = options.projection ?? 'perspective';
    this.ambientModeOverride = options.ambientMode ?? null;
    this.showRoomLabels = options.showRoomLabels ?? true;
    this.showEntityBadges = options.showEntityBadges ?? true;
    this.onEntityAction = options.onEntityAction;
    this.onCameraChanged = options.onCameraChanged;

    this.qualityProfile = RenderLoopController.resolveQualityProfile(
      options.qualityTier ?? 'auto'
    );

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f172a');
    this.rootWorldGroup = new THREE.Group();
    this.scene.add(this.rootWorldGroup);

    const width = Math.max(1, container.clientWidth || 800);
    const height = Math.max(1, container.clientHeight || 520);
    const aspect = width / height;

    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 250);
    this.perspectiveCamera.position.set(0, 12, 11);

    const frustumSize = 14;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      250
    );
    this.orthoCamera.position.set(0, 14, 12);

    this.activeCamera =
      this.projection === 'orthographic' ? this.orthoCamera : this.perspectiveCamera;

    this.initWebGLRenderer(width, height);
    this.initOrbitControls();

    this.lightPool = new LightPoolManager(this.rootWorldGroup, this.qualityProfile);
    this.badgeOverlay = new BadgeOverlayManager(this.container, (detail) => {
      if (detail.actionConfig.action === 'zoom-room' && detail.room) {
        this.focusOnRoom(detail.room.id, true);
      }
      this.onEntityAction?.(detail);
    });
    this.badgeOverlay.setSize(width, height);
    this.badgeOverlay.setVisibility({
      showRoomLabels: this.showRoomLabels,
      showEntityBadges: this.showEntityBadges
    });

    this.renderLoop = new RenderLoopController((dtSec) => this.onRenderFrame(dtSec));
    this.renderLoop.start();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  private initWebGLRenderer(width: number, height: number): void {
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: this.qualityProfile.antialias,
        powerPreference: 'high-performance',
        alpha: false
      });
      renderer.setPixelRatio(this.qualityProfile.pixelRatio);
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = this.qualityProfile.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
      renderer.domElement.addEventListener('pointerup', this.handleCanvasPointerUp);

      this.container.appendChild(renderer.domElement);
      this.renderer = renderer;
    } catch {
      // Headless / jsdom fallback where WebGL context is unavailable
      this.renderer = null;
    }
  }

  private initOrbitControls(): void {
    const domElement = this.renderer?.domElement ?? this.container;
    const controls = new OrbitControls(this.activeCamera, domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.06; // Prevent camera going underneath floor slab
    controls.minPolarAngle = 0.08;
    controls.minDistance = 2.0;
    controls.maxDistance = 65.0;
    controls.target.set(0, 0, 0);

    controls.addEventListener('change', () => {
      this.renderLoop.markDirty();
    });
    controls.addEventListener('end', () => {
      this.onCameraChanged?.(this.getCurrentCameraBookmark());
    });
    this.controls = controls;
  }

  private handleCanvasPointerDown = (ev: PointerEvent): void => {
    this.pointerDownPos.x = ev.clientX;
    this.pointerDownPos.y = ev.clientY;
  };

  private handleCanvasPointerUp = (ev: PointerEvent): void => {
    if (!this.renderer || !this.document) return;
    const dist = Math.hypot(
      ev.clientX - this.pointerDownPos.x,
      ev.clientY - this.pointerDownPos.y
    );
    if (dist > 6) return; // Ignore camera orbit drags

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this.pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.activeCamera);
    const activeRecord = this.getActiveFloorRecord();
    if (!activeRecord) return;

    // 1. Check 3D entity meshes first
    const entityHits = this.raycaster.intersectObjects(
      activeRecord.entitiesGroup.children,
      true
    );
    if (entityHits.length > 0) {
      let obj: THREE.Object3D | null = entityHits[0].object;
      while (obj && !obj.userData?.placementId) {
        obj = obj.parent;
      }
      if (obj?.userData?.placementId) {
        const placement = activeRecord.floor.entities.find(
          (e) => e.id === obj!.userData.placementId
        );
        if (placement) {
          this.onEntityAction?.({
            entityId: placement.entity_id,
            placement,
            trigger: 'tap',
            actionConfig: placement.tap_action
          });
          return;
        }
      }
    }

    // 2. Check room floor slabs
    const roomHits = this.raycaster.intersectObjects(
      activeRecord.roomsGroup.children,
      true
    );
    if (roomHits.length > 0) {
      let obj: THREE.Object3D | null = roomHits[0].object;
      while (obj && !obj.userData?.roomId) {
        obj = obj.parent;
      }
      if (obj?.userData?.roomId) {
        const room = activeRecord.floor.rooms.find((r) => r.id === obj!.userData.roomId);
        if (room && room.room_tap_action.action !== 'none') {
          if (room.room_tap_action.action === 'zoom-room') {
            this.focusOnRoom(room.id, true);
          }
          this.onEntityAction?.({
            room,
            trigger: 'tap',
            actionConfig: room.room_tap_action
          });
        }
      }
    }
  };

  public setDocument(
    doc: FloorplanDocument,
    activeFloorId?: string,
    hass?: HomeAssistant
  ): void {
    this.document = doc;
    if (hass) {
      this.hass = hass;
    }

    this.clearAllFloorRecords();

    const sortedFloors = [...doc.floors].sort((a, b) => a.level_index - b.level_index);
    for (const floor of sortedFloors) {
      const record = this.buildFloorSceneRecord(floor, doc.ambient_config);
      this.floorRecords.set(floor.id, record);
      this.rootWorldGroup.add(record.rootGroup);
    }

    const targetFloorId =
      activeFloorId && this.floorRecords.has(activeFloorId)
        ? activeFloorId
        : (sortedFloors.find((f) => f.level_index === 0)?.id ?? sortedFloors[0]?.id ?? null);

    this.activeFloorId = targetFloorId;
    this.scene.background = new THREE.Color(doc.ambient_config.background_color || '#0f172a');

    this.applyFloorVisibility();
    this.syncLightingAndOverlays();

    const activeRecord = this.getActiveFloorRecord();
    if (activeRecord?.floor.default_camera) {
      this.applyCameraBookmark(activeRecord.floor.default_camera, false);
    } else if (activeRecord) {
      this.fitCameraToFloor(activeRecord, false);
    }

    this.lightPool.markShadowMapDirty();
    this.renderLoop.markDirty();
  }

  private buildFloorSceneRecord(
    floor: FloorLevel,
    ambient: AmbientConfig
  ): FloorSceneRecord {
    const bbox = computeFloorBoundingBox2D(floor, 2.0);
    const lightmapBaker = new LightmapBaker2D(this.qualityProfile.lightmapSize);
    const lightmapTexture = lightmapBaker.getTexture();

    const rootGroup = new THREE.Group();
    rootGroup.name = `floor_${floor.id}`;

    const openDoorIds = new Set<string>();
    for (const opening of floor.openings) {
      if (isOpeningContactOpen(opening, this.hass)) {
        openDoorIds.add(opening.id);
      }
    }

    const lightStatesById = new Map<string, ResolvedLightState>();
    const entityVisualStatesById = new Map<string, ResolvedEntityVisualState>();

    for (const placement of floor.entities) {
      const visualState = resolveEntityVisualState(placement, this.hass);
      entityVisualStatesById.set(placement.id, visualState);

      const lightState = resolveLightState(placement, this.hass);
      if (lightState) {
        lightStatesById.set(placement.id, lightState);
      }
    }

    // Bake initial 2D wall-occluded lightmap
    lightmapBaker.bakeFloorLightmap(
      floor,
      Array.from(lightStatesById.values()),
      openDoorIds,
      this.getEffectiveAmbientConfig(ambient),
      bbox
    );

    const roomsGroup = RoomBuilder3D.buildFloorRooms(
      floor,
      this.getEffectiveAmbientConfig(ambient),
      lightmapTexture,
      bbox
    );
    const wallsGroup = WallBuilder3D.buildFloorWalls(
      floor,
      this.getEffectiveAmbientConfig(ambient),
      lightmapTexture,
      bbox
    );

    const openingsGroup = new THREE.Group();
    const openingGroupsById = new Map<string, THREE.Group>();
    const nodeMap = new Map(floor.nodes.map((n) => [n.id, n]));
    const wallMap = new Map(floor.walls.map((w) => [w.id, w]));

    for (const opening of floor.openings) {
      const wall = wallMap.get(opening.wall_id);
      if (!wall) continue;
      const startNode = nodeMap.get(wall.start_node_id);
      const endNode = nodeMap.get(wall.end_node_id);
      if (!startNode || !endNode) continue;
      const isOpen = openDoorIds.has(opening.id);
      const openingMesh = ProceduralCatalog3D.buildOpeningMesh(
        opening,
        wall,
        startNode,
        endNode,
        floor.elevation,
        isOpen ? 1 : 0
      );
      openingsGroup.add(openingMesh);
      openingGroupsById.set(opening.id, openingMesh);
    }

    const furnitureGroup = new THREE.Group();
    for (const item of floor.furniture) {
      const mesh = ProceduralCatalog3D.buildFurnitureMesh(item, floor.elevation);
      furnitureGroup.add(mesh);
    }

    const entitiesGroup = new THREE.Group();
    const entityGroupsById = new Map<string, THREE.Group>();
    for (const placement of floor.entities) {
      const visualState =
        entityVisualStatesById.get(placement.id) ??
        resolveEntityVisualState(placement, this.hass);
      const mesh = ProceduralCatalog3D.buildEntityMesh(
        placement,
        visualState,
        floor.elevation
      );
      entitiesGroup.add(mesh);
      entityGroupsById.set(placement.id, mesh);
    }

    const overlaysGroup = new THREE.Group();

    rootGroup.add(
      roomsGroup,
      wallsGroup,
      openingsGroup,
      furnitureGroup,
      entitiesGroup,
      overlaysGroup
    );

    return {
      floor,
      bbox,
      rootGroup,
      roomsGroup,
      wallsGroup,
      openingsGroup,
      furnitureGroup,
      entitiesGroup,
      overlaysGroup,
      lightmapBaker,
      openingGroupsById,
      entityGroupsById,
      lightStatesById,
      entityVisualStatesById,
      openDoorIds
    };
  }

  private computeRoomSummaries(floor: FloorLevel): ResolvedRoomSummary[] {
    return floor.rooms.map((room) => {
      const center = findPolygonLabelCenter2D(room.points);
      return resolveRoomSummary(room, floor, this.hass, center);
    });
  }

  private getEffectiveAmbientConfig(base: AmbientConfig): AmbientConfig {
    if (!this.ambientModeOverride) return base;
    return {
      ...base,
      mode: this.ambientModeOverride
    };
  }

  public setActiveFloor(floorId: string, stackedDollhouse = this.stackedDollhouse): void {
    if (!this.floorRecords.has(floorId)) return;
    this.activeFloorId = floorId;
    this.stackedDollhouse = stackedDollhouse;
    this.applyFloorVisibility();
    this.syncLightingAndOverlays();

    const activeRecord = this.getActiveFloorRecord();
    if (activeRecord?.floor.default_camera) {
      this.applyCameraBookmark(activeRecord.floor.default_camera, true);
    } else if (activeRecord) {
      this.fitCameraToFloor(activeRecord, true);
    }

    this.lightPool.markShadowMapDirty();
    this.renderLoop.markDirty();
  }

  public setStackedDollhouse(enabled: boolean): void {
    this.stackedDollhouse = enabled;
    this.applyFloorVisibility();
    this.syncLightingAndOverlays();
    this.lightPool.markShadowMapDirty();
    this.renderLoop.markDirty();
  }

  public isStackedDollhouse(): boolean {
    return this.stackedDollhouse;
  }

  public getActiveFloorId(): string | null {
    return this.activeFloorId;
  }

  private getActiveFloorRecord(): FloorSceneRecord | undefined {
    if (!this.activeFloorId) return undefined;
    return this.floorRecords.get(this.activeFloorId);
  }

  private applyFloorVisibility(): void {
    const activeRecord = this.getActiveFloorRecord();
    const activeLevelIndex = activeRecord?.floor.level_index ?? 0;

    for (const [id, record] of this.floorRecords.entries()) {
      if (this.stackedDollhouse) {
        // Show all floors up to and including the selected floor in dollhouse view
        record.rootGroup.visible = record.floor.level_index <= activeLevelIndex;
      } else {
        record.rootGroup.visible = id === this.activeFloorId;
      }
    }
  }

  private syncLightingAndOverlays(): void {
    if (!this.document) return;
    const activeRecord = this.getActiveFloorRecord();
    if (!activeRecord) return;

    const effectiveAmbient = this.getEffectiveAmbientConfig(this.document.ambient_config);
    const sunEntity = this.hass?.states[effectiveAmbient.sun_entity_id || 'sun.sun'];

    this.lightPool.updateAmbientAndSun(effectiveAmbient, sunEntity, activeRecord.bbox);
    this.lightPool.syncPointLights(
      Array.from(activeRecord.lightStatesById.values()),
      activeRecord.floor.elevation,
      this.controls?.target
    );

    const summaries = this.computeRoomSummaries(activeRecord.floor);
    for (const summary of summaries) {
      RoomBuilder3D.triggerMotionPulse(
        activeRecord.roomsGroup,
        summary.roomId,
        summary.motionDetected
      );
    }

    // Rebuild CSS2D overlays on the active floor
    activeRecord.rootGroup.remove(activeRecord.overlaysGroup);
    activeRecord.overlaysGroup = this.badgeOverlay.rebuildFloorOverlays(
      activeRecord.floor,
      summaries,
      activeRecord.entityVisualStatesById
    );
    activeRecord.rootGroup.add(activeRecord.overlaysGroup);
  }

  public updateHassStates(hass: HomeAssistant, _changedEntityIds?: string[]): void {
    this.hass = hass;
    if (!this.document) return;

    const effectiveAmbient = this.getEffectiveAmbientConfig(this.document.ambient_config);
    const sunEntity = hass.states[effectiveAmbient.sun_entity_id || 'sun.sun'];
    const activeRecord = this.getActiveFloorRecord();
    if (activeRecord) {
      this.lightPool.updateAmbientAndSun(effectiveAmbient, sunEntity, activeRecord.bbox);
    }

    for (const record of this.floorRecords.values()) {
      let doorStateChanged = false;

      // 1. Check door/window contact sensors (`400ms` hinge swing tween)
      for (const opening of record.floor.openings) {
        if (!opening.bound_entity_id) continue;
        const isOpen = isOpeningContactOpen(opening, hass);
        const wasOpen = record.openDoorIds.has(opening.id);
        if (isOpen !== wasOpen) {
          doorStateChanged = true;
          if (isOpen) {
            record.openDoorIds.add(opening.id);
          } else {
            record.openDoorIds.delete(opening.id);
          }
          const openingGroup = record.openingGroupsById.get(opening.id);
          if (openingGroup) {
            const startVal = wasOpen ? 1 : 0;
            const endVal = isOpen ? 1 : 0;
            this.renderLoop.addTween({
              id: `opening_${opening.id}`,
              startTimeMs: performance.now(),
              durationMs: 400,
              onUpdate: (t) => {
                const progress = startVal + (endVal - startVal) * t;
                ProceduralCatalog3D.updateOpeningSwing(openingGroup, progress);
              }
            });
          }
        }
      }

      if (doorStateChanged) {
        record.lightmapBaker.invalidateVisibilityCache();
      }

      // 2. Check entity visual & light transitions (`300ms` color/brightness lerp)
      let anyLightChanged = doorStateChanged;
      let anyFanActive = false;

      for (const placement of record.floor.entities) {
        const nextVisual = resolveEntityVisualState(placement, hass);
        record.entityVisualStatesById.set(placement.id, nextVisual);

        const entityGroup = record.entityGroupsById.get(placement.id);
        if (entityGroup) {
          ProceduralCatalog3D.updateEntityMeshState(entityGroup, nextVisual);
        }

        if (placement.mesh_type === 'ceiling_fan' && nextVisual.isActive) {
          anyFanActive = true;
        }

        const nextLight = resolveLightState(placement, hass);
        const prevLight = record.lightStatesById.get(placement.id);
        if (nextLight && prevLight) {
          const brightnessDiff = Math.abs(nextLight.brightness - prevLight.brightness);
          const colorDiff =
            Math.abs(nextLight.rgb[0] - prevLight.rgb[0]) +
            Math.abs(nextLight.rgb[1] - prevLight.rgb[1]) +
            Math.abs(nextLight.rgb[2] - prevLight.rgb[2]);

          if (nextLight.isOn !== prevLight.isOn || brightnessDiff > 0.01 || colorDiff > 0.01) {
            anyLightChanged = true;
            const startRgb: [number, number, number] = [...prevLight.rgb];
            const startBrightness = prevLight.isOn ? prevLight.brightness : 0;
            const targetRgb: [number, number, number] = [...nextLight.rgb];
            const targetBrightness = nextLight.isOn ? nextLight.brightness : 0;

            this.renderLoop.addTween({
              id: `light_${placement.id}`,
              startTimeMs: performance.now(),
              durationMs: 300,
              onUpdate: (t) => {
                const lerpedRgb = lerpRgb(startRgb, targetRgb, t);
                const lerpedBrightness =
                  startBrightness + (targetBrightness - startBrightness) * t;
                const interpolated: ResolvedLightState = {
                  ...nextLight,
                  isOn: lerpedBrightness > 0.01,
                  rgb: lerpedRgb,
                  hexColor: normalizedRgbToHex(lerpedRgb),
                  brightness: lerpedBrightness
                };
                record.lightStatesById.set(placement.id, interpolated);
                record.lightmapBaker.bakeFloorLightmap(
                  record.floor,
                  Array.from(record.lightStatesById.values()),
                  record.openDoorIds,
                  effectiveAmbient,
                  record.bbox
                );
                if (record.floor.id === this.activeFloorId) {
                  this.lightPool.syncPointLights(
                    Array.from(record.lightStatesById.values()),
                    record.floor.elevation,
                    this.controls?.target
                  );
                }
              }
            });
          } else {
            record.lightStatesById.set(placement.id, nextLight);
          }
        } else if (nextLight) {
          record.lightStatesById.set(placement.id, nextLight);
          anyLightChanged = true;
        }
      }

      this.renderLoop.setContinuousAnimation(`fans_${record.floor.id}`, anyFanActive);

      if (anyLightChanged) {
        record.lightmapBaker.bakeFloorLightmap(
          record.floor,
          Array.from(record.lightStatesById.values()),
          record.openDoorIds,
          effectiveAmbient,
          record.bbox
        );
      }

      if (record.floor.id === this.activeFloorId) {
        const summaries = this.computeRoomSummaries(record.floor);
        let anyMotion = false;
        for (const summary of summaries) {
          if (summary.motionDetected) anyMotion = true;
          RoomBuilder3D.triggerMotionPulse(
            record.roomsGroup,
            summary.roomId,
            summary.motionDetected
          );
        }
        this.renderLoop.setContinuousAnimation(`motion_${record.floor.id}`, anyMotion);
        this.lightPool.syncPointLights(
          Array.from(record.lightStatesById.values()),
          record.floor.elevation,
          this.controls?.target
        );
        this.badgeOverlay.updateFloorOverlays(summaries, record.entityVisualStatesById);
      }
    }

    this.renderLoop.markDirty();
  }

  public setWallMode(mode: WallDisplayMode): void {
    this.wallMode = mode;
    this.renderLoop.markDirty();
  }

  public getWallMode(): WallDisplayMode {
    return this.wallMode;
  }

  public setProjection(projection: CameraProjection): void {
    if (this.projection === projection) return;
    const prevCamera = this.activeCamera;
    const target = this.controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);

    this.projection = projection;
    this.activeCamera =
      projection === 'orthographic' ? this.orthoCamera : this.perspectiveCamera;
    this.activeCamera.position.copy(prevCamera.position);
    this.activeCamera.lookAt(target);

    if (this.controls) {
      this.controls.object = this.activeCamera;
      this.controls.target.copy(target);
      this.controls.update();
    }
    this.resize();
    this.renderLoop.markDirty();
  }

  public getProjection(): CameraProjection {
    return this.projection;
  }

  public setAmbientMode(mode: AmbientMode): void {
    this.ambientModeOverride = mode;
    this.syncLightingAndOverlays();
    this.renderLoop.markDirty();
  }

  public setQualityTier(tier: QualityTier): void {
    this.qualityProfile = RenderLoopController.resolveQualityProfile(tier);
    if (this.renderer) {
      this.renderer.setPixelRatio(this.qualityProfile.pixelRatio);
      this.renderer.shadowMap.enabled = this.qualityProfile.shadowsEnabled;
    }
    this.lightPool.setQualityProfile(this.qualityProfile);
    for (const record of this.floorRecords.values()) {
      record.lightmapBaker.setSize(this.qualityProfile.lightmapSize);
      if (this.document) {
        record.lightmapBaker.bakeFloorLightmap(
          record.floor,
          Array.from(record.lightStatesById.values()),
          record.openDoorIds,
          this.getEffectiveAmbientConfig(this.document.ambient_config),
          record.bbox
        );
      }
    }
    this.syncLightingAndOverlays();
    this.lightPool.markShadowMapDirty();
    this.renderLoop.markDirty();
  }

  public setOverlayVisibility(options: {
    showRoomLabels?: boolean;
    showEntityBadges?: boolean;
  }): void {
    if (options.showRoomLabels !== undefined) {
      this.showRoomLabels = options.showRoomLabels;
    }
    if (options.showEntityBadges !== undefined) {
      this.showEntityBadges = options.showEntityBadges;
    }
    this.badgeOverlay.setVisibility({
      showRoomLabels: this.showRoomLabels,
      showEntityBadges: this.showEntityBadges
    });
    this.renderLoop.markDirty();
  }

  public getCurrentCameraBookmark(): CameraBookmark {
    const pos = this.activeCamera.position;
    const target = this.controls?.target ?? new THREE.Vector3(0, 0, 0);
    return {
      projection: this.projection,
      position: [
        Number(pos.x.toFixed(3)),
        Number(pos.y.toFixed(3)),
        Number(pos.z.toFixed(3))
      ],
      target: [
        Number(target.x.toFixed(3)),
        Number(target.y.toFixed(3)),
        Number(target.z.toFixed(3))
      ],
      zoom: Number(this.activeCamera.zoom.toFixed(3))
    };
  }

  public applyCameraBookmark(bookmark: CameraBookmark, animate = true): void {
    if (bookmark.projection && bookmark.projection !== this.projection) {
      this.setProjection(bookmark.projection);
    }
    const startPos = this.activeCamera.position.clone();
    const startTarget = this.controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);
    const endPos = new THREE.Vector3(...bookmark.position);
    const endTarget = new THREE.Vector3(...bookmark.target);

    if (!animate) {
      this.activeCamera.position.copy(endPos);
      this.activeCamera.zoom = bookmark.zoom || 1;
      this.activeCamera.updateProjectionMatrix();
      if (this.controls) {
        this.controls.target.copy(endTarget);
        this.controls.update();
      }
      this.renderLoop.markDirty();
      return;
    }

    this.renderLoop.addTween({
      id: 'camera_transition',
      startTimeMs: performance.now(),
      durationMs: 450,
      onUpdate: (t) => {
        this.activeCamera.position.lerpVectors(startPos, endPos, t);
        if (this.controls) {
          this.controls.target.lerpVectors(startTarget, endTarget, t);
          this.controls.update();
        }
      }
    });
  }

  public fitCameraToFloor(record: FloorSceneRecord, animate = false): void {
    const { bbox, floor } = record;
    const span = Math.max(bbox.width, bbox.height, 8);
    const bookmark: CameraBookmark = {
      projection: this.projection,
      position: [bbox.centerX, floor.elevation + span * 1.15, bbox.centerY + span * 0.95],
      target: [bbox.centerX, floor.elevation, bbox.centerY],
      zoom: 1
    };
    this.applyCameraBookmark(bookmark, animate);
  }

  public resetCameraToDefault(animate = true): void {
    const activeRecord = this.getActiveFloorRecord();
    if (!activeRecord) return;
    if (activeRecord.floor.default_camera) {
      this.applyCameraBookmark(activeRecord.floor.default_camera, animate);
    } else {
      this.fitCameraToFloor(activeRecord, animate);
    }
  }

  public focusOnRoom(roomId: string, animate = true): void {
    const activeRecord = this.getActiveFloorRecord();
    if (!activeRecord) return;
    const room = activeRecord.floor.rooms.find((r) => r.id === roomId);
    if (!room || room.points.length < 3) return;

    const centroid = polygonCentroid2D(room.points);
    const elev = activeRecord.floor.elevation;
    const bookmark: CameraBookmark = {
      projection: this.projection,
      position: [centroid.x, elev + 6.5, centroid.y + 5.5],
      target: [centroid.x, elev, centroid.y],
      zoom: 1.35
    };
    this.applyCameraBookmark(bookmark, animate);
  }

  public resize(explicitWidth?: number, explicitHeight?: number): void {
    const width = Math.max(1, explicitWidth ?? (this.container.clientWidth || 800));
    const height = Math.max(1, explicitHeight ?? (this.container.clientHeight || 520));
    const aspect = width / height;

    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    const frustumSize = 14;
    this.orthoCamera.left = (-frustumSize * aspect) / 2;
    this.orthoCamera.right = (frustumSize * aspect) / 2;
    this.orthoCamera.top = frustumSize / 2;
    this.orthoCamera.bottom = -frustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer?.setSize(width, height);
    this.badgeOverlay.setSize(width, height);
    this.renderLoop.markDirty();
  }

  private onRenderFrame(dtSec: number): boolean {
    let stillMoving = false;

    if (this.controls) {
      const beforePos = this.activeCamera.position.clone();
      this.controls.update();
      if (beforePos.distanceToSquared(this.activeCamera.position) > 1e-6) {
        stillMoving = true;
      }
    }

    const camTarget = this.controls?.target ?? new THREE.Vector3(0, 0, 0);

    for (const record of this.floorRecords.values()) {
      if (!record.rootGroup.visible) continue;

      const wallsAnimating = WallBuilder3D.updateCutaway(
        record.wallsGroup,
        this.activeCamera.position,
        camTarget,
        this.wallMode,
        dtSec
      );
      const roomsAnimating = RoomBuilder3D.tickMotionPulses(record.roomsGroup, dtSec);
      const entitiesAnimating = ProceduralCatalog3D.tickEntityAnimations(
        record.entitiesGroup,
        dtSec
      );

      if (wallsAnimating || roomsAnimating || entitiesAnimating) {
        stillMoving = true;
      }
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.activeCamera);
    }
    this.badgeOverlay.render(this.scene, this.activeCamera);

    return stillMoving;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderLoop(): RenderLoopController {
    return this.renderLoop;
  }

  private clearAllFloorRecords(): void {
    for (const record of this.floorRecords.values()) {
      this.rootWorldGroup.remove(record.rootGroup);
      WallBuilder3D.disposeGroup(record.wallsGroup);
      RoomBuilder3D.disposeGroup(record.roomsGroup);
      ProceduralCatalog3D.disposeObject3D(record.openingsGroup);
      ProceduralCatalog3D.disposeObject3D(record.furnitureGroup);
      ProceduralCatalog3D.disposeObject3D(record.entitiesGroup);
      record.lightmapBaker.dispose();
    }
    this.floorRecords.clear();
  }

  public dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderLoop.dispose();
    this.clearAllFloorRecords();
    this.lightPool.dispose();
    this.badgeOverlay.dispose();
    this.controls?.dispose();
    if (this.renderer) {
      this.renderer.domElement.removeEventListener(
        'pointerdown',
        this.handleCanvasPointerDown
      );
      this.renderer.domElement.removeEventListener(
        'pointerup',
        this.handleCanvasPointerUp
      );
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
  }
}
