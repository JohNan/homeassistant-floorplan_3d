import{a as e,c as t,i as n,l as r,n as i,o as a,r as o,s}from"./chunks/lit-vendor-55gREmrw.js";import{a as c,c as l,d as u,f as d,h as f,l as p,m,n as h,o as g,p as _,r as v,s as y,t as b,u as x}from"./chunks/decorate-dPZQ3_Ga.js";function S(e=`main_house`,t=`Main House`){let n=new Date().toISOString();return{id:e,name:t,revision:1,created_at:n,updated_at:n,unit:`m`,grid_size:.1,ambient_config:{mode:`adaptive_contrast`,sun_entity_id:`sun.sun`,base_ambient_intensity:.25,wall_color:`#e2e8f0`,floor_color:`#334155`,background_color:`#0f172a`},floors:[{id:`ground_floor`,name:`Ground Floor`,level_index:0,elevation:0,wall_height:2.6,slab_thickness:.15,ha_floor_id:null,blueprint:null,default_camera:{projection:`perspective`,position:[0,11,10],target:[0,0,0],zoom:1},nodes:[{id:`n1`,x:-4,y:-3},{id:`n2`,x:4,y:-3},{id:`n3`,x:4,y:3},{id:`n4`,x:-4,y:3}],walls:[{id:`w1`,start_node_id:`n1`,end_node_id:`n2`,thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:`w2`,start_node_id:`n2`,end_node_id:`n3`,thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:`w3`,start_node_id:`n3`,end_node_id:`n4`,thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:`w4`,start_node_id:`n4`,end_node_id:`n1`,thickness:.2,height_override:null,is_exterior:!0,color_override:null}],openings:[],rooms:[{id:`r1`,name:`Living Room`,ha_area_id:null,points:[{x:-4,y:-3,node_id:`n1`},{x:4,y:-3,node_id:`n2`},{x:4,y:3,node_id:`n3`},{x:-4,y:3,node_id:`n4`}],floor_material:`wood_oak`,floor_color:`#8b6f4e`,show_label:!0,temp_entity_id:null,humidity_entity_id:null,motion_entity_id:null,room_tap_action:{action:`toggle`}}],furniture:[],entities:[]}]}}var C=class{constructor(e,t=50){if(this.entries=[],this.currentIndex=0,this.savedIndex=0,t<1)throw Error(`maxSteps must be at least 1`);this.maxSteps=t,this.reset(e)}get current(){let e=this.entries[this.currentIndex];return structuredClone(e.state)}push(e,t){if(this.currentIndex<this.entries.length-1&&(this.savedIndex!==null&&this.savedIndex>this.currentIndex&&(this.savedIndex=null),this.entries=this.entries.slice(0,this.currentIndex+1)),this.entries.push({state:structuredClone(e),label:t,timestamp:Date.now()}),this.entries.length>this.maxSteps){let e=this.entries.length-this.maxSteps;this.entries=this.entries.slice(e),this.savedIndex!==null&&(this.savedIndex-=e,this.savedIndex<0&&(this.savedIndex=null))}this.currentIndex=this.entries.length-1}undo(){return this.canUndo?(this.currentIndex--,this.current):null}redo(){return this.canRedo?(this.currentIndex++,this.current):null}get canUndo(){return this.currentIndex>0}get canRedo(){return this.currentIndex<this.entries.length-1}markSaved(){this.savedIndex=this.currentIndex}get isDirty(){return this.savedIndex!==this.currentIndex}reset(e){this.entries=[{state:structuredClone(e),timestamp:Date.now()}],this.currentIndex=0,this.savedIndex=0}get length(){return this.entries.length}get index(){return this.currentIndex}},w=class extends e{constructor(...e){super(...e),this.floor=null,this.ghostFloor=null,this.toolMode=`select`,this.selection={kind:`none`,id:null},this.gridSize=.1,this.snapToGrid=!0,this.snapAngleDeg=15,this.pendingOpeningType=`door_single`,this.pixelsPerMeter=60,this.panX=0,this.panY=0,this.canvasWidth=800,this.canvasHeight=600,this.isPanning=!1,this.panStartScreen={x:0,y:0},this.panStartWorld={x:0,y:0},this.spaceHeld=!1,this.didPanMove=!1,this.panStartedOnSelectable=!1,this.activePointers=new Map,this.prevPinchDist=null,this.prevPinchCenter=null,this.cursorWorld={x:0,y:0},this.snappedCursor={x:0,y:0},this.wallDrawStartNodeId=null,this.wallDrawStartPoint=null,this.roomDrawPoints=[],this.hoverWallId=null,this.hoverWallT=.5,this.hoverOpeningPoint=null,this.measureP1=null,this.measureP2=null,this.measureLocked=!1,this.dragKind=null,this.dragItemId=null,this.dragStartWorld={x:0,y:0},this.itemOriginalPos={x:0,y:0},this.dragWallOrigStart={x:0,y:0},this.dragWallOrigEnd={x:0,y:0},this.isItemDragging=!1,this.hasItemDragMoved=!1,this.hasInitialFit=!1,this.handleGlobalKeyDown=e=>{e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||(e.code===`Space`&&!this.spaceHeld?(this.spaceHeld=!0,this.requestUpdate()):e.key===`Delete`||e.key===`Backspace`?this.deleteSelected():e.key===`Escape`&&this.cancelActiveOperation())},this.handleGlobalKeyUp=e=>{e.code===`Space`&&(this.spaceHeld=!1,this.requestUpdate())},this.handleGlobalPointerMove=e=>{if(this.activePointers.has(e.pointerId)&&this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.activePointers.size===2){if(this.isItemDragging){if(this.dragKind===`wall`&&this.floor&&this.dragItemId){let e=this.floor.walls.find(e=>e.id===this.dragItemId);if(e){let t=this.dragWallOrigStart,n=this.dragWallOrigEnd;this.floor={...this.floor,nodes:this.floor.nodes.map(r=>r.id===e.start_node_id?{...r,x:t.x,y:t.y}:r.id===e.end_node_id?{...r,x:n.x,y:n.y}:r),rooms:this.floor.rooms.map(r=>({...r,points:r.points.map(r=>r.node_id===e.start_node_id?{...r,x:t.x,y:t.y}:r.node_id===e.end_node_id?{...r,x:n.x,y:n.y}:r)}))}}}this.isItemDragging=!1,this.hasItemDragMoved=!1,this.dragKind=null,this.dragItemId=null}this.isPanning=!1;let e=Array.from(this.activePointers.values()),t=this.getBoundingClientRect(),n={x:e[0].x-t.left,y:e[0].y-t.top},r={x:e[1].x-t.left,y:e[1].y-t.top},i=Math.hypot(r.x-n.x,r.y-n.y),a={x:(n.x+r.x)/2,y:(n.y+r.y)/2};if(this.prevPinchDist&&this.prevPinchCenter&&this.prevPinchDist>10){let e=i/this.prevPinchDist,t=Math.max(20,Math.min(250,this.pixelsPerMeter*e)),n={x:this.panX+(this.prevPinchCenter.x-this.canvasWidth/2)/this.pixelsPerMeter,y:this.panY+(this.prevPinchCenter.y-this.canvasHeight/2)/this.pixelsPerMeter};this.panX=n.x-(a.x-this.canvasWidth/2)/t,this.panY=n.y-(a.y-this.canvasHeight/2)/t,this.pixelsPerMeter=t}this.prevPinchDist=i,this.prevPinchCenter=a;return}if(this.activePointers.size<2&&(this.prevPinchDist=null,this.prevPinchCenter=null),this.isPanning){let t=(e.clientX-this.panStartScreen.x)/this.pixelsPerMeter,n=(e.clientY-this.panStartScreen.y)/this.pixelsPerMeter;this.panX=this.panStartWorld.x-t,this.panY=this.panStartWorld.y-n,Math.hypot(e.clientX-this.panStartScreen.x,e.clientY-this.panStartScreen.y)>5&&(this.didPanMove=!0);return}let t=this.getBoundingClientRect(),n=e.clientX-t.left,r=e.clientY-t.top;if(this.cursorWorld=this.screenToWorld(n,r),this.toolMode===`draw_wall`&&this.wallDrawStartPoint){let e=this.getSnapResult(this.cursorWorld,this.wallDrawStartPoint);this.snappedCursor=e.point}else{let e=this.getSnapResult(this.cursorWorld);this.snappedCursor=e.point}this.toolMode===`add_opening`&&this.floor&&this.updateOpeningHover(this.cursorWorld),this.isItemDragging&&this.floor&&this.handleItemDragMove(this.cursorWorld),this.toolMode===`measure`&&this.measureP1&&!this.measureLocked&&(this.measureP2=this.snappedCursor)},this.handleGlobalPointerUp=e=>{if(this.activePointers.delete(e.pointerId),this.activePointers.size<2&&(this.prevPinchDist=null,this.prevPinchCenter=null),this.isPanning&&(this.isPanning=!1,this.toolMode===`select`&&!this.didPanMove&&!this.panStartedOnSelectable&&this.emitSelectionChange({kind:`none`,id:null}),this.panStartedOnSelectable=!1),this.isItemDragging&&this.floor){if(this.isItemDragging=!1,this.hasItemDragMoved){let e=this.dragKind===`furniture_rotate`?`Rotated furniture`:`Moved ${this.dragKind||`item`}`;this.emitFloorChange(this.floor,e)}this.hasItemDragMoved=!1,this.dragKind=null,this.dragItemId=null}}}static{this.styles=r`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--primary-background-color, #0b0f19);
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .canvas-svg {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }

    .cursor-select {
      cursor: default;
    }

    .cursor-panning {
      cursor: grabbing !important;
    }

    .cursor-grab {
      cursor: grab;
    }

    .wall-group {
      cursor: move;
    }

    .wall-footprint {
      cursor: move;
      transition: fill 0.15s, stroke 0.15s;
    }

    .wall-node {
      cursor: move;
      transition: transform 0.15s;
    }

    .wall-node:hover {
      transform: scale(1.2);
    }

    .room-polygon {
      cursor: pointer;
      transition: fill-opacity 0.15s, stroke 0.15s;
    }

    .furniture-item {
      cursor: move;
    }

    .rotation-handle {
      cursor: grab;
    }

    .rotation-handle:active {
      cursor: grabbing;
    }

    .entity-item {
      cursor: move;
    }

    .opening-item {
      cursor: ew-resize;
    }

    .ghost-layer {
      pointer-events: none;
      opacity: 0.25;
    }

    .hud-overlay {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 10;
    }

    .hud-scale-bar {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .scale-ruler {
      height: 4px;
      border: 1px solid var(--primary-color, #38bdf8);
      border-top: none;
      background: rgba(56, 189, 248, 0.2);
      margin-top: 2px;
    }

    .hud-coords {
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.75rem;
      display: flex;
      gap: 0.75rem;
    }

    .hud-coords strong {
      color: var(--primary-text-color, #f8fafc);
    }

    .hud-tool-badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-color, #38bdf8);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 0.8125rem;
      font-weight: 600;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .touch-action-bar {
      position: absolute;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      z-index: 10;
      pointer-events: auto;
      max-width: 90vw;
    }

    .touch-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--divider-color, #334155);
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      transition: transform 0.1s, opacity 0.15s, background-color 0.15s;
      min-height: 36px;
    }

    .touch-pill:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .touch-pill:active:not(:disabled) {
      transform: translateY(1px);
    }

    .touch-pill:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .touch-pill-success {
      background: var(--success-color, #10b981);
      color: #ffffff;
      border-color: transparent;
    }

    .touch-pill-danger {
      background: var(--error-color, #ef4444);
      color: #ffffff;
      border-color: transparent;
    }

    .touch-pill-warning {
      background: var(--warning-color, #f59e0b);
      color: #ffffff;
      border-color: transparent;
    }

    .zoom-controls {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      z-index: 10;
      pointer-events: auto;
    }

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      min-height: 36px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #334155);
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      color: var(--primary-text-color, #f8fafc);
      backdrop-filter: blur(4px);
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      transition: background-color 0.15s, transform 0.1s;
    }

    .zoom-btn:hover {
      background: var(--secondary-background-color, #334155);
    }

    .zoom-btn:active {
      transform: scale(0.95);
    }

    .zoom-btn-fit {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .dimension-label {
      font-size: 10px;
      font-weight: 600;
      fill: var(--primary-text-color, #cbd5e1);
      text-anchor: middle;
      pointer-events: none;
      user-select: none;
    }
  `}connectedCallback(){super.connectedCallback(),typeof ResizeObserver<`u`&&(this.resizeObserver=new ResizeObserver(e=>{for(let t of e){let e=t.contentRect;e.width>0&&e.height>0&&(this.canvasWidth=e.width,this.canvasHeight=e.height)}}),this.resizeObserver.observe(this)),window.addEventListener(`keydown`,this.handleGlobalKeyDown),window.addEventListener(`keyup`,this.handleGlobalKeyUp),window.addEventListener(`pointermove`,this.handleGlobalPointerMove),window.addEventListener(`pointerup`,this.handleGlobalPointerUp),window.addEventListener(`pointercancel`,this.handleGlobalPointerUp)}disconnectedCallback(){super.disconnectedCallback(),this.resizeObserver?.disconnect(),window.removeEventListener(`keydown`,this.handleGlobalKeyDown),window.removeEventListener(`keyup`,this.handleGlobalKeyUp),window.removeEventListener(`pointermove`,this.handleGlobalPointerMove),window.removeEventListener(`pointerup`,this.handleGlobalPointerUp),window.removeEventListener(`pointercancel`,this.handleGlobalPointerUp)}willUpdate(){!this.hasInitialFit&&this.floor&&(this.floor.nodes.length>0||this.floor.blueprint)&&(this.hasInitialFit=!0,this.fitViewToFloor(!1))}worldToScreen(e,t){return{x:this.canvasWidth/2+(e-this.panX)*this.pixelsPerMeter,y:this.canvasHeight/2+(t-this.panY)*this.pixelsPerMeter}}screenToWorld(e,t){return{x:this.panX+(e-this.canvasWidth/2)/this.pixelsPerMeter,y:this.panY+(t-this.canvasHeight/2)/this.pixelsPerMeter}}sx(e){return this.canvasWidth/2+(e-this.panX)*this.pixelsPerMeter}sy(e){return this.canvasHeight/2+(e-this.panY)*this.pixelsPerMeter}getViewportCenterWorld(){return{x:Number(this.panX.toFixed(3)),y:Number(this.panY.toFixed(3))}}zoomIn(){this.pixelsPerMeter=Math.max(20,Math.min(250,this.pixelsPerMeter*1.25)),this.requestUpdate()}zoomOut(){this.pixelsPerMeter=Math.max(20,Math.min(250,this.pixelsPerMeter*.8)),this.requestUpdate()}fitViewToFloor(e=!0){if(!this.floor)return;let t=y(this.floor,1.5);this.panX=t.centerX,this.panY=t.centerY;let n=this.canvasWidth||800,r=this.canvasHeight||600,i=(n-100)/Math.max(1,t.width),a=(r-100)/Math.max(1,t.height);this.pixelsPerMeter=Math.max(20,Math.min(250,Math.min(i,a))),e&&this.requestUpdate()}emitFloorChange(e,t){this.dispatchEvent(new CustomEvent(`floor-change`,{detail:{floor:e,description:t},bubbles:!0,composed:!0}))}emitSelectionChange(e){this.selection=e,this.dispatchEvent(new CustomEvent(`selection-change`,{detail:{selection:e},bubbles:!0,composed:!0}))}getSnapResult(e,t,n){return this.floor?_(e,{gridSize:this.gridSize,snapToGrid:this.snapToGrid,nodes:this.floor.nodes,walls:this.floor.walls,nodeSnapRadius:.25,anchorPoint:t,snapAngleDeg:this.snapAngleDeg,excludeNodeIds:n}):{point:e,snappedNodeId:null,snappedWallId:null}}cancelActiveOperation(){this.wallDrawStartPoint||this.wallDrawStartNodeId?(this.wallDrawStartPoint=null,this.wallDrawStartNodeId=null):this.roomDrawPoints.length>0?this.roomDrawPoints=[]:this.measureP1?(this.measureP1=null,this.measureP2=null,this.measureLocked=!1):this.selection.kind!==`none`&&this.emitSelectionChange({kind:`none`,id:null}),this.requestUpdate()}deleteSelected(){if(!this.floor||this.selection.kind===`none`||!this.selection.id)return;let{kind:e,id:t}=this.selection,n={...this.floor},r=``;if(e===`node`){let e=new Set(n.walls.filter(e=>e.start_node_id===t||e.end_node_id===t).map(e=>e.id));n.nodes=n.nodes.filter(e=>e.id!==t),n.walls=n.walls.filter(t=>!e.has(t.id)),n.openings=n.openings.filter(t=>!e.has(t.wall_id)),n.rooms=n.rooms.map(e=>({...e,points:e.points.filter(e=>e.node_id!==t)})).filter(e=>e.points.length>=3),r=`Deleted wall node`}else e===`wall`?(n.walls=n.walls.filter(e=>e.id!==t),n.openings=n.openings.filter(e=>e.wall_id!==t),r=`Deleted wall`):e===`opening`?(n.openings=n.openings.filter(e=>e.id!==t),r=`Deleted opening`):e===`room`?(n.rooms=n.rooms.filter(e=>e.id!==t),r=`Deleted room`):e===`furniture`?(n.furniture=n.furniture.filter(e=>e.id!==t),r=`Deleted furniture`):e===`entity`&&(n.entities=n.entities.filter(e=>e.id!==t),r=`Deleted entity placement`);this.floor=n,this.emitSelectionChange({kind:`none`,id:null}),this.emitFloorChange(n,r)}handleWheel(e){e.preventDefault();let t=this.getBoundingClientRect(),n=e.clientX-t.left,r=e.clientY-t.top,i=this.screenToWorld(n,r),a=e.deltaY<0?1.15:1/1.15,o=Math.max(20,Math.min(250,this.pixelsPerMeter*a));this.panX=i.x-(n-this.canvasWidth/2)/o,this.panY=i.y-(r-this.canvasHeight/2)/o,this.pixelsPerMeter=o}handleSvgPointerDown(e){if(this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),e.button===1||e.button===2||e.button===0&&this.spaceHeld){e.preventDefault(),this.isPanning=!0,this.panStartScreen={x:e.clientX,y:e.clientY},this.panStartWorld={x:this.panX,y:this.panY},this.didPanMove=!1;return}if(e.button!==0||!this.floor)return;if(this.toolMode===`select`&&!this.isItemDragging&&this.activePointers.size===1){this.isPanning=!0,this.panStartScreen={x:e.clientX,y:e.clientY},this.panStartWorld={x:this.panX,y:this.panY},this.didPanMove=!1;return}let t=this.getBoundingClientRect(),n=e.clientX-t.left,r=e.clientY-t.top,i=this.screenToWorld(n,r);this.toolMode===`draw_wall`?this.handleDrawWallClick(i):this.toolMode===`draw_room`?this.handleDrawRoomClick(i):this.toolMode===`add_opening`?this.handleAddOpeningClick():this.toolMode===`measure`&&this.handleMeasureClick(i)}handleDrawWallClick(e){if(this.floor){if(this.wallDrawStartPoint){let t=this.getSnapResult(e,this.wallDrawStartPoint);if(l(this.wallDrawStartPoint,t.point)<.1)return;let n=t.snappedNodeId,r=[...this.floor.nodes];if(!n){let e={id:`node_`+Math.random().toString(36).substring(2,9),x:Number(t.point.x.toFixed(3)),y:Number(t.point.y.toFixed(3))};r.push(e),n=e.id}if(n===this.wallDrawStartNodeId)return;let i={id:`wall_`+Math.random().toString(36).substring(2,9),start_node_id:this.wallDrawStartNodeId,end_node_id:n,thickness:.15,height_override:null,is_exterior:!1,color_override:null},a={...this.floor,nodes:r,walls:[...this.floor.walls,i]};this.floor=a,this.emitFloorChange(a,`Added wall segment`),this.wallDrawStartNodeId=n,this.wallDrawStartPoint=t.point}else{let t=this.getSnapResult(e);if(t.snappedNodeId)this.wallDrawStartNodeId=t.snappedNodeId,this.wallDrawStartPoint=t.point;else{let e={id:`node_`+Math.random().toString(36).substring(2,9),x:Number(t.point.x.toFixed(3)),y:Number(t.point.y.toFixed(3))},n={...this.floor,nodes:[...this.floor.nodes,e]};this.floor=n,this.wallDrawStartNodeId=e.id,this.wallDrawStartPoint={x:e.x,y:e.y},this.emitFloorChange(n,`Added wall start node`)}}}}handleDrawRoomClick(e){if(!this.floor)return;let t=this.getSnapResult(e);if(this.roomDrawPoints.length>=3){let e=this.roomDrawPoints[0];if(l(t.point,e)<.35){this.finishRoomPolygon();return}}this.roomDrawPoints=[...this.roomDrawPoints,{x:t.point.x,y:t.point.y,node_id:t.snappedNodeId}]}finishRoomPolygon(){if(!this.floor||this.roomDrawPoints.length<3)return;let e={id:`room_`+Math.random().toString(36).substring(2,9),name:`Room ${this.floor.rooms.length+1}`,ha_area_id:null,points:[...this.roomDrawPoints],floor_material:`wood_oak`,floor_color:`#334155`,show_label:!0,temp_entity_id:null,humidity_entity_id:null,motion_entity_id:null,room_tap_action:{action:`default`}},t={...this.floor,rooms:[...this.floor.rooms,e]};this.floor=t,this.roomDrawPoints=[],this.emitFloorChange(t,`Created ${e.name}`),this.emitSelectionChange({kind:`room`,id:e.id})}updateOpeningHover(e){if(!this.floor)return;let t=new Map(this.floor.nodes.map(e=>[e.id,e])),n=null,r=null,i=.6;for(let a of this.floor.walls){let o=t.get(a.start_node_id),s=t.get(a.end_node_id);if(!o||!s)continue;let c=d(e,o,s);c.distance<i&&(i=c.distance,n=a,r=c)}n&&r?(this.hoverWallId=n.id,this.hoverWallT=r.t,this.hoverOpeningPoint=r.point):(this.hoverWallId=null,this.hoverOpeningPoint=null)}handleAddOpeningClick(){if(!this.floor||!this.hoverWallId||!this.hoverOpeningPoint)return;let e=this.pendingOpeningType.startsWith(`door`),t=e?.9:1.2,n={id:`op_`+Math.random().toString(36).substring(2,9),wall_id:this.hoverWallId,type:this.pendingOpeningType,t:Number(this.hoverWallT.toFixed(3)),width:t,sill_height:e?0:.9,head_height:2.1,swing_direction:`left_in`,bound_entity_id:null},r={...this.floor,openings:[...this.floor.openings,n]};this.floor=r,this.emitFloorChange(r,`Added ${this.pendingOpeningType}`),this.emitSelectionChange({kind:`opening`,id:n.id})}handleMeasureClick(e){let t=this.getSnapResult(e);!this.measureP1||this.measureLocked?(this.measureP1=t.point,this.measureP2=t.point,this.measureLocked=!1):(this.measureP2=t.point,this.measureLocked=!0)}updateCursorFromPointerEvent(e){let t=this.getBoundingClientRect();this.cursorWorld=this.screenToWorld(e.clientX-t.left,e.clientY-t.top)}startNodeDrag(e,t){this.toolMode!==`select`||e.button!==0||this.spaceHeld||(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`node`,id:t.id}),this.dragKind=`node`,this.dragItemId=t.id,this.dragStartWorld={x:t.x,y:t.y},this.itemOriginalPos={x:t.x,y:t.y},this.isItemDragging=!0,this.hasItemDragMoved=!1)}startWallDrag(e,t){if(this.toolMode!==`select`||e.button!==0||this.spaceHeld||!this.floor)return;let n=this.floor.nodes.find(e=>e.id===t.start_node_id),r=this.floor.nodes.find(e=>e.id===t.end_node_id);n&&r&&(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`wall`,id:t.id}),this.dragKind=`wall`,this.dragItemId=t.id,this.dragStartWorld={...this.cursorWorld},this.dragWallOrigStart={x:n.x,y:n.y},this.dragWallOrigEnd={x:r.x,y:r.y},this.isItemDragging=!0,this.hasItemDragMoved=!1)}startFurnitureDrag(e,t){this.toolMode!==`select`||e.button!==0||this.spaceHeld||(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`furniture`,id:t.id}),this.dragKind=`furniture`,this.dragItemId=t.id,this.dragStartWorld={...this.cursorWorld},this.itemOriginalPos={x:t.x,y:t.y},this.isItemDragging=!0,this.hasItemDragMoved=!1)}startFurnitureRotate(e,t){this.toolMode!==`select`||e.button!==0||this.spaceHeld||(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`furniture`,id:t.id}),this.dragKind=`furniture_rotate`,this.dragItemId=t.id,this.itemOriginalPos={x:t.x,y:t.y},this.isItemDragging=!0,this.hasItemDragMoved=!1)}startEntityDrag(e,t){this.toolMode!==`select`||e.button!==0||this.spaceHeld||(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`entity`,id:t.id}),this.dragKind=`entity`,this.dragItemId=t.id,this.dragStartWorld={...this.cursorWorld},this.itemOriginalPos={x:t.x,y:t.y},this.isItemDragging=!0,this.hasItemDragMoved=!1)}startOpeningDrag(e,t){this.toolMode!==`select`||e.button!==0||this.spaceHeld||(e.stopPropagation(),this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.updateCursorFromPointerEvent(e),this.emitSelectionChange({kind:`opening`,id:t.id}),this.dragKind=`opening`,this.dragItemId=t.id,this.isItemDragging=!0,this.hasItemDragMoved=!1)}handleItemDragMove(e){if(this.floor&&this.dragItemId){if(this.hasItemDragMoved=!0,this.dragKind===`node`){let t=this.getSnapResult(e,void 0,new Set([this.dragItemId])),n=t.point.x,r=t.point.y,i=this.floor.nodes.map(e=>e.id===this.dragItemId?{...e,x:n,y:r}:e),a=this.floor.rooms.map(e=>({...e,points:e.points.map(e=>e.node_id===this.dragItemId?{...e,x:n,y:r}:e)}));this.floor={...this.floor,nodes:i,rooms:a}}else if(this.dragKind===`wall`){let t=this.floor.walls.find(e=>e.id===this.dragItemId);if(!t)return;let n=e.x-this.dragStartWorld.x,r=e.y-this.dragStartWorld.y,i=this.dragWallOrigStart.x+n,a=this.dragWallOrigStart.y+r;this.snapToGrid&&this.gridSize>0&&(i=Math.round(i/this.gridSize)*this.gridSize,a=Math.round(a/this.gridSize)*this.gridSize,n=i-this.dragWallOrigStart.x,r=a-this.dragWallOrigStart.y);let o=Number((this.dragWallOrigStart.x+n).toFixed(3)),s=Number((this.dragWallOrigStart.y+r).toFixed(3)),c=Number((this.dragWallOrigEnd.x+n).toFixed(3)),l=Number((this.dragWallOrigEnd.y+r).toFixed(3)),u=this.floor.nodes.map(e=>e.id===t.start_node_id?{...e,x:o,y:s}:e.id===t.end_node_id?{...e,x:c,y:l}:e),d=this.floor.rooms.map(e=>({...e,points:e.points.map(e=>e.node_id===t.start_node_id?{...e,x:o,y:s}:e.node_id===t.end_node_id?{...e,x:c,y:l}:e)}));this.floor={...this.floor,nodes:u,rooms:d}}else if(this.dragKind===`furniture`){let t=e.x-this.dragStartWorld.x,n=e.y-this.dragStartWorld.y,r=this.itemOriginalPos.x+t,i=this.itemOriginalPos.y+n;this.snapToGrid&&this.gridSize>0&&(r=Math.round(r/this.gridSize)*this.gridSize,i=Math.round(i/this.gridSize)*this.gridSize),this.floor={...this.floor,furniture:this.floor.furniture.map(e=>e.id===this.dragItemId?{...e,x:Number(r.toFixed(3)),y:Number(i.toFixed(3))}:e)}}else if(this.dragKind===`furniture_rotate`){let t=this.itemOriginalPos.x,n=this.itemOriginalPos.y,r=Math.atan2(e.y-n,e.x-t)*180/Math.PI+90;r<0&&(r+=360),r%=360,this.snapAngleDeg>0&&(r=Math.round(r/this.snapAngleDeg)*this.snapAngleDeg),this.floor={...this.floor,furniture:this.floor.furniture.map(e=>e.id===this.dragItemId?{...e,rotation_deg:r%360}:e)}}else if(this.dragKind===`entity`){let t=e.x-this.dragStartWorld.x,n=e.y-this.dragStartWorld.y,r=this.itemOriginalPos.x+t,i=this.itemOriginalPos.y+n;this.snapToGrid&&this.gridSize>0&&(r=Math.round(r/this.gridSize)*this.gridSize,i=Math.round(i/this.gridSize)*this.gridSize);let a={x:r,y:i},o=this.floor.rooms.find(e=>x(a,e.points));this.floor={...this.floor,entities:this.floor.entities.map(e=>e.id===this.dragItemId?{...e,x:Number(r.toFixed(3)),y:Number(i.toFixed(3)),room_id:o?o.id:null}:e)}}else if(this.dragKind===`opening`){let t=this.floor.openings.find(e=>e.id===this.dragItemId);if(!t)return;let n=this.floor.walls.find(e=>e.id===t.wall_id);if(!n)return;let r=new Map(this.floor.nodes.map(e=>[e.id,e])),i=r.get(n.start_node_id),a=r.get(n.end_node_id);if(!i||!a)return;let o=d(e,i,a),s=l(i,a),c=t.width/2/Math.max(.1,s),u=Math.max(c,Math.min(1-c,o.t));this.floor={...this.floor,openings:this.floor.openings.map(e=>e.id===this.dragItemId?{...e,t:Number(u.toFixed(3))}:e)}}}}handleDragOver(e){e.dataTransfer?.types.includes(`application/x-floorplan-palette`)&&(e.preventDefault(),e.dataTransfer.dropEffect=`copy`)}handleDrop(e){if(e.preventDefault(),!this.floor)return;let t=e.dataTransfer?.getData(`application/x-floorplan-palette`);if(!t)return;let n;try{n=JSON.parse(t)}catch{return}let r=this.getBoundingClientRect(),i=this.screenToWorld(e.clientX-r.left,e.clientY-r.top),a=this.getSnapResult(i).point;if(n.kind===`entity`){let e=n.domain||(n.entityId?n.entityId.split(`.`)[0]:`switch`),t=this.floor.rooms.find(e=>x(a,e.points)),r=1.2,i=`none`,o;e===`light`?(r=2.4,i=`ceiling_light`,o={kind:`point`,radius_m:4.5,intensity_multiplier:1,cast_real_point_light:!0}):e===`media_player`?(r=.8,i=`tv_screen`):e===`fan`?(r=2.4,i=`ceiling_fan`):e===`climate`&&(r=1.5,i=`thermostat`);let s={id:`ent_`+Math.random().toString(36).substring(2,9),entity_id:n.entityId||`light.new_entity`,domain:e,room_id:t?t.id:null,x:Number(a.x.toFixed(3)),y:Number(a.y.toFixed(3)),z_elevation:r,rotation_deg:0,light_config:o,mesh_type:i,mesh_scale:[1,1,1],badge:{visible:!0,style:`compact_pill`,label_override:n.label||null,icon_override:null},tap_action:{action:`toggle`},hold_action:{action:`more-info`},double_tap_action:{action:`none`}},c={...this.floor,entities:[...this.floor.entities,s]};this.floor=c,this.emitFloorChange(c,`Placed entity ${s.entity_id}`),this.emitSelectionChange({kind:`entity`,id:s.id})}else if(n.kind===`furniture`){let e=n.furnitureType||`chair`,t=this.getDefaultFurnitureDimensions(e),r={id:`furn_`+Math.random().toString(36).substring(2,9),catalog_type:e,label:n.label||this.formatFurnitureName(e),x:Number(a.x.toFixed(3)),y:Number(a.y.toFixed(3)),z_elevation:0,width:n.defaultWidth??t.width,depth:n.defaultDepth??t.depth,height:n.defaultHeight??t.height,rotation_deg:0,color:null},i={...this.floor,furniture:[...this.floor.furniture,r]};this.floor=i,this.emitFloorChange(i,`Placed furniture ${r.label}`),this.emitSelectionChange({kind:`furniture`,id:r.id})}else if(n.kind===`opening`){let e=new Map(this.floor.nodes.map(e=>[e.id,e])),t=null,r=null,i=.8;for(let n of this.floor.walls){let o=e.get(n.start_node_id),s=e.get(n.end_node_id);if(!o||!s)continue;let c=d(a,o,s);c.distance<i&&(i=c.distance,t=n,r=c)}if(t&&r){let e=n.openingType||`door_single`,i=e.startsWith(`door`),a={id:`op_`+Math.random().toString(36).substring(2,9),wall_id:t.id,type:e,t:Number(r.t.toFixed(3)),width:i?.9:1.2,sill_height:i?0:.9,head_height:2.1,swing_direction:`left_in`,bound_entity_id:null},o={...this.floor,openings:[...this.floor.openings,a]};this.floor=o,this.emitFloorChange(o,`Placed opening ${e}`),this.emitSelectionChange({kind:`opening`,id:a.id})}}}getDefaultFurnitureDimensions(e){switch(e){case`sofa_straight`:return{width:2,depth:.9,height:.85};case`sofa_l_shape`:return{width:2.4,depth:1.8,height:.85};case`bed_double`:return{width:1.8,depth:2,height:.9};case`bed_single`:return{width:1,depth:2,height:.9};case`dining_table`:return{width:1.6,depth:.9,height:.75};case`desk`:return{width:1.4,depth:.7,height:.75};case`chair`:return{width:.5,depth:.5,height:.85};case`tv_stand`:return{width:1.8,depth:.45,height:.5};case`kitchen_counter`:return{width:1.8,depth:.65,height:.9};case`refrigerator`:return{width:.8,depth:.7,height:1.8};case`stove`:return{width:.7,depth:.65,height:.9};case`sink_cabinet`:return{width:1,depth:.65,height:.9};case`bathtub`:return{width:1.7,depth:.75,height:.55};case`shower_enclosure`:return{width:1,depth:1,height:2};case`toilet`:return{width:.5,depth:.7,height:.8};case`wardrobe`:return{width:1.5,depth:.6,height:2.1};case`bookcase`:return{width:1,depth:.35,height:2};case`potted_plant`:return{width:.5,depth:.5,height:.9};case`rug`:return{width:2,depth:1.5,height:.02};default:return{width:1,depth:1,height:1}}}formatFurnitureName(e){return e.replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}renderGrid(){let e=this.screenToWorld(0,0),n=this.screenToWorld(this.canvasWidth,this.canvasHeight),r=Math.floor(e.x),i=Math.ceil(n.x),a=Math.floor(e.y),o=Math.ceil(n.y),s=[];if(this.pixelsPerMeter>45&&this.gridSize>=.05){let r=this.gridSize,i=Math.floor(e.x/r)*r,a=Math.ceil(n.x/r)*r,o=Math.floor(e.y/r)*r,c=Math.ceil(n.y/r)*r;for(let e=i;e<=a;e+=r)Math.abs(e-Math.round(e))>1e-4&&s.push(t`
            <line
              x1="${this.sx(e)}" y1="0" x2="${this.sx(e)}" y2="${this.canvasHeight}"
              stroke="var(--divider-color, #1e293b)" stroke-width="0.5" stroke-opacity="0.25"
            />
          `);for(let e=o;e<=c;e+=r)Math.abs(e-Math.round(e))>1e-4&&s.push(t`
            <line
              x1="0" y1="${this.sy(e)}" x2="${this.canvasWidth}" y2="${this.sy(e)}"
              stroke="var(--divider-color, #1e293b)" stroke-width="0.5" stroke-opacity="0.25"
            />
          `)}for(let e=r;e<=i;e++){let n=Math.abs(e)<1e-4;s.push(t`
        <line
          x1="${this.sx(e)}" y1="0" x2="${this.sx(e)}" y2="${this.canvasHeight}"
          stroke="var(--divider-color, #334155)"
          stroke-width="${n?1.5:.8}"
          stroke-opacity="${n?.9:.45}"
        />
      `)}for(let e=a;e<=o;e++){let n=Math.abs(e)<1e-4;s.push(t`
        <line
          x1="0" y1="${this.sy(e)}" x2="${this.canvasWidth}" y2="${this.sy(e)}"
          stroke="var(--divider-color, #334155)"
          stroke-width="${n?1.5:.8}"
          stroke-opacity="${n?.9:.45}"
        />
      `)}return s}renderBlueprint(){if(!this.floor?.blueprint?.image_url)return a;let e=this.floor.blueprint,n=e.natural_width_px*e.meters_per_pixel*this.pixelsPerMeter,r=e.natural_height_px*e.meters_per_pixel*this.pixelsPerMeter,i=this.sx(e.offset_x),o=this.sy(e.offset_y);return t`
      <g
        transform="rotate(${e.rotation_deg}, ${i+n/2}, ${o+r/2})"
        opacity="${e.opacity}"
        style="pointer-events: none;"
      >
        <image
          href="${e.image_url}"
          x="${i}"
          y="${o}"
          width="${n}"
          height="${r}"
        />
      </g>
    `}renderGhostFloor(){if(!this.ghostFloor)return a;let e=this.ghostFloor,n=new Map(e.nodes.map(e=>[e.id,e]));return t`
      <g class="ghost-layer">
        <!-- Ghost Rooms -->
        ${e.rooms.map(e=>{if(!e.points||e.points.length<3)return a;let n=e.points.map(e=>`${this.sx(e.x)},${this.sy(e.y)}`).join(` `);return t`
            <polygon
              points="${n}"
              fill="rgba(56, 189, 248, 0.05)"
              stroke="#38bdf8"
              stroke-width="1.5"
              stroke-dasharray="4,4"
            />
          `})}
        <!-- Ghost Walls -->
        ${e.walls.map(e=>{let r=n.get(e.start_node_id),i=n.get(e.end_node_id);return!r||!i?a:t`
            <line
              x1="${this.sx(r.x)}" y1="${this.sy(r.y)}"
              x2="${this.sx(i.x)}" y2="${this.sy(i.y)}"
              stroke="#38bdf8"
              stroke-width="${Math.max(2,e.thickness*this.pixelsPerMeter)}"
              stroke-dasharray="4,4"
            />
          `})}
      </g>
    `}renderRooms(){return this.floor?this.floor.rooms.map(e=>{if(!e.points||e.points.length<3)return a;let n=e.points.map(e=>`${this.sx(e.x)},${this.sy(e.y)}`).join(` `),r=this.selection.kind===`room`&&this.selection.id===e.id,i=0,o=0,s=``;if(e.show_label){let t=p(e.points);i=this.sx(t.x),o=this.sy(t.y),s=`${u(e.points).toFixed(1)} m²`}return t`
        <g class="room-group">
          <polygon
            class="room-polygon"
            points="${n}"
            fill="${e.floor_color||`#334155`}"
            fill-opacity="${r?.5:.3}"
            stroke="${r?`#38bdf8`:`#475569`}"
            stroke-width="${r?2.5:1}"
            @pointerdown="${t=>{this.toolMode===`select`&&t.button===0&&(t.stopPropagation(),this.activePointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.emitSelectionChange({kind:`room`,id:e.id}),this.activePointers.size===1&&(this.isPanning=!0,this.panStartScreen={x:t.clientX,y:t.clientY},this.panStartWorld={x:this.panX,y:this.panY},this.didPanMove=!1,this.panStartedOnSelectable=!0))}}"
          />
          ${e.show_label?t`
                <text
                  x="${i}"
                  y="${o-6}"
                  fill="#f8fafc"
                  font-size="12"
                  font-weight="600"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${e.name}
                </text>
                <text
                  x="${i}"
                  y="${o+10}"
                  fill="#94a3b8"
                  font-size="10"
                  font-weight="500"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${s}
                </text>
              `:a}
        </g>
      `}):a}renderWalls(e){if(!this.floor)return a;let n=new Map(this.floor.nodes.map(e=>[e.id,e]));return this.floor.walls.map(r=>{let i=this.selection.kind===`wall`&&this.selection.id===r.id,o=e.get(r.id),s=n.get(r.start_node_id),c=n.get(r.end_node_id);if(!s||!c)return a;let u=``;if(o)u=o.quad.map(e=>`${this.sx(e.x)},${this.sy(e.y)}`).join(` `);else{let e=l(s,c);if(e<1e-4)return a;let t=(c.x-s.x)/e,n=(c.y-s.y)/e,i=r.thickness/2,o=-n*i,d=t*i;u=[`${this.sx(s.x+o)},${this.sy(s.y+d)}`,`${this.sx(c.x+o)},${this.sy(c.y+d)}`,`${this.sx(c.x-o)},${this.sy(c.y-d)}`,`${this.sx(s.x-o)},${this.sy(s.y-d)}`].join(` `)}let d=l(s,c),f=(s.x+c.x)/2,p=(s.y+c.y)/2,m=o?o.normal:{x:-(c.y-s.y)/d,y:(c.x-s.x)/d},h=.22,g=this.sx(f+m.x*h),_=this.sy(p+m.y*h);return t`
        <g
          class="wall-group"
          @pointerdown="${e=>this.startWallDrag(e,r)}"
        >
          <!-- Enlarged transparent hit target for easy touch/mouse wall edge dragging -->
          <line
            class="wall-hit-target"
            x1="${this.sx(s.x)}" y1="${this.sy(s.y)}"
            x2="${this.sx(c.x)}" y2="${this.sy(c.y)}"
            stroke="transparent"
            stroke-width="24"
          />
          <polygon
            class="wall-footprint"
            points="${u}"
            fill="${r.color_override||(i?`#0284c7`:`#475569`)}"
            stroke="${i?`#38bdf8`:`#334155`}"
            stroke-width="${i?2:1}"
          />
          ${d>.6?t`
                <text
                  class="dimension-label"
                  x="${g}"
                  y="${_}"
                >
                  ${d.toFixed(2)} m
                </text>
              `:a}
        </g>
      `})}renderOpenings(){if(!this.floor)return a;let e=new Map(this.floor.nodes.map(e=>[e.id,e])),n=new Map(this.floor.walls.map(e=>[e.id,e]));return this.floor.openings.map(r=>{let i=n.get(r.wall_id);if(!i)return a;let o=e.get(i.start_node_id),s=e.get(i.end_node_id);if(!o||!s)return a;let c=l(o,s);if(c<1e-4)return a;let u=(s.x-o.x)/c,d=(s.y-o.y)/c,f=-d,p=u,m=o.x+r.t*(s.x-o.x),h=o.y+r.t*(s.y-o.y),g=r.width/2,_={x:m-g*u,y:h-g*d},v={x:m+g*u,y:h+g*d},y=this.selection.kind===`opening`&&this.selection.id===r.id?`#38bdf8`:`#94a3b8`,b=r.type.startsWith(`door`),x=r.swing_direction.startsWith(`left`),S=r.swing_direction.endsWith(`out`),C=x?_:v,w=x?v:_,T=S?-1:1,E={x:C.x+T*r.width*f,y:C.y+T*r.width*p},D=r.width*this.pixelsPerMeter,O=x&&!S||!x&&S?1:0;return t`
        <g
          class="opening-item"
          @pointerdown="${e=>this.startOpeningDrag(e,r)}"
        >
          <!-- Transparent enlarged touch hit-box -->
          <line
            x1="${this.sx(_.x)}" y1="${this.sy(_.y)}"
            x2="${this.sx(v.x)}" y2="${this.sy(v.y)}"
            stroke="transparent"
            stroke-width="32"
          />

          <!-- Wall cutout line -->
          <line
            x1="${this.sx(_.x)}" y1="${this.sy(_.y)}"
            x2="${this.sx(v.x)}" y2="${this.sy(v.y)}"
            stroke="#0f172a"
            stroke-width="${Math.max(3,i.thickness*this.pixelsPerMeter)}"
          />

          ${b?t`
                <!-- Door Leaf -->
                <line
                  x1="${this.sx(C.x)}" y1="${this.sy(C.y)}"
                  x2="${this.sx(E.x)}" y2="${this.sy(E.y)}"
                  stroke="${y}"
                  stroke-width="2.5"
                />
                <!-- Door Swing Arc -->
                <path
                  d="M ${this.sx(w.x)} ${this.sy(w.y)} A ${D} ${D} 0 0 ${O} ${this.sx(E.x)} ${this.sy(E.y)}"
                  fill="none"
                  stroke="${y}"
                  stroke-width="1.2"
                  stroke-dasharray="3,3"
                />
              `:t`
                <!-- Window Double Line -->
                <line
                  x1="${this.sx(_.x)}" y1="${this.sy(_.y)}"
                  x2="${this.sx(v.x)}" y2="${this.sy(v.y)}"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                />
                <line
                  x1="${this.sx(_.x+f*(i.thickness/2))}" y1="${this.sy(_.y+p*(i.thickness/2))}"
                  x2="${this.sx(v.x+f*(i.thickness/2))}" y2="${this.sy(v.y+p*(i.thickness/2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
                <line
                  x1="${this.sx(_.x-f*(i.thickness/2))}" y1="${this.sy(_.y-p*(i.thickness/2))}"
                  x2="${this.sx(v.x-f*(i.thickness/2))}" y2="${this.sy(v.y-p*(i.thickness/2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
              `}
        </g>
      `})}renderWallNodes(){return this.floor?this.floor.nodes.map(e=>{let n=this.selection.kind===`node`&&this.selection.id===e.id,r=this.sx(e.x),i=this.sy(e.y);return t`
        <g
          class="wall-node"
          transform="translate(${r}, ${i})"
          @pointerdown="${t=>this.startNodeDrag(t,e)}"
        >
          <!-- Enlarged touch target -->
          <circle r="18" fill="transparent" />

          ${n?t`
                <circle r="12" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2" />
              `:a}
          <circle
            r="${n?7:5}"
            fill="${n?`#38bdf8`:`#94a3b8`}"
            stroke="#0f172a"
            stroke-width="1.5"
          />
        </g>
      `}):a}renderFurniture(){return this.floor?this.floor.furniture.map(e=>{let n=this.selection.kind===`furniture`&&this.selection.id===e.id,r=e.width*this.pixelsPerMeter,i=e.depth*this.pixelsPerMeter,o=n?`#38bdf8`:`#64748b`,s=i/2+20;return t`
        <g
          class="furniture-item"
          transform="translate(${this.sx(e.x)}, ${this.sy(e.y)}) rotate(${e.rotation_deg})"
          @pointerdown="${t=>this.startFurnitureDrag(t,e)}"
        >
          <!-- Main Bounding Box -->
          <rect
            x="${-r/2}"
            y="${-i/2}"
            width="${r}"
            height="${i}"
            rx="4"
            fill="${n?`#1e293b`:`#0f172a`}"
            fill-opacity="0.85"
            stroke="${o}"
            stroke-width="${n?2:1}"
          />

          <!-- Facing Indicator Notch -->
          <path
            d="M ${-r*.25} ${-i/2} L 0 ${-i/2+6} L ${r*.25} ${-i/2}"
            fill="none"
            stroke="${o}"
            stroke-width="1.5"
          />

          <!-- Label -->
          <text
            x="0"
            y="3"
            fill="#f8fafc"
            font-size="10"
            font-weight="500"
            text-anchor="middle"
            style="pointer-events: none;"
          >
            ${e.label}
          </text>

          <!-- Interactive Rotation Handle (When Selected) with Enlarged Touch Target -->
          ${n?t`
                <line
                  x1="0" y1="${-i/2}"
                  x2="0" y2="${-s}"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-dasharray="3,2"
                />
                <!-- Enlarged 18px touch hit-target -->
                <circle
                  cx="0"
                  cy="${-s}"
                  r="18"
                  fill="transparent"
                  class="rotation-handle"
                  @pointerdown="${t=>this.startFurnitureRotate(t,e)}"
                />
                <circle
                  class="rotation-handle"
                  cx="0"
                  cy="${-s}"
                  r="6"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  stroke-width="2"
                  style="pointer-events: none;"
                />
              `:a}
        </g>
      `}):a}renderEntities(){return this.floor?this.floor.entities.map(e=>{let n=this.selection.kind===`entity`&&this.selection.id===e.id,r=this.sx(e.x),i=this.sy(e.y),o=`#3b82f6`,s=`🔘`;switch(e.domain){case`light`:o=`#eab308`,s=`💡`;break;case`media_player`:o=`#8b5cf6`,s=`📺`;break;case`fan`:o=`#14b8a6`,s=`🌀`;break;case`climate`:o=`#06b6d4`,s=`❄️`;break;case`binary_sensor`:case`sensor`:o=`#10b981`,s=`📊`}return t`
        <g
          class="entity-item"
          transform="translate(${r}, ${i})"
          @pointerdown="${t=>this.startEntityDrag(t,e)}"
        >
          <!-- Enlarged 20px Touch Hit-Target -->
          <circle r="20" fill="transparent" />

          <!-- Light Falloff Circle Preview when selected -->
          ${n&&e.light_config&&e.light_config.radius_m?t`
                <circle
                  r="${e.light_config.radius_m*this.pixelsPerMeter}"
                  fill="rgba(253, 224, 71, 0.08)"
                  stroke="#facc15"
                  stroke-width="1.5"
                  stroke-dasharray="5,4"
                  style="pointer-events: none;"
                />
              `:a}

          <!-- Outer Selection Ring -->
          ${n?t`
                <circle r="18" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,2" />
              `:a}

          <!-- Main Entity Badge -->
          <circle
            r="12"
            fill="${o}"
            stroke="#ffffff"
            stroke-width="1.5"
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"
          />

          <!-- Domain Icon -->
          <text
            x="0"
            y="4"
            font-size="10"
            text-anchor="middle"
            style="pointer-events: none;"
          >
            ${s}
          </text>
        </g>
      `}):a}renderActiveToolPreviews(){let e=[];if(this.toolMode===`draw_wall`&&this.wallDrawStartPoint){let n=this.wallDrawStartPoint,r=this.snappedCursor,i=l(n,r),a={x:(n.x+r.x)/2,y:(n.y+r.y)/2};e.push(t`
        <g class="tool-preview">
          <line
            x1="${this.sx(n.x)}" y1="${this.sy(n.y)}"
            x2="${this.sx(r.x)}" y2="${this.sy(r.y)}"
            stroke="#38bdf8"
            stroke-width="2.5"
            stroke-dasharray="4,4"
          />
          <circle cx="${this.sx(n.x)}" cy="${this.sy(n.y)}" r="5" fill="#38bdf8" />
          <circle cx="${this.sx(r.x)}" cy="${this.sy(r.y)}" r="5" fill="#38bdf8" />
          <text
            x="${this.sx(a.x)}"
            y="${this.sy(a.y)-10}"
            class="dimension-label"
            fill="#38bdf8"
          >
            ${i.toFixed(2)} m
          </text>
        </g>
      `)}if(this.toolMode===`draw_room`&&this.roomDrawPoints.length>0){let n=[...this.roomDrawPoints,{x:this.snappedCursor.x,y:this.snappedCursor.y}].map(e=>`${this.sx(e.x)},${this.sy(e.y)}`).join(` `);e.push(t`
        <g class="tool-preview">
          <polygon
            points="${n}"
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            stroke-width="2"
            stroke-dasharray="4,4"
          />
          ${this.roomDrawPoints.map((e,n)=>t`
              <circle
                cx="${this.sx(e.x)}" cy="${this.sy(e.y)}"
                r="${n===0?7:4}"
                fill="${n===0?`#10b981`:`#38bdf8`}"
                stroke="#ffffff"
                stroke-width="1.5"
              />
            `)}
        </g>
      `)}if(this.toolMode===`add_opening`&&this.hoverOpeningPoint&&e.push(t`
        <g class="tool-preview">
          <circle
            cx="${this.sx(this.hoverOpeningPoint.x)}"
            cy="${this.sy(this.hoverOpeningPoint.y)}"
            r="8"
            fill="#38bdf8"
            fill-opacity="0.5"
            stroke="#38bdf8"
            stroke-width="2"
          />
        </g>
      `),this.toolMode===`measure`&&this.measureP1&&this.measureP2){let n=this.measureP1,r=this.measureP2,i=l(n,r),a={x:(n.x+r.x)/2,y:(n.y+r.y)/2};e.push(t`
        <g class="tool-preview">
          <line
            x1="${this.sx(n.x)}" y1="${this.sy(n.y)}"
            x2="${this.sx(r.x)}" y2="${this.sy(r.y)}"
            stroke="#f59e0b"
            stroke-width="2"
            stroke-dasharray="4,2"
          />
          <circle cx="${this.sx(n.x)}" cy="${this.sy(n.y)}" r="4" fill="#f59e0b" />
          <circle cx="${this.sx(r.x)}" cy="${this.sy(r.y)}" r="4" fill="#f59e0b" />
          <rect
            x="${this.sx(a.x)-40}"
            y="${this.sy(a.y)-24}"
            width="80"
            height="20"
            rx="4"
            fill="var(--card-background-color, #0f172a)"
            stroke="#f59e0b"
            stroke-width="1"
          />
          <text
            x="${this.sx(a.x)}"
            y="${this.sy(a.y)-10}"
            fill="#f59e0b"
            font-size="11"
            font-weight="bold"
            text-anchor="middle"
          >
            ${i.toFixed(2)} m
          </text>
        </g>
      `)}return e}renderTouchActionBar(){return this.toolMode===`draw_wall`&&this.wallDrawStartPoint?s`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-success" @click="${()=>this.cancelActiveOperation()}">
            ✓ Finish Wall
          </button>
          <button class="touch-pill touch-pill-danger" @click="${()=>this.cancelActiveOperation()}">
            ✕ Cancel
          </button>
        </div>
      `:this.toolMode===`draw_room`&&this.roomDrawPoints.length>0?s`
        <div class="touch-action-bar">
          <button
            class="touch-pill touch-pill-success"
            ?disabled="${this.roomDrawPoints.length<3}"
            @click="${()=>this.finishRoomPolygon()}"
          >
            ✓ Complete Room (${this.roomDrawPoints.length})
          </button>
          <button class="touch-pill touch-pill-danger" @click="${()=>this.cancelActiveOperation()}">
            ✕ Cancel
          </button>
        </div>
      `:this.toolMode===`measure`&&this.measureP1?s`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-warning" @click="${()=>this.cancelActiveOperation()}">
            ✕ Clear Measure
          </button>
        </div>
      `:this.selection.kind!==`none`&&this.selection.id?s`
        <div class="touch-action-bar">
          <button class="touch-pill touch-pill-danger" @click="${()=>this.deleteSelected()}">
            🗑 Delete ${this.selection.kind}
          </button>
        </div>
      `:a}render(){let e=this.isPanning?`cursor-panning`:this.spaceHeld?`cursor-grab`:this.toolMode===`select`?`cursor-select`:``,t=this.floor?m(this.floor.nodes,this.floor.walls,this.floor.rooms):new Map,n=1;this.pixelsPerMeter<35?n=5:this.pixelsPerMeter<70&&(n=2);let r=n*this.pixelsPerMeter;return s`
      <div
        class="canvas-container"
        style="width: 100%; height: 100%; position: relative;"
        @wheel="${this.handleWheel}"
        @dragover="${this.handleDragOver}"
        @drop="${this.handleDrop}"
        @contextmenu="${e=>e.preventDefault()}"
      >
        <svg
          class="canvas-svg ${e}"
          @pointerdown="${this.handleSvgPointerDown}"
        >
          <!-- Background Grid -->
          <g class="grid-layer">
            ${this.renderGrid()}
          </g>

          <!-- Blueprint Background -->
          ${this.renderBlueprint()}

          <!-- Onion-skin Ghost Floor -->
          ${this.renderGhostFloor()}

          <!-- Rooms -->
          <g class="rooms-layer">
            ${this.renderRooms()}
          </g>

          <!-- Mitered Walls -->
          <g class="walls-layer">
            ${this.renderWalls(t)}
          </g>

          <!-- Openings (Doors & Windows) -->
          <g class="openings-layer">
            ${this.renderOpenings()}
          </g>

          <!-- Furniture Items -->
          <g class="furniture-layer">
            ${this.renderFurniture()}
          </g>

          <!-- Placed Smart Home Entities -->
          <g class="entities-layer">
            ${this.renderEntities()}
          </g>

          <!-- Wall Nodes -->
          <g class="nodes-layer">
            ${this.renderWallNodes()}
          </g>

          <!-- Active Tool & Interactive Previews -->
          ${this.renderActiveToolPreviews()}
        </svg>

        <!-- Floating On-Screen Touch Action Pills -->
        ${this.renderTouchActionBar()}

        <!-- Metric Scale & Coordinates HUD Overlay -->
        <div class="hud-overlay">
          <div class="hud-scale-bar">
            <span>${n} m</span>
            <div class="scale-ruler" style="width: ${r}px;"></div>
          </div>
          <div class="hud-coords">
            <span>X: <strong>${this.cursorWorld.x.toFixed(2)} m</strong></span>
            <span>Y: <strong>${this.cursorWorld.y.toFixed(2)} m</strong></span>
            <span>Snap: <strong>${this.snapToGrid?`${this.gridSize}m`:`Off`}</strong></span>
          </div>
        </div>

        <!-- Tool Mode Badge -->
        <div class="hud-tool-badge">
          <span>Tool: <strong>${this.toolMode.toUpperCase()}</strong></span>
        </div>

        <!-- Floating Zoom & Fit Controls -->
        <div class="zoom-controls">
          <button class="zoom-btn" title="Zoom In" @click="${()=>this.zoomIn()}">+</button>
          <button class="zoom-btn" title="Zoom Out" @click="${()=>this.zoomOut()}">−</button>
          <button class="zoom-btn zoom-btn-fit" title="Fit to Floor" @click="${()=>this.fitViewToFloor()}">⊡ Fit</button>
        </div>
      </div>
    `}};b([o({attribute:!1})],w.prototype,`floor`,void 0),b([o({attribute:!1})],w.prototype,`ghostFloor`,void 0),b([o({type:String})],w.prototype,`toolMode`,void 0),b([o({attribute:!1})],w.prototype,`selection`,void 0),b([o({type:Number})],w.prototype,`gridSize`,void 0),b([o({type:Boolean})],w.prototype,`snapToGrid`,void 0),b([o({type:Number})],w.prototype,`snapAngleDeg`,void 0),b([o({type:String})],w.prototype,`pendingOpeningType`,void 0),b([i()],w.prototype,`pixelsPerMeter`,void 0),b([i()],w.prototype,`panX`,void 0),b([i()],w.prototype,`panY`,void 0),b([i()],w.prototype,`canvasWidth`,void 0),b([i()],w.prototype,`canvasHeight`,void 0),b([i()],w.prototype,`isPanning`,void 0),b([i()],w.prototype,`panStartScreen`,void 0),b([i()],w.prototype,`panStartWorld`,void 0),b([i()],w.prototype,`spaceHeld`,void 0),b([i()],w.prototype,`cursorWorld`,void 0),b([i()],w.prototype,`snappedCursor`,void 0),b([i()],w.prototype,`wallDrawStartNodeId`,void 0),b([i()],w.prototype,`wallDrawStartPoint`,void 0),b([i()],w.prototype,`roomDrawPoints`,void 0),b([i()],w.prototype,`hoverWallId`,void 0),b([i()],w.prototype,`hoverWallT`,void 0),b([i()],w.prototype,`hoverOpeningPoint`,void 0),b([i()],w.prototype,`measureP1`,void 0),b([i()],w.prototype,`measureP2`,void 0),b([i()],w.prototype,`measureLocked`,void 0),w=b([n(`floorplan-canvas-2d`)],w);var T=class extends e{constructor(...e){super(...e),this.open=!1,this.floorplanId=``,this.floorId=``,this.currentBlueprint=null,this.imageUrl=``,this.imageMimeType=`image/png`,this.naturalWidth=0,this.naturalHeight=0,this.p1=null,this.p2=null,this.realDistanceMeters=5,this.opacity=.5,this.isUploading=!1,this.errorMessage=null,this.pointerDownPos=null}static{this.styles=r`
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
  `}updated(e){e.has(`open`)&&this.open&&this.currentBlueprint&&!this.imageUrl&&(this.imageUrl=this.currentBlueprint.image_url,this.naturalWidth=this.currentBlueprint.natural_width_px,this.naturalHeight=this.currentBlueprint.natural_height_px,this.opacity=this.currentBlueprint.opacity,this.errorMessage=null),e.has(`currentBlueprint`)&&this.currentBlueprint&&this.open&&(this.imageUrl=this.currentBlueprint.image_url,this.naturalWidth=this.currentBlueprint.natural_width_px,this.naturalHeight=this.currentBlueprint.natural_height_px,this.opacity=this.currentBlueprint.opacity)}handleFileChange(e){let t=e.target;if(!t.files||t.files.length===0)return;let n=t.files[0];this.imageMimeType=n.type||`image/png`,this.errorMessage=null;let r=new FileReader;r.onload=e=>{let t=e.target?.result;this.loadNewImage(t,this.imageMimeType)},r.onerror=()=>{this.errorMessage=`Failed to read selected image file.`},r.readAsDataURL(n)}loadNewImage(e,t){this.imageUrl=e,this.imageMimeType=t,this.p1=null,this.p2=null;let n=new Image;n.onload=()=>{this.naturalWidth=n.naturalWidth||n.width,this.naturalHeight=n.naturalHeight||n.height,this.requestUpdate()},n.onerror=()=>{this.errorMessage=`Failed to load image preview.`},n.src=e}handleSvgPointerDown(e){this.pointerDownPos={x:e.clientX,y:e.clientY}}handleSvgPointerUp(e){if(!this.pointerDownPos)return;let t=Math.hypot(e.clientX-this.pointerDownPos.x,e.clientY-this.pointerDownPos.y);if(this.pointerDownPos=null,t>8||!this.naturalWidth||!this.naturalHeight)return;let n=e.currentTarget.getBoundingClientRect();if(n.width<=0||n.height<=0)return;let r=e.clientX-n.left,i=e.clientY-n.top,a=Math.max(0,Math.min(this.naturalWidth,r/n.width*this.naturalWidth)),o=Math.max(0,Math.min(this.naturalHeight,i/n.height*this.naturalHeight)),s={x:Number(a.toFixed(2)),y:Number(o.toFixed(2))};this.p1?this.p2?(this.p1=s,this.p2=null):this.p2=s:this.p1=s}handleResetPoints(){this.p1=null,this.p2=null}get computedPixelDistance(){return!this.p1||!this.p2?0:Math.hypot(this.p2.x-this.p1.x,this.p2.y-this.p1.y)}get computedMetersPerPixel(){return!this.p1||!this.p2||this.realDistanceMeters<=0?this.currentBlueprint?.meters_per_pixel??.01:g(this.p1,this.p2,this.realDistanceMeters)}async handleApply(){if(!this.imageUrl)this.errorMessage=`Please select a blueprint image.`;else if(!this.p1||!this.p2)this.errorMessage=`Please click two reference points on the blueprint to calibrate distance.`;else if(this.realDistanceMeters<=0)this.errorMessage=`Known distance must be greater than 0 meters.`;else{this.isUploading=!0,this.errorMessage=null;try{let e=this.imageUrl;if(this.uploadCallback){let t=this.imageMimeType,n=this.imageUrl;if(this.imageUrl.startsWith(`data:`)){let e=this.imageUrl.split(`,`),r=e[0].match(/:(.*?);/);r&&(t=r[1]),n=e[1]||``}e=await this.uploadCallback({floorplanId:this.floorplanId,floorId:this.floorId,mimeType:t,dataBase64:n})}let t=this.computedMetersPerPixel,n={imageUrl:e,naturalWidthPx:this.naturalWidth,naturalHeightPx:this.naturalHeight,metersPerPixel:t,opacity:this.opacity};this.dispatchEvent(new CustomEvent(`blueprint-calibrated`,{detail:n,bubbles:!0,composed:!0})),this.handleClose()}catch(e){this.errorMessage=e?.message||`Failed to apply and upload blueprint.`}finally{this.isUploading=!1}}}handleClose(){this.dispatchEvent(new CustomEvent(`modal-close`,{bubbles:!0,composed:!0}))}renderCalibrationOverlay(){if(!this.naturalWidth||!this.naturalHeight)return a;let e=Math.max(10,Math.min(this.naturalWidth,this.naturalHeight)*.015),t=Math.max(2,e*.2),n=Math.max(12,e*1.1);return s`
      ${this.p1&&this.p2?s`
            <line
              x1="${this.p1.x}"
              y1="${this.p1.y}"
              x2="${this.p2.x}"
              y2="${this.p2.y}"
              stroke="#f59e0b"
              stroke-width="${t}"
              stroke-dasharray="${t*3},${t*2}"
            />
            <rect
              x="${(this.p1.x+this.p2.x)/2-e*3}"
              y="${(this.p1.y+this.p2.y)/2-e*1.2}"
              width="${e*6}"
              height="${e*2.2}"
              rx="${e*.4}"
              fill="#0f172a"
              fill-opacity="0.85"
              stroke="#f59e0b"
              stroke-width="${t*.7}"
            />
            <text
              x="${(this.p1.x+this.p2.x)/2}"
              y="${(this.p1.y+this.p2.y)/2+e*.35}"
              fill="#fbbf24"
              font-size="${n*.9}"
              font-weight="bold"
              text-anchor="middle"
            >
              ${this.realDistanceMeters.toFixed(2)} m
            </text>
          `:a}
      ${this.p1?s`
            <g class="crosshair-marker">
              <line
                x1="${this.p1.x-e*1.5}"
                y1="${this.p1.y}"
                x2="${this.p1.x+e*1.5}"
                y2="${this.p1.y}"
                stroke="#38bdf8"
                stroke-width="${t}"
              />
              <line
                x1="${this.p1.x}"
                y1="${this.p1.y-e*1.5}"
                x2="${this.p1.x}"
                y2="${this.p1.y+e*1.5}"
                stroke="#38bdf8"
                stroke-width="${t}"
              />
              <circle
                cx="${this.p1.x}"
                cy="${this.p1.y}"
                r="${e}"
                fill="#0284c7"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${t}"
              />
              <text
                x="${this.p1.x}"
                y="${this.p1.y+n*.35}"
                fill="#ffffff"
                font-size="${n}"
                font-weight="bold"
                text-anchor="middle"
              >
                1
              </text>
            </g>
          `:a}
      ${this.p2?s`
            <g class="crosshair-marker">
              <line
                x1="${this.p2.x-e*1.5}"
                y1="${this.p2.y}"
                x2="${this.p2.x+e*1.5}"
                y2="${this.p2.y}"
                stroke="#10b981"
                stroke-width="${t}"
              />
              <line
                x1="${this.p2.x}"
                y1="${this.p2.y-e*1.5}"
                x2="${this.p2.x}"
                y2="${this.p2.y+e*1.5}"
                stroke="#10b981"
                stroke-width="${t}"
              />
              <circle
                cx="${this.p2.x}"
                cy="${this.p2.y}"
                r="${e}"
                fill="#059669"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${t}"
              />
              <text
                x="${this.p2.x}"
                y="${this.p2.y+n*.35}"
                fill="#ffffff"
                font-size="${n}"
                font-weight="bold"
                text-anchor="middle"
              >
                2
              </text>
            </g>
          `:a}
    `}render(){if(!this.open)return a;let e=this.computedMetersPerPixel,t=e>0?1/e:0;return s`
      <div
        class="modal-backdrop"
        @click="${e=>{e.target===e.currentTarget&&this.handleClose()}}"
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

            ${this.errorMessage?s`<div class="error-banner">${this.errorMessage}</div>`:a}

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
                    @click="${()=>this.shadowRoot?.getElementById(`blueprint-file-input`)?.click()}"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Choose Image...
                  </button>
                  ${this.p1||this.p2?s`
                        <button class="btn btn-secondary" @click="${this.handleResetPoints}">
                          Reset Points
                        </button>
                      `:a}
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
                  @input="${e=>{let t=parseFloat(e.target.value);isNaN(t)||(this.realDistanceMeters=t)}}"
                />
              </div>

              <div class="form-group">
                <label for="opacity-input">Opacity: ${Math.round(this.opacity*100)}%</label>
                <input
                  id="opacity-input"
                  type="range"
                  class="form-input"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  .value="${String(this.opacity)}"
                  @input="${e=>{this.opacity=parseFloat(e.target.value)}}"
                />
              </div>
            </div>

            <div class="preview-container ${this.imageUrl?`has-image`:``}">
              ${this.imageUrl&&this.naturalWidth>0?s`
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
                  `:s`
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

            ${this.imageUrl?s`
                  <div class="stats-bar">
                    <div class="stats-item">
                      Resolution: <strong>${this.naturalWidth} × ${this.naturalHeight} px</strong>
                    </div>
                    <div class="stats-item">
                      Point 1: <strong>${this.p1?`(${this.p1.x}, ${this.p1.y})`:`Not set`}</strong>
                    </div>
                    <div class="stats-item">
                      Point 2: <strong>${this.p2?`(${this.p2.x}, ${this.p2.y})`:`Not set`}</strong>
                    </div>
                    <div class="stats-item">
                      Pixel Distance: <strong>${this.computedPixelDistance.toFixed(1)} px</strong>
                    </div>
                    <div class="stats-item">
                      Calculated Scale: <strong>${t.toFixed(1)} px/m (${(e*100).toFixed(2)} cm/px)</strong>
                    </div>
                  </div>
                `:a}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="${this.handleClose}" ?disabled="${this.isUploading}">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="${this.handleApply}"
              ?disabled="${!this.imageUrl||!this.p1||!this.p2||this.isUploading}"
            >
              ${this.isUploading?`Uploading & Applying...`:`Apply & Upload Blueprint`}
            </button>
          </div>
        </div>
      </div>
    `}};b([o({type:Boolean})],T.prototype,`open`,void 0),b([o({type:String})],T.prototype,`floorplanId`,void 0),b([o({type:String})],T.prototype,`floorId`,void 0),b([o({attribute:!1})],T.prototype,`currentBlueprint`,void 0),b([o({attribute:!1})],T.prototype,`uploadCallback`,void 0),b([i()],T.prototype,`imageUrl`,void 0),b([i()],T.prototype,`imageMimeType`,void 0),b([i()],T.prototype,`naturalWidth`,void 0),b([i()],T.prototype,`naturalHeight`,void 0),b([i()],T.prototype,`p1`,void 0),b([i()],T.prototype,`p2`,void 0),b([i()],T.prototype,`realDistanceMeters`,void 0),b([i()],T.prototype,`opacity`,void 0),b([i()],T.prototype,`isUploading`,void 0),b([i()],T.prototype,`errorMessage`,void 0),T=b([n(`floorplan-blueprint-modal`)],T);var E=class extends e{constructor(...e){super(...e),this.floorplans=[],this.activeFloorplanId=``,this.floors=[],this.activeFloorId=``,this.activeTool=`select`,this.gridSize=.1,this.snapToGrid=!0,this.canUndo=!1,this.canRedo=!1,this.viewLayout=`split`,this.isDirty=!1,this.onionSkin=!1,this.narrow=!1,this.leftPaneCollapsed=!1,this.rightPaneCollapsed=!1,this.focusMode=!1,this.isMoreMenuOpen=!1}static{this.styles=r`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      background: var(--app-header-background-color, var(--primary-background-color, #0f172a));
      border-bottom: 1px solid var(--divider-color, #334155);
      padding: 0 12px;
      color: var(--app-header-text-color, var(--primary-text-color, #f8fafc));
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      user-select: none;
      box-sizing: border-box;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      position: relative;
    }

    :host([narrow]) {
      height: 52px;
      overflow: visible;
      padding: 0 8px;
      gap: 6px;
    }

    :host::-webkit-scrollbar {
      height: 4px;
    }

    :host::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .toolbar-section {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .separator {
      width: 1px;
      height: 22px;
      background: var(--divider-color, #334155);
      margin: 0 4px;
      flex-shrink: 0;
    }

    select {
      background: var(--secondary-background-color, #1e293b);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
      height: 30px;
    }

    select:focus {
      border-color: var(--primary-color, #3b82f6);
    }

    button {
      background: var(--secondary-background-color, #1e293b);
      color: var(--primary-text-color, #cbd5e1);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 30px;
      min-height: 30px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    button:hover:not(:disabled) {
      background: var(--primary-background-color, #334155);
      color: var(--primary-text-color, #ffffff);
      border-color: var(--primary-color, #64748b);
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button.active {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    button.danger:hover:not(:disabled) {
      background: var(--error-color, #991b1b);
      border-color: var(--error-color, #ef4444);
      color: #fecaca;
    }

    .ha-menu-btn {
      background: transparent;
      border: none;
      color: var(--app-header-text-color, var(--primary-text-color, #f8fafc));
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      height: 32px;
      width: 32px;
    }

    .ha-menu-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-group {
      display: inline-flex;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--divider-color, #475569);
    }

    .btn-group button {
      border: none;
      border-radius: 0;
      border-right: 1px solid var(--divider-color, #475569);
      margin: 0;
    }

    .btn-group button:last-child {
      border-right: none;
    }

    .save-button {
      background: var(--success-color, #15803d);
      color: #ffffff;
      border-color: var(--success-color, #22c55e);
      font-weight: 600;
    }

    .save-button:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .dirty-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .dirty-pill.unsaved {
      background: rgba(245, 158, 11, 0.2);
      color: var(--warning-color, #fbbf24);
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .dirty-pill.saved {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success-color, #4ade80);
      border: 1px solid rgba(34, 197, 94, 0.4);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .dirty-pill.unsaved .status-dot {
      background: var(--warning-color, #fbbf24);
    }

    .dirty-pill.saved .status-dot {
      background: var(--success-color, #4ade80);
    }

    .icon {
      font-size: 14px;
      line-height: 1;
    }

    /* Mobile / Narrow specific styles */
    .mobile-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 6px;
    }

    .mobile-selects {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .mobile-selects select {
      flex: 1;
      min-width: 0;
      max-width: 110px;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .mobile-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .more-popover {
      position: absolute;
      top: 52px;
      right: 8px;
      z-index: 200;
      background: var(--card-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 8px;
      padding: 8px;
      min-width: 220px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .popover-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 10px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--primary-text-color, #f8fafc);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      min-height: 36px;
    }

    .popover-item:hover:not(:disabled) {
      background: var(--secondary-background-color, #334155);
    }

    .popover-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .popover-divider {
      height: 1px;
      background: var(--divider-color, #334155);
      margin: 4px 0;
    }
  `}handleToggleMenu(){this.dispatchEvent(new CustomEvent(`hass-toggle-menu`,{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent(`toggle-menu`,{bubbles:!0,composed:!0}))}handleFloorplanSelect(e){let t=e.target;this.dispatchEvent(new CustomEvent(`floorplan-change`,{bubbles:!0,composed:!0,detail:{floorplanId:t.value}}))}handleFloorSelect(e){let t=e.target;this.dispatchEvent(new CustomEvent(`floor-change`,{bubbles:!0,composed:!0,detail:{floorId:t.value}}))}handleToolSelect(e){this.dispatchEvent(new CustomEvent(`tool-change`,{bubbles:!0,composed:!0,detail:{tool:e}}))}handleGridSizeSelect(e){let t=e.target,n=parseFloat(t.value);this.dispatchEvent(new CustomEvent(`grid-size-change`,{bubbles:!0,composed:!0,detail:{gridSize:n}}))}handleSnapToggle(){this.dispatchEvent(new CustomEvent(`snap-toggle`,{bubbles:!0,composed:!0,detail:{snap:!this.snapToGrid}}))}handleOnionSkinToggle(){this.dispatchEvent(new CustomEvent(`toggle-onion-skin`,{bubbles:!0,composed:!0,detail:{onionSkin:!this.onionSkin}}))}handleLayoutSelect(e){this.dispatchEvent(new CustomEvent(`layout-change`,{bubbles:!0,composed:!0,detail:{layout:e}}))}handleSaveCamera(){this.dispatchEvent(new CustomEvent(`save-camera`,{bubbles:!0,composed:!0}))}toggleMobileView(){let e=this.viewLayout===`3d`?`2d`:`3d`;this.handleLayoutSelect(e)}render(){return this.narrow?this.renderMobileToolbar():this.renderDesktopToolbar()}renderMobileToolbar(){return s`
      <div class="mobile-row">
        <!-- HA Hamburger Menu -->
        <button
          class="ha-menu-btn"
          aria-label="Toggle Home Assistant sidebar"
          title="Toggle Sidebar"
          @click=${this.handleToggleMenu}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        <!-- Floorplan & Floor Selectors -->
        <div class="mobile-selects">
          <select
            aria-label="Floorplan selector"
            .value=${this.activeFloorplanId}
            @change=${this.handleFloorplanSelect}
          >
            ${this.floorplans.length===0?s`<option value="">Floorplan</option>`:this.floorplans.map(e=>s`<option value=${e.id}>${e.name}</option>`)}
          </select>

          <select
            aria-label="Floor level selector"
            .value=${this.activeFloorId}
            @change=${this.handleFloorSelect}
          >
            ${this.floors.map(e=>s`<option value=${e.id}>${e.name}</option>`)}
          </select>
        </div>

        <!-- Compact Actions -->
        <div class="mobile-actions">
          <button
            title="Undo"
            ?disabled=${!this.canUndo}
            @click=${()=>this.dispatchEvent(new CustomEvent(`undo`,{bubbles:!0,composed:!0}))}
          >
            ↶
          </button>
          <button
            title="Redo"
            ?disabled=${!this.canRedo}
            @click=${()=>this.dispatchEvent(new CustomEvent(`redo`,{bubbles:!0,composed:!0}))}
          >
            ↷
          </button>
          <button
            title="Toggle 2D / 3D View"
            @click=${this.toggleMobileView}
          >
            ${this.viewLayout===`3d`?`2D`:`3D`}
          </button>
          <button
            class="save-button"
            title="Save Floorplan"
            @click=${()=>this.dispatchEvent(new CustomEvent(`save-floorplan`,{bubbles:!0,composed:!0}))}
          >
            Save ${this.isDirty?`•`:``}
          </button>
          <button
            aria-label="More editor actions"
            title="More Options"
            @click=${()=>this.isMoreMenuOpen=!this.isMoreMenuOpen}
          >
            ⋮
          </button>
        </div>
      </div>

      <!-- Popover Dropdown for Overflow Actions -->
      ${this.isMoreMenuOpen?s`
            <div class="more-popover">
              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`floorplan-new`,{bubbles:!0,composed:!0}))}}
              >
                <span>+ New Floorplan</span>
              </button>
              <button
                class="popover-item"
                ?disabled=${this.floorplans.length<=1}
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`floorplan-delete`,{bubbles:!0,composed:!0}))}}
              >
                <span>Delete Floorplan</span>
              </button>

              <div class="popover-divider"></div>

              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`floor-add`,{bubbles:!0,composed:!0}))}}
              >
                <span>+ Add Floor Above</span>
              </button>
              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`duplicate-perimeter`,{bubbles:!0,composed:!0}))}}
              >
                <span>Duplicate Perimeter</span>
              </button>
              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.handleOnionSkinToggle()}}
              >
                <span>Ghost Trace: ${this.onionSkin?`On`:`Off`}</span>
              </button>

              <div class="popover-divider"></div>

              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`calibrate-blueprint`,{bubbles:!0,composed:!0}))}}
              >
                <span>Calibrate Blueprint</span>
              </button>
              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.handleSnapToggle()}}
              >
                <span>Snap to Grid: ${this.snapToGrid?`On`:`Off`}</span>
              </button>
              <div class="popover-item" style="cursor: default;">
                <span>Grid Size</span>
                <select
                  aria-label="Grid snap size"
                  .value=${String(this.gridSize)}
                  @change=${e=>{this.isMoreMenuOpen=!1,this.handleGridSizeSelect(e)}}
                >
                  <option value="0.05">0.05m</option>
                  <option value="0.1">0.1m</option>
                  <option value="0.25">0.25m</option>
                  <option value="0.5">0.5m</option>
                </select>
              </div>

              ${this.viewLayout===`2d`?``:s`
                    <button
                      class="popover-item"
                      @click=${()=>{this.isMoreMenuOpen=!1,this.handleSaveCamera()}}
                    >
                      <span>Save 3D Camera</span>
                    </button>
                  `}

              <div class="popover-divider"></div>

              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`import-json`,{bubbles:!0,composed:!0}))}}
              >
                <span>Import JSON</span>
              </button>
              <button
                class="popover-item"
                @click=${()=>{this.isMoreMenuOpen=!1,this.dispatchEvent(new CustomEvent(`export-json`,{bubbles:!0,composed:!0}))}}
              >
                <span>Export JSON</span>
              </button>
            </div>
          `:``}
    `}renderDesktopToolbar(){return s`
      <!-- HA Sidebar Hamburger Button -->
      <button
        class="ha-menu-btn"
        aria-label="Toggle Home Assistant sidebar"
        title="Toggle Sidebar"
        @click=${this.handleToggleMenu}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>

      <!-- 1. Floorplan Switcher -->
      <div class="toolbar-section">
        <select
          aria-label="Floorplan selector"
          .value=${this.activeFloorplanId}
          @change=${this.handleFloorplanSelect}
        >
          ${this.floorplans.length===0?s`<option value="">Default Floorplan</option>`:this.floorplans.map(e=>s`<option value=${e.id}>${e.name}</option>`)}
        </select>
        <button
          title="Create New Floorplan"
          @click=${()=>this.dispatchEvent(new CustomEvent(`floorplan-new`,{bubbles:!0,composed:!0}))}
        >
          <span class="icon">+</span> New
        </button>
        <button
          class="danger"
          title="Delete Active Floorplan"
          ?disabled=${this.floorplans.length<=1}
          @click=${()=>this.dispatchEvent(new CustomEvent(`floorplan-delete`,{bubbles:!0,composed:!0}))}
        >
          Delete
        </button>
      </div>

      <div class="separator"></div>

      <!-- 2. Floor Selector & Level Management -->
      <div class="toolbar-section">
        <select
          aria-label="Floor level selector"
          .value=${this.activeFloorId}
          @change=${this.handleFloorSelect}
        >
          ${this.floors.map(e=>s`<option value=${e.id}>${e.name} (L${e.level_index})</option>`)}
        </select>
        <button
          title="Add New Floor Above"
          @click=${()=>this.dispatchEvent(new CustomEvent(`floor-add`,{bubbles:!0,composed:!0}))}
        >
          + Add Floor
        </button>
        <button
          title="Duplicate Exterior Perimeter Walls from Floor Below"
          @click=${()=>this.dispatchEvent(new CustomEvent(`duplicate-perimeter`,{bubbles:!0,composed:!0}))}
        >
          Duplicate Perimeter
        </button>
        <button
          class=${this.onionSkin?`active`:``}
          title="Toggle Onion-Skin Ghost Trace from Floor Below"
          @click=${this.handleOnionSkinToggle}
        >
          Ghost Trace
        </button>
      </div>

      <div class="separator"></div>

      <!-- 3. Tool Mode Buttons -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            class=${this.activeTool===`select`?`active`:``}
            title="Select & Move [V]"
            @click=${()=>this.handleToolSelect(`select`)}
          >
            Select [V]
          </button>
          <button
            class=${this.activeTool===`draw_wall`?`active`:``}
            title="Draw Wall [W]"
            @click=${()=>this.handleToolSelect(`draw_wall`)}
          >
            Wall [W]
          </button>
          <button
            class=${this.activeTool===`draw_room`?`active`:``}
            title="Draw Room Polygon [R]"
            @click=${()=>this.handleToolSelect(`draw_room`)}
          >
            Room [R]
          </button>
          <button
            class=${this.activeTool===`add_opening`?`active`:``}
            title="Add Door / Window [O]"
            @click=${()=>this.handleToolSelect(`add_opening`)}
          >
            Opening [O]
          </button>
          <button
            class=${this.activeTool===`measure`?`active`:``}
            title="Measure Distance [M]"
            @click=${()=>this.handleToolSelect(`measure`)}
          >
            Measure [M]
          </button>
        </div>
        <button
          title="Calibrate 2-Point Blueprint Scale"
          @click=${()=>this.dispatchEvent(new CustomEvent(`calibrate-blueprint`,{bubbles:!0,composed:!0}))}
        >
          Calibrate Blueprint
        </button>
      </div>

      <div class="separator"></div>

      <!-- 4. Grid Size & Magnetic Snapping -->
      <div class="toolbar-section">
        <button
          class=${this.snapToGrid?`active`:``}
          title="Toggle Snap to Grid"
          @click=${this.handleSnapToggle}
        >
          Snap
        </button>
        <select
          aria-label="Grid snap size"
          .value=${String(this.gridSize)}
          @change=${this.handleGridSizeSelect}
        >
          <option value="0.05">0.05m</option>
          <option value="0.1">0.1m</option>
          <option value="0.25">0.25m</option>
          <option value="0.5">0.5m</option>
        </select>
      </div>

      <div class="separator"></div>

      <!-- 5. History Controls (Undo / Redo) -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            title="Undo (Ctrl+Z)"
            ?disabled=${!this.canUndo}
            @click=${()=>this.dispatchEvent(new CustomEvent(`undo`,{bubbles:!0,composed:!0}))}
          >
            Undo
          </button>
          <button
            title="Redo (Ctrl+Y)"
            ?disabled=${!this.canRedo}
            @click=${()=>this.dispatchEvent(new CustomEvent(`redo`,{bubbles:!0,composed:!0}))}
          >
            Redo
          </button>
        </div>
      </div>

      <div class="separator"></div>

      <!-- 6. View Layout Mode, Pane Toggles & Camera Bookmark -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            class=${this.leftPaneCollapsed?``:`active`}
            title="Toggle Left Catalog & Entities Panel ["
            @click=${()=>this.dispatchEvent(new CustomEvent(`toggle-left-pane`,{bubbles:!0,composed:!0}))}
          >
            ◧ Catalog
          </button>
          <button
            class=${this.viewLayout===`2d`?`active`:``}
            title="2D CAD Viewport Only"
            @click=${()=>this.handleLayoutSelect(`2d`)}
          >
            2D
          </button>
          <button
            class=${this.viewLayout===`split`?`active`:``}
            title="Split 2D Viewport + 3D Live Preview"
            @click=${()=>this.handleLayoutSelect(`split`)}
          >
            2D+3D
          </button>
          <button
            class=${this.viewLayout===`3d`?`active`:``}
            title="3D Preview Only"
            @click=${()=>this.handleLayoutSelect(`3d`)}
          >
            3D
          </button>
          <button
            class=${this.rightPaneCollapsed?``:`active`}
            title="Toggle Right Property Inspector ]"
            @click=${()=>this.dispatchEvent(new CustomEvent(`toggle-right-pane`,{bubbles:!0,composed:!0}))}
          >
            ◨ Inspector
          </button>
        </div>
        <button
          class=${this.focusMode?`active`:``}
          title="Focus Mode: Hide All Sidebars & Maximize Canvas [F]"
          @click=${()=>this.dispatchEvent(new CustomEvent(`toggle-focus-mode`,{bubbles:!0,composed:!0}))}
        >
          ⛶ Focus
        </button>
        ${this.viewLayout===`2d`?``:s`
              <button
                title="Save 3D Camera as Floor Default"
                @click=${this.handleSaveCamera}
              >
                Save 3D Camera
              </button>
            `}
      </div>

      <div class="separator"></div>

      <!-- 7. Document Import / Export & Save -->
      <div class="toolbar-section">
        <button
          title="Import Floorplan JSON"
          @click=${()=>this.dispatchEvent(new CustomEvent(`import-json`,{bubbles:!0,composed:!0}))}
        >
          Import
        </button>
        <button
          title="Export Floorplan JSON"
          @click=${()=>this.dispatchEvent(new CustomEvent(`export-json`,{bubbles:!0,composed:!0}))}
        >
          Export
        </button>

        <div class="dirty-pill ${this.isDirty?`unsaved`:`saved`}">
          <span class="status-dot"></span>
          ${this.isDirty?`Unsaved`:`Saved`}
        </div>

        <button
          class="save-button"
          title="Save Floorplan to Home Assistant Storage"
          @click=${()=>this.dispatchEvent(new CustomEvent(`save-floorplan`,{bubbles:!0,composed:!0}))}
        >
          Save
        </button>
        <button
          title="Collapse Top Toolbar"
          aria-label="Collapse top toolbar"
          @click=${()=>this.dispatchEvent(new CustomEvent(`toggle-top-toolbar`,{bubbles:!0,composed:!0}))}
        >
          ▲
        </button>
      </div>
    `}};b([o({type:Array})],E.prototype,`floorplans`,void 0),b([o({type:String})],E.prototype,`activeFloorplanId`,void 0),b([o({type:Array})],E.prototype,`floors`,void 0),b([o({type:String})],E.prototype,`activeFloorId`,void 0),b([o({type:String})],E.prototype,`activeTool`,void 0),b([o({type:Number})],E.prototype,`gridSize`,void 0),b([o({type:Boolean})],E.prototype,`snapToGrid`,void 0),b([o({type:Boolean})],E.prototype,`canUndo`,void 0),b([o({type:Boolean})],E.prototype,`canRedo`,void 0),b([o({type:String})],E.prototype,`viewLayout`,void 0),b([o({type:Boolean})],E.prototype,`isDirty`,void 0),b([o({type:Boolean})],E.prototype,`onionSkin`,void 0),b([o({type:Boolean,reflect:!0})],E.prototype,`narrow`,void 0),b([o({type:Boolean})],E.prototype,`leftPaneCollapsed`,void 0),b([o({type:Boolean})],E.prototype,`rightPaneCollapsed`,void 0),b([o({type:Boolean})],E.prototype,`focusMode`,void 0),b([i()],E.prototype,`isMoreMenuOpen`,void 0),E=b([n(`floorplan-editor-toolbar`)],E);var D=[{type:`door_single`,label:`Single Door`,defaultWidth:.9,defaultHeight:2.1,icon:`🚪`},{type:`door_double`,label:`Double Door`,defaultWidth:1.8,defaultHeight:2.1,icon:`🚪🚪`},{type:`door_sliding`,label:`Sliding Door`,defaultWidth:1.8,defaultHeight:2.1,icon:`↔️`},{type:`archway`,label:`Archway / Portal`,defaultWidth:1.2,defaultHeight:2.1,icon:`🏛️`},{type:`window_standard`,label:`Standard Window`,defaultWidth:1.2,defaultHeight:1.2,icon:`🪟`},{type:`window_floor_to_ceiling`,label:`Floor-to-Ceiling Window`,defaultWidth:2,defaultHeight:2.4,icon:`🪟`}],O=[{type:`sofa_straight`,label:`Sofa (Straight)`,defaultWidth:2,defaultDepth:.9,defaultHeight:.85,category:`Living`,icon:`🛋️`},{type:`sofa_l_shape`,label:`Sofa (L-Shape)`,defaultWidth:2.4,defaultDepth:1.8,defaultHeight:.85,category:`Living`,icon:`🛋️`},{type:`bed_double`,label:`Double Bed`,defaultWidth:1.8,defaultDepth:2.1,defaultHeight:.9,category:`Bedroom`,icon:`🛏️`},{type:`bed_single`,label:`Single Bed`,defaultWidth:1,defaultDepth:2,defaultHeight:.85,category:`Bedroom`,icon:`🛏️`},{type:`dining_table`,label:`Dining Table`,defaultWidth:1.6,defaultDepth:.9,defaultHeight:.75,category:`Dining`,icon:`🪑`},{type:`desk`,label:`Work Desk`,defaultWidth:1.4,defaultDepth:.7,defaultHeight:.75,category:`Office`,icon:`🖥️`},{type:`chair`,label:`Chair`,defaultWidth:.5,defaultDepth:.5,defaultHeight:.85,category:`Dining`,icon:`🪑`},{type:`tv_stand`,label:`Media / TV Stand`,defaultWidth:1.6,defaultDepth:.45,defaultHeight:.5,category:`Living`,icon:`📺`},{type:`kitchen_counter`,label:`Kitchen Counter`,defaultWidth:1.8,defaultDepth:.65,defaultHeight:.9,category:`Kitchen`,icon:`🍳`},{type:`refrigerator`,label:`Refrigerator`,defaultWidth:.8,defaultDepth:.75,defaultHeight:1.85,category:`Kitchen`,icon:`🧊`},{type:`stove`,label:`Stove & Range`,defaultWidth:.75,defaultDepth:.65,defaultHeight:.9,category:`Kitchen`,icon:`🔥`},{type:`sink_cabinet`,label:`Sink Cabinet`,defaultWidth:1,defaultDepth:.65,defaultHeight:.9,category:`Kitchen`,icon:`🚰`},{type:`bathtub`,label:`Bathtub`,defaultWidth:1.7,defaultDepth:.8,defaultHeight:.55,category:`Bathroom`,icon:`🛁`},{type:`shower_enclosure`,label:`Shower Enclosure`,defaultWidth:1,defaultDepth:1,defaultHeight:2,category:`Bathroom`,icon:`🚿`},{type:`toilet`,label:`Toilet`,defaultWidth:.45,defaultDepth:.65,defaultHeight:.8,category:`Bathroom`,icon:`🚽`},{type:`wardrobe`,label:`Wardrobe / Closet`,defaultWidth:1.2,defaultDepth:.6,defaultHeight:2.1,category:`Bedroom`,icon:`🚪`},{type:`bookcase`,label:`Bookcase`,defaultWidth:1,defaultDepth:.35,defaultHeight:1.9,category:`Living`,icon:`📚`},{type:`potted_plant`,label:`Potted Plant`,defaultWidth:.5,defaultDepth:.5,defaultHeight:.9,category:`Decor`,icon:`🪴`},{type:`rug`,label:`Area Rug`,defaultWidth:2.4,defaultDepth:1.6,defaultHeight:.02,category:`Decor`,icon:`🪡`}],k=[`all`,`light`,`switch`,`binary_sensor`,`sensor`,`media_player`,`climate`,`fan`,`button`],A=class extends e{constructor(...e){super(...e),this.selectedRoomAreaId=null,this.mobile=!1,this.activeTab=`entities`,this.searchQuery=``,this.selectedDomain=`all`,this.filterByArea=!1,this.unplacedOnly=!1,this.furnitureCategoryFilter=`all`}static{this.styles=r`
    :host {
      display: flex;
      flex-direction: column;
      width: 260px;
      flex-shrink: 0;
      height: 100%;
      background: var(--card-background-color, #0f172a);
      border-right: 1px solid var(--divider-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    :host([mobile]) {
      width: 100%;
      border: none;
      height: auto;
      max-height: 100%;
    }

    .tabs-header {
      display: flex;
      align-items: center;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
    }

    .pane-collapse-btn {
      background: transparent;
      border: none;
      border-left: 1px solid var(--divider-color, #334155);
      color: var(--secondary-text-color, #94a3b8);
      padding: 0 10px;
      height: 44px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .pane-collapse-btn:hover {
      color: var(--primary-text-color, #f8fafc);
      background: rgba(255, 255, 255, 0.08);
    }

    .tab-button {
      flex: 1;
      padding: 12px 8px;
      min-height: 44px;
      text-align: center;
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      box-sizing: border-box;
    }

    .tab-button:hover {
      color: var(--primary-text-color, #f8fafc);
    }

    .tab-button.active {
      color: var(--primary-color, #3b82f6);
      border-bottom-color: var(--primary-color, #3b82f6);
      background: rgba(59, 130, 246, 0.05);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }

    .tab-content::-webkit-scrollbar {
      width: 4px;
    }

    .tab-content::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .search-box {
      position: relative;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--primary-text-color, #f8fafc);
      font-size: 13px;
      outline: none;
      min-height: 38px;
    }

    .search-box input:focus {
      border-color: var(--primary-color, #3b82f6);
    }

    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip {
      background: var(--secondary-background-color, #1e293b);
      color: var(--secondary-text-color, #94a3b8);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      min-height: 34px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .chip:hover {
      color: var(--primary-text-color, #f8fafc);
      border-color: var(--divider-color, #64748b);
    }

    .chip.active {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .toggles-bar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--secondary-background-color, #1e293b);
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #334155);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--primary-text-color, #cbd5e1);
      cursor: pointer;
      min-height: 30px;
    }

    .toggle-row input[type='checkbox'] {
      cursor: pointer;
      accent-color: var(--primary-color, #3b82f6);
      width: 18px;
      height: 18px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color, #64748b);
      margin-top: 4px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 6px;
      padding: 8px 12px;
      cursor: grab;
      min-height: 44px;
      box-sizing: border-box;
      transition: border-color 0.15s, background 0.15s;
    }

    .item-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--divider-color, #475569);
    }

    .item-row:active {
      cursor: grabbing;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      font-size: 18px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .item-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #f8fafc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtext {
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .place-btn {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      min-height: 34px;
      transition: background 0.15s;
    }

    .place-btn:hover {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .placed-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(34, 197, 94, 0.2);
      color: var(--success-color, #4ade80);
      border: 1px solid rgba(34, 197, 94, 0.4);
      padding: 1px 5px;
      border-radius: 8px;
      margin-left: 4px;
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: var(--secondary-text-color, #64748b);
      font-size: 13px;
    }
  `}handleDragStart(e,t){e.dataTransfer&&(e.dataTransfer.setData(`application/x-floorplan-palette`,JSON.stringify(t)),e.dataTransfer.effectAllowed=`copy`)}handlePlaceItem(e){this.dispatchEvent(new CustomEvent(`palette-place`,{bubbles:!0,composed:!0,detail:e}))}getFilteredEntities(){if(!this.hass?.states)return[];let e=this.searchQuery.trim().toLowerCase(),t=new Set(this.activeFloor?.entities.map(e=>e.entity_id)??[]);return Object.values(this.hass.states).filter(n=>{let r=n.entity_id,i=r.split(`.`)[0],a=n.attributes.friendly_name||``;return!(this.selectedDomain!==`all`&&i!==this.selectedDomain||e&&!r.toLowerCase().includes(e)&&!a.toLowerCase().includes(e)||this.unplacedOnly&&t.has(r)||this.filterByArea&&this.selectedRoomAreaId&&c(r,this.hass)!==this.selectedRoomAreaId)})}getDomainIcon(e){switch(e){case`light`:return`💡`;case`switch`:return`🔌`;case`binary_sensor`:return`🔔`;case`sensor`:return`🌡️`;case`media_player`:return`📻`;case`climate`:return`❄️`;case`fan`:return`🌀`;case`button`:return`🔘`;default:return`⚙️`}}render(){let e=this.selectedRoomAreaId&&this.hass?.areas?.[this.selectedRoomAreaId]?this.hass.areas[this.selectedRoomAreaId].name:this.selectedRoomAreaId;return s`
      <!-- Header Tabs -->
      <div class="tabs-header">
        <button
          class="tab-button ${this.activeTab===`entities`?`active`:``}"
          @click=${()=>this.activeTab=`entities`}
        >
          Entities
        </button>
        <button
          class="tab-button ${this.activeTab===`catalog`?`active`:``}"
          @click=${()=>this.activeTab=`catalog`}
        >
          Catalog
        </button>
        ${this.mobile?``:s`
              <button
                class="pane-collapse-btn"
                title="Collapse Left Panel ["
                aria-label="Collapse left panel"
                @click=${()=>this.dispatchEvent(new CustomEvent(`collapse-pane`,{bubbles:!0,composed:!0}))}
              >
                ◀
              </button>
            `}
      </div>

      <!-- Tab 1: HA Entities -->
      ${this.activeTab===`entities`?s`
            <div class="tab-content">
              <!-- Search box -->
              <div class="search-box">
                <input
                  type="text"
                  placeholder="Search entities..."
                  .value=${this.searchQuery}
                  @input=${e=>this.searchQuery=e.target.value}
                />
              </div>

              <!-- Domain pills -->
              <div class="chips-bar">
                ${k.map(e=>s`
                    <div
                      class="chip ${this.selectedDomain===e?`active`:``}"
                      @click=${()=>this.selectedDomain=e}
                    >
                      ${e}
                    </div>
                  `)}
              </div>

              <!-- Filter Toggles -->
              <div class="toggles-bar">
                <label class="toggle-row">
                  <input
                    type="checkbox"
                    .checked=${this.filterByArea}
                    ?disabled=${!this.selectedRoomAreaId}
                    @change=${e=>this.filterByArea=e.target.checked}
                  />
                  <span>
                    Filter by Selected Room's HA Area
                    ${e?s`<b>(${e})</b>`:``}
                  </span>
                </label>
                <label class="toggle-row">
                  <input
                    type="checkbox"
                    .checked=${this.unplacedOnly}
                    @change=${e=>this.unplacedOnly=e.target.checked}
                  />
                  <span>Unplaced Only</span>
                </label>
              </div>

              <!-- Entities List -->
              <div class="section-title">
                Entities (${this.getFilteredEntities().length})
              </div>
              <div class="items-list">
                ${this.getFilteredEntities().length===0?s`<div class="empty-state">No entities match filters.</div>`:this.getFilteredEntities().map(e=>{let t=e.entity_id.split(`.`)[0],n=this.activeFloor?.entities.some(t=>t.entity_id===e.entity_id),r={kind:`entity`,entityId:e.entity_id,domain:t,label:e.attributes.friendly_name||e.entity_id};return s`
                        <div
                          class="item-row"
                          draggable="true"
                          @dragstart=${e=>this.handleDragStart(e,r)}
                        >
                          <div class="item-left">
                            <span class="item-icon">${this.getDomainIcon(t)}</span>
                            <div class="item-details">
                              <span class="item-name">
                                ${e.attributes.friendly_name||e.entity_id}
                                ${n?s`<span class="placed-pill">Placed</span>`:``}
                              </span>
                              <span class="item-subtext">
                                ${e.entity_id} • ${e.state}
                              </span>
                            </div>
                          </div>
                          <button
                            class="place-btn"
                            title="Place in center of active floor"
                            @click=${()=>this.handlePlaceItem(r)}
                          >
                            + Place
                          </button>
                        </div>
                      `})}
              </div>
            </div>
          `:s`
            <!-- Tab 2: Catalog & Furniture -->
            <div class="tab-content">
              <!-- Openings & Portals -->
              <div class="section-title">Openings & Portals</div>
              <div class="items-list">
                ${D.map(e=>{let t={kind:`opening`,openingType:e.type,defaultWidth:e.defaultWidth,defaultHeight:e.defaultHeight,label:e.label};return s`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${e=>this.handleDragStart(e,t)}
                    >
                      <div class="item-left">
                        <span class="item-icon">${e.icon}</span>
                        <div class="item-details">
                          <span class="item-name">${e.label}</span>
                          <span class="item-subtext">
                            ${e.defaultWidth}m × ${e.defaultHeight}m
                          </span>
                        </div>
                      </div>
                      <button
                        class="place-btn"
                        title="Add to wall or center of floor"
                        @click=${()=>this.handlePlaceItem(t)}
                      >
                        + Add
                      </button>
                    </div>
                  `})}
              </div>

              <!-- Procedural Furniture -->
              <div class="section-title">Procedural Furniture (19 Models)</div>
              <div class="chips-bar">
                ${[`all`,`Living`,`Bedroom`,`Kitchen`,`Bathroom`,`Dining`,`Office`,`Decor`].map(e=>s`
                    <div
                      class="chip ${this.furnitureCategoryFilter===e?`active`:``}"
                      @click=${()=>this.furnitureCategoryFilter=e}
                    >
                      ${e}
                    </div>
                  `)}
              </div>

              <div class="items-list">
                ${O.filter(e=>this.furnitureCategoryFilter===`all`||e.category===this.furnitureCategoryFilter).map(e=>{let t={kind:`furniture`,furnitureType:e.type,defaultWidth:e.defaultWidth,defaultDepth:e.defaultDepth,defaultHeight:e.defaultHeight,label:e.label};return s`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${e=>this.handleDragStart(e,t)}
                    >
                      <div class="item-left">
                        <span class="item-icon">${e.icon}</span>
                        <div class="item-details">
                          <span class="item-name">${e.label}</span>
                          <span class="item-subtext">
                            ${e.defaultWidth}m × ${e.defaultDepth}m × ${e.defaultHeight}m
                          </span>
                        </div>
                      </div>
                      <button
                        class="place-btn"
                        title="Place in center of floor"
                        @click=${()=>this.handlePlaceItem(t)}
                      >
                        + Add
                      </button>
                    </div>
                  `})}
              </div>
            </div>
          `}
    `}};b([o({attribute:!1})],A.prototype,`hass`,void 0),b([o({attribute:!1})],A.prototype,`activeFloor`,void 0),b([o({type:String})],A.prototype,`selectedRoomAreaId`,void 0),b([o({type:Boolean,reflect:!0})],A.prototype,`mobile`,void 0),b([i()],A.prototype,`activeTab`,void 0),b([i()],A.prototype,`searchQuery`,void 0),b([i()],A.prototype,`selectedDomain`,void 0),b([i()],A.prototype,`filterByArea`,void 0),b([i()],A.prototype,`unplacedOnly`,void 0),b([i()],A.prototype,`furnitureCategoryFilter`,void 0),A=b([n(`floorplan-entity-palette`)],A);var j=[{value:`adaptive_contrast`,label:`Adaptive Contrast (Recommended)`},{value:`sun_sync`,label:`Sun Synchronization`},{value:`dark`,label:`Dark Mode`},{value:`daylight`,label:`Daylight Mode`}],M=[{value:`wood_oak`,label:`Natural Oak Wood`},{value:`wood_walnut`,label:`Dark Walnut Wood`},{value:`tile_slate`,label:`Slate Tile`},{value:`tile_marble`,label:`Marble Tile`},{value:`carpet`,label:`Soft Carpet`},{value:`concrete`,label:`Polished Concrete`},{value:`custom`,label:`Custom Tint Color`}],N=[{value:`door_single`,label:`Single Door`},{value:`door_double`,label:`Double Door`},{value:`door_sliding`,label:`Sliding Door`},{value:`archway`,label:`Archway / Portal`},{value:`window_standard`,label:`Standard Window`},{value:`window_floor_to_ceiling`,label:`Floor-to-Ceiling Window`}],P=[{value:`left_in`,label:`Left Inward`},{value:`left_out`,label:`Left Outward`},{value:`right_in`,label:`Right Inward`},{value:`right_out`,label:`Right Outward`}],F=[{value:`none`,label:`None (Icon / Badge Only)`},{value:`ceiling_light`,label:`Ceiling Pendant Light`},{value:`wall_sconce`,label:`Wall Sconce`},{value:`led_strip`,label:`LED Strip Fixture`},{value:`tv_screen`,label:`Smart TV Screen`},{value:`ceiling_fan`,label:`Ceiling Fan (Animated)`},{value:`thermostat`,label:`Wall Thermostat`},{value:`speaker`,label:`Smart Speaker`}],I=[{value:`point`,label:`Point Light (Omnidirectional)`},{value:`spot`,label:`Spotlight`},{value:`strip`,label:`LED Strip`},{value:`wall_sconce`,label:`Wall Sconce`}],L=[{value:`sofa_straight`,label:`Sofa (Straight)`},{value:`sofa_l_shape`,label:`Sofa (L-Shape)`},{value:`bed_double`,label:`Double Bed`},{value:`bed_single`,label:`Single Bed`},{value:`dining_table`,label:`Dining Table`},{value:`desk`,label:`Work Desk`},{value:`chair`,label:`Chair`},{value:`tv_stand`,label:`TV Stand`},{value:`kitchen_counter`,label:`Kitchen Counter`},{value:`refrigerator`,label:`Refrigerator`},{value:`stove`,label:`Stove & Range`},{value:`sink_cabinet`,label:`Sink Cabinet`},{value:`bathtub`,label:`Bathtub`},{value:`shower_enclosure`,label:`Shower Enclosure`},{value:`toilet`,label:`Toilet`},{value:`wardrobe`,label:`Wardrobe`},{value:`bookcase`,label:`Bookcase`},{value:`potted_plant`,label:`Potted Plant`},{value:`rug`,label:`Area Rug`}],R=class extends e{constructor(...e){super(...e),this.selection={kind:`none`,id:null},this.mobile=!1}static{this.styles=r`
    :host {
      display: flex;
      flex-direction: column;
      width: 260px;
      flex-shrink: 0;
      height: 100%;
      background: var(--card-background-color, #0f172a);
      border-left: 1px solid var(--divider-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    :host([mobile]) {
      width: 100%;
      border: none;
      height: auto;
      max-height: 100%;
    }

    .inspector-header {
      padding: 8px 10px 8px 14px;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 44px;
      box-sizing: border-box;
    }

    .pane-collapse-btn {
      background: transparent;
      border: 1px solid var(--divider-color, #334155);
      border-radius: 4px;
      color: var(--secondary-text-color, #94a3b8);
      padding: 4px 8px;
      cursor: pointer;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .pane-collapse-btn:hover {
      color: var(--primary-text-color, #f8fafc);
      background: rgba(255, 255, 255, 0.08);
    }

    .inspector-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-text-color, #f8fafc);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-kind {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--primary-color, #3b82f6);
      color: #ffffff;
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
    }

    .inspector-body::-webkit-scrollbar {
      width: 4px;
    }

    .inspector-body::-webkit-scrollbar-thumb {
      background: var(--divider-color, #334155);
      border-radius: 2px;
    }

    .section-card {
      background: var(--secondary-background-color, #1e293b);
      border: 1px solid var(--divider-color, #334155);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color, #94a3b8);
      border-bottom: 1px solid var(--divider-color, #334155);
      padding-bottom: 6px;
      margin-bottom: 2px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    label {
      font-size: 11px;
      font-weight: 500;
      color: var(--secondary-text-color, #94a3b8);
    }

    input[type='text'],
    input[type='number'],
    select {
      background: var(--primary-background-color, #0f172a);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--primary-text-color, #f8fafc);
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      width: 100%;
      min-height: 36px;
    }

    input[type='text']:focus,
    input[type='number']:focus,
    select:focus {
      border-color: var(--primary-color, #3b82f6);
    }

    input[type='color'] {
      background: transparent;
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      width: 44px;
      height: 36px;
      cursor: pointer;
      padding: 0;
    }

    input[type='range'] {
      width: 100%;
      accent-color: var(--primary-color, #3b82f6);
      cursor: pointer;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--primary-text-color, #cbd5e1);
      cursor: pointer;
      min-height: 32px;
    }

    .checkbox-row input[type='checkbox'] {
      accent-color: var(--primary-color, #3b82f6);
      cursor: pointer;
      width: 18px;
      height: 18px;
    }

    .slider-val {
      font-size: 11px;
      font-weight: 600;
      color: var(--primary-color, #38bdf8);
      min-width: 42px;
      text-align: right;
    }

    .btn {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #475569);
      border-radius: 4px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn:hover {
      background: var(--primary-background-color, #475569);
    }

    .btn-danger {
      background: var(--error-color, #7f1d1d);
      color: #fecaca;
      border-color: var(--error-color, #991b1b);
    }

    .btn-danger:hover {
      filter: brightness(1.1);
    }

    .btn-primary {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border-color: var(--primary-color, #3b82f6);
    }

    .btn-primary:hover {
      filter: brightness(1.1);
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .grid-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    .entity-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--primary-background-color, #0f172a);
      padding: 8px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #334155);
      font-size: 12px;
      min-height: 36px;
      box-sizing: border-box;
    }

    .state-badge {
      font-weight: 700;
      color: var(--primary-color, #38bdf8);
    }
  `}mutate(e,t){if(!this.document)return;let n=structuredClone(this.document),r=n.floors.find(e=>e.id===this.floor?.id)??n.floors[0];r&&(t(n,r),this.dispatchEvent(new CustomEvent(`document-mutate`,{bubbles:!0,composed:!0,detail:{document:n,description:e}})))}handleDeleteSelected(){if(!this.selection||this.selection.kind===`none`||!this.selection.id)return;let{kind:e,id:t}=this.selection;this.mutate(`Delete ${e}`,(n,r)=>{switch(e){case`wall`:r.walls=r.walls.filter(e=>e.id!==t),r.openings=r.openings.filter(e=>e.wall_id!==t);break;case`room`:r.rooms=r.rooms.filter(e=>e.id!==t);break;case`opening`:r.openings=r.openings.filter(e=>e.id!==t);break;case`furniture`:r.furniture=r.furniture.filter(e=>e.id!==t);break;case`entity`:r.entities=r.entities.filter(e=>e.id!==t)}}),this.dispatchEvent(new CustomEvent(`delete-selected`,{bubbles:!0,composed:!0,detail:this.selection}))}render(){let{kind:e}=this.selection;return s`
      <div class="inspector-header">
        <div class="inspector-title">
          <span>Properties</span>
          <span class="badge-kind">${e===`none`?`Global / Floor`:e}</span>
        </div>
        ${this.mobile?``:s`
              <button
                class="pane-collapse-btn"
                title="Collapse Inspector ]"
                aria-label="Collapse right panel"
                @click=${()=>this.dispatchEvent(new CustomEvent(`collapse-pane`,{bubbles:!0,composed:!0}))}
              >
                ▶
              </button>
            `}
      </div>

      <div class="inspector-body">
        ${e===`none`?this.renderGlobalAndFloorInspector():``}
        ${e===`wall`?this.renderWallInspector():``}
        ${e===`room`?this.renderRoomInspector():``}
        ${e===`opening`?this.renderOpeningInspector():``}
        ${e===`furniture`?this.renderFurnitureInspector():``}
        ${e===`entity`?this.renderEntityInspector():``}
      </div>
    `}renderGlobalAndFloorInspector(){if(!this.document||!this.floor)return s``;let e=this.document,t=this.floor,n=e.ambient_config;return s`
      <!-- Global Floorplan Settings -->
      <div class="section-card">
        <div class="section-header">Floorplan Global Settings</div>

        <div class="form-group">
          <label>Floorplan Name</label>
          <input
            type="text"
            .value=${e.name}
            @change=${e=>{let t=e.target.value;this.mutate(`Change floorplan name`,e=>{e.name=t})}}
          />
        </div>

        <div class="form-group">
          <label>Ambient Lighting Mode</label>
          <select
            .value=${n.mode}
            @change=${e=>{let t=e.target.value;this.mutate(`Change ambient lighting mode`,e=>{e.ambient_config.mode=t})}}
          >
            ${j.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="form-row">
          <label>Wall Paint Color</label>
          <input
            type="color"
            .value=${n.wall_color||`#e2e8f0`}
            @change=${e=>{let t=e.target.value;this.mutate(`Change wall color`,e=>{e.ambient_config.wall_color=t})}}
          />
        </div>

        <div class="form-row">
          <label>Base Floor Color</label>
          <input
            type="color"
            .value=${n.floor_color||`#334155`}
            @change=${e=>{let t=e.target.value;this.mutate(`Change floor base color`,e=>{e.ambient_config.floor_color=t})}}
          />
        </div>

        <div class="form-row">
          <label>3D Sky / Background</label>
          <input
            type="color"
            .value=${n.background_color||`#0f172a`}
            @change=${e=>{let t=e.target.value;this.mutate(`Change background color`,e=>{e.ambient_config.background_color=t})}}
          />
        </div>
      </div>

      <!-- Active Floor Level Settings -->
      <div class="section-card">
        <div class="section-header">Active Floor Level (${t.name})</div>

        <div class="form-group">
          <label>Floor Level Name</label>
          <input
            type="text"
            .value=${t.name}
            @change=${e=>{let t=e.target.value;this.mutate(`Change floor level name`,(e,n)=>{n.name=t})}}
          />
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Level Index</label>
            <input
              type="number"
              step="1"
              .value=${String(t.level_index)}
              @change=${e=>{let t=parseInt(e.target.value,10);this.mutate(`Change floor level index`,(e,n)=>{n.level_index=t})}}
            />
          </div>

          <div class="form-group">
            <label>Elevation (m)</label>
            <input
              type="number"
              step="0.1"
              .value=${String(t.elevation)}
              @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Change floor elevation`,(e,n)=>{n.elevation=t})}}
            />
          </div>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Wall Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="6.0"
              .value=${String(t.wall_height)}
              @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Change floor wall height`,(e,n)=>{n.wall_height=t})}}
            />
          </div>

          <div class="form-group">
            <label>Slab Thick (m)</label>
            <input
              type="number"
              step="0.01"
              min="0.05"
              max="0.5"
              .value=${String(t.slab_thickness||.15)}
              @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Change floor slab thickness`,(e,n)=>{n.slab_thickness=t})}}
            />
          </div>
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Floor</label>
          <select
            .value=${t.ha_floor_id||``}
            @change=${e=>{let t=e.target.value||null;this.mutate(`Bind HA floor ID`,(e,n)=>{n.ha_floor_id=t})}}
          >
            <option value="">None (Unbound)</option>
            ${Object.values(this.hass?.floors??{}).map(e=>s`<option value=${e.floor_id}>${e.name}</option>`)}
          </select>
        </div>
      </div>

      <!-- Blueprint Calibration & Overlay -->
      <div class="section-card">
        <div class="section-header">Blueprint Reference Image</div>
        ${t.blueprint?s`
              <div class="form-row">
                <label>Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  .value=${String(t.blueprint.opacity)}
                  @input=${e=>{let t=parseFloat(e.target.value);this.mutate(`Update blueprint opacity`,(e,n)=>{n.blueprint&&(n.blueprint.opacity=t)})}}
                />
                <span class="slider-val">${Math.round(t.blueprint.opacity*100)}%</span>
              </div>

              <div class="grid-2col">
                <div class="form-group">
                  <label>X Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(t.blueprint.offset_x)}
                    @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Update blueprint offset X`,(e,n)=>{n.blueprint&&(n.blueprint.offset_x=t)})}}
                  />
                </div>
                <div class="form-group">
                  <label>Y Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(t.blueprint.offset_y)}
                    @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Update blueprint offset Y`,(e,n)=>{n.blueprint&&(n.blueprint.offset_y=t)})}}
                  />
                </div>
              </div>

              <div class="grid-2col">
                <div class="form-group">
                  <label>Rotation (°)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="360"
                    .value=${String(t.blueprint.rotation_deg)}
                    @change=${e=>{let t=parseFloat(e.target.value);this.mutate(`Update blueprint rotation`,(e,n)=>{n.blueprint&&(n.blueprint.rotation_deg=t)})}}
                  />
                </div>
                <div class="form-group">
                  <label>Scale (m/px)</label>
                  <input
                    type="number"
                    step="0.001"
                    .value=${String(t.blueprint.meters_per_pixel.toFixed(4))}
                    disabled
                  />
                </div>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${t.blueprint.locked}
                  @change=${e=>{let t=e.target.checked;this.mutate(`Toggle blueprint locked`,(e,n)=>{n.blueprint&&(n.blueprint.locked=t)})}}
                />
                <span>Lock Blueprint Position & Scale</span>
              </label>

              <button
                class="btn btn-primary"
                @click=${()=>this.dispatchEvent(new CustomEvent(`open-blueprint-modal`,{bubbles:!0,composed:!0}))}
              >
                Recalibrate 2-Point Scale
              </button>

              <button
                class="btn btn-danger"
                @click=${()=>{this.mutate(`Remove blueprint`,(e,t)=>{t.blueprint=null})}}
              >
                Remove Blueprint
              </button>
            `:s`
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                No blueprint reference image uploaded for this floor.
              </p>
              <button
                class="btn btn-primary"
                @click=${()=>this.dispatchEvent(new CustomEvent(`open-blueprint-modal`,{bubbles:!0,composed:!0}))}
              >
                Upload & Calibrate Blueprint
              </button>
            `}
      </div>
    `}renderWallInspector(){if(!this.floor)return s``;let e=this.floor.walls.find(e=>e.id===this.selection.id);return e?s`
      <div class="section-card">
        <div class="section-header">Wall Segment (${e.id})</div>

        <div class="form-group">
          <label>Thickness (m)</label>
          <input
            type="number"
            step="0.01"
            min="0.05"
            max="1.0"
            .value=${String(e.thickness)}
            @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change wall thickness`,(t,r)=>{let i=r.walls.find(t=>t.id===e.id);i&&(i.thickness=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Height Override (m, null for floor wall height)</label>
          <input
            type="number"
            step="0.05"
            min="0.2"
            max="6.0"
            placeholder="Default (use floor height)"
            .value=${e.height_override===null?``:String(e.height_override)}
            @change=${t=>{let n=t.target,r=n.value===``?null:parseFloat(n.value);this.mutate(`Change wall height override`,(t,n)=>{let i=n.walls.find(t=>t.id===e.id);i&&(i.height_override=r)})}}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${e.is_exterior}
            @change=${t=>{let n=t.target.checked;this.mutate(`Toggle exterior wall`,(t,r)=>{let i=r.walls.find(t=>t.id===e.id);i&&(i.is_exterior=n)})}}
          />
          <span>Exterior Wall (Affects Sims-style Cutaway)</span>
        </label>

        <div class="form-row">
          <label>Custom Paint Color</label>
          <input
            type="color"
            .value=${e.color_override||`#e2e8f0`}
            @change=${t=>{let n=t.target.value;this.mutate(`Change wall color`,(t,r)=>{let i=r.walls.find(t=>t.id===e.id);i&&(i.color_override=n)})}}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Wall
        </button>
      </div>
    `:s`<div class="section-card">Wall not found.</div>`}renderRoomInspector(){if(!this.floor)return s``;let e=this.floor.rooms.find(e=>e.id===this.selection.id);return e?s`
      <div class="section-card">
        <div class="section-header">Room Polygon (${e.name})</div>

        <div class="form-group">
          <label>Room Name</label>
          <input
            type="text"
            .value=${e.name}
            @change=${t=>{let n=t.target.value;this.mutate(`Change room name`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.name=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Area</label>
          <select
            .value=${e.ha_area_id||``}
            @change=${t=>{let n=t.target.value||null;this.mutate(`Bind HA area`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.ha_area_id=n)})}}
          >
            <option value="">None (Unbound Area)</option>
            ${Object.values(this.hass?.areas??{}).map(e=>s`<option value=${e.area_id}>${e.name}</option>`)}
          </select>
        </div>

        <div class="form-group">
          <label>Floor Material Surface</label>
          <select
            .value=${e.floor_material}
            @change=${t=>{let n=t.target.value;this.mutate(`Change room floor material`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.floor_material=n)})}}
          >
            ${M.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="form-row">
          <label>Floor Tint Color</label>
          <input
            type="color"
            .value=${e.floor_color||`#8b6f4e`}
            @change=${t=>{let n=t.target.value;this.mutate(`Change room floor color`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.floor_color=n)})}}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${e.show_label}
            @change=${t=>{let n=t.target.checked;this.mutate(`Toggle room label visibility`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.show_label=n)})}}
          />
          <span>Show Floating 3D Room Label</span>
        </label>
      </div>

      <!-- Sensor Overrides -->
      <div class="section-card">
        <div class="section-header">Sensor Overrides (Optional)</div>

        <div class="form-group">
          <label>Temperature Sensor</label>
          <input
            type="text"
            placeholder="sensor.living_room_temperature"
            .value=${e.temp_entity_id||``}
            @change=${t=>{let n=t.target.value.trim()||null;this.mutate(`Set room temperature sensor`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.temp_entity_id=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Humidity Sensor</label>
          <input
            type="text"
            placeholder="sensor.living_room_humidity"
            .value=${e.humidity_entity_id||``}
            @change=${t=>{let n=t.target.value.trim()||null;this.mutate(`Set room humidity sensor`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.humidity_entity_id=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Motion / Occupancy Sensor</label>
          <input
            type="text"
            placeholder="binary_sensor.living_room_motion"
            .value=${e.motion_entity_id||``}
            @change=${t=>{let n=t.target.value.trim()||null;this.mutate(`Set room motion sensor`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.motion_entity_id=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Room Tap Action</label>
          <select
            .value=${e.room_tap_action.action}
            @change=${t=>{let n=t.target.value;this.mutate(`Change room tap action`,(t,r)=>{let i=r.rooms.find(t=>t.id===e.id);i&&(i.room_tap_action.action=n)})}}
          >
            <option value="toggle">Toggle Room Lights</option>
            <option value="zoom-room">Zoom Camera to Room</option>
            <option value="none">None (Disabled)</option>
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Room
        </button>
      </div>
    `:s`<div class="section-card">Room not found.</div>`}renderOpeningInspector(){if(!this.floor)return s``;let e=this.floor.openings.find(e=>e.id===this.selection.id);if(!e)return s`<div class="section-card">Opening not found.</div>`;let t=Object.keys(this.hass?.states??{}).filter(e=>e.startsWith(`binary_sensor.`));return s`
      <div class="section-card">
        <div class="section-header">Wall Opening (${e.type})</div>

        <div class="form-group">
          <label>Opening Type</label>
          <select
            .value=${e.type}
            @change=${t=>{let n=t.target.value;this.mutate(`Change opening type`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.type=n)})}}
          >
            ${N.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Width (m)</label>
            <input
              type="number"
              step="0.05"
              min="0.5"
              max="5.0"
              .value=${String(e.width)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change opening width`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.width=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Sill Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="0.0"
              max="3.0"
              .value=${String(e.sill_height)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change opening sill height`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.sill_height=n)})}}
            />
          </div>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Head Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="5.0"
              .value=${String(e.head_height)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change opening head height`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.head_height=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Swing Direction</label>
            <select
              .value=${e.swing_direction}
              @change=${t=>{let n=t.target.value;this.mutate(`Change opening swing direction`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.swing_direction=n)})}}
            >
              ${P.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Bound Contact Sensor (Door/Window)</label>
          <select
            .value=${e.bound_entity_id||``}
            @change=${t=>{let n=t.target.value||null;this.mutate(`Bind opening contact sensor`,(t,r)=>{let i=r.openings.find(t=>t.id===e.id);i&&(i.bound_entity_id=n)})}}
          >
            <option value="">None (Static Position)</option>
            ${t.map(e=>s`<option value=${e}>${e}</option>`)}
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Opening
        </button>
      </div>
    `}renderFurnitureInspector(){if(!this.floor)return s``;let e=this.floor.furniture.find(e=>e.id===this.selection.id);return e?s`
      <div class="section-card">
        <div class="section-header">Furniture Item (${e.label})</div>

        <div class="form-group">
          <label>Label</label>
          <input
            type="text"
            .value=${e.label}
            @change=${t=>{let n=t.target.value;this.mutate(`Change furniture label`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.label=n)})}}
          />
        </div>

        <div class="form-group">
          <label>Catalog Model</label>
          <select
            .value=${e.catalog_type}
            @change=${t=>{let n=t.target.value;this.mutate(`Change furniture type`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.catalog_type=n)})}}
          >
            ${L.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>X (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.x.toFixed(2))}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture X`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.x=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Y (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.y.toFixed(2))}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture Y`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.y=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Elev (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.z_elevation.toFixed(2))}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture Z elevation`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.z_elevation=n)})}}
            />
          </div>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>Width (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.width)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture width`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.width=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Depth (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.depth)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture depth`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.depth=n)})}}
            />
          </div>

          <div class="form-group">
            <label>Height (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(e.height)}
              @change=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change furniture height`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.height=n)})}}
            />
          </div>
        </div>

        <div class="form-row">
          <label>Rotation (°)</label>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            .value=${String(e.rotation_deg)}
            @input=${t=>{let n=parseFloat(t.target.value);this.mutate(`Rotate furniture`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.rotation_deg=n)})}}
          />
          <span class="slider-val">${e.rotation_deg}°</span>
        </div>

        <div class="form-row">
          <label>Color Override</label>
          <input
            type="color"
            .value=${e.color||`#94a3b8`}
            @change=${t=>{let n=t.target.value;this.mutate(`Change furniture color`,(t,r)=>{let i=r.furniture.find(t=>t.id===e.id);i&&(i.color=n)})}}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Furniture
        </button>
      </div>
    `:s`<div class="section-card">Furniture not found.</div>`}renderEntityInspector(){if(!this.floor)return s``;let e=this.floor.entities.find(e=>e.id===this.selection.id);if(!e)return s`<div class="section-card">Entity placement not found.</div>`;let t=this.hass?.states[e.entity_id],n=e.domain===`light`||!!e.light_config;return s`
      <div class="section-card">
        <div class="section-header">Entity Placement</div>

        <div class="entity-preview">
          <span>${t?.attributes.friendly_name||e.entity_id}</span>
          <span class="state-badge">${t?.state??`unavailable`}</span>
        </div>

        <div class="form-group">
          <label>Entity ID</label>
          <input
            type="text"
            .value=${e.entity_id}
            @change=${t=>{let n=t.target.value.trim();this.mutate(`Change placed entity ID`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.entity_id=n,i.domain=n.split(`.`)[0]||`sensor`)})}}
          />
        </div>

        <div class="form-row">
          <label>Z Elevation (m)</label>
          <input
            type="range"
            min="0"
            max="3.5"
            step="0.05"
            .value=${String(e.z_elevation)}
            @input=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change entity elevation`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.z_elevation=n)})}}
          />
          <span class="slider-val">${e.z_elevation.toFixed(2)}m</span>
        </div>

        <div class="form-row">
          <label>Rotation (°)</label>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            .value=${String(e.rotation_deg)}
            @input=${t=>{let n=parseFloat(t.target.value);this.mutate(`Rotate entity`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.rotation_deg=n)})}}
          />
          <span class="slider-val">${e.rotation_deg}°</span>
        </div>

        <div class="form-group">
          <label>3D Mesh Coupling</label>
          <select
            .value=${e.mesh_type}
            @change=${t=>{let n=t.target.value;this.mutate(`Change entity 3D mesh type`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.mesh_type=n)})}}
          >
            ${F.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>
      </div>

      <!-- Light Fixture 3D Config -->
      ${n?s`
            <div class="section-card">
              <div class="section-header">Light Fixture 3D Settings</div>

              <div class="form-group">
                <label>Fixture Kind</label>
                <select
                  .value=${e.light_config?.kind||`point`}
                  @change=${t=>{let n=t.target.value;this.mutate(`Change light fixture kind`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.light_config={kind:n,radius_m:i.light_config?.radius_m??4.5,intensity_multiplier:i.light_config?.intensity_multiplier??1,cast_real_point_light:i.light_config?.cast_real_point_light??!0})})}}
                >
                  ${I.map(e=>s`<option value=${e.value}>${e.label}</option>`)}
                </select>
              </div>

              <div class="form-row">
                <label>Falloff Radius (m)</label>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.25"
                  .value=${String(e.light_config?.radius_m??4.5)}
                  @input=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change light radius`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i?.light_config&&(i.light_config.radius_m=n)})}}
                />
                <span class="slider-val">
                  ${(e.light_config?.radius_m??4.5).toFixed(1)}m
                </span>
              </div>

              <div class="form-row">
                <label>Intensity Mult</label>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  .value=${String(e.light_config?.intensity_multiplier??1)}
                  @input=${t=>{let n=parseFloat(t.target.value);this.mutate(`Change light intensity multiplier`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i?.light_config&&(i.light_config.intensity_multiplier=n)})}}
                />
                <span class="slider-val">
                  ${(e.light_config?.intensity_multiplier??1).toFixed(1)}x
                </span>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${e.light_config?.cast_real_point_light??!0}
                  @change=${t=>{let n=t.target.checked;this.mutate(`Toggle real point light pool`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i?.light_config&&(i.light_config.cast_real_point_light=n)})}}
                />
                <span>Eligible for Three.js PointLight Pool</span>
              </label>
            </div>
          `:``}

      <!-- Floating Touch Badge -->
      <div class="section-card">
        <div class="section-header">Floating Touch Badge</div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${e.badge?.visible??!0}
            @change=${t=>{let n=t.target.checked;this.mutate(`Toggle badge visibility`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.badge.visible=n)})}}
          />
          <span>Show 3D Floating Badge</span>
        </label>

        <div class="form-group">
          <label>Badge Style</label>
          <select
            .value=${e.badge?.style||`icon_only`}
            @change=${t=>{let n=t.target.value;this.mutate(`Change badge style`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.badge.style=n)})}}
          >
            <option value="icon_only">Icon Only</option>
            <option value="icon_and_state">Icon & State</option>
            <option value="compact_pill">Compact Pill</option>
          </select>
        </div>

        <div class="form-group">
          <label>Label Override</label>
          <input
            type="text"
            placeholder="Default entity friendly name"
            .value=${e.badge?.label_override||``}
            @change=${t=>{let n=t.target.value.trim()||null;this.mutate(`Set badge label override`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.badge.label_override=n)})}}
          />
        </div>
      </div>

      <!-- Touch Actions -->
      <div class="section-card">
        <div class="section-header">Touch Actions</div>

        <div class="form-group">
          <label>Tap Action</label>
          <select
            .value=${e.tap_action?.action||`default`}
            @change=${t=>{let n=t.target.value;this.mutate(`Change entity tap action`,(t,r)=>{let i=r.entities.find(t=>t.id===e.id);i&&(i.tap_action.action=n)})}}
          >
            <option value="default">Default (Toggle light/switch or More Info)</option>
            <option value="toggle">Toggle</option>
            <option value="more-info">More Info Dialog</option>
            <option value="none">None</option>
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Placement
        </button>
      </div>
    `}};b([o({attribute:!1})],R.prototype,`hass`,void 0),b([o({attribute:!1})],R.prototype,`document`,void 0),b([o({attribute:!1})],R.prototype,`floor`,void 0),b([o({attribute:!1})],R.prototype,`selection`,void 0),b([o({type:Boolean,reflect:!0})],R.prototype,`mobile`,void 0),R=b([n(`floorplan-property-inspector`)],R);var z=class extends e{constructor(...e){super(...e),this.narrow=!1,this.floorplans=[],this.activeFloorplanId=``,this.activeFloorId=``,this.activeTool=`select`,this.viewLayout=`2d`,this.gridSize=.1,this.snapToGrid=!0,this.onionSkin=!1,this.selection={kind:`none`,id:null},this.isBlueprintModalOpen=!1,this.isDirty=!1,this.canUndo=!1,this.canRedo=!1,this.toastMessage=null,this.isViewportNarrow=!1,this.activeMobileSheet=`none`,this.isLeftPaneCollapsed=!1,this.isRightPaneCollapsed=!1,this.isTopToolbarCollapsed=!1,this.splitRatio=.65,this.stateDiffer=new v,this.scene3d=null,this.sceneContainerEl=null,this.toastTimer=null,this.isWsInitialized=!1,this.hostResizeObserver=null,this.isResizingSplit=!1,this.prevFocusState=null,this.startSplitResize=e=>{e.button===0&&(e.preventDefault(),this.isResizingSplit=!0)},this.handleSplitPointerMove=e=>{if(!this.isResizingSplit)return;let t=this.renderRoot.querySelector(`.center-viewport`);if(!t)return;let n=t.getBoundingClientRect();if(n.width<=0)return;let r=(e.clientX-n.left)/n.width;this.splitRatio=Math.max(.2,Math.min(.85,Number(r.toFixed(3)))),this.scene3d?.resize()},this.handleSplitPointerUp=()=>{this.isResizingSplit&&(this.isResizingSplit=!1,this.scene3d?.resize())},this.handleKeyDown=e=>{let t=e.composedPath?.()[0]??e.target,n=t?.tagName?.toLowerCase();if(n===`input`||n===`textarea`||n===`select`||t?.isContentEditable)return;let r=e.ctrlKey||e.metaKey;if(r&&e.key.toLowerCase()===`z`)e.preventDefault(),e.shiftKey?this.handleRedo():this.handleUndo();else if(r&&e.key.toLowerCase()===`y`)e.preventDefault(),this.handleRedo();else if(r&&e.key.toLowerCase()===`s`)e.preventDefault(),this.handleSaveFloorplan();else switch(e.key.toLowerCase()){case`v`:this.activeTool=`select`;break;case`w`:this.activeTool=`draw_wall`;break;case`r`:this.activeTool=`draw_room`;break;case`o`:this.activeTool=`add_opening`;break;case`m`:this.activeTool=`measure`;break;case`b`:this.isBlueprintModalOpen=!0;break;case`[`:this.isLeftPaneCollapsed=!this.isLeftPaneCollapsed;break;case`]`:this.isRightPaneCollapsed=!this.isRightPaneCollapsed;break;case`f`:this.toggleFocusMode();break;case`delete`:case`backspace`:this.deleteSelection()}}}static{this.styles=r`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      background: var(--primary-background-color, #090d16);
      color: var(--primary-text-color, #f8fafc);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }

    .editor-body {
      display: flex;
      flex: 1;
      min-height: 0;
      position: relative;
    }

    .editor-body.mobile {
      flex-direction: column;
    }

    .center-viewport {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
      background: var(--primary-background-color, #090d16);
      position: relative;
    }

    .viewport-pane {
      flex: 1;
      height: 100%;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }

    .viewport-pane.hidden {
      display: none;
    }

    .viewport-divider {
      width: 6px;
      background: var(--secondary-background-color, #1e293b);
      border-left: 1px solid var(--divider-color, #334155);
      border-right: 1px solid var(--divider-color, #334155);
      cursor: col-resize;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      user-select: none;
      z-index: 20;
    }

    .viewport-divider:hover {
      background: var(--primary-color, #3b82f6);
    }

    .viewport-divider::after {
      content: '⋮';
      font-size: 11px;
      color: var(--secondary-text-color, #94a3b8);
      line-height: 1;
    }

    .pane-expand-tab {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 30;
      background: var(--card-background-color, rgba(15, 23, 42, 0.92));
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--divider-color, #334155);
      padding: 10px 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(4px);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .pane-expand-tab:hover {
      background: var(--secondary-background-color, #1e293b);
      border-color: var(--primary-color, #38bdf8);
      color: var(--primary-color, #38bdf8);
    }

    .pane-expand-tab.left {
      left: 0;
      border-left: none;
      border-radius: 0 8px 8px 0;
    }

    .pane-expand-tab.right {
      right: 0;
      border-right: none;
      border-radius: 8px 0 0 8px;
    }

    .viewport-floating-bar {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 25;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card-background-color, rgba(15, 23, 42, 0.9));
      border: 1px solid var(--divider-color, #334155);
      border-radius: 8px;
      padding: 4px 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(4px);
    }

    .floating-chip-btn {
      background: transparent;
      color: var(--primary-text-color, #cbd5e1);
      border: 1px solid transparent;
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .floating-chip-btn:hover {
      background: var(--secondary-background-color, #334155);
      color: var(--primary-text-color, #ffffff);
    }

    .floating-chip-btn.active {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
    }

    .scene-3d-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: var(--card-background-color, #0f172a);
    }

    .toast-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card-background-color, #1e293b);
      color: var(--primary-text-color, #f8fafc);
      border: 1px solid var(--primary-color, #3b82f6);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      pointer-events: none;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, 8px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    .file-input-hidden {
      display: none;
    }

    /* Mobile Bottom CAD Dock */
    .mobile-bottom-dock {
      height: 58px;
      background: var(--card-background-color, #0f172a);
      border-top: 1px solid var(--divider-color, #334155);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 4px;
      box-sizing: border-box;
      flex-shrink: 0;
      z-index: 50;
    }

    .dock-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      min-height: 44px;
      flex: 1;
      min-width: 0;
      transition: background 0.15s, color 0.15s;
    }

    .dock-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .dock-btn.active {
      color: var(--primary-color, #38bdf8);
      background: rgba(59, 130, 246, 0.12);
    }

    .dock-icon {
      font-size: 16px;
      line-height: 1;
    }

    .dock-label {
      font-size: 10px;
      font-weight: 600;
      margin-top: 2px;
    }

    .dock-divider {
      width: 1px;
      height: 28px;
      background: var(--divider-color, #334155);
      margin: 0 2px;
      flex-shrink: 0;
    }

    /* Floating Selection Bar on Mobile */
    .mobile-selection-bar {
      position: absolute;
      bottom: 66px;
      left: 12px;
      right: 12px;
      background: var(--card-background-color, #1e293b);
      border: 1px solid var(--primary-color, #3b82f6);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 60;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      animation: fadeIn 0.15s ease-out;
    }

    .selection-text {
      font-size: 12px;
      color: var(--primary-text-color, #f8fafc);
    }

    .selection-actions {
      display: flex;
      gap: 6px;
    }

    .btn-sel-edit {
      background: var(--primary-color, #2563eb);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sel-delete {
      background: var(--error-color, #7f1d1d);
      color: #fecaca;
      border: 1px solid var(--error-color, #991b1b);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Slide-up Bottom Sheets */
    .mobile-sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 100;
      backdrop-filter: blur(2px);
    }

    .mobile-sheet-drawer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 75vh;
      background: var(--card-background-color, #0f172a);
      border-top: 1px solid var(--divider-color, #334155);
      border-radius: 16px 16px 0 0;
      z-index: 110;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .mobile-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--secondary-background-color, #1e293b);
      border-bottom: 1px solid var(--divider-color, #334155);
    }

    .sheet-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color, #f8fafc);
    }

    .sheet-close-btn {
      background: transparent;
      border: none;
      color: var(--secondary-text-color, #94a3b8);
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .sheet-close-btn:hover {
      color: var(--primary-text-color, #ffffff);
      background: rgba(255, 255, 255, 0.1);
    }

    .mobile-sheet-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  `}connectedCallback(){super.connectedCallback();let e=S();this.history=new C(e,50),this.activeFloorplanId=e.id,this.activeFloorId=e.floors[0]?.id??``,this.updateHistoryFlags(),this.wsClient=new f(()=>this.hass),window.addEventListener(`keydown`,this.handleKeyDown),window.addEventListener(`pointermove`,this.handleSplitPointerMove),window.addEventListener(`pointerup`,this.handleSplitPointerUp),typeof ResizeObserver<`u`&&(this.hostResizeObserver=new ResizeObserver(e=>{for(let t of e){let e=t.contentRect.width;this.isViewportNarrow=e>0&&e<768}}),this.hostResizeObserver.observe(this))}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener(`keydown`,this.handleKeyDown),window.removeEventListener(`pointermove`,this.handleSplitPointerMove),window.removeEventListener(`pointerup`,this.handleSplitPointerUp),this.hostResizeObserver?.disconnect(),this.hostResizeObserver=null,this.toastTimer&&window.clearTimeout(this.toastTimer),this.scene3d?.dispose(),this.scene3d=null}willUpdate(e){super.willUpdate(e),(e.has(`narrow`)||e.has(`isViewportNarrow`))&&this.isMobile&&this.viewLayout===`split`&&(this.viewLayout=`2d`)}updated(e){if(super.updated(e),e.has(`hass`)&&this.hass&&!this.isWsInitialized&&(this.isWsInitialized=!0,this.stateDiffer.rebuildWatchedSet(this.currentDocument,this.hass),this.loadInitialData()),e.has(`hass`)&&this.hass&&this.scene3d){let e=this.stateDiffer.diffStates(this.hass);e.length>0&&this.scene3d.updateHassStates(this.hass,e)}e.has(`viewLayout`)&&this.handleLayoutChangeEffect()}get isMobile(){return this.narrow||this.isViewportNarrow}get isFocusMode(){return this.isLeftPaneCollapsed&&this.isRightPaneCollapsed&&this.viewLayout===`2d`}toggleFocusMode(){this.isFocusMode?this.prevFocusState?(this.isLeftPaneCollapsed=this.prevFocusState.left,this.isRightPaneCollapsed=this.prevFocusState.right,this.isTopToolbarCollapsed=this.prevFocusState.top,this.viewLayout=this.prevFocusState.layout,this.prevFocusState=null):(this.isLeftPaneCollapsed=!1,this.isRightPaneCollapsed=!1,this.isTopToolbarCollapsed=!1):(this.prevFocusState={left:this.isLeftPaneCollapsed,right:this.isRightPaneCollapsed,top:this.isTopToolbarCollapsed,layout:this.viewLayout},this.isLeftPaneCollapsed=!0,this.isRightPaneCollapsed=!0,this.viewLayout=`2d`)}async loadInitialData(){try{let e=await this.wsClient.listFloorplans();if(this.floorplans=e,e.length>0){let t=e[0],n=await this.wsClient.getFloorplan(t.id);this.history.reset(n),this.activeFloorplanId=n.id,this.activeFloorId=n.floors[0]?.id??``,this.updateHistoryFlags(),this.sync3DScene()}}catch(e){console.warn(`Could not load floorplans via WebSocket; running in standalone mode`,e)}}get currentDocument(){return this.history.current}get activeFloor(){return this.currentDocument.floors.find(e=>e.id===this.activeFloorId)??this.currentDocument.floors[0]}updateHistoryFlags(){this.canUndo=this.history.canUndo,this.canRedo=this.history.canRedo,this.isDirty=this.history.isDirty}pushHistory(e,t){this.history.push(e,t),this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate()}showToast(e){this.toastMessage=e,this.toastTimer&&window.clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>{this.toastMessage=null,this.toastTimer=null,this.requestUpdate()},3200),this.requestUpdate()}handleUndo(){this.history.undo()&&(this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Undo`))}handleRedo(){this.history.redo()&&(this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Redo`))}deleteSelection(){if(this.selection.kind===`none`||!this.selection.id)return;let{kind:e,id:t}=this.selection,n=structuredClone(this.currentDocument),r=n.floors.find(e=>e.id===this.activeFloorId);if(r){switch(e){case`node`:{let e=new Set(r.walls.filter(e=>e.start_node_id===t||e.end_node_id===t).map(e=>e.id));r.nodes=r.nodes.filter(e=>e.id!==t),r.walls=r.walls.filter(t=>!e.has(t.id)),r.openings=r.openings.filter(t=>!e.has(t.wall_id)),r.rooms=r.rooms.map(e=>({...e,points:e.points.filter(e=>e.node_id!==t)})).filter(e=>e.points.length>=3);break}case`wall`:r.walls=r.walls.filter(e=>e.id!==t),r.openings=r.openings.filter(e=>e.wall_id!==t);break;case`room`:r.rooms=r.rooms.filter(e=>e.id!==t);break;case`opening`:r.openings=r.openings.filter(e=>e.id!==t);break;case`furniture`:r.furniture=r.furniture.filter(e=>e.id!==t);break;case`entity`:r.entities=r.entities.filter(e=>e.id!==t)}this.selection={kind:`none`,id:null},this.pushHistory(n,`Delete ${e}`),this.showToast(`Deleted ${e}`)}}sync3DScene(){this.stateDiffer.rebuildWatchedSet(this.currentDocument,this.hass),this.scene3d&&this.scene3d.setDocument(this.currentDocument,this.activeFloorId,this.hass)}handleLayoutChangeEffect(){this.viewLayout===`2d`?this.scene3d&&(this.scene3d.dispose(),this.scene3d=null,this.sceneContainerEl=null):this.updateComplete.then(()=>{this.ensure3DSceneMounted()})}ensure3DSceneMounted(){if(this.viewLayout===`2d`)return;let e=this.renderRoot.querySelector(`#scene-3d-root`);e&&(!this.scene3d||this.sceneContainerEl!==e?(this.scene3d?.dispose(),this.sceneContainerEl=e,this.scene3d=new h(e,{wallMode:`auto_cutaway`,projection:`perspective`,showRoomLabels:!0,showEntityBadges:!0,onCameraChanged:e=>{}}),this.scene3d.setDocument(this.currentDocument,this.activeFloorId,this.hass)):this.scene3d.resize())}handleFloorplanChange(e){let{floorplanId:t}=e.detail;t&&this.wsClient.getFloorplan(t).then(e=>{this.history.reset(e),this.activeFloorplanId=e.id,this.activeFloorId=e.floors[0]?.id??``,this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Loaded floorplan: ${e.name}`)}).catch(e=>{this.showToast(`Failed to load floorplan: ${e.message}`)})}handleFloorplanNew(){let e=`floorplan_${Date.now().toString(36)}`,t=`Floorplan ${this.floorplans.length+1}`,n=S(e,t);this.history.reset(n),this.activeFloorplanId=n.id,this.activeFloorId=n.floors[0]?.id??``,this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Created new floorplan: ${t}`)}async handleFloorplanDelete(){if(this.floorplans.length<=1)this.showToast(`Cannot delete the only remaining floorplan.`);else if(window.confirm(`Are you sure you want to delete the floorplan "${this.currentDocument.name}"?`))try{await this.wsClient.deleteFloorplan(this.activeFloorplanId),this.showToast(`Floorplan deleted.`),await this.loadInitialData()}catch(e){this.showToast(`Failed to delete: ${e?.message||e}`)}}handleFloorChange(e){this.activeFloorId=e.detail.floorId,this.selection={kind:`none`,id:null},this.scene3d?.setActiveFloor(this.activeFloorId),this.requestUpdate()}handleFloorAdd(){let e=structuredClone(this.currentDocument),t=Math.max(...e.floors.map(e=>e.level_index),0),n=Math.max(...e.floors.map(e=>e.elevation),0),r=t+1,i=n+(this.activeFloor?.wall_height??2.6),a=`floor_${Date.now().toString(36)}`,o={id:a,name:`Level ${r}`,level_index:r,elevation:i,wall_height:2.6,slab_thickness:.15,ha_floor_id:null,blueprint:null,default_camera:null,nodes:[],walls:[],openings:[],rooms:[],furniture:[],entities:[]};e.floors.push(o),this.activeFloorId=a,this.pushHistory(e,`Add Floor Level ${r}`),this.showToast(`Added Floor: ${o.name}`)}handleDuplicatePerimeter(){let e=structuredClone(this.currentDocument),t=e.floors.find(e=>e.id===this.activeFloorId);if(!t)return;let n=[...e.floors].filter(e=>e.level_index<t.level_index).sort((e,t)=>t.level_index-e.level_index)[0];if(!n){this.showToast(`No floor level found below the current level.`);return}let r=n.walls.filter(e=>e.is_exterior);if(r.length===0){this.showToast(`Floor below has no exterior walls to duplicate.`);return}let i=new Set;for(let e of r)i.add(e.start_node_id),i.add(e.end_node_id);let a=new Map,o=[];for(let e of n.nodes)if(i.has(e.id)){let t=`n_${Math.random().toString(36).substring(2,9)}`;a.set(e.id,t),o.push({id:t,x:e.x,y:e.y})}let s=r.map(e=>({id:`w_${Math.random().toString(36).substring(2,9)}`,start_node_id:a.get(e.start_node_id),end_node_id:a.get(e.end_node_id),thickness:e.thickness,height_override:e.height_override,is_exterior:!0,color_override:e.color_override}));t.nodes.push(...o),t.walls.push(...s),this.pushHistory(e,`Duplicate Perimeter from Below`),this.showToast(`Duplicated ${s.length} perimeter walls from ${n.name}`)}handleSaveCamera(){if(!this.scene3d){this.showToast(`3D scene view is not active.`);return}let e=this.scene3d.getCurrentCameraBookmark(),t=structuredClone(this.currentDocument),n=t.floors.find(e=>e.id===this.activeFloorId);n&&(n.default_camera=e,this.pushHistory(t,`Save 3D Camera as Default`),this.showToast(`Saved current 3D camera as floor default.`))}handleImportJsonClick(){this.renderRoot.querySelector(`#json-file-input`)?.click()}handleJsonFileSelected(e){let t=e.target;if(!t.files||t.files.length===0)return;let n=t.files[0],r=new FileReader;r.onload=e=>{try{let t=JSON.parse(e.target?.result);if(!t.id||!Array.isArray(t.floors))throw Error(`Invalid floorplan JSON schema: missing id or floors array`);t.updated_at=new Date().toISOString(),this.history.push(t,`Import Floorplan JSON`),this.activeFloorplanId=t.id,this.activeFloorId=t.floors[0]?.id??``,this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Imported floorplan: ${t.name}`)}catch(e){this.showToast(`Failed to parse JSON: ${e?.message||e}`)}},r.readAsText(n),t.value=``}handleExportJson(){let e=JSON.stringify(this.currentDocument,null,2),t=new Blob([e],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`${this.currentDocument.id||`floorplan`}.json`,r.click(),URL.revokeObjectURL(n),this.showToast(`Exported floorplan JSON`)}async handleSaveFloorplan(){try{let e=this.currentDocument;e.updated_at=new Date().toISOString();let t=await this.wsClient.saveFloorplan(e,e.revision);this.history.markSaved(),this.updateHistoryFlags(),this.showToast(`Floorplan saved (Rev ${t.revision})`);let n=await this.wsClient.listFloorplans();this.floorplans=n}catch(e){this.showToast(`Failed to save: ${e?.message||e}`)}}handleDocumentMutate(e){this.pushHistory(e.detail.document,e.detail.description)}handleCanvasFloorChange(e){let{floor:t,description:n}=e.detail,r=structuredClone(this.currentDocument),i=r.floors.findIndex(e=>e.id===t.id);i===-1?r.floors.push(t):r.floors[i]=t,this.pushHistory(r,n||`Edit Floor Canvas`)}handleSelectionChange(e){this.selection=e.detail.selection,this.requestUpdate()}handlePalettePlace(e){let t=e.detail,n=structuredClone(this.currentDocument),r=n.floors.find(e=>e.id===this.activeFloorId);if(!r)return;let i=this.renderRoot.querySelector(`floorplan-canvas-2d`),a=i?.getViewportCenterWorld?.()??(typeof i?.panX==`number`&&typeof i?.panY==`number`?{x:i.panX,y:i.panY}:{x:0,y:0}),o=Number(a.x.toFixed(2)),s=Number(a.y.toFixed(2));if(t.kind===`entity`&&t.entityId){let e={id:`ent_${Math.random().toString(36).substring(2,9)}`,entity_id:t.entityId,domain:t.domain||t.entityId.split(`.`)[0]||`sensor`,room_id:null,x:o,y:s,z_elevation:t.domain===`light`?2.4:1.2,rotation_deg:0,mesh_type:t.domain===`light`?`ceiling_light`:`none`,mesh_scale:[1,1,1],badge:{visible:!0,style:`icon_only`,label_override:null,icon_override:null},tap_action:{action:`default`},hold_action:{action:`none`},double_tap_action:{action:`none`}};r.entities.push(e),this.selection={kind:`entity`,id:e.id},this.pushHistory(n,`Place Entity ${t.entityId}`),this.showToast(`Placed entity: ${t.entityId}`)}else if(t.kind===`furniture`&&t.furnitureType){let e={id:`furn_${Math.random().toString(36).substring(2,9)}`,catalog_type:t.furnitureType,label:t.label||`Furniture`,x:o,y:s,z_elevation:0,width:t.defaultWidth??1.5,depth:t.defaultDepth??.8,height:t.defaultHeight??.8,rotation_deg:0,color:null};r.furniture.push(e),this.selection={kind:`furniture`,id:e.id},this.pushHistory(n,`Add ${e.label}`),this.showToast(`Added ${e.label}`)}else if(t.kind===`opening`&&t.openingType){if(r.walls.length===0){this.showToast(`Please draw walls first before adding doors or windows.`);return}let e=r.walls[0],i={id:`open_${Math.random().toString(36).substring(2,9)}`,wall_id:e.id,type:t.openingType,t:.5,width:t.defaultWidth??.9,sill_height:t.openingType.includes(`window`)?.9:0,head_height:2.1,swing_direction:`left_in`,bound_entity_id:null};r.openings.push(i),this.selection={kind:`opening`,id:i.id},this.pushHistory(n,`Add ${t.label||`Opening`}`),this.showToast(`Added ${t.label||`Opening`} to wall`)}this.activeMobileSheet=`none`}handleBlueprintCalibrated(e){let t=e.detail,n=structuredClone(this.currentDocument),r=n.floors.find(e=>e.id===this.activeFloorId);r&&(r.blueprint={image_url:t.imageUrl,opacity:t.opacity,locked:!1,offset_x:0,offset_y:0,rotation_deg:0,meters_per_pixel:t.metersPerPixel,natural_width_px:t.naturalWidthPx,natural_height_px:t.naturalHeightPx},this.pushHistory(n,`Calibrate Blueprint Reference`),this.isBlueprintModalOpen=!1,this.showToast(`Blueprint scale calibrated successfully`))}render(){let e=this.activeFloor,t=(this.selection.kind===`room`?e?.rooms.find(e=>e.id===this.selection.id):null)?.ha_area_id??null,n=e?[...this.currentDocument.floors].filter(t=>t.level_index<e.level_index).sort((e,t)=>t.level_index-e.level_index)[0]??null:null,r=this.isMobile;return s`
      <!-- Top CAD Command Bar -->
      ${!this.isTopToolbarCollapsed||r?s`
            <floorplan-editor-toolbar
              .floorplans=${this.floorplans}
              .activeFloorplanId=${this.activeFloorplanId}
              .floors=${this.currentDocument.floors}
              .activeFloorId=${this.activeFloorId}
              .activeTool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .canUndo=${this.canUndo}
              .canRedo=${this.canRedo}
              .viewLayout=${this.viewLayout}
              .isDirty=${this.isDirty}
              .onionSkin=${this.onionSkin}
              .narrow=${r}
              .leftPaneCollapsed=${this.isLeftPaneCollapsed}
              .rightPaneCollapsed=${this.isRightPaneCollapsed}
              .focusMode=${this.isFocusMode}
              @floorplan-change=${this.handleFloorplanChange}
              @floorplan-new=${this.handleFloorplanNew}
              @floorplan-delete=${this.handleFloorplanDelete}
              @floor-change=${this.handleFloorChange}
              @floor-add=${this.handleFloorAdd}
              @duplicate-perimeter=${this.handleDuplicatePerimeter}
              @toggle-onion-skin=${e=>this.onionSkin=e.detail.onionSkin}
              @tool-change=${e=>this.activeTool=e.detail.tool}
              @calibrate-blueprint=${()=>this.isBlueprintModalOpen=!0}
              @grid-size-change=${e=>this.gridSize=e.detail.gridSize}
              @snap-toggle=${e=>this.snapToGrid=e.detail.snap}
              @undo=${this.handleUndo}
              @redo=${this.handleRedo}
              @layout-change=${e=>this.viewLayout=e.detail.layout}
              @toggle-left-pane=${()=>this.isLeftPaneCollapsed=!this.isLeftPaneCollapsed}
              @toggle-right-pane=${()=>this.isRightPaneCollapsed=!this.isRightPaneCollapsed}
              @toggle-focus-mode=${()=>this.toggleFocusMode()}
              @toggle-top-toolbar=${()=>this.isTopToolbarCollapsed=!this.isTopToolbarCollapsed}
              @save-camera=${this.handleSaveCamera}
              @import-json=${this.handleImportJsonClick}
              @export-json=${this.handleExportJson}
              @save-floorplan=${this.handleSaveFloorplan}
            ></floorplan-editor-toolbar>
          `:``}

      ${r?this.renderMobileLayout(e,t,n):this.renderDesktopLayout(e,t,n)}

      <!-- Blueprint 2-Point Calibration Modal -->
      <floorplan-blueprint-modal
        .open=${this.isBlueprintModalOpen}
        .floorplanId=${this.currentDocument.id}
        .floorId=${this.activeFloorId}
        .currentBlueprint=${e?.blueprint??null}
        .uploadCallback=${e=>this.wsClient.uploadBlueprint(e)}
        @blueprint-calibrated=${this.handleBlueprintCalibrated}
        @modal-close=${()=>this.isBlueprintModalOpen=!1}
      ></floorplan-blueprint-modal>

      <!-- Toast Overlay -->
      ${this.toastMessage?s`<div class="toast-overlay">${this.toastMessage}</div>`:``}

      <!-- Hidden file input for JSON import -->
      <input
        type="file"
        id="json-file-input"
        class="file-input-hidden"
        accept=".json,application/json"
        @change=${this.handleJsonFileSelected}
      />
    `}renderDesktopLayout(e,t,n){let r=this.viewLayout===`split`?`flex: ${this.splitRatio};`:`flex: 1;`,i=this.viewLayout===`split`?`flex: ${1-this.splitRatio};`:`flex: 1;`;return s`
      <div class="editor-body">
        <!-- Left Dock: Entity & Catalog Palette (Collapsible) -->
        ${this.isLeftPaneCollapsed?``:s`
              <floorplan-entity-palette
                .hass=${this.hass}
                .activeFloor=${e}
                .selectedRoomAreaId=${t}
                @palette-place=${this.handlePalettePlace}
                @collapse-pane=${()=>this.isLeftPaneCollapsed=!0}
              ></floorplan-entity-palette>
            `}

        <!-- Center Viewport: 2D CAD Canvas + Split/3D Live Preview -->
        <div class="center-viewport">
          <!-- Floating Left Expand Tab when Left Palette is Collapsed -->
          ${this.isLeftPaneCollapsed?s`
                <button
                  class="pane-expand-tab left"
                  title="Expand Catalog & Entities ["
                  aria-label="Expand left catalog panel"
                  @click=${()=>this.isLeftPaneCollapsed=!1}
                >
                  ▶ Catalog [
                </button>
              `:``}

          <!-- Floating Right Expand Tab when Right Inspector is Collapsed -->
          ${this.isRightPaneCollapsed?s`
                <button
                  class="pane-expand-tab right"
                  title="Expand Property Inspector ]"
                  aria-label="Expand right property inspector"
                  @click=${()=>this.isRightPaneCollapsed=!1}
                >
                  ◀ Inspector ]
                </button>
              `:``}

          <!-- 2D Viewport Pane -->
          <div
            class="viewport-pane ${this.viewLayout===`3d`?`hidden`:``}"
            style=${r}
          >
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${e??null}
              .toolMode=${this.activeTool}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .ghostFloor=${this.onionSkin?n:null}
              .onionSkinFloor=${this.onionSkin?n:null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @floor-change=${this.handleCanvasFloorChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
              @palette-place=${this.handlePalettePlace}
            ></floorplan-canvas-2d>

            <!-- Floating 2D Pane Quick Controls (Top-Right) -->
            <div class="viewport-floating-bar">
              ${this.isTopToolbarCollapsed?s`
                    <button
                      class="floating-chip-btn"
                      title="Toggle Home Assistant Sidebar"
                      @click=${()=>this.dispatchEvent(new CustomEvent(`hass-toggle-menu`,{bubbles:!0,composed:!0}))}
                    >
                      ☰
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Show Top Toolbar"
                      @click=${()=>this.isTopToolbarCollapsed=!1}
                    >
                      ▼ Toolbar
                    </button>
                  `:``}
              <button
                class="floating-chip-btn ${this.viewLayout===`split`?`active`:``}"
                title="Toggle 3D Split Preview"
                @click=${()=>this.viewLayout=this.viewLayout===`split`?`2d`:`split`}
              >
                ◫ 3D Split
              </button>
              <button
                class="floating-chip-btn ${this.isFocusMode?`active`:``}"
                title="Focus Mode: Hide Sidebars & Maximize Canvas [F]"
                @click=${()=>this.toggleFocusMode()}
              >
                ${this.isFocusMode?`🗗 Restore [F]`:`⛶ Focus [F]`}
              </button>
            </div>
          </div>

          ${this.viewLayout===`split`?s`
                <div
                  class="viewport-divider"
                  title="Drag to resize 2D/3D split (Double-click to hide 3D)"
                  @pointerdown=${this.startSplitResize}
                  @dblclick=${()=>this.viewLayout=`2d`}
                ></div>
              `:``}

          <!-- 3D Preview Pane -->
          <div
            class="viewport-pane ${this.viewLayout===`2d`?`hidden`:``}"
            style=${i}
          >
            <div class="scene-3d-container" id="scene-3d-root"></div>

            <!-- Floating 3D Pane Quick Controls (Top-Right) -->
            <div class="viewport-floating-bar">
              ${this.isTopToolbarCollapsed&&this.viewLayout===`3d`?s`
                    <button
                      class="floating-chip-btn"
                      title="Show Top Toolbar"
                      @click=${()=>this.isTopToolbarCollapsed=!1}
                    >
                      ▼ Toolbar
                    </button>
                  `:``}
              ${this.viewLayout===`split`?s`
                    <button
                      class="floating-chip-btn"
                      title="Maximize 3D Preview"
                      @click=${()=>this.viewLayout=`3d`}
                    >
                      ⛶ Full 3D
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Collapse 3D Preview Pane"
                      @click=${()=>this.viewLayout=`2d`}
                    >
                      ✕ Hide 3D
                    </button>
                  `:s`
                    <button
                      class="floating-chip-btn"
                      title="Return to Split 2D + 3D View"
                      @click=${()=>this.viewLayout=`split`}
                    >
                      ◫ Split 2D+3D
                    </button>
                    <button
                      class="floating-chip-btn"
                      title="Switch to 2D Canvas Only"
                      @click=${()=>this.viewLayout=`2d`}
                    >
                      2D Only
                    </button>
                  `}
            </div>
          </div>
        </div>

        <!-- Right Dock: Context-Sensitive Property Inspector (Collapsible) -->
        ${this.isRightPaneCollapsed?``:s`
              <floorplan-property-inspector
                .hass=${this.hass}
                .document=${this.currentDocument}
                .floor=${e}
                .selection=${this.selection}
                @document-mutate=${this.handleDocumentMutate}
                @delete-selected=${()=>this.deleteSelection()}
                @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
                @collapse-pane=${()=>this.isRightPaneCollapsed=!0}
              ></floorplan-property-inspector>
            `}
      </div>
    `}renderMobileLayout(e,t,n){return s`
      <div class="editor-body mobile">
        <!-- Viewport takes entire height minus header and bottom dock -->
        <div class="center-viewport mobile">
          <!-- 2D Viewport Pane -->
          <div class="viewport-pane ${this.viewLayout===`3d`?`hidden`:``}">
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${e??null}
              .toolMode=${this.activeTool}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .ghostFloor=${this.onionSkin?n:null}
              .onionSkinFloor=${this.onionSkin?n:null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @floor-change=${this.handleCanvasFloorChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
              @palette-place=${this.handlePalettePlace}
            ></floorplan-canvas-2d>
          </div>

          <!-- 3D Preview Pane -->
          <div class="viewport-pane ${this.viewLayout===`2d`?`hidden`:``}">
            <div class="scene-3d-container" id="scene-3d-root"></div>
          </div>
        </div>

        <!-- Compact Floating Selection Bar (Non-blocking) -->
        ${this.selection.kind!==`none`&&this.activeMobileSheet===`none`?s`
              <div class="mobile-selection-bar">
                <span class="selection-text">Selected: <strong>${this.selection.kind}</strong></span>
                <div class="selection-actions">
                  <button
                    class="btn-sel-edit"
                    @click=${()=>this.activeMobileSheet=`inspector`}
                  >
                    Edit Properties
                  </button>
                  <button
                    class="btn-sel-delete"
                    @click=${()=>this.deleteSelection()}
                  >
                    Delete
                  </button>
                </div>
              </div>
            `:``}

        <!-- Thumb-Friendly Bottom CAD Dock -->
        <div class="mobile-bottom-dock">
          <button
            class="dock-btn ${this.activeTool===`select`&&this.activeMobileSheet===`none`?`active`:``}"
            @click=${()=>{this.activeTool=`select`,this.activeMobileSheet=`none`}}
          >
            <span class="dock-icon">↖</span>
            <span class="dock-label">Select</span>
          </button>
          <button
            class="dock-btn ${this.activeTool===`draw_wall`&&this.activeMobileSheet===`none`?`active`:``}"
            @click=${()=>{this.activeTool=`draw_wall`,this.activeMobileSheet=`none`}}
          >
            <span class="dock-icon">🧱</span>
            <span class="dock-label">Wall</span>
          </button>
          <button
            class="dock-btn ${this.activeTool===`draw_room`&&this.activeMobileSheet===`none`?`active`:``}"
            @click=${()=>{this.activeTool=`draw_room`,this.activeMobileSheet=`none`}}
          >
            <span class="dock-icon">⬚</span>
            <span class="dock-label">Room</span>
          </button>
          <button
            class="dock-btn ${this.activeTool===`add_opening`&&this.activeMobileSheet===`none`?`active`:``}"
            @click=${()=>{this.activeTool=`add_opening`,this.activeMobileSheet=`none`}}
          >
            <span class="dock-icon">🚪</span>
            <span class="dock-label">Opening</span>
          </button>
          <button
            class="dock-btn ${this.activeTool===`measure`&&this.activeMobileSheet===`none`?`active`:``}"
            @click=${()=>{this.activeTool=`measure`,this.activeMobileSheet=`none`}}
          >
            <span class="dock-icon">📏</span>
            <span class="dock-label">Measure</span>
          </button>

          <div class="dock-divider"></div>

          <button
            class="dock-btn ${this.activeMobileSheet===`palette`?`active`:``}"
            @click=${()=>{this.activeMobileSheet=this.activeMobileSheet===`palette`?`none`:`palette`}}
          >
            <span class="dock-icon">+</span>
            <span class="dock-label">Add</span>
          </button>
          <button
            class="dock-btn ${this.activeMobileSheet===`inspector`?`active`:``}"
            @click=${()=>{this.activeMobileSheet=this.activeMobileSheet===`inspector`?`none`:`inspector`}}
          >
            <span class="dock-icon">⚙</span>
            <span class="dock-label">Props</span>
          </button>
        </div>

        <!-- Slide-Up Bottom Sheets -->
        ${this.activeMobileSheet===`none`?``:s`
              <div
                class="mobile-sheet-backdrop"
                @click=${()=>this.activeMobileSheet=`none`}
              ></div>
              <div class="mobile-sheet-drawer">
                <div class="mobile-sheet-header">
                  <span class="sheet-title">
                    ${this.activeMobileSheet===`palette`?`Entities & Furniture Catalog`:`Property Inspector`}
                  </span>
                  <button
                    class="sheet-close-btn"
                    aria-label="Close sheet"
                    @click=${()=>this.activeMobileSheet=`none`}
                  >
                    ✕
                  </button>
                </div>
                <div class="mobile-sheet-content">
                  ${this.activeMobileSheet===`palette`?s`
                        <floorplan-entity-palette
                          ?mobile=${!0}
                          .hass=${this.hass}
                          .activeFloor=${e}
                          .selectedRoomAreaId=${t}
                          @palette-place=${this.handlePalettePlace}
                        ></floorplan-entity-palette>
                      `:s`
                        <floorplan-property-inspector
                          ?mobile=${!0}
                          .hass=${this.hass}
                          .document=${this.currentDocument}
                          .floor=${e}
                          .selection=${this.selection}
                          @document-mutate=${this.handleDocumentMutate}
                          @delete-selected=${()=>this.deleteSelection()}
                          @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
                        ></floorplan-property-inspector>
                      `}
                </div>
              </div>
            `}
      </div>
    `}};b([o({attribute:!1})],z.prototype,`hass`,void 0),b([o({type:Boolean})],z.prototype,`narrow`,void 0),b([i()],z.prototype,`floorplans`,void 0),b([i()],z.prototype,`activeFloorplanId`,void 0),b([i()],z.prototype,`activeFloorId`,void 0),b([i()],z.prototype,`activeTool`,void 0),b([i()],z.prototype,`viewLayout`,void 0),b([i()],z.prototype,`gridSize`,void 0),b([i()],z.prototype,`snapToGrid`,void 0),b([i()],z.prototype,`onionSkin`,void 0),b([i()],z.prototype,`selection`,void 0),b([i()],z.prototype,`isBlueprintModalOpen`,void 0),b([i()],z.prototype,`isDirty`,void 0),b([i()],z.prototype,`canUndo`,void 0),b([i()],z.prototype,`canRedo`,void 0),b([i()],z.prototype,`toastMessage`,void 0),b([i()],z.prototype,`isViewportNarrow`,void 0),b([i()],z.prototype,`activeMobileSheet`,void 0),b([i()],z.prototype,`isLeftPaneCollapsed`,void 0),b([i()],z.prototype,`isRightPaneCollapsed`,void 0),b([i()],z.prototype,`isTopToolbarCollapsed`,void 0),b([i()],z.prototype,`splitRatio`,void 0),z=b([n(`floorplan-editor-panel`)],z);