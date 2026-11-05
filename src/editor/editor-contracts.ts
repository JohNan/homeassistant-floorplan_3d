import type {
  FurnitureCatalogType,
  OpeningType,
  Point2D
} from '../types/floorplan';

/**
 * Shared Editor Types & Event Contracts (`src/editor/editor-contracts.ts`)
 * Links Subagent 3A (`FloorplanCanvas2D`, `BlueprintModal`) and Subagent 3B (`EditorToolbar`, `EntityPalette`, `PropertyInspector`, `floorplan-editor-panel`).
 */

export type EditorToolMode =
  | 'select'
  | 'draw_wall'
  | 'draw_room'
  | 'add_opening'
  | 'measure';

export type EditorViewLayout = '2d' | 'split' | '3d';

export type EditorSelectionKind =
  | 'none'
  | 'node'
  | 'wall'
  | 'opening'
  | 'room'
  | 'furniture'
  | 'entity';

export interface EditorSelection {
  kind: EditorSelectionKind;
  id: string | null;
}

export interface PaletteDragPayload {
  kind: 'entity' | 'furniture' | 'opening';
  entityId?: string;
  domain?: string;
  furnitureType?: FurnitureCatalogType;
  openingType?: OpeningType;
  defaultWidth?: number;
  defaultDepth?: number;
  defaultHeight?: number;
  label?: string;
  wallId?: string;
  dropPoint?: Point2D;
}

export interface BlueprintCalibrationResult {
  imageUrl: string;
  naturalWidthPx: number;
  naturalHeightPx: number;
  metersPerPixel: number;
  opacity: number;
}
