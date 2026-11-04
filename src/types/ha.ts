/**
 * Home Assistant Frontend Type Contracts (`hass`, Entities, Area/Floor Registries, WebSocket)
 */

export interface HassEntityAttributes {
  friendly_name?: string;
  icon?: string;
  unit_of_measurement?: string;
  device_class?: string;
  brightness?: number; // 0 - 255
  rgb_color?: [number, number, number];
  hs_color?: [number, number];
  color_temp_kelvin?: number;
  color_temp?: number; // mireds fallback
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  supported_color_modes?: string[];
  color_mode?: string;
  percentage?: number; // fan speed 0 - 100
  current_temperature?: number;
  temperature?: number;
  hvac_action?: string;
  media_title?: string;
  media_artist?: string;
  entity_picture?: string;
  elevation?: number; // sun.sun solar elevation in degrees
  azimuth?: number;   // sun.sun solar azimuth in degrees
  rising?: boolean;
  [key: string]: unknown;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributes;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  floor_id: string | null;
  icon: string | null;
  picture: string | null;
  aliases: string[];
  temperature_entity_id?: string | null;
  humidity_entity_id?: string | null;
}

export interface FloorRegistryEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  hidden?: boolean;
  entity_category?: 'config' | 'diagnostic';
  platform?: string;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
  name: string | null;
  name_by_user: string | null;
}

export interface HassUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
}

export interface HassConnection {
  subscribeMessage<T>(
    callback: (msg: T) => void,
    subscribeMessage: Record<string, unknown>
  ): Promise<() => Promise<void>>;
  sendMessagePromise<T>(message: Record<string, unknown>): Promise<T>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  areas?: Record<string, AreaRegistryEntry>;
  floors?: Record<string, FloorRegistryEntry>;
  entities?: Record<string, EntityRegistryDisplayEntry>;
  devices?: Record<string, DeviceRegistryEntry>;
  user?: HassUser;
  language: string;
  themes?: {
    darkMode?: boolean;
    [key: string]: unknown;
  };
  connection: HassConnection;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: {
      entity_id?: string | string[];
      device_id?: string | string[];
      area_id?: string | string[];
    }
  ): Promise<unknown>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  editMode?: boolean;
  setConfig(config: unknown): void;
  getCardSize?(): number | Promise<number>;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: unknown): void;
}
