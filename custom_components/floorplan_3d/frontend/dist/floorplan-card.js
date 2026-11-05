import{a as e,c as t,n,o as r,r as i,s as a,t as o}from"./chunks/lit-vendor-RPBkZGWT.js";import{i as s,n as c,r as l,t as u,y as d}from"./chunks/decorate-MHvWLNda.js";var f=class extends e{constructor(...e){super(...e),this._floorplans=[],this._loadingFloorplans=!1,this._floorplansLoaded=!1}set hass(e){this._hass=e,!this._floorplansLoaded&&!this._loadingFloorplans&&this._fetchFloorplans()}get hass(){return this._hass}setConfig(e){this._config={...e},this._hass&&!this._floorplansLoaded&&!this._loadingFloorplans&&this._fetchFloorplans()}async _fetchFloorplans(){if(this._hass){this._loadingFloorplans=!0;try{let e=new d(()=>this._hass);this._floorplans=await e.listFloorplans(),this._floorplansLoaded=!0}catch(e){console.warn(`[floorplan-3d-card-editor] Could not list floorplans:`,e)}finally{this._loadingFloorplans=!1,this.requestUpdate()}}}_valueChanged(e){if(!this._config)return;let t=e.target,n=t.dataset.field;if(!n)return;let r;r=t instanceof HTMLInputElement&&t.type===`checkbox`?t.checked:t instanceof HTMLInputElement&&t.type===`number`?t.value?Number(t.value):void 0:t.value;let i={...this._config,[n]:r};(r===void 0||r===``)&&delete i[n],this.dispatchEvent(new CustomEvent(`config-changed`,{detail:{config:i},bubbles:!0,composed:!0}))}render(){if(!this._config)return r;let e=this._config.floorplan_id||``,t=this._floorplans.find(t=>t.id===e)?.floors||[];return a`
      <div class="editor-container">
        <!-- Section: Floorplan Source -->
        <div class="form-section">
          <div class="section-header">Floorplan Source</div>

          <div class="form-group">
            <label class="form-label" for="floorplan_id">Floorplan Model</label>
            <select
              id="floorplan_id"
              class="form-control"
              data-field="floorplan_id"
              .value=${e}
              @change=${this._valueChanged}
            >
              ${this._floorplans.length===0?a`
                    <option value="${e||`main_house`}">
                      ${e||`main_house (custom)`}
                    </option>
                  `:this._floorplans.map(t=>a`
                      <option
                        value="${t.id}"
                        ?selected=${t.id===e}
                      >
                        ${t.name||t.id} (rev ${t.revision})
                      </option>
                    `)}
            </select>
            <div class="helper-text">
              Select a floorplan authored in the sidebar 2D Floorplan Editor.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="default_floor_id">Default Starting Floor</label>
            <select
              id="default_floor_id"
              class="form-control"
              data-field="default_floor_id"
              .value=${this._config.default_floor_id||``}
              @change=${this._valueChanged}
            >
              <option value="">Auto (Ground Floor / Index 0)</option>
              ${t.map(e=>a`
                  <option
                    value="${e.id}"
                    ?selected=${e.id===this._config?.default_floor_id}
                  >
                    ${e.name||e.id} (Level ${e.level_index})
                  </option>
                `)}
            </select>
            <div class="helper-text">
              The initial floor active when the card loads.
            </div>
          </div>
        </div>

        <!-- Section: Dimensions & Presentation -->
        <div class="form-section">
          <div class="section-header">Dimensions & Camera</div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="height">Card Height (px)</label>
              <input
                id="height"
                type="number"
                class="form-control"
                data-field="height"
                min="240"
                max="1600"
                step="20"
                .value=${String(this._config.height??520)}
                @input=${this._valueChanged}
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="camera_projection">Camera Projection</label>
              <select
                id="camera_projection"
                class="form-control"
                data-field="camera_projection"
                .value=${this._config.camera_projection??`perspective`}
                @change=${this._valueChanged}
              >
                <option value="perspective">Perspective (True 3D)</option>
                <option value="orthographic">Orthographic (Isometric)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="wall_mode">Wall Cutaway Mode</label>
            <select
              id="wall_mode"
              class="form-control"
              data-field="wall_mode"
              .value=${this._config.wall_mode??`auto_cutaway`}
              @change=${this._valueChanged}
            >
              <option value="auto_cutaway">Auto Cutaway (Sims-Style Camera Facing)</option>
              <option value="half">Half Walls (Low Architectural Cross-Section)</option>
              <option value="full">Full Walls (Full Height Room Enclosure)</option>
            </select>
          </div>
        </div>

        <!-- Section: Environment & Performance -->
        <div class="form-section">
          <div class="section-header">Environment & Performance</div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="ambient_mode">Ambient Lighting</label>
              <select
                id="ambient_mode"
                class="form-control"
                data-field="ambient_mode"
                .value=${this._config.ambient_mode??`adaptive_contrast`}
                @change=${this._valueChanged}
              >
                <option value="adaptive_contrast">Adaptive Contrast (Recommended)</option>
                <option value="sun_sync">Sun Sync (Tracks sun.sun elevation)</option>
                <option value="dark">Dark Theme / Night Mode</option>
                <option value="daylight">Daylight Mode</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="quality_tier">Performance Tier</label>
              <select
                id="quality_tier"
                class="form-control"
                data-field="quality_tier"
                .value=${this._config.quality_tier??`auto`}
                @change=${this._valueChanged}
              >
                <option value="auto">Auto (Detect Platform & DPR)</option>
                <option value="tablet">Wall Tablet (Optimized 0-FPS)</option>
                <option value="high">High (Desktop / MSAA / 8 PointLights)</option>
                <option value="low">Low (Legacy / 256px Lightmap)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section: HUD & Interactivity Toggles -->
        <div class="form-section">
          <div class="section-header">Overlay Controls & Gestures</div>

          <div class="switch-row">
            <label class="switch-label" for="show_floor_selector">
              <span class="switch-title">Floor Switcher & Dollhouse Bar</span>
              <span class="switch-description">Show floor selector pills in top-left</span>
            </label>
            <input
              id="show_floor_selector"
              type="checkbox"
              class="switch-control"
              data-field="show_floor_selector"
              ?checked=${this._config.show_floor_selector??!0}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_wall_mode_toggle">
              <span class="switch-title">Wall Cutaway Button</span>
              <span class="switch-description">Allow toggling cutaway / half / full walls</span>
            </label>
            <input
              id="show_wall_mode_toggle"
              type="checkbox"
              class="switch-control"
              data-field="show_wall_mode_toggle"
              ?checked=${this._config.show_wall_mode_toggle??!0}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_reset_camera">
              <span class="switch-title">Reset Camera Button</span>
              <span class="switch-description">Allow quick camera return to saved default bookmark</span>
            </label>
            <input
              id="show_reset_camera"
              type="checkbox"
              class="switch-control"
              data-field="show_reset_camera"
              ?checked=${this._config.show_reset_camera??!0}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_room_labels">
              <span class="switch-title">Floating Room Labels</span>
              <span class="switch-description">Show room titles and area sensor metrics</span>
            </label>
            <input
              id="show_room_labels"
              type="checkbox"
              class="switch-control"
              data-field="show_room_labels"
              ?checked=${this._config.show_room_labels??!0}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="show_entity_badges">
              <span class="switch-title">Floating Entity Badges</span>
              <span class="switch-description">Display touch-interactive entity icons & status pills</span>
            </label>
            <input
              id="show_entity_badges"
              type="checkbox"
              class="switch-control"
              data-field="show_entity_badges"
              ?checked=${this._config.show_entity_badges??!0}
              @change=${this._valueChanged}
            />
          </div>

          <div class="switch-row">
            <label class="switch-label" for="enable_room_zoom_on_tap">
              <span class="switch-title">Room Zoom on Tap</span>
              <span class="switch-description">Smoothly center camera when tapping a room floor or label</span>
            </label>
            <input
              id="enable_room_zoom_on_tap"
              type="checkbox"
              class="switch-control"
              data-field="enable_room_zoom_on_tap"
              ?checked=${this._config.enable_room_zoom_on_tap??!1}
              @change=${this._valueChanged}
            />
          </div>
        </div>
      </div>
    `}static{this.styles=t`
    :host {
      display: block;
      box-sizing: border-box;
      padding: 16px 0;
      color: var(--primary-text-color, #f1f5f9);
      font-family: inherit;
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-section {
      background: var(--card-background-color, rgba(30, 41, 59, 0.45));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-header {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary-color, #3b82f6);
      margin-bottom: 2px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 500px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #e2e8f0);
    }

    .form-control {
      appearance: none;
      background: var(--input-fill-color, rgba(15, 23, 42, 0.7));
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.14));
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }

    .form-control:focus {
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 1px var(--primary-color, #3b82f6);
    }

    select.form-control {
      cursor: pointer;
      background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E');
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 32px;
    }

    .helper-text {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      line-height: 1.3;
    }

    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
    }

    .switch-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .switch-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
    }

    .switch-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #e2e8f0);
    }

    .switch-description {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
    }

    .switch-control {
      appearance: none;
      width: 38px;
      height: 22px;
      background: rgba(148, 163, 184, 0.3);
      border-radius: 9999px;
      position: relative;
      cursor: pointer;
      outline: none;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .switch-control::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switch-control:checked {
      background: var(--primary-color, #3b82f6);
    }

    .switch-control:checked::after {
      transform: translateX(16px);
    }
  `}};u([i({attribute:!1})],f.prototype,`hass`,null),u([n()],f.prototype,`_config`,void 0),u([n()],f.prototype,`_floorplans`,void 0),u([n()],f.prototype,`_loadingFloorplans`,void 0),u([n()],f.prototype,`_floorplansLoaded`,void 0),customElements.get(`floorplan-3d-card-editor`)||customElements.define(`floorplan-3d-card-editor`,f),window.customCards=window.customCards||[],window.customCards.some(e=>e.type===`floorplan-3d-card`)||window.customCards.push({type:`floorplan-3d-card`,name:`3D Floorplan Card`,description:`Interactive 3D bird's-eye floorplan with dynamic lighting and live Home Assistant entities`,preview:!0});var p=class extends e{constructor(...e){super(...e),this._document=null,this._activeFloorId=null,this._isDollhouse=!1,this._currentWallMode=`auto_cutaway`,this._currentProjection=`perspective`,this._loading=!1,this._errorMessage=null,this._scene3d=null,this._stateDiffer=new l,this._wsClient=null}static async getConfigElement(){return document.createElement(`floorplan-3d-card-editor`)}static getStubConfig(){return{type:`custom:floorplan-3d-card`,floorplan_id:`main_house`,wall_mode:`auto_cutaway`,camera_projection:`perspective`,ambient_mode:`adaptive_contrast`,quality_tier:`auto`,show_floor_selector:!0,show_wall_mode_toggle:!0,show_reset_camera:!0,show_room_labels:!0,show_entity_badges:!0}}set hass(e){let t=!this._hass;if(this._hass=e,this._config){if(!this._document&&!this._loading)this._loadFloorplan();else if(this._document){t&&this._stateDiffer.rebuildWatchedSet(this._document,e);let n=this._stateDiffer.diffStates(e);n.length>0&&this._scene3d&&this._scene3d.updateHassStates(e,n)}}}get hass(){return this._hass}setConfig(e){if(!e||!e.floorplan_id)throw Error(`Please define floorplan_id in your 3D Floorplan Card configuration.`);let t=this._config?.floorplan_id;this._config={...e},this._currentWallMode=e.wall_mode??`auto_cutaway`,this._currentProjection=e.camera_projection??`perspective`,this._scene3d&&(this._scene3d.setWallMode(this._currentWallMode),this._scene3d.setProjection(this._currentProjection),e.ambient_mode&&this._scene3d.setAmbientMode(e.ambient_mode),e.quality_tier&&this._scene3d.setQualityTier(e.quality_tier),this._scene3d.setOverlayVisibility({showRoomLabels:e.show_room_labels??!0,showEntityBadges:e.show_entity_badges??!0})),t&&t!==e.floorplan_id&&(this._teardownWs(),this._document=null,this._hass&&this._loadFloorplan())}getCardSize(){return Math.max(1,Math.round((this._config?.height??520)/50))}connectedCallback(){super.connectedCallback(),!this._scene3d&&this._document&&this._viewportContainer&&this._initScene()}disconnectedCallback(){this._teardownWs(),this._scene3d&&=(this._scene3d.dispose(),null),super.disconnectedCallback()}firstUpdated(){this._viewportContainer&&this._document&&!this._scene3d&&this._initScene()}async _loadFloorplan(){if(this._hass&&this._config?.floorplan_id&&!this._loading){this._loading=!0,this._errorMessage=null,this.requestUpdate();try{this._wsClient=new d(()=>this._hass);let e=await this._wsClient.getFloorplan(this._config.floorplan_id);this._document=e,this._stateDiffer.rebuildWatchedSet(e,this._hass);let t=e.floors.find(e=>e.id===this._config.default_floor_id);if(t||=e.floors.find(e=>e.level_index===0)??e.floors[0],this._activeFloorId=t?.id??null,!this._unsubscribeWs)try{this._unsubscribeWs=await this._wsClient.subscribeFloorplan(this._config.floorplan_id,e=>{e.event===`updated`&&e.floorplan?this._onFloorplanHotReload(e.floorplan):e.event===`deleted`&&(this._errorMessage=`Floorplan '${this._config.floorplan_id}' was deleted.`,this._document=null,this.requestUpdate())})}catch(e){console.warn(`[floorplan-3d-card] Real-time WS subscription notice:`,e)}this._loading=!1,this.requestUpdate(),await this.updateComplete,this._initScene()}catch(e){this._loading=!1,this._errorMessage=e instanceof Error?e.message:`Failed to load floorplan '${this._config.floorplan_id}'.`,this.requestUpdate()}}}_onFloorplanHotReload(e){this._document=e,this._stateDiffer.rebuildWatchedSet(e,this._hass),this._activeFloorId&&!e.floors.some(e=>e.id===this._activeFloorId)&&(this._activeFloorId=e.floors[0]?.id??null),this._scene3d&&this._scene3d.setDocument(e,this._activeFloorId??void 0,this._hass),this.requestUpdate()}_initScene(){this._viewportContainer&&this._document&&(this._scene3d&&=(this._scene3d.dispose(),null),this._scene3d=new c(this._viewportContainer,{qualityTier:this._config.quality_tier??`auto`,wallMode:this._currentWallMode,projection:this._currentProjection,ambientMode:this._config.ambient_mode,showRoomLabels:this._config.show_room_labels??!0,showEntityBadges:this._config.show_entity_badges??!0,onEntityAction:e=>{s(this,this._hass,e),this._config.enable_room_zoom_on_tap&&e.room&&this._scene3d?.focusOnRoom(e.room.id,!0)}}),this._scene3d.setDocument(this._document,this._activeFloorId??void 0,this._hass),this._isDollhouse&&this._scene3d.setStackedDollhouse(!0))}_teardownWs(){this._unsubscribeWs&&=(this._unsubscribeWs().catch(()=>{}),void 0)}_handleFloorSelect(e){this._activeFloorId!==e&&(this._activeFloorId=e,this._scene3d?.setActiveFloor(e,this._isDollhouse),this.requestUpdate())}_handleToggleDollhouse(){this._isDollhouse=!this._isDollhouse,this._scene3d?.setStackedDollhouse(this._isDollhouse),this.requestUpdate()}_handleCycleWallMode(){let e={auto_cutaway:`half`,half:`full`,full:`auto_cutaway`}[this._currentWallMode]??`auto_cutaway`;this._currentWallMode=e,this._scene3d?.setWallMode(e),this.requestUpdate()}_handleToggleProjection(){let e=this._currentProjection===`orthographic`?`perspective`:`orthographic`;this._currentProjection=e,this._scene3d?.setProjection(e),this.requestUpdate()}_handleResetCamera(){this._scene3d?.resetCameraToDefault(!0)}_getHeightStyle(){return this._config?.height?`${this._config.height}px`:`520px`}_getWallModeLabel(){switch(this._currentWallMode){case`auto_cutaway`:return`Cutaway`;case`half`:return`Half`;case`full`:return`Full`;default:return`Walls`}}render(){let e=this._getHeightStyle(),t=[...this._document?.floors||[]].sort((e,t)=>e.level_index-t.level_index),n=(this._config?.show_floor_selector??!0)&&t.length>0,i=this._config?.show_wall_mode_toggle??!0,o=this._config?.show_reset_camera??!0;return a`
      <div class="card-root" style="height: ${e};">
        <!-- 3D Three.js WebGL & CSS2D Container -->
        <div class="viewport-container"></div>

        <!-- Top-Left Overlay: Floor Switcher & Dollhouse Mode -->
        ${n?a`
              <div class="hud-overlay hud-top-left">
                <div class="glass-pill-bar">
                  ${t.map(e=>a`
                      <button
                        type="button"
                        class="pill-btn ${this._activeFloorId===e.id?`active`:``}"
                        @click=${()=>this._handleFloorSelect(e.id)}
                        title="${e.name} (Level ${e.level_index})"
                      >
                        ${e.name||`Level ${e.level_index}`}
                      </button>
                    `)}
                  ${t.length>1?a`
                        <button
                          type="button"
                          class="pill-btn icon-pill ${this._isDollhouse?`active`:``}"
                          @click=${this._handleToggleDollhouse}
                          title="Dollhouse View (Stacked Floors)"
                        >
                          <svg viewBox="0 0 24 24" class="hud-icon">
                            <path
                              fill="currentColor"
                              d="M12 3L2 9l10 6 10-6-10-6zm0 8.5L4.5 7.5 12 4.5l7.5 3L12 11.5zM2 13l10 6 10-6v2l-10 6-10-6v-2zm0 4l10 6 10-6v2l-10 6-10-6v-2z"
                            />
                          </svg>
                          <span>Dollhouse</span>
                        </button>
                      `:r}
                </div>
              </div>
            `:r}

        <!-- Top-Right Overlay: Wall Cutaway, Camera Projection, Reset View -->
        <div class="hud-overlay hud-top-right">
          <div class="glass-pill-bar">
            ${i?a`
                  <button
                    type="button"
                    class="pill-btn icon-pill"
                    @click=${this._handleCycleWallMode}
                    title="Wall Display Mode (${this._getWallModeLabel()})"
                  >
                    <svg viewBox="0 0 24 24" class="hud-icon">
                      <path
                        fill="currentColor"
                        d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4h-6V6h6v2zm-8-2v2H5V6h6zm-6 4h6v2H5v-2zm8 0h6v2h-6v-2zm6 4h-6v2h6v-2zm-8 2H5v-2h6v2z"
                      />
                    </svg>
                    <span>${this._getWallModeLabel()}</span>
                  </button>
                `:r}

            <button
              type="button"
              class="pill-btn icon-pill"
              @click=${this._handleToggleProjection}
              title="Camera Projection (${this._currentProjection===`orthographic`?`Isometric`:`3D Perspective`})"
            >
              <svg viewBox="0 0 24 24" class="hud-icon">
                <path
                  fill="currentColor"
                  d="M21 16.5l-9 5.25-9-5.25V7.5L12 2.25l9 5.25v9zM12 4.15L5.05 8.2 12 12.25l6.95-4.05L12 4.15zM4.5 9.87v5.52l6.75 3.94v-5.52L4.5 9.87zm15 0l-6.75 3.94v5.52l6.75-3.94V9.87z"
                />
              </svg>
              <span>${this._currentProjection===`orthographic`?`Iso`:`3D`}</span>
            </button>

            ${o?a`
                  <button
                    type="button"
                    class="pill-btn icon-only"
                    @click=${this._handleResetCamera}
                    title="Reset Camera to Saved Default Bookmark"
                  >
                    <svg viewBox="0 0 24 24" class="hud-icon">
                      <path
                        fill="currentColor"
                        d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.16 5.44-5 5.92v2.02c3.95-.49 7-3.85 7-7.94 0-4.42-3.58-8-8-8zm-6 8c0-1.66.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.09 3.05 7.45 7 7.94v-2.02c-2.84-.48-5-2.95-5-5.92z"
                      />
                    </svg>
                  </button>
                `:r}
          </div>
        </div>

        <!-- Loading State Overlay -->
        ${this._loading?a`
              <div class="status-overlay">
                <div class="spinner"></div>
                <div class="status-text">Loading 3D Floorplan...</div>
              </div>
            `:r}

        <!-- Error State Overlay -->
        ${this._errorMessage?a`
              <div class="status-overlay error">
                <div class="error-card">
                  <div class="error-title">Floorplan Unavailable</div>
                  <div class="error-detail">${this._errorMessage}</div>
                  <button type="button" class="retry-btn" @click=${this._loadFloorplan}>
                    Retry
                  </button>
                </div>
              </div>
            `:r}
      </div>
    `}static{this.styles=t`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      width: 100%;
    }

    .card-root {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: #0f172a;
      box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0, 0, 0, 0.25));
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, rgba(255, 255, 255, 0.08));
    }

    .viewport-container {
      width: 100%;
      height: 100%;
      display: block;
      overflow: hidden;
      touch-action: none;
    }

    /* Floating Glassmorphic HUD */
    .hud-overlay {
      position: absolute;
      top: 12px;
      z-index: 10;
      pointer-events: none;
    }

    .hud-top-left {
      left: 12px;
      max-width: 60%;
    }

    .hud-top-right {
      right: 12px;
    }

    .glass-pill-bar {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      background: rgba(15, 23, 42, 0.76);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      pointer-events: auto;
      user-select: none;
    }

    .pill-btn {
      appearance: none;
      border: none;
      outline: none;
      background: transparent;
      color: #94a3b8;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.18s ease;
      min-height: 28px;
    }

    .pill-btn:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.08);
    }

    .pill-btn.active {
      color: #ffffff;
      background: var(--primary-color, #3b82f6);
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    }

    .pill-btn.icon-only {
      padding: 6px 8px;
    }

    .hud-icon {
      width: 14px;
      height: 14px;
      display: block;
    }

    /* Loading and Error Overlays */
    .status-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 20;
      color: #f8fafc;
      gap: 12px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--primary-color, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: #cbd5e1;
    }

    .error-card {
      max-width: 380px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .error-title {
      font-size: 15px;
      font-weight: 600;
      color: #f87171;
      margin-bottom: 8px;
    }

    .error-detail {
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .retry-btn {
      appearance: none;
      border: none;
      background: var(--primary-color, #3b82f6);
      color: white;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .retry-btn:hover {
      opacity: 0.9;
    }
  `}};u([i({attribute:!1})],p.prototype,`hass`,null),u([n()],p.prototype,`_config`,void 0),u([n()],p.prototype,`_document`,void 0),u([n()],p.prototype,`_activeFloorId`,void 0),u([n()],p.prototype,`_isDollhouse`,void 0),u([n()],p.prototype,`_currentWallMode`,void 0),u([n()],p.prototype,`_currentProjection`,void 0),u([n()],p.prototype,`_loading`,void 0),u([n()],p.prototype,`_errorMessage`,void 0),u([o(`.viewport-container`)],p.prototype,`_viewportContainer`,void 0),customElements.get(`floorplan-3d-card`)||customElements.define(`floorplan-3d-card`,p);