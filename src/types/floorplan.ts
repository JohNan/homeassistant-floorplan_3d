/**
 * Canonical Data Model & Schema for `floorplan_3d` (STORAGE_VERSION = 1)
 *
 * Coordinate Convention:
 * - All 2D spatial coordinates (`x`, `y`) are stored in meters (`m`).
 * - Origin `(0, 0)` is the center of the floorplan canvas.
 * - `+X` points East (right in 2D), `+Y` points South (down in 2D).
 * - In Three.js 3D world space, `(x, y)` maps to `(x, floor.elevation + z_elevation, y)`
 *   where `+Y_3D` is vertical up.
 */

export interface FloorplanStoreData {
  version: 1;
  floorplans: Record<string, FloorplanDocument>;
}

export interface FloorplanSummary {
  id: string;
  name: string;
  revision: number;
  updated_at: string;
  floors: Array<{ id: string; name: string; level_index: number }>;
}

export interface FloorplanDocument {
  id: string;
  name: string;
  revision: number;
  created_at: string;
  updated_at: string;
  unit: 'm';
  grid_size: number;
  ambient_config: AmbientConfig;
  floors: FloorLevel[];
}

export type AmbientMode = 'adaptive_contrast' | 'sun_sync' | 'dark' | 'daylight';

export interface AmbientConfig {
  mode: AmbientMode;
  sun_entity_id: string;
  base_ambient_intensity: number;
  wall_color: string;
  floor_color: string;
  background_color: string;
}

export interface FloorLevel {
  id: string;
  name: string;
  level_index: number;
  elevation: number;
  wall_height: number;
  slab_thickness: number;
  ha_floor_id: string | null;
  blueprint: BlueprintCalibration | null;
  default_camera: CameraBookmark | null;
  nodes: WallNode[];
  walls: WallEdge[];
  openings: WallOpening[];
  rooms: RoomPolygon[];
  furniture: FurnitureItem[];
  entities: EntityPlacement[];
}

export interface BlueprintCalibration {
  image_url: string;
  opacity: number;
  locked: boolean;
  offset_x: number;
  offset_y: number;
  rotation_deg: number;
  meters_per_pixel: number;
  natural_width_px: number;
  natural_height_px: number;
}

export type CameraProjection = 'perspective' | 'orthographic';

export interface CameraBookmark {
  projection: CameraProjection;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface WallNode {
  id: string;
  x: number;
  y: number;
}

export interface WallEdge {
  id: string;
  start_node_id: string;
  end_node_id: string;
  thickness: number;
  height_override: number | null;
  is_exterior: boolean;
  color_override: string | null;
}

export type OpeningType =
  | 'door_single'
  | 'door_double'
  | 'door_sliding'
  | 'archway'
  | 'window_standard'
  | 'window_floor_to_ceiling';

export type DoorSwingDirection = 'left_in' | 'left_out' | 'right_in' | 'right_out';

export interface WallOpening {
  id: string;
  wall_id: string;
  type: OpeningType;
  /** Normalized position [0.0 - 1.0] of opening center along WallEdge from start to end */
  t: number;
  width: number;
  sill_height: number;
  head_height: number;
  swing_direction: DoorSwingDirection;
  /** Optional binary_sensor (door/window contact) driving live 3D open/close state */
  bound_entity_id: string | null;
}

export type FloorMaterialType =
  | 'wood_oak'
  | 'wood_walnut'
  | 'tile_slate'
  | 'tile_marble'
  | 'carpet'
  | 'concrete'
  | 'custom';

export interface RoomPolygonPoint {
  x: number;
  y: number;
  node_id?: string | null;
}

export interface RoomPolygon {
  id: string;
  name: string;
  ha_area_id: string | null;
  points: RoomPolygonPoint[];
  floor_material: FloorMaterialType;
  floor_color: string;
  show_label: boolean;
  temp_entity_id: string | null;
  humidity_entity_id: string | null;
  motion_entity_id: string | null;
  room_tap_action: ActionConfig;
}

export type FurnitureCatalogType =
  | 'sofa_straight'
  | 'sofa_l_shape'
  | 'bed_double'
  | 'bed_single'
  | 'dining_table'
  | 'desk'
  | 'chair'
  | 'tv_stand'
  | 'kitchen_counter'
  | 'refrigerator'
  | 'stove'
  | 'sink_cabinet'
  | 'bathtub'
  | 'shower_enclosure'
  | 'toilet'
  | 'wardrobe'
  | 'bookcase'
  | 'potted_plant'
  | 'rug';

export interface FurnitureItem {
  id: string;
  catalog_type: FurnitureCatalogType;
  label: string;
  x: number;
  y: number;
  z_elevation: number;
  width: number;
  depth: number;
  height: number;
  rotation_deg: number;
  color: string | null;
}

export type LightFixtureKind = 'point' | 'spot' | 'strip' | 'wall_sconce';

export type EntityMeshType =
  | 'none'
  | 'ceiling_light'
  | 'wall_sconce'
  | 'led_strip'
  | 'tv_screen'
  | 'ceiling_fan'
  | 'thermostat'
  | 'speaker';

export type BadgeStyle = 'icon_only' | 'icon_and_state' | 'compact_pill';

export interface EntityLightConfig {
  kind: LightFixtureKind;
  radius_m: number;
  intensity_multiplier: number;
  spot_angle_deg?: number;
  strip_points?: Point2D[];
  cast_real_point_light: boolean;
}

export interface EntityBadgeConfig {
  visible: boolean;
  style: BadgeStyle;
  label_override: string | null;
  icon_override: string | null;
}

export interface EntityPlacement {
  id: string;
  entity_id: string;
  domain: string;
  room_id: string | null;
  x: number;
  y: number;
  z_elevation: number;
  rotation_deg: number;
  light_config?: EntityLightConfig;
  mesh_type: EntityMeshType;
  mesh_scale: [number, number, number];
  badge: EntityBadgeConfig;
  tap_action: ActionConfig;
  hold_action: ActionConfig;
  double_tap_action: ActionConfig;
}

export type ActionType =
  | 'default'
  | 'toggle'
  | 'more-info'
  | 'call-service'
  | 'navigate'
  | 'zoom-room'
  | 'none';

export interface ActionConfig {
  action: ActionType;
  service?: string;
  service_data?: Record<string, unknown>;
  target?: {
    entity_id?: string | string[];
    area_id?: string | string[];
  };
  navigation_path?: string;
}

export type WallDisplayMode = 'auto_cutaway' | 'half' | 'full';
export type QualityTier = 'auto' | 'high' | 'tablet' | 'low';

export interface FloorplanCardConfig {
  type: string;
  floorplan_id: string;
  default_floor_id?: string;
  height?: number;
  aspect_ratio?: string;
  camera_projection?: CameraProjection;
  wall_mode?: WallDisplayMode;
  ambient_mode?: AmbientMode;
  quality_tier?: QualityTier;
  show_floor_selector?: boolean;
  show_wall_mode_toggle?: boolean;
  show_reset_camera?: boolean;
  show_room_labels?: boolean;
  show_entity_badges?: boolean;
  enable_room_zoom_on_tap?: boolean;
}

/**
 * Factory helper for creating a clean default FloorplanDocument
 */
export function createDefaultFloorplanDocument(
  id = 'main_house',
  name = 'Main House'
): FloorplanDocument {
  const now = new Date().toISOString();
  return {
    id,
    name,
    revision: 1,
    created_at: now,
    updated_at: now,
    unit: 'm',
    grid_size: 0.1,
    ambient_config: {
      mode: 'adaptive_contrast',
      sun_entity_id: 'sun.sun',
      base_ambient_intensity: 0.25,
      wall_color: '#e2e8f0',
      floor_color: '#334155',
      background_color: '#0f172a'
    },
    floors: [
      {
        id: 'ground_floor',
        name: 'Ground Floor',
        level_index: 0,
        elevation: 0,
        wall_height: 2.6,
        slab_thickness: 0.15,
        ha_floor_id: null,
        blueprint: null,
        default_camera: {
          projection: 'perspective',
          position: [0, 11, 10],
          target: [0, 0, 0],
          zoom: 1
        },
        nodes: [
          { id: 'n1', x: -4, y: -3 },
          { id: 'n2', x: 4, y: -3 },
          { id: 'n3', x: 4, y: 3 },
          { id: 'n4', x: -4, y: 3 }
        ],
        walls: [
          { id: 'w1', start_node_id: 'n1', end_node_id: 'n2', thickness: 0.2, height_override: null, is_exterior: true, color_override: null },
          { id: 'w2', start_node_id: 'n2', end_node_id: 'n3', thickness: 0.2, height_override: null, is_exterior: true, color_override: null },
          { id: 'w3', start_node_id: 'n3', end_node_id: 'n4', thickness: 0.2, height_override: null, is_exterior: true, color_override: null },
          { id: 'w4', start_node_id: 'n4', end_node_id: 'n1', thickness: 0.2, height_override: null, is_exterior: true, color_override: null }
        ],
        openings: [],
        rooms: [
          {
            id: 'r1',
            name: 'Living Room',
            ha_area_id: null,
            points: [
              { x: -4, y: -3, node_id: 'n1' },
              { x: 4, y: -3, node_id: 'n2' },
              { x: 4, y: 3, node_id: 'n3' },
              { x: -4, y: 3, node_id: 'n4' }
            ],
            floor_material: 'wood_oak',
            floor_color: '#8b6f4e',
            show_label: true,
            temp_entity_id: null,
            humidity_entity_id: null,
            motion_entity_id: null,
            room_tap_action: { action: 'toggle' }
          }
        ],
        furniture: [],
        entities: []
      }
    ]
  };
}
