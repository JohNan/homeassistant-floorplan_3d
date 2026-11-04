import type { FloorplanDocument, FloorplanSummary } from '../types/floorplan';
import type { HomeAssistant } from '../types/ha';

export interface UploadBlueprintParams {
  floorplanId: string;
  floorId: string;
  mimeType: string;
  dataBase64: string;
}

export interface FloorplanSubscriptionEvent {
  event: 'updated' | 'deleted';
  floorplan_id: string;
  floorplan?: FloorplanDocument;
}

/**
 * Typed Home Assistant WebSocket API client for `floorplan_3d`.
 */
export class FloorplanWsClient {
  private getHass: () => HomeAssistant | undefined;

  constructor(getHass: () => HomeAssistant | undefined) {
    this.getHass = getHass;
  }

  private getHassInstance(): HomeAssistant {
    const hass = this.getHass();
    if (!hass) {
      throw new Error('Home Assistant instance not available');
    }
    return hass;
  }

  /**
   * Fetches lightweight summary metadata for all floorplans.
   */
  async listFloorplans(): Promise<FloorplanSummary[]> {
    return this.getHassInstance().callWS<FloorplanSummary[]>({
      type: 'floorplan_3d/list'
    });
  }

  /**
   * Fetches the complete FloorplanDocument for a specific ID.
   */
  async getFloorplan(floorplanId: string): Promise<FloorplanDocument> {
    return this.getHassInstance().callWS<FloorplanDocument>({
      type: 'floorplan_3d/get',
      floorplan_id: floorplanId
    });
  }

  /**
   * Saves a FloorplanDocument with optimistic revision locking.
   */
  async saveFloorplan(
    floorplan: FloorplanDocument,
    expectedRevision?: number
  ): Promise<FloorplanDocument> {
    return this.getHassInstance().callWS<FloorplanDocument>({
      type: 'floorplan_3d/save',
      floorplan,
      expected_revision:
        expectedRevision !== undefined ? expectedRevision : floorplan.revision
    });
  }

  /**
   * Deletes a FloorplanDocument and associated blueprints.
   */
  async deleteFloorplan(floorplanId: string): Promise<boolean> {
    const result = await this.getHassInstance().callWS<{ success: boolean } | boolean>({
      type: 'floorplan_3d/delete',
      floorplan_id: floorplanId
    });
    if (typeof result === 'boolean') {
      return result;
    }
    return result?.success ?? true;
  }

  /**
   * Uploads a base64 encoded blueprint image to Home Assistant storage.
   */
  async uploadBlueprint(params: UploadBlueprintParams): Promise<string> {
    const response = await this.getHassInstance().callWS<{ url: string } | string>({
      type: 'floorplan_3d/upload_blueprint',
      floorplan_id: params.floorplanId,
      floor_id: params.floorId,
      mime_type: params.mimeType,
      data_base64: params.dataBase64
    });
    if (typeof response === 'string') {
      return response;
    }
    return response.url;
  }

  /**
   * Subscribes to real-time floorplan update and delete notifications.
   * Returns an unsubscribe function.
   */
  async subscribeFloorplan(
    floorplanId: string | null,
    onEvent: (event: FloorplanSubscriptionEvent) => void
  ): Promise<() => Promise<void>> {
    const hass = this.getHassInstance();
    const msg: Record<string, unknown> = {
      type: 'floorplan_3d/subscribe'
    };
    if (floorplanId) {
      msg.floorplan_id = floorplanId;
    }
    return hass.connection.subscribeMessage<FloorplanSubscriptionEvent>(onEvent, msg);
  }
}
