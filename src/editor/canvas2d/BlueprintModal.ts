import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { BlueprintCalibration, Point2D } from '../../types/floorplan';
import type { BlueprintCalibrationResult } from '../editor-contracts';
import { computeCalibrationMetersPerPixel } from '../../utils/geometry2d';

/**
 * Interactive 2-Point Blueprint Calibration Modal (`<floorplan-blueprint-modal>`)
 *
 * Allows administrators to upload an architectural blueprint image (PNG/JPG/WEBP/SVG),
 * calibrate metric scale by clicking two known reference points, configure visual opacity,
 * and save the calibrated blueprint into Home Assistant storage.
 *
 * Fully integrated with Home Assistant theme CSS variables and mobile-responsive layout.
 */
@customElement('floorplan-blueprint-modal')
export class BlueprintModal extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      box-sizing: border-box;
    }

    .modal-dialog {
      background: var(--card-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 960px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      color: var(--primary-text-color, #f8fafc);
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--secondary-background-color, #0f172a);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary-text-color, #f8fafc);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: color 0.15s, background-color 0.15s;
    }

    .close-btn:hover {
      color: var(--primary-text-color, #f8fafc);
      background: var(--divider-color, #334155);
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex: 1;
    }

    .instructions-card {
      background: var(--secondary-background-color, #0f172a);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: var(--secondary-text-color, #94a3b8);
      line-height: 1.5;
    }

    .instructions-card strong {
      color: var(--primary-color, #38bdf8);
    }

    .control-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      background: var(--secondary-background-color, #0f172a);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #334155);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 140px;
      flex: 1;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color, #94a3b8);
    }

    .form-input {
      background: var(--card-background-color, #1e293b);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 6px;
      color: var(--primary-text-color, #f8fafc);
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus {
      border-color: var(--primary-color, #38bdf8);
    }

    .file-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-input {
      display: none;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      border-color: var(--divider-color, #475569);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--divider-color, #475569);
    }

    .btn-primary {
      background: var(--primary-color, #0284c7);
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .preview-container {
      position: relative;
      background: var(--primary-background-color, #090d16);
      border: 2px dashed var(--divider-color, #334155);
      border-radius: 8px;
      min-height: 340px;
      max-height: 50vh;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      touch-action: pan-x pan-y;
    }

    .preview-container.has-image {
      border-style: solid;
      border-color: var(--divider-color, #475569);
      cursor: crosshair;
    }

    .blueprint-svg {
      display: block;
      max-width: 100%;
      height: auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      touch-action: none;
    }

    .stats-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      background: var(--secondary-background-color, #0f172a);
      padding: 0.75rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.8125rem;
      color: var(--secondary-text-color, #94a3b8);
    }

    .stats-item strong {
      color: var(--primary-text-color, #f8fafc);
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid var(--error-color, #dc2626);
      color: var(--error-color, #fecaca);
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--secondary-background-color, #0f172a);
    }

    @media (max-width: 768px) {
      .modal-backdrop {
        padding: 0.5rem;
      }

      .modal-dialog {
        max-height: 95vh;
      }

      .control-row {
        flex-direction: column;
        align-items: stretch;
      }

      .btn {
        min-height: 40px;
      }

      .stats-bar {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `;

  @property({ type: Boolean }) open = false;
  @property({ type: String }) floorplanId = '';
  @property({ type: String }) floorId = '';
  @property({ attribute: false }) currentBlueprint: BlueprintCalibration | null = null;
  @property({ attribute: false }) uploadCallback?: (params: {
    floorplanId: string;
    floorId: string;
    mimeType: string;
    dataBase64: string;
  }) => Promise<string>;

  @state() private imageUrl = '';
  @state() private imageMimeType = 'image/png';
  @state() private naturalWidth = 0;
  @state() private naturalHeight = 0;
  @state() private p1: Point2D | null = null;
  @state() private p2: Point2D | null = null;
  @state() private realDistanceMeters = 5.0;
  @state() private opacity = 0.5;
  @state() private isUploading = false;
  @state() private errorMessage: string | null = null;

  private pointerDownPos: { x: number; y: number } | null = null;

  override updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('open') && this.open) {
      if (this.currentBlueprint && !this.imageUrl) {
        this.imageUrl = this.currentBlueprint.image_url;
        this.naturalWidth = this.currentBlueprint.natural_width_px;
        this.naturalHeight = this.currentBlueprint.natural_height_px;
        this.opacity = this.currentBlueprint.opacity;
        this.errorMessage = null;
      }
    }
    if (changedProperties.has('currentBlueprint') && this.currentBlueprint && this.open) {
      this.imageUrl = this.currentBlueprint.image_url;
      this.naturalWidth = this.currentBlueprint.natural_width_px;
      this.naturalHeight = this.currentBlueprint.natural_height_px;
      this.opacity = this.currentBlueprint.opacity;
    }
  }

  private handleFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.imageMimeType = file.type || 'image/png';
    this.errorMessage = null;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      this.loadNewImage(dataUrl, this.imageMimeType);
    };
    reader.onerror = () => {
      this.errorMessage = 'Failed to read selected image file.';
    };
    reader.readAsDataURL(file);
  }

  private loadNewImage(url: string, mimeType: string): void {
    this.imageUrl = url;
    this.imageMimeType = mimeType;
    this.p1 = null;
    this.p2 = null;

    const img = new Image();
    img.onload = () => {
      this.naturalWidth = img.naturalWidth || img.width;
      this.naturalHeight = img.naturalHeight || img.height;
      this.requestUpdate();
    };
    img.onerror = () => {
      this.errorMessage = 'Failed to load image preview.';
    };
    img.src = url;
  }

  private handleSvgPointerDown(e: PointerEvent): void {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  }

  private handleSvgPointerUp(e: PointerEvent): void {
    if (!this.pointerDownPos) return;
    const moveDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    this.pointerDownPos = null;

    // Discard pointer releases that were panning/dragging movements on touchscreen
    if (moveDist > 8) return;

    if (!this.naturalWidth || !this.naturalHeight) return;
    const svgEl = e.currentTarget as SVGSVGElement;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const u = Math.max(0, Math.min(this.naturalWidth, (clickX / rect.width) * this.naturalWidth));
    const v = Math.max(0, Math.min(this.naturalHeight, (clickY / rect.height) * this.naturalHeight));

    const clickedPoint: Point2D = {
      x: Number(u.toFixed(2)),
      y: Number(v.toFixed(2))
    };

    if (!this.p1) {
      this.p1 = clickedPoint;
    } else if (!this.p2) {
      this.p2 = clickedPoint;
    } else {
      // Third click restarts point selection
      this.p1 = clickedPoint;
      this.p2 = null;
    }
  }

  private handleResetPoints(): void {
    this.p1 = null;
    this.p2 = null;
  }

  private get computedPixelDistance(): number {
    if (!this.p1 || !this.p2) return 0;
    return Math.hypot(this.p2.x - this.p1.x, this.p2.y - this.p1.y);
  }

  private get computedMetersPerPixel(): number {
    if (!this.p1 || !this.p2 || this.realDistanceMeters <= 0) {
      return this.currentBlueprint?.meters_per_pixel ?? 0.01;
    }
    return computeCalibrationMetersPerPixel(this.p1, this.p2, this.realDistanceMeters);
  }

  private async handleApply(): Promise<void> {
    if (!this.imageUrl) {
      this.errorMessage = 'Please select a blueprint image.';
      return;
    }
    if (!this.p1 || !this.p2) {
      this.errorMessage = 'Please click two reference points on the blueprint to calibrate distance.';
      return;
    }
    if (this.realDistanceMeters <= 0) {
      this.errorMessage = 'Known distance must be greater than 0 meters.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;

    try {
      let finalImageUrl = this.imageUrl;

      if (this.uploadCallback) {
        let mimeType = this.imageMimeType;
        let dataBase64 = this.imageUrl;
        if (this.imageUrl.startsWith('data:')) {
          const parts = this.imageUrl.split(',');
          const match = parts[0].match(/:(.*?);/);
          if (match) {
            mimeType = match[1];
          }
          dataBase64 = parts[1] || '';
        }

        finalImageUrl = await this.uploadCallback({
          floorplanId: this.floorplanId,
          floorId: this.floorId,
          mimeType,
          dataBase64
        });
      }

      const metersPerPixel = this.computedMetersPerPixel;

      const result: BlueprintCalibrationResult = {
        imageUrl: finalImageUrl,
        naturalWidthPx: this.naturalWidth,
        naturalHeightPx: this.naturalHeight,
        metersPerPixel,
        opacity: this.opacity
      };

      this.dispatchEvent(
        new CustomEvent<BlueprintCalibrationResult>('blueprint-calibrated', {
          detail: result,
          bubbles: true,
          composed: true
        })
      );

      this.handleClose();
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to apply and upload blueprint.';
    } finally {
      this.isUploading = false;
    }
  }

  private handleClose(): void {
    this.dispatchEvent(
      new CustomEvent('modal-close', {
        bubbles: true,
        composed: true
      })
    );
  }

  private renderCalibrationOverlay() {
    if (!this.naturalWidth || !this.naturalHeight) return nothing;

    const markerR = Math.max(10, Math.min(this.naturalWidth, this.naturalHeight) * 0.015);
    const strokeW = Math.max(2, markerR * 0.2);
    const fontSize = Math.max(12, markerR * 1.1);

    return html`
      ${this.p1 && this.p2
        ? html`
            <line
              x1="${this.p1.x}"
              y1="${this.p1.y}"
              x2="${this.p2.x}"
              y2="${this.p2.y}"
              stroke="#f59e0b"
              stroke-width="${strokeW}"
              stroke-dasharray="${strokeW * 3},${strokeW * 2}"
            />
            <rect
              x="${(this.p1.x + this.p2.x) / 2 - markerR * 3}"
              y="${(this.p1.y + this.p2.y) / 2 - markerR * 1.2}"
              width="${markerR * 6}"
              height="${markerR * 2.2}"
              rx="${markerR * 0.4}"
              fill="#0f172a"
              fill-opacity="0.85"
              stroke="#f59e0b"
              stroke-width="${strokeW * 0.7}"
            />
            <text
              x="${(this.p1.x + this.p2.x) / 2}"
              y="${(this.p1.y + this.p2.y) / 2 + markerR * 0.35}"
              fill="#fbbf24"
              font-size="${fontSize * 0.9}"
              font-weight="bold"
              text-anchor="middle"
            >
              ${this.realDistanceMeters.toFixed(2)} m
            </text>
          `
        : nothing}
      ${this.p1
        ? html`
            <g class="crosshair-marker">
              <line
                x1="${this.p1.x - markerR * 1.5}"
                y1="${this.p1.y}"
                x2="${this.p1.x + markerR * 1.5}"
                y2="${this.p1.y}"
                stroke="#38bdf8"
                stroke-width="${strokeW}"
              />
              <line
                x1="${this.p1.x}"
                y1="${this.p1.y - markerR * 1.5}"
                x2="${this.p1.x}"
                y2="${this.p1.y + markerR * 1.5}"
                stroke="#38bdf8"
                stroke-width="${strokeW}"
              />
              <circle
                cx="${this.p1.x}"
                cy="${this.p1.y}"
                r="${markerR}"
                fill="#0284c7"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${strokeW}"
              />
              <text
                x="${this.p1.x}"
                y="${this.p1.y + fontSize * 0.35}"
                fill="#ffffff"
                font-size="${fontSize}"
                font-weight="bold"
                text-anchor="middle"
              >
                1
              </text>
            </g>
          `
        : nothing}
      ${this.p2
        ? html`
            <g class="crosshair-marker">
              <line
                x1="${this.p2.x - markerR * 1.5}"
                y1="${this.p2.y}"
                x2="${this.p2.x + markerR * 1.5}"
                y2="${this.p2.y}"
                stroke="#10b981"
                stroke-width="${strokeW}"
              />
              <line
                x1="${this.p2.x}"
                y1="${this.p2.y - markerR * 1.5}"
                x2="${this.p2.x}"
                y2="${this.p2.y + markerR * 1.5}"
                stroke="#10b981"
                stroke-width="${strokeW}"
              />
              <circle
                cx="${this.p2.x}"
                cy="${this.p2.y}"
                r="${markerR}"
                fill="#059669"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${strokeW}"
              />
              <text
                x="${this.p2.x}"
                y="${this.p2.y + fontSize * 0.35}"
                fill="#ffffff"
                font-size="${fontSize}"
                font-weight="bold"
                text-anchor="middle"
              >
                2
              </text>
            </g>
          `
        : nothing}
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const mpp = this.computedMetersPerPixel;
    const pxPerMeter = mpp > 0 ? 1 / mpp : 0;

    return html`
      <div
        class="modal-backdrop"
        @click="${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}"
      >
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              Blueprint Calibration
            </h2>
            <button class="close-btn" @click="${this.handleClose}" aria-label="Close modal">×</button>
          </div>

          <div class="modal-body">
            <div class="instructions-card">
              <strong>Interactive 2-Point Calibration:</strong> Select a blueprint image, tap or click two distinct reference points
              along a wall or landmark of known length (Point 1 and Point 2), enter the real-world distance in meters, and click Apply.
            </div>

            ${this.errorMessage
              ? html`<div class="error-banner">${this.errorMessage}</div>`
              : nothing}

            <div class="control-row">
              <div class="form-group">
                <label>Blueprint Image</label>
                <div class="file-input-wrapper">
                  <input
                    type="file"
                    id="blueprint-file-input"
                    class="file-input"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    @change="${this.handleFileChange}"
                  />
                  <button
                    class="btn btn-secondary"
                    @click="${() => this.shadowRoot?.getElementById('blueprint-file-input')?.click()}"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Choose Image...
                  </button>
                  ${this.p1 || this.p2
                    ? html`
                        <button class="btn btn-secondary" @click="${this.handleResetPoints}">
                          Reset Points
                        </button>
                      `
                    : nothing}
                </div>
              </div>

              <div class="form-group">
                <label for="distance-input">Known Distance (m)</label>
                <input
                  id="distance-input"
                  type="number"
                  class="form-input"
                  step="0.01"
                  min="0.01"
                  .value="${String(this.realDistanceMeters)}"
                  @input="${(e: InputEvent) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) this.realDistanceMeters = val;
                  }}"
                />
              </div>

              <div class="form-group">
                <label for="opacity-input">Opacity: ${Math.round(this.opacity * 100)}%</label>
                <input
                  id="opacity-input"
                  type="range"
                  class="form-input"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  .value="${String(this.opacity)}"
                  @input="${(e: InputEvent) => {
                    this.opacity = parseFloat((e.target as HTMLInputElement).value);
                  }}"
                />
              </div>
            </div>

            <div class="preview-container ${this.imageUrl ? 'has-image' : ''}">
              ${this.imageUrl && this.naturalWidth > 0
                ? html`
                    <svg
                      class="blueprint-svg"
                      viewBox="0 0 ${this.naturalWidth} ${this.naturalHeight}"
                      @pointerdown="${this.handleSvgPointerDown}"
                      @pointerup="${this.handleSvgPointerUp}"
                    >
                      <image
                        href="${this.imageUrl}"
                        width="${this.naturalWidth}"
                        height="${this.naturalHeight}"
                      />
                      ${this.renderCalibrationOverlay()}
                    </svg>
                  `
                : html`
                    <div style="color: var(--secondary-text-color, #64748b); text-align: center; padding: 2rem;">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <div>No blueprint selected. Click "Choose Image..." to get started.</div>
                    </div>
                  `}
            </div>

            ${this.imageUrl
              ? html`
                  <div class="stats-bar">
                    <div class="stats-item">
                      Resolution: <strong>${this.naturalWidth} × ${this.naturalHeight} px</strong>
                    </div>
                    <div class="stats-item">
                      Point 1: <strong>${this.p1 ? `(${this.p1.x}, ${this.p1.y})` : 'Not set'}</strong>
                    </div>
                    <div class="stats-item">
                      Point 2: <strong>${this.p2 ? `(${this.p2.x}, ${this.p2.y})` : 'Not set'}</strong>
                    </div>
                    <div class="stats-item">
                      Pixel Distance: <strong>${this.computedPixelDistance.toFixed(1)} px</strong>
                    </div>
                    <div class="stats-item">
                      Calculated Scale: <strong>${pxPerMeter.toFixed(1)} px/m (${(mpp * 100).toFixed(2)} cm/px)</strong>
                    </div>
                  </div>
                `
              : nothing}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="${this.handleClose}" ?disabled="${this.isUploading}">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="${this.handleApply}"
              ?disabled="${!this.imageUrl || !this.p1 || !this.p2 || this.isUploading}"
            >
              ${this.isUploading ? 'Uploading & Applying...' : 'Apply & Upload Blueprint'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
