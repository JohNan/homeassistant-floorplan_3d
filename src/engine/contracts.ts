import type * as THREE from 'three';
import type {
  ActionConfig,
  AmbientConfig,
  CameraBookmark,
  CameraProjection,
  EntityPlacement,
  FloorLevel,
  FloorplanDocument,
  FurnitureItem,
  Point2D,
  QualityTier,
  RoomPolygon,
  WallDisplayMode,
  WallEdge,
  WallNode,
  WallOpening
} from '../types/floorplan';
import type { HomeAssistant } from '../types/ha';

/**
 * Shared 3D Engine Contracts (`src/engine/contracts.ts`)
 * Frozen interfaces linking Wave 1 utilities, Wave 2 3D subsystems, and Wave 3 UI components.
 */

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface WallMiterFootprint {
  wallId: string;
  /** 4 corner vertices in 2D floor space [startLeft, endLeft, endRight, startRight] */
  quad: [Point2D, Point2D, Point2D, Point2D];
  startPoint: Point2D;
  endPoint: Point2D;
  length: number;
  thickness: number;
  angleRad: number;
  /** Outward unit normal in 2D (nx, ny) */
  normal: Point2D;
}

export interface WallSegmentInterval {
  kind: 'solid' | 'opening';
  tStart: number;
  tEnd: number;
  distStart: number;
  distEnd: number;
  opening?: WallOpening;
}

export interface ResolvedLightState {
  placementId: string;
  entityId: string;
  isOn: boolean;
  /** Normalized RGB [0..1, 0..1, 0..1] */
  rgb: [number, number, number];
  hexColor: string;
  /** Normalized brightness [0..1] */
  brightness: number;
  x: number;
  y: number;
  zElevation: number;
  radiusM: number;
  intensityMultiplier: number;
  kind: 'point' | 'spot' | 'strip' | 'wall_sconce';
  stripPoints?: Point2D[];
  castRealPointLight: boolean;
}

export interface ResolvedEntityVisualState {
  placementId: string;
  entityId: string;
  domain: string;
  state: string;
  isActive: boolean;
  friendlyName: string;
  formattedState: string;
  unit?: string;
  icon?: string;
  rgb: [number, number, number];
  brightness: number;
  fanPercentage: number;
  mediaPlaying: boolean;
  mediaPictureUrl?: string;
}

export interface ResolvedRoomSummary {
  roomId: string;
  name: string;
  areaId: string | null;
  labelPosition2D: Point2D;
  areaSqM: number;
  temperatureText: string | null;
  humidityText: string | null;
  activeLightCount: number;
  totalLightCount: number;
  motionDetected: boolean;
}

export interface QualityProfile {
  tier: 'high' | 'tablet' | 'low';
  pixelRatio: number;
  antialias: boolean;
  lightmapSize: number;
  maxPointLights: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  maxFps: number;
}

export interface ActiveTween {
  id: string;
  startTimeMs: number;
  durationMs: number;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export interface EntityActionDispatchDetail {
  entityId?: string;
  placement?: EntityPlacement;
  room?: RoomPolygon;
  trigger: 'tap' | 'hold' | 'double_tap';
  actionConfig: ActionConfig;
}
