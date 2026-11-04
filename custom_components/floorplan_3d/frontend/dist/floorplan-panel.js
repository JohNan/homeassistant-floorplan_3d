import{i as E,n as h,r as c,a as R,d as Q,s as Z,f as W,p as U,g as X,w as v,A as f,h as tt,j as et,k as it,b as d,t as B,l as ot,m as st,F as nt,c as at}from"./chunks/ws-client-S5oyb1qv.js";function q(t="main_house",e="Main House"){const i=new Date().toISOString();return{id:t,name:e,revision:1,created_at:i,updated_at:i,unit:"m",grid_size:.1,ambient_config:{mode:"adaptive_contrast",sun_entity_id:"sun.sun",base_ambient_intensity:.25,wall_color:"#e2e8f0",floor_color:"#334155",background_color:"#0f172a"},floors:[{id:"ground_floor",name:"Ground Floor",level_index:0,elevation:0,wall_height:2.6,slab_thickness:.15,ha_floor_id:null,blueprint:null,default_camera:{projection:"perspective",position:[0,11,10],target:[0,0,0],zoom:1},nodes:[{id:"n1",x:-4,y:-3},{id:"n2",x:4,y:-3},{id:"n3",x:4,y:3},{id:"n4",x:-4,y:3}],walls:[{id:"w1",start_node_id:"n1",end_node_id:"n2",thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:"w2",start_node_id:"n2",end_node_id:"n3",thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:"w3",start_node_id:"n3",end_node_id:"n4",thickness:.2,height_override:null,is_exterior:!0,color_override:null},{id:"w4",start_node_id:"n4",end_node_id:"n1",thickness:.2,height_override:null,is_exterior:!0,color_override:null}],openings:[],rooms:[{id:"r1",name:"Living Room",ha_area_id:null,points:[{x:-4,y:-3,node_id:"n1"},{x:4,y:-3,node_id:"n2"},{x:4,y:3,node_id:"n3"},{x:-4,y:3,node_id:"n4"}],floor_material:"wood_oak",floor_color:"#8b6f4e",show_label:!0,temp_entity_id:null,humidity_entity_id:null,motion_entity_id:null,room_tap_action:{action:"toggle"}}],furniture:[],entities:[]}]}}class rt{constructor(e,i=50){if(this.entries=[],this.currentIndex=0,this.savedIndex=0,i<1)throw new Error("maxSteps must be at least 1");this.maxSteps=i,this.reset(e)}get current(){const e=this.entries[this.currentIndex];return structuredClone(e.state)}push(e,i){if(this.currentIndex<this.entries.length-1&&(this.savedIndex!==null&&this.savedIndex>this.currentIndex&&(this.savedIndex=null),this.entries=this.entries.slice(0,this.currentIndex+1)),this.entries.push({state:structuredClone(e),label:i,timestamp:Date.now()}),this.entries.length>this.maxSteps){const s=this.entries.length-this.maxSteps;this.entries=this.entries.slice(s),this.savedIndex!==null&&(this.savedIndex-=s,this.savedIndex<0&&(this.savedIndex=null))}this.currentIndex=this.entries.length-1}undo(){return this.canUndo?(this.currentIndex--,this.current):null}redo(){return this.canRedo?(this.currentIndex++,this.current):null}get canUndo(){return this.currentIndex>0}get canRedo(){return this.currentIndex<this.entries.length-1}markSaved(){this.savedIndex=this.currentIndex}get isDirty(){return this.savedIndex!==this.currentIndex}reset(e){this.entries=[{state:structuredClone(e),timestamp:Date.now()}],this.currentIndex=0,this.savedIndex=0}get length(){return this.entries.length}get index(){return this.currentIndex}}var lt=Object.defineProperty,dt=Object.getOwnPropertyDescriptor,m=(t,e,i,s)=>{for(var o=s>1?void 0:s?dt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&lt(e,i,o),o};let u=class extends R{constructor(){super(...arguments),this.floor=null,this.ghostFloor=null,this.toolMode="select",this.selection={kind:"none",id:null},this.gridSize=.1,this.snapToGrid=!0,this.snapAngleDeg=15,this.pendingOpeningType="door_single",this.pixelsPerMeter=60,this.panX=0,this.panY=0,this.canvasWidth=800,this.canvasHeight=600,this.isPanning=!1,this.panStartScreen={x:0,y:0},this.panStartWorld={x:0,y:0},this.spaceHeld=!1,this.cursorWorld={x:0,y:0},this.snappedCursor={x:0,y:0},this.wallDrawStartNodeId=null,this.wallDrawStartPoint=null,this.roomDrawPoints=[],this.hoverWallId=null,this.hoverWallT=.5,this.hoverOpeningPoint=null,this.measureP1=null,this.measureP2=null,this.measureLocked=!1,this.dragKind=null,this.dragItemId=null,this.dragStripIndex=-1,this.dragStartWorld={x:0,y:0},this.itemOriginalPos={x:0,y:0},this.itemOriginalAngle=0,this.isItemDragging=!1,this.handleGlobalKeyDown=t=>{t.target instanceof HTMLInputElement||t.target instanceof HTMLTextAreaElement||(t.code==="Space"&&!this.spaceHeld?(this.spaceHeld=!0,this.requestUpdate()):t.key==="Delete"||t.key==="Backspace"?this.deleteSelected():t.key==="Escape"&&this.cancelActiveOperation())},this.handleGlobalKeyUp=t=>{t.code==="Space"&&(this.spaceHeld=!1,this.requestUpdate())},this.handleGlobalPointerMove=t=>{if(this.isPanning){const o=(t.clientX-this.panStartScreen.x)/this.pixelsPerMeter,n=(t.clientY-this.panStartScreen.y)/this.pixelsPerMeter;this.panX=this.panStartWorld.x-o,this.panY=this.panStartWorld.y-n;return}const e=this.getBoundingClientRect(),i=t.clientX-e.left,s=t.clientY-e.top;if(this.cursorWorld=this.screenToWorld(i,s),this.toolMode==="draw_wall"&&this.wallDrawStartPoint){const o=this.getSnapResult(this.cursorWorld,this.wallDrawStartPoint);this.snappedCursor=o.point}else{const o=this.getSnapResult(this.cursorWorld);this.snappedCursor=o.point}this.toolMode==="add_opening"&&this.floor&&this.updateOpeningHover(this.cursorWorld),this.isItemDragging&&this.floor&&this.handleItemDragMove(this.cursorWorld),this.toolMode==="measure"&&this.measureP1&&!this.measureLocked&&(this.measureP2=this.snappedCursor)},this.handleGlobalPointerUp=t=>{if(this.isPanning&&(this.isPanning=!1),this.isItemDragging&&this.floor){this.isItemDragging=!1;const e=this.dragKind==="furniture_rotate"?"Rotated furniture":`Moved ${this.dragKind||"item"}`;this.emitFloorChange(this.floor,e),this.dragKind=null,this.dragItemId=null}}}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(t=>{for(const e of t){const i=e.contentRect;i.width>0&&i.height>0&&(this.canvasWidth=i.width,this.canvasHeight=i.height)}}),this.resizeObserver.observe(this),window.addEventListener("keydown",this.handleGlobalKeyDown),window.addEventListener("keyup",this.handleGlobalKeyUp),window.addEventListener("pointermove",this.handleGlobalPointerMove),window.addEventListener("pointerup",this.handleGlobalPointerUp)}disconnectedCallback(){super.disconnectedCallback(),this.resizeObserver?.disconnect(),window.removeEventListener("keydown",this.handleGlobalKeyDown),window.removeEventListener("keyup",this.handleGlobalKeyUp),window.removeEventListener("pointermove",this.handleGlobalPointerMove),window.removeEventListener("pointerup",this.handleGlobalPointerUp)}firstUpdated(){this.floor&&(this.floor.nodes.length>0||this.floor.blueprint)&&this.fitViewToFloor()}worldToScreen(t,e){return{x:this.canvasWidth/2+(t-this.panX)*this.pixelsPerMeter,y:this.canvasHeight/2+(e-this.panY)*this.pixelsPerMeter}}screenToWorld(t,e){return{x:this.panX+(t-this.canvasWidth/2)/this.pixelsPerMeter,y:this.panY+(e-this.canvasHeight/2)/this.pixelsPerMeter}}sx(t){return this.canvasWidth/2+(t-this.panX)*this.pixelsPerMeter}sy(t){return this.canvasHeight/2+(t-this.panY)*this.pixelsPerMeter}fitViewToFloor(){if(!this.floor)return;const t=Q(this.floor,1.5);this.panX=t.centerX,this.panY=t.centerY;const e=this.canvasWidth||800,i=this.canvasHeight||600,s=(e-100)/Math.max(1,t.width),o=(i-100)/Math.max(1,t.height);this.pixelsPerMeter=Math.max(20,Math.min(250,Math.min(s,o))),this.requestUpdate()}emitFloorChange(t,e){this.dispatchEvent(new CustomEvent("floor-change",{detail:{floor:t,description:e},bubbles:!0,composed:!0}))}emitSelectionChange(t){this.selection=t,this.dispatchEvent(new CustomEvent("selection-change",{detail:{selection:t},bubbles:!0,composed:!0}))}getSnapResult(t,e,i){return this.floor?Z(t,{gridSize:this.gridSize,snapToGrid:this.snapToGrid,nodes:this.floor.nodes,walls:this.floor.walls,nodeSnapRadius:.25,anchorPoint:e,snapAngleDeg:this.snapAngleDeg,excludeNodeIds:i}):{point:t,snappedNodeId:null,snappedWallId:null}}cancelActiveOperation(){this.wallDrawStartPoint||this.wallDrawStartNodeId?(this.wallDrawStartPoint=null,this.wallDrawStartNodeId=null):this.roomDrawPoints.length>0?this.roomDrawPoints=[]:this.measureP1?(this.measureP1=null,this.measureP2=null,this.measureLocked=!1):this.selection.kind!=="none"&&this.emitSelectionChange({kind:"none",id:null}),this.requestUpdate()}deleteSelected(){if(!this.floor||this.selection.kind==="none"||!this.selection.id)return;const{kind:t,id:e}=this.selection,i={...this.floor};let s="";if(t==="node"){const o=new Set(i.walls.filter(n=>n.start_node_id===e||n.end_node_id===e).map(n=>n.id));i.nodes=i.nodes.filter(n=>n.id!==e),i.walls=i.walls.filter(n=>!o.has(n.id)),i.openings=i.openings.filter(n=>!o.has(n.wall_id)),i.rooms=i.rooms.map(n=>({...n,points:n.points.filter(a=>a.node_id!==e)})).filter(n=>n.points.length>=3),s="Deleted wall node"}else t==="wall"?(i.walls=i.walls.filter(o=>o.id!==e),i.openings=i.openings.filter(o=>o.wall_id!==e),s="Deleted wall"):t==="opening"?(i.openings=i.openings.filter(o=>o.id!==e),s="Deleted opening"):t==="room"?(i.rooms=i.rooms.filter(o=>o.id!==e),s="Deleted room"):t==="furniture"?(i.furniture=i.furniture.filter(o=>o.id!==e),s="Deleted furniture"):t==="entity"&&(i.entities=i.entities.filter(o=>o.id!==e),s="Deleted entity placement");this.floor=i,this.emitSelectionChange({kind:"none",id:null}),this.emitFloorChange(i,s)}handleWheel(t){t.preventDefault();const e=this.getBoundingClientRect(),i=t.clientX-e.left,s=t.clientY-e.top,o=this.screenToWorld(i,s),n=t.deltaY<0?1.15:1/1.15,a=Math.max(20,Math.min(250,this.pixelsPerMeter*n));this.panX=o.x-(i-this.canvasWidth/2)/a,this.panY=o.y-(s-this.canvasHeight/2)/a,this.pixelsPerMeter=a}handleSvgPointerDown(t){if(t.button===1||t.button===2||t.button===0&&this.spaceHeld){t.preventDefault(),this.isPanning=!0,this.panStartScreen={x:t.clientX,y:t.clientY},this.panStartWorld={x:this.panX,y:this.panY};return}if(t.button!==0||!this.floor)return;const i=this.getBoundingClientRect(),s=t.clientX-i.left,o=t.clientY-i.top,n=this.screenToWorld(s,o);this.toolMode==="draw_wall"?this.handleDrawWallClick(n):this.toolMode==="draw_room"?this.handleDrawRoomClick(n):this.toolMode==="add_opening"?this.handleAddOpeningClick():this.toolMode==="measure"?this.handleMeasureClick(n):this.toolMode==="select"&&(this.isItemDragging||this.emitSelectionChange({kind:"none",id:null}))}handleDrawWallClick(t){if(this.floor)if(this.wallDrawStartPoint){const e=this.getSnapResult(t,this.wallDrawStartPoint);if(W(this.wallDrawStartPoint,e.point)<.1)return;let s=e.snappedNodeId,o=[...this.floor.nodes];if(!s){const r={id:"node_"+Math.random().toString(36).substring(2,9),x:Number(e.point.x.toFixed(3)),y:Number(e.point.y.toFixed(3))};o.push(r),s=r.id}if(s===this.wallDrawStartNodeId)return;const n={id:"wall_"+Math.random().toString(36).substring(2,9),start_node_id:this.wallDrawStartNodeId,end_node_id:s,thickness:.15,height_override:null,is_exterior:!1,color_override:null},a={...this.floor,nodes:o,walls:[...this.floor.walls,n]};this.floor=a,this.emitFloorChange(a,"Added wall segment"),this.wallDrawStartNodeId=s,this.wallDrawStartPoint=e.point}else{const e=this.getSnapResult(t);if(e.snappedNodeId)this.wallDrawStartNodeId=e.snappedNodeId,this.wallDrawStartPoint=e.point;else{const i={id:"node_"+Math.random().toString(36).substring(2,9),x:Number(e.point.x.toFixed(3)),y:Number(e.point.y.toFixed(3))},s={...this.floor,nodes:[...this.floor.nodes,i]};this.floor=s,this.wallDrawStartNodeId=i.id,this.wallDrawStartPoint={x:i.x,y:i.y},this.emitFloorChange(s,"Added wall start node")}}}handleDrawRoomClick(t){if(!this.floor)return;const e=this.getSnapResult(t);if(this.roomDrawPoints.length>=3){const i=this.roomDrawPoints[0];if(W(e.point,i)<.35){this.finishRoomPolygon();return}}this.roomDrawPoints=[...this.roomDrawPoints,{x:e.point.x,y:e.point.y,node_id:e.snappedNodeId}]}finishRoomPolygon(){if(!this.floor||this.roomDrawPoints.length<3)return;const t={id:"room_"+Math.random().toString(36).substring(2,9),name:`Room ${this.floor.rooms.length+1}`,ha_area_id:null,points:[...this.roomDrawPoints],floor_material:"wood_oak",floor_color:"#334155",show_label:!0,temp_entity_id:null,humidity_entity_id:null,motion_entity_id:null,room_tap_action:{action:"default"}},e={...this.floor,rooms:[...this.floor.rooms,t]};this.floor=e,this.roomDrawPoints=[],this.emitFloorChange(e,`Created ${t.name}`),this.emitSelectionChange({kind:"room",id:t.id})}updateOpeningHover(t){if(!this.floor)return;const e=new Map(this.floor.nodes.map(n=>[n.id,n]));let i=null,s=null,o=.6;for(const n of this.floor.walls){const a=e.get(n.start_node_id),r=e.get(n.end_node_id);if(!a||!r)continue;const l=U(t,a,r);l.distance<o&&(o=l.distance,i=n,s=l)}i&&s?(this.hoverWallId=i.id,this.hoverWallT=s.t,this.hoverOpeningPoint=s.point):(this.hoverWallId=null,this.hoverOpeningPoint=null)}handleAddOpeningClick(){if(!this.floor||!this.hoverWallId||!this.hoverOpeningPoint)return;const t=this.pendingOpeningType.startsWith("door"),e=t?.9:1.2,i={id:"op_"+Math.random().toString(36).substring(2,9),wall_id:this.hoverWallId,type:this.pendingOpeningType,t:Number(this.hoverWallT.toFixed(3)),width:e,sill_height:t?0:.9,head_height:2.1,swing_direction:"left_in",bound_entity_id:null},s={...this.floor,openings:[...this.floor.openings,i]};this.floor=s,this.emitFloorChange(s,`Added ${this.pendingOpeningType}`),this.emitSelectionChange({kind:"opening",id:i.id})}handleMeasureClick(t){const e=this.getSnapResult(t);!this.measureP1||this.measureLocked?(this.measureP1=e.point,this.measureP2=e.point,this.measureLocked=!1):(this.measureP2=e.point,this.measureLocked=!0)}startNodeDrag(t,e){this.toolMode!=="select"||t.button!==0||(t.stopPropagation(),this.emitSelectionChange({kind:"node",id:e.id}),this.dragKind="node",this.dragItemId=e.id,this.dragStartWorld={x:e.x,y:e.y},this.itemOriginalPos={x:e.x,y:e.y},this.isItemDragging=!0)}startFurnitureDrag(t,e){this.toolMode!=="select"||t.button!==0||(t.stopPropagation(),this.emitSelectionChange({kind:"furniture",id:e.id}),this.dragKind="furniture",this.dragItemId=e.id,this.dragStartWorld=this.cursorWorld,this.itemOriginalPos={x:e.x,y:e.y},this.isItemDragging=!0)}startFurnitureRotate(t,e){this.toolMode!=="select"||t.button!==0||(t.stopPropagation(),this.emitSelectionChange({kind:"furniture",id:e.id}),this.dragKind="furniture_rotate",this.dragItemId=e.id,this.itemOriginalPos={x:e.x,y:e.y},this.itemOriginalAngle=e.rotation_deg,this.isItemDragging=!0)}startEntityDrag(t,e){this.toolMode!=="select"||t.button!==0||(t.stopPropagation(),this.emitSelectionChange({kind:"entity",id:e.id}),this.dragKind="entity",this.dragItemId=e.id,this.dragStartWorld=this.cursorWorld,this.itemOriginalPos={x:e.x,y:e.y},this.isItemDragging=!0)}startOpeningDrag(t,e){this.toolMode!=="select"||t.button!==0||(t.stopPropagation(),this.emitSelectionChange({kind:"opening",id:e.id}),this.dragKind="opening",this.dragItemId=e.id,this.isItemDragging=!0)}handleItemDragMove(t){if(!(!this.floor||!this.dragItemId)){if(this.dragKind==="node"){const e=this.getSnapResult(t,void 0,new Set([this.dragItemId])),i=e.point.x,s=e.point.y,o=this.floor.nodes.map(a=>a.id===this.dragItemId?{...a,x:i,y:s}:a),n=this.floor.rooms.map(a=>({...a,points:a.points.map(r=>r.node_id===this.dragItemId?{...r,x:i,y:s}:r)}));this.floor={...this.floor,nodes:o,rooms:n}}else if(this.dragKind==="furniture"){const e=t.x-this.dragStartWorld.x,i=t.y-this.dragStartWorld.y;let s=this.itemOriginalPos.x+e,o=this.itemOriginalPos.y+i;this.snapToGrid&&this.gridSize>0&&(s=Math.round(s/this.gridSize)*this.gridSize,o=Math.round(o/this.gridSize)*this.gridSize),this.floor={...this.floor,furniture:this.floor.furniture.map(n=>n.id===this.dragItemId?{...n,x:Number(s.toFixed(3)),y:Number(o.toFixed(3))}:n)}}else if(this.dragKind==="furniture_rotate"){const e=this.itemOriginalPos.x,i=this.itemOriginalPos.y;let o=Math.atan2(t.y-i,t.x-e)*180/Math.PI+90;o<0&&(o+=360),o=o%360,this.snapAngleDeg>0&&(o=Math.round(o/this.snapAngleDeg)*this.snapAngleDeg),this.floor={...this.floor,furniture:this.floor.furniture.map(n=>n.id===this.dragItemId?{...n,rotation_deg:o%360}:n)}}else if(this.dragKind==="entity"){const e=t.x-this.dragStartWorld.x,i=t.y-this.dragStartWorld.y;let s=this.itemOriginalPos.x+e,o=this.itemOriginalPos.y+i;this.snapToGrid&&this.gridSize>0&&(s=Math.round(s/this.gridSize)*this.gridSize,o=Math.round(o/this.gridSize)*this.gridSize);const n={x:s,y:o},a=this.floor.rooms.find(r=>X(n,r.points));this.floor={...this.floor,entities:this.floor.entities.map(r=>r.id===this.dragItemId?{...r,x:Number(s.toFixed(3)),y:Number(o.toFixed(3)),room_id:a?a.id:null}:r)}}else if(this.dragKind==="opening"){const e=this.floor.openings.find(p=>p.id===this.dragItemId);if(!e)return;const i=this.floor.walls.find(p=>p.id===e.wall_id);if(!i)return;const s=new Map(this.floor.nodes.map(p=>[p.id,p])),o=s.get(i.start_node_id),n=s.get(i.end_node_id);if(!o||!n)return;const a=U(t,o,n),r=W(o,n),l=e.width/2/Math.max(.1,r),g=Math.max(l,Math.min(1-l,a.t));this.floor={...this.floor,openings:this.floor.openings.map(p=>p.id===this.dragItemId?{...p,t:Number(g.toFixed(3))}:p)}}}}handleDragOver(t){t.dataTransfer?.types.includes("application/x-floorplan-palette")&&(t.preventDefault(),t.dataTransfer.dropEffect="copy")}handleDrop(t){if(t.preventDefault(),!this.floor)return;const e=t.dataTransfer?.getData("application/x-floorplan-palette");if(!e)return;let i;try{i=JSON.parse(e)}catch{return}const s=this.getBoundingClientRect(),o=this.screenToWorld(t.clientX-s.left,t.clientY-s.top),a=this.getSnapResult(o).point;if(i.kind==="entity"){const r=i.domain||(i.entityId?i.entityId.split(".")[0]:"switch"),l=this.floor.rooms.find(y=>X(a,y.points));let g=1.2,p="none",w;r==="light"?(g=2.4,p="ceiling_light",w={kind:"point",radius_m:4.5,intensity_multiplier:1,cast_real_point_light:!0}):r==="media_player"?(g=.8,p="tv_screen"):r==="fan"?(g=2.4,p="ceiling_fan"):r==="climate"&&(g=1.5,p="thermostat");const b={id:"ent_"+Math.random().toString(36).substring(2,9),entity_id:i.entityId||"light.new_entity",domain:r,room_id:l?l.id:null,x:Number(a.x.toFixed(3)),y:Number(a.y.toFixed(3)),z_elevation:g,rotation_deg:0,light_config:w,mesh_type:p,mesh_scale:[1,1,1],badge:{visible:!0,style:"compact_pill",label_override:i.label||null,icon_override:null},tap_action:{action:"toggle"},hold_action:{action:"more-info"},double_tap_action:{action:"none"}},D={...this.floor,entities:[...this.floor.entities,b]};this.floor=D,this.emitFloorChange(D,`Placed entity ${b.entity_id}`),this.emitSelectionChange({kind:"entity",id:b.id})}else if(i.kind==="furniture"){const r=i.furnitureType||"chair",l=this.getDefaultFurnitureDimensions(r),g={id:"furn_"+Math.random().toString(36).substring(2,9),catalog_type:r,label:i.label||this.formatFurnitureName(r),x:Number(a.x.toFixed(3)),y:Number(a.y.toFixed(3)),z_elevation:0,width:i.defaultWidth??l.width,depth:i.defaultDepth??l.depth,height:i.defaultHeight??l.height,rotation_deg:0,color:null},p={...this.floor,furniture:[...this.floor.furniture,g]};this.floor=p,this.emitFloorChange(p,`Placed furniture ${g.label}`),this.emitSelectionChange({kind:"furniture",id:g.id})}else if(i.kind==="opening"){const r=new Map(this.floor.nodes.map(w=>[w.id,w]));let l=null,g=null,p=.8;for(const w of this.floor.walls){const b=r.get(w.start_node_id),D=r.get(w.end_node_id);if(!b||!D)continue;const y=U(a,b,D);y.distance<p&&(p=y.distance,l=w,g=y)}if(l&&g){const w=i.openingType||"door_single",b=w.startsWith("door"),D={id:"op_"+Math.random().toString(36).substring(2,9),wall_id:l.id,type:w,t:Number(g.t.toFixed(3)),width:b?.9:1.2,sill_height:b?0:.9,head_height:2.1,swing_direction:"left_in",bound_entity_id:null},y={...this.floor,openings:[...this.floor.openings,D]};this.floor=y,this.emitFloorChange(y,`Placed opening ${w}`),this.emitSelectionChange({kind:"opening",id:D.id})}}}getDefaultFurnitureDimensions(t){switch(t){case"sofa_straight":return{width:2,depth:.9,height:.85};case"sofa_l_shape":return{width:2.4,depth:1.8,height:.85};case"bed_double":return{width:1.8,depth:2,height:.9};case"bed_single":return{width:1,depth:2,height:.9};case"dining_table":return{width:1.6,depth:.9,height:.75};case"desk":return{width:1.4,depth:.7,height:.75};case"chair":return{width:.5,depth:.5,height:.85};case"tv_stand":return{width:1.8,depth:.45,height:.5};case"kitchen_counter":return{width:1.8,depth:.65,height:.9};case"refrigerator":return{width:.8,depth:.7,height:1.8};case"stove":return{width:.7,depth:.65,height:.9};case"sink_cabinet":return{width:1,depth:.65,height:.9};case"bathtub":return{width:1.7,depth:.75,height:.55};case"shower_enclosure":return{width:1,depth:1,height:2};case"toilet":return{width:.5,depth:.7,height:.8};case"wardrobe":return{width:1.5,depth:.6,height:2.1};case"bookcase":return{width:1,depth:.35,height:2};case"potted_plant":return{width:.5,depth:.5,height:.9};case"rug":return{width:2,depth:1.5,height:.02};default:return{width:1,depth:1,height:1}}}formatFurnitureName(t){return t.replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase())}renderGrid(){const t=this.screenToWorld(0,0),e=this.screenToWorld(this.canvasWidth,this.canvasHeight),i=Math.floor(t.x),s=Math.ceil(e.x),o=Math.floor(t.y),n=Math.ceil(e.y),a=[];if(this.pixelsPerMeter>45&&this.gridSize>=.05){const r=this.gridSize,l=Math.floor(t.x/r)*r,g=Math.ceil(e.x/r)*r,p=Math.floor(t.y/r)*r,w=Math.ceil(e.y/r)*r;for(let b=l;b<=g;b+=r)Math.abs(b-Math.round(b))>1e-4&&a.push(v`
            <line
              x1="${this.sx(b)}" y1="0" x2="${this.sx(b)}" y2="${this.canvasHeight}"
              stroke="#1e293b" stroke-width="0.5" stroke-opacity="0.5"
            />
          `);for(let b=p;b<=w;b+=r)Math.abs(b-Math.round(b))>1e-4&&a.push(v`
            <line
              x1="0" y1="${this.sy(b)}" x2="${this.canvasWidth}" y2="${this.sy(b)}"
              stroke="#1e293b" stroke-width="0.5" stroke-opacity="0.5"
            />
          `)}for(let r=i;r<=s;r++){const l=Math.abs(r)<1e-4;a.push(v`
        <line
          x1="${this.sx(r)}" y1="0" x2="${this.sx(r)}" y2="${this.canvasHeight}"
          stroke="${l?"#475569":"#334155"}"
          stroke-width="${l?1.5:.8}"
          stroke-opacity="${l?.8:.4}"
        />
      `)}for(let r=o;r<=n;r++){const l=Math.abs(r)<1e-4;a.push(v`
        <line
          x1="0" y1="${this.sy(r)}" x2="${this.canvasWidth}" y2="${this.sy(r)}"
          stroke="${l?"#475569":"#334155"}"
          stroke-width="${l?1.5:.8}"
          stroke-opacity="${l?.8:.4}"
        />
      `)}return a}renderBlueprint(){if(!this.floor?.blueprint?.image_url)return f;const t=this.floor.blueprint,e=t.natural_width_px*t.meters_per_pixel*this.pixelsPerMeter,i=t.natural_height_px*t.meters_per_pixel*this.pixelsPerMeter,s=this.sx(t.offset_x),o=this.sy(t.offset_y);return v`
      <g
        transform="rotate(${t.rotation_deg}, ${s+e/2}, ${o+i/2})"
        opacity="${t.opacity}"
        style="pointer-events: none;"
      >
        <image
          href="${t.image_url}"
          x="${s}"
          y="${o}"
          width="${e}"
          height="${i}"
        />
      </g>
    `}renderGhostFloor(){if(!this.ghostFloor)return f;const t=this.ghostFloor,e=new Map(t.nodes.map(i=>[i.id,i]));return v`
      <g class="ghost-layer">
        <!-- Ghost Rooms -->
        ${t.rooms.map(i=>{if(!i.points||i.points.length<3)return f;const s=i.points.map(o=>`${this.sx(o.x)},${this.sy(o.y)}`).join(" ");return v`
            <polygon
              points="${s}"
              fill="rgba(56, 189, 248, 0.05)"
              stroke="#38bdf8"
              stroke-width="1.5"
              stroke-dasharray="4,4"
            />
          `})}
        <!-- Ghost Walls -->
        ${t.walls.map(i=>{const s=e.get(i.start_node_id),o=e.get(i.end_node_id);return!s||!o?f:v`
            <line
              x1="${this.sx(s.x)}" y1="${this.sy(s.y)}"
              x2="${this.sx(o.x)}" y2="${this.sy(o.y)}"
              stroke="#38bdf8"
              stroke-width="${Math.max(2,i.thickness*this.pixelsPerMeter)}"
              stroke-dasharray="4,4"
            />
          `})}
      </g>
    `}renderRooms(){return this.floor?this.floor.rooms.map(t=>{if(!t.points||t.points.length<3)return f;const e=t.points.map(a=>`${this.sx(a.x)},${this.sy(a.y)}`).join(" "),i=this.selection.kind==="room"&&this.selection.id===t.id;let s=0,o=0,n="";if(t.show_label){const a=tt(t.points);s=this.sx(a.x),o=this.sy(a.y),n=`${et(t.points).toFixed(1)} m²`}return v`
        <g class="room-group">
          <polygon
            class="room-polygon"
            points="${e}"
            fill="${t.floor_color||"#334155"}"
            fill-opacity="${i?.5:.3}"
            stroke="${i?"#38bdf8":"#475569"}"
            stroke-width="${i?2.5:1}"
            @pointerdown="${a=>{this.toolMode==="select"&&a.button===0&&(a.stopPropagation(),this.emitSelectionChange({kind:"room",id:t.id}))}}"
          />
          ${t.show_label?v`
                <text
                  x="${s}"
                  y="${o-6}"
                  fill="#f8fafc"
                  font-size="12"
                  font-weight="600"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${t.name}
                </text>
                <text
                  x="${s}"
                  y="${o+10}"
                  fill="#94a3b8"
                  font-size="10"
                  font-weight="500"
                  text-anchor="middle"
                  style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
                >
                  ${n}
                </text>
              `:f}
        </g>
      `}):f}renderWalls(t){if(!this.floor)return f;const e=new Map(this.floor.nodes.map(i=>[i.id,i]));return this.floor.walls.map(i=>{const s=this.selection.kind==="wall"&&this.selection.id===i.id,o=t.get(i.id),n=e.get(i.start_node_id),a=e.get(i.end_node_id);if(!n||!a)return f;let r="";if(o)r=o.quad.map(x=>`${this.sx(x.x)},${this.sy(x.y)}`).join(" ");else{const x=W(n,a);if(x<1e-4)return f;const G=(a.x-n.x)/x,H=(a.y-n.y)/x,L=i.thickness/2,M=-H*L,T=G*L;r=[`${this.sx(n.x+M)},${this.sy(n.y+T)}`,`${this.sx(a.x+M)},${this.sy(a.y+T)}`,`${this.sx(a.x-M)},${this.sy(a.y-T)}`,`${this.sx(n.x-M)},${this.sy(n.y-T)}`].join(" ")}const l=W(n,a),g=(n.x+a.x)/2,p=(n.y+a.y)/2,w=o?o.normal:{x:-(a.y-n.y)/l,y:(a.x-n.x)/l},b=.22,D=this.sx(g+w.x*b),y=this.sy(p+w.y*b);return v`
        <g class="wall-group">
          <polygon
            class="wall-footprint"
            points="${r}"
            fill="${i.color_override||(s?"#0284c7":"#475569")}"
            stroke="${s?"#38bdf8":"#334155"}"
            stroke-width="${s?2:1}"
            @pointerdown="${x=>{this.toolMode==="select"&&x.button===0&&(x.stopPropagation(),this.emitSelectionChange({kind:"wall",id:i.id}))}}"
          />
          ${l>.6?v`
                <text
                  class="dimension-label"
                  x="${D}"
                  y="${y}"
                >
                  ${l.toFixed(2)} m
                </text>
              `:f}
        </g>
      `})}renderOpenings(){if(!this.floor)return f;const t=new Map(this.floor.nodes.map(i=>[i.id,i])),e=new Map(this.floor.walls.map(i=>[i.id,i]));return this.floor.openings.map(i=>{const s=e.get(i.wall_id);if(!s)return f;const o=t.get(s.start_node_id),n=t.get(s.end_node_id);if(!o||!n)return f;const a=W(o,n);if(a<1e-4)return f;const r=(n.x-o.x)/a,l=(n.y-o.y)/a,g=-l,p=r,w=o.x+i.t*(n.x-o.x),b=o.y+i.t*(n.y-o.y),D=i.width/2,y={x:w-D*r,y:b-D*l},x={x:w+D*r,y:b+D*l},H=this.selection.kind==="opening"&&this.selection.id===i.id?"#38bdf8":"#94a3b8",L=i.type.startsWith("door"),M=i.swing_direction.startsWith("left"),T=i.swing_direction.endsWith("out"),A=M?y:x,j=M?x:y,Y=T?-1:1,N={x:A.x+Y*i.width*g,y:A.y+Y*i.width*p},K=i.width*this.pixelsPerMeter,J=M&&!T||!M&&T?1:0;return v`
        <g
          class="opening-item"
          @pointerdown="${V=>this.startOpeningDrag(V,i)}"
        >
          <!-- Transparent clickable hit box -->
          <line
            x1="${this.sx(y.x)}" y1="${this.sy(y.y)}"
            x2="${this.sx(x.x)}" y2="${this.sy(x.y)}"
            stroke="transparent"
            stroke-width="24"
          />

          <!-- Wall cutout line -->
          <line
            x1="${this.sx(y.x)}" y1="${this.sy(y.y)}"
            x2="${this.sx(x.x)}" y2="${this.sy(x.y)}"
            stroke="#0f172a"
            stroke-width="${Math.max(3,s.thickness*this.pixelsPerMeter)}"
          />

          ${L?v`
                <!-- Door Leaf -->
                <line
                  x1="${this.sx(A.x)}" y1="${this.sy(A.y)}"
                  x2="${this.sx(N.x)}" y2="${this.sy(N.y)}"
                  stroke="${H}"
                  stroke-width="2.5"
                />
                <!-- Door Swing Arc -->
                <path
                  d="M ${this.sx(j.x)} ${this.sy(j.y)} A ${K} ${K} 0 0 ${J} ${this.sx(N.x)} ${this.sy(N.y)}"
                  fill="none"
                  stroke="${H}"
                  stroke-width="1.2"
                  stroke-dasharray="3,3"
                />
              `:v`
                <!-- Window Double Line -->
                <line
                  x1="${this.sx(y.x)}" y1="${this.sy(y.y)}"
                  x2="${this.sx(x.x)}" y2="${this.sy(x.y)}"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                />
                <line
                  x1="${this.sx(y.x+g*(s.thickness/2))}" y1="${this.sy(y.y+p*(s.thickness/2))}"
                  x2="${this.sx(x.x+g*(s.thickness/2))}" y2="${this.sy(x.y+p*(s.thickness/2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
                <line
                  x1="${this.sx(y.x-g*(s.thickness/2))}" y1="${this.sy(y.y-p*(s.thickness/2))}"
                  x2="${this.sx(x.x-g*(s.thickness/2))}" y2="${this.sy(x.y-p*(s.thickness/2))}"
                  stroke="#64748b"
                  stroke-width="1"
                />
              `}
        </g>
      `})}renderWallNodes(){return this.floor?this.floor.nodes.map(t=>{const e=this.selection.kind==="node"&&this.selection.id===t.id,i=this.sx(t.x),s=this.sy(t.y);return v`
        <g
          class="wall-node"
          transform="translate(${i}, ${s})"
          @pointerdown="${o=>this.startNodeDrag(o,t)}"
        >
          ${e?v`
                <circle r="12" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2" />
              `:f}
          <circle
            r="${e?7:5}"
            fill="${e?"#38bdf8":"#94a3b8"}"
            stroke="#0f172a"
            stroke-width="1.5"
          />
        </g>
      `}):f}renderFurniture(){return this.floor?this.floor.furniture.map(t=>{const e=this.selection.kind==="furniture"&&this.selection.id===t.id,i=t.width*this.pixelsPerMeter,s=t.depth*this.pixelsPerMeter,o=e?"#38bdf8":"#64748b",n=s/2+20;return v`
        <g
          class="furniture-item"
          transform="translate(${this.sx(t.x)}, ${this.sy(t.y)}) rotate(${t.rotation_deg})"
          @pointerdown="${a=>this.startFurnitureDrag(a,t)}"
        >
          <!-- Main Bounding Box -->
          <rect
            x="${-i/2}"
            y="${-s/2}"
            width="${i}"
            height="${s}"
            rx="4"
            fill="${e?"#1e293b":"#0f172a"}"
            fill-opacity="0.85"
            stroke="${o}"
            stroke-width="${e?2:1}"
          />

          <!-- Facing Indicator Notch -->
          <path
            d="M ${-i*.25} ${-s/2} L 0 ${-s/2+6} L ${i*.25} ${-s/2}"
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
            ${t.label}
          </text>

          <!-- Interactive Rotation Handle (When Selected) -->
          ${e?v`
                <line
                  x1="0" y1="${-s/2}"
                  x2="0" y2="${-n}"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-dasharray="3,2"
                />
                <circle
                  class="rotation-handle"
                  cx="0"
                  cy="${-n}"
                  r="6"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  stroke-width="2"
                  @pointerdown="${a=>this.startFurnitureRotate(a,t)}"
                />
              `:f}
        </g>
      `}):f}renderEntities(){return this.floor?this.floor.entities.map(t=>{const e=this.selection.kind==="entity"&&this.selection.id===t.id,i=this.sx(t.x),s=this.sy(t.y);let o="#3b82f6",n="🔘";switch(t.domain){case"light":o="#eab308",n="💡";break;case"media_player":o="#8b5cf6",n="📺";break;case"fan":o="#14b8a6",n="🌀";break;case"climate":o="#06b6d4",n="❄️";break;case"binary_sensor":case"sensor":o="#10b981",n="📊";break}return v`
        <g
          class="entity-item"
          transform="translate(${i}, ${s})"
          @pointerdown="${a=>this.startEntityDrag(a,t)}"
        >
          <!-- Light Falloff Circle Preview when selected -->
          ${e&&t.light_config&&t.light_config.radius_m?v`
                <circle
                  r="${t.light_config.radius_m*this.pixelsPerMeter}"
                  fill="rgba(253, 224, 71, 0.08)"
                  stroke="#facc15"
                  stroke-width="1.5"
                  stroke-dasharray="5,4"
                  style="pointer-events: none;"
                />
              `:f}

          <!-- Outer Selection Ring -->
          ${e?v`
                <circle r="18" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,2" />
              `:f}

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
            ${n}
          </text>
        </g>
      `}):f}renderActiveToolPreviews(){const t=[];if(this.toolMode==="draw_wall"&&this.wallDrawStartPoint){const e=this.wallDrawStartPoint,i=this.snappedCursor,s=W(e,i),o={x:(e.x+i.x)/2,y:(e.y+i.y)/2};t.push(v`
        <g class="tool-preview">
          <line
            x1="${this.sx(e.x)}" y1="${this.sy(e.y)}"
            x2="${this.sx(i.x)}" y2="${this.sy(i.y)}"
            stroke="#38bdf8"
            stroke-width="2.5"
            stroke-dasharray="4,4"
          />
          <circle cx="${this.sx(e.x)}" cy="${this.sy(e.y)}" r="5" fill="#38bdf8" />
          <circle cx="${this.sx(i.x)}" cy="${this.sy(i.y)}" r="5" fill="#38bdf8" />
          <text
            x="${this.sx(o.x)}"
            y="${this.sy(o.y)-10}"
            class="dimension-label"
            fill="#38bdf8"
          >
            ${s.toFixed(2)} m
          </text>
        </g>
      `)}if(this.toolMode==="draw_room"&&this.roomDrawPoints.length>0){const i=[...this.roomDrawPoints,{x:this.snappedCursor.x,y:this.snappedCursor.y}].map(s=>`${this.sx(s.x)},${this.sy(s.y)}`).join(" ");t.push(v`
        <g class="tool-preview">
          <polygon
            points="${i}"
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            stroke-width="2"
            stroke-dasharray="4,4"
          />
          ${this.roomDrawPoints.map((s,o)=>v`
              <circle
                cx="${this.sx(s.x)}" cy="${this.sy(s.y)}"
                r="${o===0?7:4}"
                fill="${o===0?"#10b981":"#38bdf8"}"
                stroke="#ffffff"
                stroke-width="1.5"
              />
            `)}
        </g>
      `)}if(this.toolMode==="add_opening"&&this.hoverOpeningPoint&&t.push(v`
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
      `),this.toolMode==="measure"&&this.measureP1&&this.measureP2){const e=this.measureP1,i=this.measureP2,s=W(e,i),o={x:(e.x+i.x)/2,y:(e.y+i.y)/2};t.push(v`
        <g class="tool-preview">
          <line
            x1="${this.sx(e.x)}" y1="${this.sy(e.y)}"
            x2="${this.sx(i.x)}" y2="${this.sy(i.y)}"
            stroke="#f59e0b"
            stroke-width="2"
            stroke-dasharray="4,2"
          />
          <circle cx="${this.sx(e.x)}" cy="${this.sy(e.y)}" r="4" fill="#f59e0b" />
          <circle cx="${this.sx(i.x)}" cy="${this.sy(i.y)}" r="4" fill="#f59e0b" />
          <rect
            x="${this.sx(o.x)-40}"
            y="${this.sy(o.y)-24}"
            width="80"
            height="20"
            rx="4"
            fill="#0f172a"
            stroke="#f59e0b"
            stroke-width="1"
          />
          <text
            x="${this.sx(o.x)}"
            y="${this.sy(o.y)-10}"
            fill="#f59e0b"
            font-size="11"
            font-weight="bold"
            text-anchor="middle"
          >
            ${s.toFixed(2)} m
          </text>
        </g>
      `)}return t}render(){const t=this.isPanning?"cursor-panning":this.spaceHeld?"cursor-grab":this.toolMode==="select"?"cursor-select":"",e=this.floor?it(this.floor.nodes,this.floor.walls,this.floor.rooms):new Map;let i=1;this.pixelsPerMeter<35?i=5:this.pixelsPerMeter<70&&(i=2);const s=i*this.pixelsPerMeter;return d`
      <div
        class="canvas-container"
        style="width: 100%; height: 100%; position: relative;"
        @wheel="${this.handleWheel}"
        @dragover="${this.handleDragOver}"
        @drop="${this.handleDrop}"
        @contextmenu="${o=>o.preventDefault()}"
      >
        <svg
          class="canvas-svg ${t}"
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
            ${this.renderWalls(e)}
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

        <!-- Metric Scale & Coordinates HUD Overlay -->
        <div class="hud-overlay">
          <div class="hud-scale-bar">
            <span>${i} m</span>
            <div class="scale-ruler" style="width: ${s}px;"></div>
          </div>
          <div class="hud-coords">
            <span>X: <strong>${this.cursorWorld.x.toFixed(2)} m</strong></span>
            <span>Y: <strong>${this.cursorWorld.y.toFixed(2)} m</strong></span>
            <span>Snap: <strong>${this.snapToGrid?`${this.gridSize}m`:"Off"}</strong></span>
          </div>
        </div>

        <!-- Tool Mode Badge -->
        <div class="hud-tool-badge">
          <span>Tool: <strong>${this.toolMode.toUpperCase()}</strong></span>
        </div>
      </div>
    `}};u.styles=E`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0b0f19;
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

    .wall-footprint {
      cursor: pointer;
      transition: fill 0.15s, stroke 0.15s;
    }

    .wall-node {
      cursor: move;
      transition: transform 0.15s;
    }

    .wall-node:hover {
      transform: scale(1.25);
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
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .scale-ruler {
      height: 4px;
      border: 1px solid #38bdf8;
      border-top: none;
      background: rgba(56, 189, 248, 0.2);
      margin-top: 2px;
    }

    .hud-coords {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.75rem;
      display: flex;
      gap: 0.75rem;
    }

    .hud-coords strong {
      color: #f8fafc;
    }

    .hud-tool-badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #334155;
      color: #38bdf8;
      font-size: 0.8125rem;
      font-weight: 600;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dimension-label {
      font-size: 10px;
      font-weight: 600;
      fill: #cbd5e1;
      text-anchor: middle;
      pointer-events: none;
      user-select: none;
    }
  `;m([h({attribute:!1})],u.prototype,"floor",2);m([h({attribute:!1})],u.prototype,"ghostFloor",2);m([h({type:String})],u.prototype,"toolMode",2);m([h({attribute:!1})],u.prototype,"selection",2);m([h({type:Number})],u.prototype,"gridSize",2);m([h({type:Boolean})],u.prototype,"snapToGrid",2);m([h({type:Number})],u.prototype,"snapAngleDeg",2);m([h({type:String})],u.prototype,"pendingOpeningType",2);m([c()],u.prototype,"pixelsPerMeter",2);m([c()],u.prototype,"panX",2);m([c()],u.prototype,"panY",2);m([c()],u.prototype,"canvasWidth",2);m([c()],u.prototype,"canvasHeight",2);m([c()],u.prototype,"isPanning",2);m([c()],u.prototype,"panStartScreen",2);m([c()],u.prototype,"panStartWorld",2);m([c()],u.prototype,"spaceHeld",2);m([c()],u.prototype,"cursorWorld",2);m([c()],u.prototype,"snappedCursor",2);m([c()],u.prototype,"wallDrawStartNodeId",2);m([c()],u.prototype,"wallDrawStartPoint",2);m([c()],u.prototype,"roomDrawPoints",2);m([c()],u.prototype,"hoverWallId",2);m([c()],u.prototype,"hoverWallT",2);m([c()],u.prototype,"hoverOpeningPoint",2);m([c()],u.prototype,"measureP1",2);m([c()],u.prototype,"measureP2",2);m([c()],u.prototype,"measureLocked",2);u=m([B("floorplan-canvas-2d")],u);var ct=Object.defineProperty,ht=Object.getOwnPropertyDescriptor,S=(t,e,i,s)=>{for(var o=s>1?void 0:s?ht(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&ct(e,i,o),o};let _=class extends R{constructor(){super(...arguments),this.open=!1,this.floorplanId="",this.floorId="",this.currentBlueprint=null,this.imageUrl="",this.imageMimeType="image/png",this.naturalWidth=0,this.naturalHeight=0,this.p1=null,this.p2=null,this.realDistanceMeters=5,this.opacity=.5,this.isUploading=!1,this.errorMessage=null}updated(t){t.has("open")&&this.open&&this.currentBlueprint&&!this.imageUrl&&(this.imageUrl=this.currentBlueprint.image_url,this.naturalWidth=this.currentBlueprint.natural_width_px,this.naturalHeight=this.currentBlueprint.natural_height_px,this.opacity=this.currentBlueprint.opacity,this.errorMessage=null),t.has("currentBlueprint")&&this.currentBlueprint&&this.open&&(this.imageUrl=this.currentBlueprint.image_url,this.naturalWidth=this.currentBlueprint.natural_width_px,this.naturalHeight=this.currentBlueprint.natural_height_px,this.opacity=this.currentBlueprint.opacity)}handleFileChange(t){const e=t.target;if(!e.files||e.files.length===0)return;const i=e.files[0];this.imageMimeType=i.type||"image/png",this.errorMessage=null;const s=new FileReader;s.onload=o=>{const n=o.target?.result;this.loadNewImage(n,this.imageMimeType)},s.onerror=()=>{this.errorMessage="Failed to read selected image file."},s.readAsDataURL(i)}loadNewImage(t,e){this.imageUrl=t,this.imageMimeType=e,this.p1=null,this.p2=null;const i=new Image;i.onload=()=>{this.naturalWidth=i.naturalWidth||i.width,this.naturalHeight=i.naturalHeight||i.height,this.requestUpdate()},i.onerror=()=>{this.errorMessage="Failed to load image preview."},i.src=t}handleSvgClick(t){if(!this.naturalWidth||!this.naturalHeight)return;const i=t.currentTarget.getBoundingClientRect();if(i.width<=0||i.height<=0)return;const s=t.clientX-i.left,o=t.clientY-i.top,n=Math.max(0,Math.min(this.naturalWidth,s/i.width*this.naturalWidth)),a=Math.max(0,Math.min(this.naturalHeight,o/i.height*this.naturalHeight)),r={x:Number(n.toFixed(2)),y:Number(a.toFixed(2))};this.p1?this.p2?(this.p1=r,this.p2=null):this.p2=r:this.p1=r}handleResetPoints(){this.p1=null,this.p2=null}get computedPixelDistance(){return!this.p1||!this.p2?0:Math.hypot(this.p2.x-this.p1.x,this.p2.y-this.p1.y)}get computedMetersPerPixel(){return!this.p1||!this.p2||this.realDistanceMeters<=0?this.currentBlueprint?.meters_per_pixel??.01:ot(this.p1,this.p2,this.realDistanceMeters)}async handleApply(){if(!this.imageUrl){this.errorMessage="Please select a blueprint image.";return}if(!this.p1||!this.p2){this.errorMessage="Please click two reference points on the blueprint to calibrate distance.";return}if(this.realDistanceMeters<=0){this.errorMessage="Known distance must be greater than 0 meters.";return}this.isUploading=!0,this.errorMessage=null;try{let t=this.imageUrl;if(this.uploadCallback){let s=this.imageMimeType,o=this.imageUrl;if(this.imageUrl.startsWith("data:")){const n=this.imageUrl.split(","),a=n[0].match(/:(.*?);/);a&&(s=a[1]),o=n[1]||""}t=await this.uploadCallback({floorplanId:this.floorplanId,floorId:this.floorId,mimeType:s,dataBase64:o})}const e=this.computedMetersPerPixel,i={imageUrl:t,naturalWidthPx:this.naturalWidth,naturalHeightPx:this.naturalHeight,metersPerPixel:e,opacity:this.opacity};this.dispatchEvent(new CustomEvent("blueprint-calibrated",{detail:i,bubbles:!0,composed:!0})),this.handleClose()}catch(t){this.errorMessage=t?.message||"Failed to apply and upload blueprint."}finally{this.isUploading=!1}}handleClose(){this.dispatchEvent(new CustomEvent("modal-close",{bubbles:!0,composed:!0}))}renderCalibrationOverlay(){if(!this.naturalWidth||!this.naturalHeight)return f;const t=Math.max(10,Math.min(this.naturalWidth,this.naturalHeight)*.015),e=Math.max(2,t*.2),i=Math.max(12,t*1.1);return d`
      ${this.p1&&this.p2?d`
            <line
              x1="${this.p1.x}"
              y1="${this.p1.y}"
              x2="${this.p2.x}"
              y2="${this.p2.y}"
              stroke="#f59e0b"
              stroke-width="${e}"
              stroke-dasharray="${e*3},${e*2}"
            />
            <rect
              x="${(this.p1.x+this.p2.x)/2-t*3}"
              y="${(this.p1.y+this.p2.y)/2-t*1.2}"
              width="${t*6}"
              height="${t*2.2}"
              rx="${t*.4}"
              fill="#0f172a"
              fill-opacity="0.85"
              stroke="#f59e0b"
              stroke-width="${e*.7}"
            />
            <text
              x="${(this.p1.x+this.p2.x)/2}"
              y="${(this.p1.y+this.p2.y)/2+t*.35}"
              fill="#fbbf24"
              font-size="${i*.9}"
              font-weight="bold"
              text-anchor="middle"
            >
              ${this.realDistanceMeters.toFixed(2)} m
            </text>
          `:f}
      ${this.p1?d`
            <g class="crosshair-marker">
              <line
                x1="${this.p1.x-t*1.5}"
                y1="${this.p1.y}"
                x2="${this.p1.x+t*1.5}"
                y2="${this.p1.y}"
                stroke="#38bdf8"
                stroke-width="${e}"
              />
              <line
                x1="${this.p1.x}"
                y1="${this.p1.y-t*1.5}"
                x2="${this.p1.x}"
                y2="${this.p1.y+t*1.5}"
                stroke="#38bdf8"
                stroke-width="${e}"
              />
              <circle
                cx="${this.p1.x}"
                cy="${this.p1.y}"
                r="${t}"
                fill="#0284c7"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${e}"
              />
              <text
                x="${this.p1.x}"
                y="${this.p1.y+i*.35}"
                fill="#ffffff"
                font-size="${i}"
                font-weight="bold"
                text-anchor="middle"
              >
                1
              </text>
            </g>
          `:f}
      ${this.p2?d`
            <g class="crosshair-marker">
              <line
                x1="${this.p2.x-t*1.5}"
                y1="${this.p2.y}"
                x2="${this.p2.x+t*1.5}"
                y2="${this.p2.y}"
                stroke="#10b981"
                stroke-width="${e}"
              />
              <line
                x1="${this.p2.x}"
                y1="${this.p2.y-t*1.5}"
                x2="${this.p2.x}"
                y2="${this.p2.y+t*1.5}"
                stroke="#10b981"
                stroke-width="${e}"
              />
              <circle
                cx="${this.p2.x}"
                cy="${this.p2.y}"
                r="${t}"
                fill="#059669"
                fill-opacity="0.8"
                stroke="#ffffff"
                stroke-width="${e}"
              />
              <text
                x="${this.p2.x}"
                y="${this.p2.y+i*.35}"
                fill="#ffffff"
                font-size="${i}"
                font-weight="bold"
                text-anchor="middle"
              >
                2
              </text>
            </g>
          `:f}
    `}render(){if(!this.open)return f;const t=this.computedMetersPerPixel,e=t>0?1/t:0;return d`
      <div class="modal-backdrop" @click="${i=>{i.target===i.currentTarget&&this.handleClose()}}">
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
              <strong>Interactive 2-Point Calibration:</strong> Select a blueprint image, click two distinct reference points
              along a wall or landmark with known length (Point 1 and Point 2), enter the real-world distance in meters, and click Apply.
            </div>

            ${this.errorMessage?d`<div class="error-banner">${this.errorMessage}</div>`:f}

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
                    @click="${()=>this.shadowRoot?.getElementById("blueprint-file-input")?.click()}"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Choose Image...
                  </button>
                  ${this.p1||this.p2?d`
                        <button class="btn btn-secondary" @click="${this.handleResetPoints}">
                          Reset Points
                        </button>
                      `:f}
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
                  @input="${i=>{const s=parseFloat(i.target.value);isNaN(s)||(this.realDistanceMeters=s)}}"
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
                  @input="${i=>{this.opacity=parseFloat(i.target.value)}}"
                />
              </div>
            </div>

            <div class="preview-container ${this.imageUrl?"has-image":""}">
              ${this.imageUrl&&this.naturalWidth>0?d`
                    <svg
                      class="blueprint-svg"
                      viewBox="0 0 ${this.naturalWidth} ${this.naturalHeight}"
                      @click="${this.handleSvgClick}"
                    >
                      <image
                        href="${this.imageUrl}"
                        width="${this.naturalWidth}"
                        height="${this.naturalHeight}"
                      />
                      ${this.renderCalibrationOverlay()}
                    </svg>
                  `:d`
                    <div style="color: #64748b; text-align: center; padding: 2rem;">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <div>No blueprint selected. Click "Choose Image..." to get started.</div>
                    </div>
                  `}
            </div>

            ${this.imageUrl?d`
                  <div class="stats-bar">
                    <div class="stats-item">
                      Resolution: <strong>${this.naturalWidth} × ${this.naturalHeight} px</strong>
                    </div>
                    <div class="stats-item">
                      Point 1: <strong>${this.p1?`(${this.p1.x}, ${this.p1.y})`:"Not set"}</strong>
                    </div>
                    <div class="stats-item">
                      Point 2: <strong>${this.p2?`(${this.p2.x}, ${this.p2.y})`:"Not set"}</strong>
                    </div>
                    <div class="stats-item">
                      Pixel Distance: <strong>${this.computedPixelDistance.toFixed(1)} px</strong>
                    </div>
                    <div class="stats-item">
                      Calculated Scale: <strong>${e.toFixed(1)} px/m (${(t*100).toFixed(2)} cm/px)</strong>
                    </div>
                  </div>
                `:f}
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
              ${this.isUploading?"Uploading & Applying...":"Apply & Upload Blueprint"}
            </button>
          </div>
        </div>
      </div>
    `}};_.styles=E`
    :host {
      display: block;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      box-sizing: border-box;
    }

    .modal-dialog {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 960px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      color: #f8fafc;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: color 0.15s, background-color 0.15s;
    }

    .close-btn:hover {
      color: #f8fafc;
      background: #334155;
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
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    .instructions-card strong {
      color: #38bdf8;
    }

    .control-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      background: #0f172a;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #334155;
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
      color: #94a3b8;
    }

    .form-input {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      color: #f8fafc;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus {
      border-color: #38bdf8;
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
      background: #334155;
      color: #f8fafc;
      border-color: #475569;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #475569;
    }

    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }

    .preview-container {
      position: relative;
      background: #090d16;
      border: 2px dashed #334155;
      border-radius: 8px;
      min-height: 340px;
      max-height: 50vh;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .preview-container.has-image {
      border-style: solid;
      border-color: #475569;
      cursor: crosshair;
    }

    .blueprint-svg {
      display: block;
      max-width: 100%;
      height: auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    .stats-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      background: #0f172a;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      border: 1px solid #334155;
      font-size: 0.8125rem;
      color: #94a3b8;
    }

    .stats-item strong {
      color: #f8fafc;
    }

    .error-banner {
      background: #7f1d1d;
      border: 1px solid #dc2626;
      color: #fecaca;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #0f172a;
    }
  `;S([h({type:Boolean})],_.prototype,"open",2);S([h({type:String})],_.prototype,"floorplanId",2);S([h({type:String})],_.prototype,"floorId",2);S([h({attribute:!1})],_.prototype,"currentBlueprint",2);S([h({attribute:!1})],_.prototype,"uploadCallback",2);S([c()],_.prototype,"imageUrl",2);S([c()],_.prototype,"imageMimeType",2);S([c()],_.prototype,"naturalWidth",2);S([c()],_.prototype,"naturalHeight",2);S([c()],_.prototype,"p1",2);S([c()],_.prototype,"p2",2);S([c()],_.prototype,"realDistanceMeters",2);S([c()],_.prototype,"opacity",2);S([c()],_.prototype,"isUploading",2);S([c()],_.prototype,"errorMessage",2);_=S([B("floorplan-blueprint-modal")],_);var pt=Object.defineProperty,ut=Object.getOwnPropertyDescriptor,C=(t,e,i,s)=>{for(var o=s>1?void 0:s?ut(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&pt(e,i,o),o};let F=class extends R{constructor(){super(...arguments),this.floorplans=[],this.activeFloorplanId="",this.floors=[],this.activeFloorId="",this.activeTool="select",this.gridSize=.1,this.snapToGrid=!0,this.canUndo=!1,this.canRedo=!1,this.viewLayout="split",this.isDirty=!1,this.onionSkin=!1}handleFloorplanSelect(t){const e=t.target;this.dispatchEvent(new CustomEvent("floorplan-change",{bubbles:!0,composed:!0,detail:{floorplanId:e.value}}))}handleFloorSelect(t){const e=t.target;this.dispatchEvent(new CustomEvent("floor-change",{bubbles:!0,composed:!0,detail:{floorId:e.value}}))}handleToolSelect(t){this.dispatchEvent(new CustomEvent("tool-change",{bubbles:!0,composed:!0,detail:{tool:t}}))}handleGridSizeSelect(t){const e=t.target,i=parseFloat(e.value);this.dispatchEvent(new CustomEvent("grid-size-change",{bubbles:!0,composed:!0,detail:{gridSize:i}}))}handleSnapToggle(){this.dispatchEvent(new CustomEvent("snap-toggle",{bubbles:!0,composed:!0,detail:{snap:!this.snapToGrid}}))}handleOnionSkinToggle(){this.dispatchEvent(new CustomEvent("toggle-onion-skin",{bubbles:!0,composed:!0,detail:{onionSkin:!this.onionSkin}}))}handleLayoutSelect(t){this.dispatchEvent(new CustomEvent("layout-change",{bubbles:!0,composed:!0,detail:{layout:t}}))}handleSaveCamera(){this.dispatchEvent(new CustomEvent("save-camera",{bubbles:!0,composed:!0}))}render(){return d`
      <!-- 1. Floorplan Switcher -->
      <div class="toolbar-section">
        <select
          aria-label="Floorplan selector"
          .value=${this.activeFloorplanId}
          @change=${this.handleFloorplanSelect}
        >
          ${this.floorplans.length===0?d`<option value="">Default Floorplan</option>`:this.floorplans.map(t=>d`<option value=${t.id}>${t.name}</option>`)}
        </select>
        <button
          title="Create New Floorplan"
          @click=${()=>this.dispatchEvent(new CustomEvent("floorplan-new",{bubbles:!0,composed:!0}))}
        >
          <span class="icon">+</span> New
        </button>
        <button
          class="danger"
          title="Delete Active Floorplan"
          ?disabled=${this.floorplans.length<=1}
          @click=${()=>this.dispatchEvent(new CustomEvent("floorplan-delete",{bubbles:!0,composed:!0}))}
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
          ${this.floors.map(t=>d`<option value=${t.id}>${t.name} (L${t.level_index})</option>`)}
        </select>
        <button
          title="Add New Floor Above"
          @click=${()=>this.dispatchEvent(new CustomEvent("floor-add",{bubbles:!0,composed:!0}))}
        >
          + Add Floor
        </button>
        <button
          title="Duplicate Exterior Perimeter Walls from Floor Below"
          @click=${()=>this.dispatchEvent(new CustomEvent("duplicate-perimeter",{bubbles:!0,composed:!0}))}
        >
          Duplicate Perimeter
        </button>
        <button
          class=${this.onionSkin?"active":""}
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
            class=${this.activeTool==="select"?"active":""}
            title="Select & Move [V]"
            @click=${()=>this.handleToolSelect("select")}
          >
            Select [V]
          </button>
          <button
            class=${this.activeTool==="draw_wall"?"active":""}
            title="Draw Wall [W]"
            @click=${()=>this.handleToolSelect("draw_wall")}
          >
            Wall [W]
          </button>
          <button
            class=${this.activeTool==="draw_room"?"active":""}
            title="Draw Room Polygon [R]"
            @click=${()=>this.handleToolSelect("draw_room")}
          >
            Room [R]
          </button>
          <button
            class=${this.activeTool==="add_opening"?"active":""}
            title="Add Door / Window [O]"
            @click=${()=>this.handleToolSelect("add_opening")}
          >
            Opening [O]
          </button>
          <button
            class=${this.activeTool==="measure"?"active":""}
            title="Measure Distance [M]"
            @click=${()=>this.handleToolSelect("measure")}
          >
            Measure [M]
          </button>
        </div>
        <button
          title="Calibrate 2-Point Blueprint Scale"
          @click=${()=>this.dispatchEvent(new CustomEvent("calibrate-blueprint",{bubbles:!0,composed:!0}))}
        >
          Calibrate Blueprint
        </button>
      </div>

      <div class="separator"></div>

      <!-- 4. Grid Size & Magnetic Snapping -->
      <div class="toolbar-section">
        <button
          class=${this.snapToGrid?"active":""}
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
            @click=${()=>this.dispatchEvent(new CustomEvent("undo",{bubbles:!0,composed:!0}))}
          >
            Undo
          </button>
          <button
            title="Redo (Ctrl+Y)"
            ?disabled=${!this.canRedo}
            @click=${()=>this.dispatchEvent(new CustomEvent("redo",{bubbles:!0,composed:!0}))}
          >
            Redo
          </button>
        </div>
      </div>

      <div class="separator"></div>

      <!-- 6. View Layout Mode & Camera Bookmark -->
      <div class="toolbar-section">
        <div class="btn-group">
          <button
            class=${this.viewLayout==="2d"?"active":""}
            title="2D CAD Viewport Only"
            @click=${()=>this.handleLayoutSelect("2d")}
          >
            2D Only
          </button>
          <button
            class=${this.viewLayout==="split"?"active":""}
            title="Split 2D Viewport + 3D Live Preview"
            @click=${()=>this.handleLayoutSelect("split")}
          >
            Split 2D + 3D
          </button>
          <button
            class=${this.viewLayout==="3d"?"active":""}
            title="3D Preview Only"
            @click=${()=>this.handleLayoutSelect("3d")}
          >
            3D Preview
          </button>
        </div>
        ${this.viewLayout!=="2d"?d`
              <button
                title="Save 3D Camera as Floor Default"
                @click=${this.handleSaveCamera}
              >
                Save 3D Camera
              </button>
            `:""}
      </div>

      <div class="separator"></div>

      <!-- 7. Document Import / Export & Save -->
      <div class="toolbar-section">
        <button
          title="Import Floorplan JSON"
          @click=${()=>this.dispatchEvent(new CustomEvent("import-json",{bubbles:!0,composed:!0}))}
        >
          Import JSON
        </button>
        <button
          title="Export Floorplan JSON"
          @click=${()=>this.dispatchEvent(new CustomEvent("export-json",{bubbles:!0,composed:!0}))}
        >
          Export JSON
        </button>

        <div class="dirty-pill ${this.isDirty?"unsaved":"saved"}">
          <span class="status-dot"></span>
          ${this.isDirty?"Unsaved":"Saved"}
        </div>

        <button
          class="save-button"
          title="Save Floorplan to Home Assistant Storage"
          @click=${()=>this.dispatchEvent(new CustomEvent("save-floorplan",{bubbles:!0,composed:!0}))}
        >
          Save
        </button>
      </div>
    `}};F.styles=E`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      padding: 0 12px;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      user-select: none;
      box-sizing: border-box;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
    }

    :host::-webkit-scrollbar {
      height: 4px;
    }

    :host::-webkit-scrollbar-thumb {
      background: #334155;
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
      background: #334155;
      margin: 0 4px;
      flex-shrink: 0;
    }

    select {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
      height: 28px;
    }

    select:focus {
      border-color: #3b82f6;
    }

    button {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    button:hover:not(:disabled) {
      background: #334155;
      color: #ffffff;
      border-color: #64748b;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
    }

    button.danger:hover:not(:disabled) {
      background: #991b1b;
      border-color: #ef4444;
      color: #fecaca;
    }

    .btn-group {
      display: inline-flex;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #475569;
    }

    .btn-group button {
      border: none;
      border-radius: 0;
      border-right: 1px solid #475569;
      margin: 0;
    }

    .btn-group button:last-child {
      border-right: none;
    }

    .save-button {
      background: #15803d;
      color: #ffffff;
      border-color: #22c55e;
      font-weight: 600;
    }

    .save-button:hover:not(:disabled) {
      background: #16a34a;
      border-color: #4ade80;
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
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .dirty-pill.saved {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.4);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .dirty-pill.unsaved .status-dot {
      background: #fbbf24;
    }

    .dirty-pill.saved .status-dot {
      background: #4ade80;
    }

    .icon {
      font-size: 14px;
      line-height: 1;
    }
  `;C([h({type:Array})],F.prototype,"floorplans",2);C([h({type:String})],F.prototype,"activeFloorplanId",2);C([h({type:Array})],F.prototype,"floors",2);C([h({type:String})],F.prototype,"activeFloorId",2);C([h({type:String})],F.prototype,"activeTool",2);C([h({type:Number})],F.prototype,"gridSize",2);C([h({type:Boolean})],F.prototype,"snapToGrid",2);C([h({type:Boolean})],F.prototype,"canUndo",2);C([h({type:Boolean})],F.prototype,"canRedo",2);C([h({type:String})],F.prototype,"viewLayout",2);C([h({type:Boolean})],F.prototype,"isDirty",2);C([h({type:Boolean})],F.prototype,"onionSkin",2);F=C([B("floorplan-editor-toolbar")],F);var gt=Object.defineProperty,ft=Object.getOwnPropertyDescriptor,P=(t,e,i,s)=>{for(var o=s>1?void 0:s?ft(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&gt(e,i,o),o};const bt=[{type:"door_single",label:"Single Door",defaultWidth:.9,defaultHeight:2.1,icon:"🚪"},{type:"door_double",label:"Double Door",defaultWidth:1.8,defaultHeight:2.1,icon:"🚪🚪"},{type:"door_sliding",label:"Sliding Door",defaultWidth:1.8,defaultHeight:2.1,icon:"↔️"},{type:"archway",label:"Archway / Portal",defaultWidth:1.2,defaultHeight:2.1,icon:"🏛️"},{type:"window_standard",label:"Standard Window",defaultWidth:1.2,defaultHeight:1.2,icon:"🪟"},{type:"window_floor_to_ceiling",label:"Floor-to-Ceiling Window",defaultWidth:2,defaultHeight:2.4,icon:"🪟"}],mt=[{type:"sofa_straight",label:"Sofa (Straight)",defaultWidth:2,defaultDepth:.9,defaultHeight:.85,category:"Living",icon:"🛋️"},{type:"sofa_l_shape",label:"Sofa (L-Shape)",defaultWidth:2.4,defaultDepth:1.8,defaultHeight:.85,category:"Living",icon:"🛋️"},{type:"bed_double",label:"Double Bed",defaultWidth:1.8,defaultDepth:2.1,defaultHeight:.9,category:"Bedroom",icon:"🛏️"},{type:"bed_single",label:"Single Bed",defaultWidth:1,defaultDepth:2,defaultHeight:.85,category:"Bedroom",icon:"🛏️"},{type:"dining_table",label:"Dining Table",defaultWidth:1.6,defaultDepth:.9,defaultHeight:.75,category:"Dining",icon:"🪑"},{type:"desk",label:"Work Desk",defaultWidth:1.4,defaultDepth:.7,defaultHeight:.75,category:"Office",icon:"🖥️"},{type:"chair",label:"Chair",defaultWidth:.5,defaultDepth:.5,defaultHeight:.85,category:"Dining",icon:"🪑"},{type:"tv_stand",label:"Media / TV Stand",defaultWidth:1.6,defaultDepth:.45,defaultHeight:.5,category:"Living",icon:"📺"},{type:"kitchen_counter",label:"Kitchen Counter",defaultWidth:1.8,defaultDepth:.65,defaultHeight:.9,category:"Kitchen",icon:"🍳"},{type:"refrigerator",label:"Refrigerator",defaultWidth:.8,defaultDepth:.75,defaultHeight:1.85,category:"Kitchen",icon:"🧊"},{type:"stove",label:"Stove & Range",defaultWidth:.75,defaultDepth:.65,defaultHeight:.9,category:"Kitchen",icon:"🔥"},{type:"sink_cabinet",label:"Sink Cabinet",defaultWidth:1,defaultDepth:.65,defaultHeight:.9,category:"Kitchen",icon:"🚰"},{type:"bathtub",label:"Bathtub",defaultWidth:1.7,defaultDepth:.8,defaultHeight:.55,category:"Bathroom",icon:"🛁"},{type:"shower_enclosure",label:"Shower Enclosure",defaultWidth:1,defaultDepth:1,defaultHeight:2,category:"Bathroom",icon:"🚿"},{type:"toilet",label:"Toilet",defaultWidth:.45,defaultDepth:.65,defaultHeight:.8,category:"Bathroom",icon:"🚽"},{type:"wardrobe",label:"Wardrobe / Closet",defaultWidth:1.2,defaultDepth:.6,defaultHeight:2.1,category:"Bedroom",icon:"🚪"},{type:"bookcase",label:"Bookcase",defaultWidth:1,defaultDepth:.35,defaultHeight:1.9,category:"Living",icon:"📚"},{type:"potted_plant",label:"Potted Plant",defaultWidth:.5,defaultDepth:.5,defaultHeight:.9,category:"Decor",icon:"🪴"},{type:"rug",label:"Area Rug",defaultWidth:2.4,defaultDepth:1.6,defaultHeight:.02,category:"Decor",icon:"🪡"}],vt=["all","light","switch","binary_sensor","sensor","media_player","climate","fan","button"];let I=class extends R{constructor(){super(...arguments),this.selectedRoomAreaId=null,this.activeTab="entities",this.searchQuery="",this.selectedDomain="all",this.filterByArea=!1,this.unplacedOnly=!1,this.furnitureCategoryFilter="all"}handleDragStart(t,e){t.dataTransfer&&(t.dataTransfer.setData("application/x-floorplan-palette",JSON.stringify(e)),t.dataTransfer.effectAllowed="copy")}handlePlaceItem(t){this.dispatchEvent(new CustomEvent("palette-place",{bubbles:!0,composed:!0,detail:t}))}getFilteredEntities(){if(!this.hass?.states)return[];const t=this.searchQuery.trim().toLowerCase(),e=new Set(this.activeFloor?.entities.map(i=>i.entity_id)??[]);return Object.values(this.hass.states).filter(i=>{const s=i.entity_id,o=s.split(".")[0],n=i.attributes.friendly_name||"";return!(this.selectedDomain!=="all"&&o!==this.selectedDomain||t&&!s.toLowerCase().includes(t)&&!n.toLowerCase().includes(t)||this.unplacedOnly&&e.has(s)||this.filterByArea&&this.selectedRoomAreaId&&st(s,this.hass)!==this.selectedRoomAreaId)})}getDomainIcon(t){switch(t){case"light":return"💡";case"switch":return"🔌";case"binary_sensor":return"🔔";case"sensor":return"🌡️";case"media_player":return"📻";case"climate":return"❄️";case"fan":return"🌀";case"button":return"🔘";default:return"⚙️"}}render(){const t=this.selectedRoomAreaId&&this.hass?.areas?.[this.selectedRoomAreaId]?this.hass.areas[this.selectedRoomAreaId].name:this.selectedRoomAreaId;return d`
      <!-- Header Tabs -->
      <div class="tabs-header">
        <button
          class="tab-button ${this.activeTab==="entities"?"active":""}"
          @click=${()=>this.activeTab="entities"}
        >
          Entities
        </button>
        <button
          class="tab-button ${this.activeTab==="catalog"?"active":""}"
          @click=${()=>this.activeTab="catalog"}
        >
          Catalog & Furniture
        </button>
      </div>

      <!-- Tab 1: HA Entities -->
      ${this.activeTab==="entities"?d`
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
                ${vt.map(e=>d`
                    <div
                      class="chip ${this.selectedDomain===e?"active":""}"
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
                    ${t?d`<b>(${t})</b>`:""}
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
                ${this.getFilteredEntities().length===0?d`<div class="empty-state">No entities match filters.</div>`:this.getFilteredEntities().map(e=>{const i=e.entity_id.split(".")[0],s=this.activeFloor?.entities.some(n=>n.entity_id===e.entity_id),o={kind:"entity",entityId:e.entity_id,domain:i,label:e.attributes.friendly_name||e.entity_id};return d`
                        <div
                          class="item-row"
                          draggable="true"
                          @dragstart=${n=>this.handleDragStart(n,o)}
                        >
                          <div class="item-left">
                            <span class="item-icon">${this.getDomainIcon(i)}</span>
                            <div class="item-details">
                              <span class="item-name">
                                ${e.attributes.friendly_name||e.entity_id}
                                ${s?d`<span class="placed-pill">Placed</span>`:""}
                              </span>
                              <span class="item-subtext">
                                ${e.entity_id} • ${e.state}
                              </span>
                            </div>
                          </div>
                          <button
                            class="place-btn"
                            title="Place in center of active floor"
                            @click=${()=>this.handlePlaceItem(o)}
                          >
                            + Place
                          </button>
                        </div>
                      `})}
              </div>
            </div>
          `:d`
            <!-- Tab 2: Catalog & Furniture -->
            <div class="tab-content">
              <!-- Openings & Portals -->
              <div class="section-title">Openings & Portals</div>
              <div class="items-list">
                ${bt.map(e=>{const i={kind:"opening",openingType:e.type,defaultWidth:e.defaultWidth,defaultHeight:e.defaultHeight,label:e.label};return d`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${s=>this.handleDragStart(s,i)}
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
                        @click=${()=>this.handlePlaceItem(i)}
                      >
                        + Add
                      </button>
                    </div>
                  `})}
              </div>

              <!-- Procedural Furniture -->
              <div class="section-title">Procedural Furniture (19 Models)</div>
              <div class="chips-bar">
                ${["all","Living","Bedroom","Kitchen","Bathroom","Dining","Office","Decor"].map(e=>d`
                    <div
                      class="chip ${this.furnitureCategoryFilter===e?"active":""}"
                      @click=${()=>this.furnitureCategoryFilter=e}
                    >
                      ${e}
                    </div>
                  `)}
              </div>

              <div class="items-list">
                ${mt.filter(e=>this.furnitureCategoryFilter==="all"||e.category===this.furnitureCategoryFilter).map(e=>{const i={kind:"furniture",furnitureType:e.type,defaultWidth:e.defaultWidth,defaultDepth:e.defaultDepth,defaultHeight:e.defaultHeight,label:e.label};return d`
                    <div
                      class="item-row"
                      draggable="true"
                      @dragstart=${s=>this.handleDragStart(s,i)}
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
                        @click=${()=>this.handlePlaceItem(i)}
                      >
                        + Add
                      </button>
                    </div>
                  `})}
              </div>
            </div>
          `}
    `}};I.styles=E`
    :host {
      display: flex;
      flex-direction: column;
      width: 320px;
      height: 100%;
      background: #0f172a;
      border-right: 1px solid #334155;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    .tabs-header {
      display: flex;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .tab-button {
      flex: 1;
      padding: 10px 8px;
      text-align: center;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }

    .tab-button:hover {
      color: #f8fafc;
    }

    .tab-button.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
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
      background: #334155;
      border-radius: 2px;
    }

    .search-box {
      position: relative;
    }

    .search-box input {
      width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 7px 10px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
    }

    .search-box input:focus {
      border-color: #3b82f6;
    }

    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .chip {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .chip:hover {
      color: #f8fafc;
      border-color: #64748b;
    }

    .chip.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
    }

    .toggles-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #1e293b;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
      cursor: pointer;
    }

    .toggle-row input[type='checkbox'] {
      cursor: pointer;
      accent-color: #3b82f6;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-top: 4px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 10px;
      cursor: grab;
      transition: border-color 0.15s, background 0.15s;
    }

    .item-row:hover {
      background: #273549;
      border-color: #475569;
    }

    .item-row:active {
      cursor: grabbing;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      font-size: 16px;
      flex-shrink: 0;
      width: 22px;
      text-align: center;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .item-name {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtext {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .place-btn {
      background: #334155;
      color: #f8fafc;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s;
    }

    .place-btn:hover {
      background: #2563eb;
    }

    .placed-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.4);
      padding: 1px 5px;
      border-radius: 8px;
      margin-left: 4px;
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  `;P([h({attribute:!1})],I.prototype,"hass",2);P([h({attribute:!1})],I.prototype,"activeFloor",2);P([h({type:String})],I.prototype,"selectedRoomAreaId",2);P([c()],I.prototype,"activeTab",2);P([c()],I.prototype,"searchQuery",2);P([c()],I.prototype,"selectedDomain",2);P([c()],I.prototype,"filterByArea",2);P([c()],I.prototype,"unplacedOnly",2);P([c()],I.prototype,"furnitureCategoryFilter",2);I=P([B("floorplan-entity-palette")],I);var yt=Object.defineProperty,xt=Object.getOwnPropertyDescriptor,z=(t,e,i,s)=>{for(var o=s>1?void 0:s?xt(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&yt(e,i,o),o};const wt=[{value:"adaptive_contrast",label:"Adaptive Contrast (Recommended)"},{value:"sun_sync",label:"Sun Synchronization"},{value:"dark",label:"Dark Mode"},{value:"daylight",label:"Daylight Mode"}],$t=[{value:"wood_oak",label:"Natural Oak Wood"},{value:"wood_walnut",label:"Dark Walnut Wood"},{value:"tile_slate",label:"Slate Tile"},{value:"tile_marble",label:"Marble Tile"},{value:"carpet",label:"Soft Carpet"},{value:"concrete",label:"Polished Concrete"},{value:"custom",label:"Custom Tint Color"}],_t=[{value:"door_single",label:"Single Door"},{value:"door_double",label:"Double Door"},{value:"door_sliding",label:"Sliding Door"},{value:"archway",label:"Archway / Portal"},{value:"window_standard",label:"Standard Window"},{value:"window_floor_to_ceiling",label:"Floor-to-Ceiling Window"}],kt=[{value:"left_in",label:"Left Inward"},{value:"left_out",label:"Left Outward"},{value:"right_in",label:"Right Inward"},{value:"right_out",label:"Right Outward"}],St=[{value:"none",label:"None (Icon / Badge Only)"},{value:"ceiling_light",label:"Ceiling Pendant Light"},{value:"wall_sconce",label:"Wall Sconce"},{value:"led_strip",label:"LED Strip Fixture"},{value:"tv_screen",label:"Smart TV Screen"},{value:"ceiling_fan",label:"Ceiling Fan (Animated)"},{value:"thermostat",label:"Wall Thermostat"},{value:"speaker",label:"Smart Speaker"}],Dt=[{value:"point",label:"Point Light (Omnidirectional)"},{value:"spot",label:"Spotlight"},{value:"strip",label:"LED Strip"},{value:"wall_sconce",label:"Wall Sconce"}],Ft=[{value:"sofa_straight",label:"Sofa (Straight)"},{value:"sofa_l_shape",label:"Sofa (L-Shape)"},{value:"bed_double",label:"Double Bed"},{value:"bed_single",label:"Single Bed"},{value:"dining_table",label:"Dining Table"},{value:"desk",label:"Work Desk"},{value:"chair",label:"Chair"},{value:"tv_stand",label:"TV Stand"},{value:"kitchen_counter",label:"Kitchen Counter"},{value:"refrigerator",label:"Refrigerator"},{value:"stove",label:"Stove & Range"},{value:"sink_cabinet",label:"Sink Cabinet"},{value:"bathtub",label:"Bathtub"},{value:"shower_enclosure",label:"Shower Enclosure"},{value:"toilet",label:"Toilet"},{value:"wardrobe",label:"Wardrobe"},{value:"bookcase",label:"Bookcase"},{value:"potted_plant",label:"Potted Plant"},{value:"rug",label:"Area Rug"}];let O=class extends R{constructor(){super(...arguments),this.selection={kind:"none",id:null}}mutate(t,e){if(!this.document)return;const i=structuredClone(this.document),s=i.floors.find(o=>o.id===this.floor?.id)??i.floors[0];s&&(e(i,s),this.dispatchEvent(new CustomEvent("document-mutate",{bubbles:!0,composed:!0,detail:{document:i,description:t}})))}handleDeleteSelected(){if(!this.selection||this.selection.kind==="none"||!this.selection.id)return;const{kind:t,id:e}=this.selection;this.mutate(`Delete ${t}`,(i,s)=>{switch(t){case"wall":s.walls=s.walls.filter(o=>o.id!==e),s.openings=s.openings.filter(o=>o.wall_id!==e);break;case"room":s.rooms=s.rooms.filter(o=>o.id!==e);break;case"opening":s.openings=s.openings.filter(o=>o.id!==e);break;case"furniture":s.furniture=s.furniture.filter(o=>o.id!==e);break;case"entity":s.entities=s.entities.filter(o=>o.id!==e);break}}),this.dispatchEvent(new CustomEvent("delete-selected",{bubbles:!0,composed:!0,detail:this.selection}))}render(){const{kind:t}=this.selection;return d`
      <div class="inspector-header">
        <div class="inspector-title">
          <span>Properties</span>
          <span class="badge-kind">${t==="none"?"Global / Floor":t}</span>
        </div>
      </div>

      <div class="inspector-body">
        ${t==="none"?this.renderGlobalAndFloorInspector():""}
        ${t==="wall"?this.renderWallInspector():""}
        ${t==="room"?this.renderRoomInspector():""}
        ${t==="opening"?this.renderOpeningInspector():""}
        ${t==="furniture"?this.renderFurnitureInspector():""}
        ${t==="entity"?this.renderEntityInspector():""}
      </div>
    `}renderGlobalAndFloorInspector(){if(!this.document||!this.floor)return d``;const t=this.document,e=this.floor,i=t.ambient_config;return d`
      <!-- Global Floorplan Settings -->
      <div class="section-card">
        <div class="section-header">Floorplan Global Settings</div>

        <div class="form-group">
          <label>Floorplan Name</label>
          <input
            type="text"
            .value=${t.name}
            @change=${s=>{const o=s.target.value;this.mutate("Change floorplan name",n=>{n.name=o})}}
          />
        </div>

        <div class="form-group">
          <label>Ambient Lighting Mode</label>
          <select
            .value=${i.mode}
            @change=${s=>{const o=s.target.value;this.mutate("Change ambient lighting mode",n=>{n.ambient_config.mode=o})}}
          >
            ${wt.map(s=>d`<option value=${s.value}>${s.label}</option>`)}
          </select>
        </div>

        <div class="form-row">
          <label>Wall Paint Color</label>
          <input
            type="color"
            .value=${i.wall_color||"#e2e8f0"}
            @change=${s=>{const o=s.target.value;this.mutate("Change wall color",n=>{n.ambient_config.wall_color=o})}}
          />
        </div>

        <div class="form-row">
          <label>Base Floor Color</label>
          <input
            type="color"
            .value=${i.floor_color||"#334155"}
            @change=${s=>{const o=s.target.value;this.mutate("Change floor base color",n=>{n.ambient_config.floor_color=o})}}
          />
        </div>

        <div class="form-row">
          <label>3D Sky / Background</label>
          <input
            type="color"
            .value=${i.background_color||"#0f172a"}
            @change=${s=>{const o=s.target.value;this.mutate("Change background color",n=>{n.ambient_config.background_color=o})}}
          />
        </div>
      </div>

      <!-- Active Floor Level Settings -->
      <div class="section-card">
        <div class="section-header">Active Floor Level (${e.name})</div>

        <div class="form-group">
          <label>Floor Level Name</label>
          <input
            type="text"
            .value=${e.name}
            @change=${s=>{const o=s.target.value;this.mutate("Change floor level name",(n,a)=>{a.name=o})}}
          />
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label>Level Index</label>
            <input
              type="number"
              step="1"
              .value=${String(e.level_index)}
              @change=${s=>{const o=parseInt(s.target.value,10);this.mutate("Change floor level index",(n,a)=>{a.level_index=o})}}
            />
          </div>

          <div class="form-group">
            <label>Elevation (m)</label>
            <input
              type="number"
              step="0.1"
              .value=${String(e.elevation)}
              @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Change floor elevation",(n,a)=>{a.elevation=o})}}
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
              .value=${String(e.wall_height)}
              @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Change floor wall height",(n,a)=>{a.wall_height=o})}}
            />
          </div>

          <div class="form-group">
            <label>Slab Thick (m)</label>
            <input
              type="number"
              step="0.01"
              min="0.05"
              max="0.5"
              .value=${String(e.slab_thickness||.15)}
              @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Change floor slab thickness",(n,a)=>{a.slab_thickness=o})}}
            />
          </div>
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Floor</label>
          <select
            .value=${e.ha_floor_id||""}
            @change=${s=>{const o=s.target.value||null;this.mutate("Bind HA floor ID",(n,a)=>{a.ha_floor_id=o})}}
          >
            <option value="">None (Unbound)</option>
            ${Object.values(this.hass?.floors??{}).map(s=>d`<option value=${s.floor_id}>${s.name}</option>`)}
          </select>
        </div>
      </div>

      <!-- Blueprint Calibration & Overlay -->
      <div class="section-card">
        <div class="section-header">Blueprint Reference Image</div>
        ${e.blueprint?d`
              <div class="form-row">
                <label>Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  .value=${String(e.blueprint.opacity)}
                  @input=${s=>{const o=parseFloat(s.target.value);this.mutate("Update blueprint opacity",(n,a)=>{a.blueprint&&(a.blueprint.opacity=o)})}}
                />
                <span class="slider-val">${Math.round(e.blueprint.opacity*100)}%</span>
              </div>

              <div class="grid-2col">
                <div class="form-group">
                  <label>X Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(e.blueprint.offset_x)}
                    @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Update blueprint offset X",(n,a)=>{a.blueprint&&(a.blueprint.offset_x=o)})}}
                  />
                </div>
                <div class="form-group">
                  <label>Y Offset (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    .value=${String(e.blueprint.offset_y)}
                    @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Update blueprint offset Y",(n,a)=>{a.blueprint&&(a.blueprint.offset_y=o)})}}
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
                    .value=${String(e.blueprint.rotation_deg)}
                    @change=${s=>{const o=parseFloat(s.target.value);this.mutate("Update blueprint rotation",(n,a)=>{a.blueprint&&(a.blueprint.rotation_deg=o)})}}
                  />
                </div>
                <div class="form-group">
                  <label>Scale (m/px)</label>
                  <input
                    type="number"
                    step="0.001"
                    .value=${String(e.blueprint.meters_per_pixel.toFixed(4))}
                    disabled
                  />
                </div>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${e.blueprint.locked}
                  @change=${s=>{const o=s.target.checked;this.mutate("Toggle blueprint locked",(n,a)=>{a.blueprint&&(a.blueprint.locked=o)})}}
                />
                <span>Lock Blueprint Position & Scale</span>
              </label>

              <button
                class="btn btn-primary"
                @click=${()=>this.dispatchEvent(new CustomEvent("open-blueprint-modal",{bubbles:!0,composed:!0}))}
              >
                Recalibrate 2-Point Scale
              </button>

              <button
                class="btn btn-danger"
                @click=${()=>{this.mutate("Remove blueprint",(s,o)=>{o.blueprint=null})}}
              >
                Remove Blueprint
              </button>
            `:d`
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                No blueprint reference image uploaded for this floor.
              </p>
              <button
                class="btn btn-primary"
                @click=${()=>this.dispatchEvent(new CustomEvent("open-blueprint-modal",{bubbles:!0,composed:!0}))}
              >
                Upload & Calibrate Blueprint
              </button>
            `}
      </div>
    `}renderWallInspector(){if(!this.floor)return d``;const t=this.floor.walls.find(e=>e.id===this.selection.id);return t?d`
      <div class="section-card">
        <div class="section-header">Wall Segment (${t.id})</div>

        <div class="form-group">
          <label>Thickness (m)</label>
          <input
            type="number"
            step="0.01"
            min="0.05"
            max="1.0"
            .value=${String(t.thickness)}
            @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change wall thickness",(s,o)=>{const n=o.walls.find(a=>a.id===t.id);n&&(n.thickness=i)})}}
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
            .value=${t.height_override!==null?String(t.height_override):""}
            @change=${e=>{const i=e.target,s=i.value===""?null:parseFloat(i.value);this.mutate("Change wall height override",(o,n)=>{const a=n.walls.find(r=>r.id===t.id);a&&(a.height_override=s)})}}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${t.is_exterior}
            @change=${e=>{const i=e.target.checked;this.mutate("Toggle exterior wall",(s,o)=>{const n=o.walls.find(a=>a.id===t.id);n&&(n.is_exterior=i)})}}
          />
          <span>Exterior Wall (Affects Sims-style Cutaway)</span>
        </label>

        <div class="form-row">
          <label>Custom Paint Color</label>
          <input
            type="color"
            .value=${t.color_override||"#e2e8f0"}
            @change=${e=>{const i=e.target.value;this.mutate("Change wall color",(s,o)=>{const n=o.walls.find(a=>a.id===t.id);n&&(n.color_override=i)})}}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Wall
        </button>
      </div>
    `:d`<div class="section-card">Wall not found.</div>`}renderRoomInspector(){if(!this.floor)return d``;const t=this.floor.rooms.find(e=>e.id===this.selection.id);return t?d`
      <div class="section-card">
        <div class="section-header">Room Polygon (${t.name})</div>

        <div class="form-group">
          <label>Room Name</label>
          <input
            type="text"
            .value=${t.name}
            @change=${e=>{const i=e.target.value;this.mutate("Change room name",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.name=i)})}}
          />
        </div>

        <div class="form-group">
          <label>Bound Home Assistant Area</label>
          <select
            .value=${t.ha_area_id||""}
            @change=${e=>{const i=e.target.value||null;this.mutate("Bind HA area",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.ha_area_id=i)})}}
          >
            <option value="">None (Unbound Area)</option>
            ${Object.values(this.hass?.areas??{}).map(e=>d`<option value=${e.area_id}>${e.name}</option>`)}
          </select>
        </div>

        <div class="form-group">
          <label>Floor Material Surface</label>
          <select
            .value=${t.floor_material}
            @change=${e=>{const i=e.target.value;this.mutate("Change room floor material",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.floor_material=i)})}}
          >
            ${$t.map(e=>d`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="form-row">
          <label>Floor Tint Color</label>
          <input
            type="color"
            .value=${t.floor_color||"#8b6f4e"}
            @change=${e=>{const i=e.target.value;this.mutate("Change room floor color",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.floor_color=i)})}}
          />
        </div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${t.show_label}
            @change=${e=>{const i=e.target.checked;this.mutate("Toggle room label visibility",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.show_label=i)})}}
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
            .value=${t.temp_entity_id||""}
            @change=${e=>{const i=e.target.value.trim()||null;this.mutate("Set room temperature sensor",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.temp_entity_id=i)})}}
          />
        </div>

        <div class="form-group">
          <label>Humidity Sensor</label>
          <input
            type="text"
            placeholder="sensor.living_room_humidity"
            .value=${t.humidity_entity_id||""}
            @change=${e=>{const i=e.target.value.trim()||null;this.mutate("Set room humidity sensor",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.humidity_entity_id=i)})}}
          />
        </div>

        <div class="form-group">
          <label>Motion / Occupancy Sensor</label>
          <input
            type="text"
            placeholder="binary_sensor.living_room_motion"
            .value=${t.motion_entity_id||""}
            @change=${e=>{const i=e.target.value.trim()||null;this.mutate("Set room motion sensor",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.motion_entity_id=i)})}}
          />
        </div>

        <div class="form-group">
          <label>Room Tap Action</label>
          <select
            .value=${t.room_tap_action.action}
            @change=${e=>{const i=e.target.value;this.mutate("Change room tap action",(s,o)=>{const n=o.rooms.find(a=>a.id===t.id);n&&(n.room_tap_action.action=i)})}}
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
    `:d`<div class="section-card">Room not found.</div>`}renderOpeningInspector(){if(!this.floor)return d``;const t=this.floor.openings.find(i=>i.id===this.selection.id);if(!t)return d`<div class="section-card">Opening not found.</div>`;const e=Object.keys(this.hass?.states??{}).filter(i=>i.startsWith("binary_sensor."));return d`
      <div class="section-card">
        <div class="section-header">Wall Opening (${t.type})</div>

        <div class="form-group">
          <label>Opening Type</label>
          <select
            .value=${t.type}
            @change=${i=>{const s=i.target.value;this.mutate("Change opening type",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.type=s)})}}
          >
            ${_t.map(i=>d`<option value=${i.value}>${i.label}</option>`)}
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
              .value=${String(t.width)}
              @change=${i=>{const s=parseFloat(i.target.value);this.mutate("Change opening width",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.width=s)})}}
            />
          </div>

          <div class="form-group">
            <label>Sill Height (m)</label>
            <input
              type="number"
              step="0.05"
              min="0.0"
              max="3.0"
              .value=${String(t.sill_height)}
              @change=${i=>{const s=parseFloat(i.target.value);this.mutate("Change opening sill height",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.sill_height=s)})}}
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
              .value=${String(t.head_height)}
              @change=${i=>{const s=parseFloat(i.target.value);this.mutate("Change opening head height",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.head_height=s)})}}
            />
          </div>

          <div class="form-group">
            <label>Swing Direction</label>
            <select
              .value=${t.swing_direction}
              @change=${i=>{const s=i.target.value;this.mutate("Change opening swing direction",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.swing_direction=s)})}}
            >
              ${kt.map(i=>d`<option value=${i.value}>${i.label}</option>`)}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Bound Contact Sensor (Door/Window)</label>
          <select
            .value=${t.bound_entity_id||""}
            @change=${i=>{const s=i.target.value||null;this.mutate("Bind opening contact sensor",(o,n)=>{const a=n.openings.find(r=>r.id===t.id);a&&(a.bound_entity_id=s)})}}
          >
            <option value="">None (Static Position)</option>
            ${e.map(i=>d`<option value=${i}>${i}</option>`)}
          </select>
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Opening
        </button>
      </div>
    `}renderFurnitureInspector(){if(!this.floor)return d``;const t=this.floor.furniture.find(e=>e.id===this.selection.id);return t?d`
      <div class="section-card">
        <div class="section-header">Furniture Item (${t.label})</div>

        <div class="form-group">
          <label>Label</label>
          <input
            type="text"
            .value=${t.label}
            @change=${e=>{const i=e.target.value;this.mutate("Change furniture label",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.label=i)})}}
          />
        </div>

        <div class="form-group">
          <label>Catalog Model</label>
          <select
            .value=${t.catalog_type}
            @change=${e=>{const i=e.target.value;this.mutate("Change furniture type",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.catalog_type=i)})}}
          >
            ${Ft.map(e=>d`<option value=${e.value}>${e.label}</option>`)}
          </select>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>X (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.x.toFixed(2))}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture X",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.x=i)})}}
            />
          </div>

          <div class="form-group">
            <label>Y (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.y.toFixed(2))}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture Y",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.y=i)})}}
            />
          </div>

          <div class="form-group">
            <label>Elev (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.z_elevation.toFixed(2))}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture Z elevation",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.z_elevation=i)})}}
            />
          </div>
        </div>

        <div class="grid-3col">
          <div class="form-group">
            <label>Width (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.width)}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture width",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.width=i)})}}
            />
          </div>

          <div class="form-group">
            <label>Depth (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.depth)}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture depth",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.depth=i)})}}
            />
          </div>

          <div class="form-group">
            <label>Height (m)</label>
            <input
              type="number"
              step="0.05"
              .value=${String(t.height)}
              @change=${e=>{const i=parseFloat(e.target.value);this.mutate("Change furniture height",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.height=i)})}}
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
            .value=${String(t.rotation_deg)}
            @input=${e=>{const i=parseFloat(e.target.value);this.mutate("Rotate furniture",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.rotation_deg=i)})}}
          />
          <span class="slider-val">${t.rotation_deg}°</span>
        </div>

        <div class="form-row">
          <label>Color Override</label>
          <input
            type="color"
            .value=${t.color||"#94a3b8"}
            @change=${e=>{const i=e.target.value;this.mutate("Change furniture color",(s,o)=>{const n=o.furniture.find(a=>a.id===t.id);n&&(n.color=i)})}}
          />
        </div>

        <button class="btn btn-danger" @click=${this.handleDeleteSelected}>
          Delete Furniture
        </button>
      </div>
    `:d`<div class="section-card">Furniture not found.</div>`}renderEntityInspector(){if(!this.floor)return d``;const t=this.floor.entities.find(s=>s.id===this.selection.id);if(!t)return d`<div class="section-card">Entity placement not found.</div>`;const e=this.hass?.states[t.entity_id],i=t.domain==="light"||!!t.light_config;return d`
      <div class="section-card">
        <div class="section-header">Entity Placement</div>

        <div class="entity-preview">
          <span>${e?.attributes.friendly_name||t.entity_id}</span>
          <span class="state-badge">${e?.state??"unavailable"}</span>
        </div>

        <div class="form-group">
          <label>Entity ID</label>
          <input
            type="text"
            .value=${t.entity_id}
            @change=${s=>{const o=s.target.value.trim();this.mutate("Change placed entity ID",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.entity_id=o,r.domain=o.split(".")[0]||"sensor")})}}
          />
        </div>

        <div class="form-row">
          <label>Z Elevation (m)</label>
          <input
            type="range"
            min="0"
            max="3.5"
            step="0.05"
            .value=${String(t.z_elevation)}
            @input=${s=>{const o=parseFloat(s.target.value);this.mutate("Change entity elevation",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.z_elevation=o)})}}
          />
          <span class="slider-val">${t.z_elevation.toFixed(2)}m</span>
        </div>

        <div class="form-row">
          <label>Rotation (°)</label>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            .value=${String(t.rotation_deg)}
            @input=${s=>{const o=parseFloat(s.target.value);this.mutate("Rotate entity",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.rotation_deg=o)})}}
          />
          <span class="slider-val">${t.rotation_deg}°</span>
        </div>

        <div class="form-group">
          <label>3D Mesh Coupling</label>
          <select
            .value=${t.mesh_type}
            @change=${s=>{const o=s.target.value;this.mutate("Change entity 3D mesh type",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.mesh_type=o)})}}
          >
            ${St.map(s=>d`<option value=${s.value}>${s.label}</option>`)}
          </select>
        </div>
      </div>

      <!-- Light Fixture 3D Config -->
      ${i?d`
            <div class="section-card">
              <div class="section-header">Light Fixture 3D Settings</div>

              <div class="form-group">
                <label>Fixture Kind</label>
                <select
                  .value=${t.light_config?.kind||"point"}
                  @change=${s=>{const o=s.target.value;this.mutate("Change light fixture kind",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.light_config={kind:o,radius_m:r.light_config?.radius_m??4.5,intensity_multiplier:r.light_config?.intensity_multiplier??1,cast_real_point_light:r.light_config?.cast_real_point_light??!0})})}}
                >
                  ${Dt.map(s=>d`<option value=${s.value}>${s.label}</option>`)}
                </select>
              </div>

              <div class="form-row">
                <label>Falloff Radius (m)</label>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.25"
                  .value=${String(t.light_config?.radius_m??4.5)}
                  @input=${s=>{const o=parseFloat(s.target.value);this.mutate("Change light radius",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r?.light_config&&(r.light_config.radius_m=o)})}}
                />
                <span class="slider-val">
                  ${(t.light_config?.radius_m??4.5).toFixed(1)}m
                </span>
              </div>

              <div class="form-row">
                <label>Intensity Mult</label>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  .value=${String(t.light_config?.intensity_multiplier??1)}
                  @input=${s=>{const o=parseFloat(s.target.value);this.mutate("Change light intensity multiplier",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r?.light_config&&(r.light_config.intensity_multiplier=o)})}}
                />
                <span class="slider-val">
                  ${(t.light_config?.intensity_multiplier??1).toFixed(1)}x
                </span>
              </div>

              <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${t.light_config?.cast_real_point_light??!0}
                  @change=${s=>{const o=s.target.checked;this.mutate("Toggle real point light pool",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r?.light_config&&(r.light_config.cast_real_point_light=o)})}}
                />
                <span>Eligible for Three.js PointLight Pool</span>
              </label>
            </div>
          `:""}

      <!-- Floating Touch Badge -->
      <div class="section-card">
        <div class="section-header">Floating Touch Badge</div>

        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${t.badge?.visible??!0}
            @change=${s=>{const o=s.target.checked;this.mutate("Toggle badge visibility",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.badge.visible=o)})}}
          />
          <span>Show 3D Floating Badge</span>
        </label>

        <div class="form-group">
          <label>Badge Style</label>
          <select
            .value=${t.badge?.style||"icon_only"}
            @change=${s=>{const o=s.target.value;this.mutate("Change badge style",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.badge.style=o)})}}
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
            .value=${t.badge?.label_override||""}
            @change=${s=>{const o=s.target.value.trim()||null;this.mutate("Set badge label override",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.badge.label_override=o)})}}
          />
        </div>
      </div>

      <!-- Touch Actions -->
      <div class="section-card">
        <div class="section-header">Touch Actions</div>

        <div class="form-group">
          <label>Tap Action</label>
          <select
            .value=${t.tap_action?.action||"default"}
            @change=${s=>{const o=s.target.value;this.mutate("Change entity tap action",(n,a)=>{const r=a.entities.find(l=>l.id===t.id);r&&(r.tap_action.action=o)})}}
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
    `}};O.styles=E`
    :host {
      display: flex;
      flex-direction: column;
      width: 320px;
      height: 100%;
      background: #0f172a;
      border-left: 1px solid #334155;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      user-select: none;
    }

    .inspector-header {
      padding: 12px 14px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .inspector-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
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
      background: #3b82f6;
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
      background: #334155;
      border-radius: 2px;
    }

    .section-card {
      background: #1e293b;
      border: 1px solid #334155;
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
      color: #94a3b8;
      border-bottom: 1px solid #334155;
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
      color: #94a3b8;
    }

    input[type='text'],
    input[type='number'],
    select {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 6px 8px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
      width: 100%;
    }

    input[type='text']:focus,
    input[type='number']:focus,
    select:focus {
      border-color: #3b82f6;
    }

    input[type='color'] {
      background: transparent;
      border: 1px solid #475569;
      border-radius: 4px;
      width: 38px;
      height: 28px;
      cursor: pointer;
      padding: 0;
    }

    input[type='range'] {
      width: 100%;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
      cursor: pointer;
    }

    .checkbox-row input[type='checkbox'] {
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .slider-val {
      font-size: 11px;
      font-weight: 600;
      color: #38bdf8;
      min-width: 42px;
      text-align: right;
    }

    .btn {
      background: #334155;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn:hover {
      background: #475569;
    }

    .btn-danger {
      background: #7f1d1d;
      color: #fecaca;
      border-color: #991b1b;
    }

    .btn-danger:hover {
      background: #991b1b;
      border-color: #ef4444;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border-color: #3b82f6;
    }

    .btn-primary:hover {
      background: #1d4ed8;
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
      background: #0f172a;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
      font-size: 11px;
    }

    .state-badge {
      font-weight: 700;
      color: #38bdf8;
    }
  `;z([h({attribute:!1})],O.prototype,"hass",2);z([h({attribute:!1})],O.prototype,"document",2);z([h({attribute:!1})],O.prototype,"floor",2);z([h({attribute:!1})],O.prototype,"selection",2);O=z([B("floorplan-property-inspector")],O);var Ct=Object.defineProperty,It=Object.getOwnPropertyDescriptor,k=(t,e,i,s)=>{for(var o=s>1?void 0:s?It(e,i):e,n=t.length-1,a;n>=0;n--)(a=t[n])&&(o=(s?a(e,i,o):a(o))||o);return s&&o&&Ct(e,i,o),o};let $=class extends R{constructor(){super(...arguments),this.narrow=!1,this.floorplans=[],this.activeFloorplanId="",this.activeFloorId="",this.activeTool="select",this.viewLayout="split",this.gridSize=.1,this.snapToGrid=!0,this.onionSkin=!1,this.selection={kind:"none",id:null},this.isBlueprintModalOpen=!1,this.isDirty=!1,this.canUndo=!1,this.canRedo=!1,this.toastMessage=null,this.scene3d=null,this.sceneContainerEl=null,this.toastTimer=null,this.isWsInitialized=!1,this.handleKeyDown=t=>{const e=t.target?.tagName?.toLowerCase();if(e==="input"||e==="textarea"||e==="select")return;const i=t.ctrlKey||t.metaKey;if(i&&t.key.toLowerCase()==="z"){t.preventDefault(),t.shiftKey?this.handleRedo():this.handleUndo();return}if(i&&t.key.toLowerCase()==="y"){t.preventDefault(),this.handleRedo();return}if(i&&t.key.toLowerCase()==="s"){t.preventDefault(),this.handleSaveFloorplan();return}switch(t.key.toLowerCase()){case"v":this.activeTool="select";break;case"w":this.activeTool="draw_wall";break;case"r":this.activeTool="draw_room";break;case"o":this.activeTool="add_opening";break;case"m":this.activeTool="measure";break;case"b":this.isBlueprintModalOpen=!0;break;case"delete":case"backspace":this.deleteSelection();break}}}connectedCallback(){super.connectedCallback();const t=q();this.history=new rt(t,50),this.activeFloorplanId=t.id,this.activeFloorId=t.floors[0]?.id??"",this.updateHistoryFlags(),this.wsClient=new nt(()=>this.hass),window.addEventListener("keydown",this.handleKeyDown)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.handleKeyDown),this.toastTimer&&window.clearTimeout(this.toastTimer),this.scene3d?.dispose(),this.scene3d=null}updated(t){super.updated(t),t.has("hass")&&this.hass&&!this.isWsInitialized&&(this.isWsInitialized=!0,this.loadInitialData()),t.has("hass")&&this.hass&&this.scene3d&&this.scene3d.updateHassStates(this.hass),t.has("viewLayout")&&this.handleLayoutChangeEffect()}async loadInitialData(){try{const t=await this.wsClient.listFloorplans();if(this.floorplans=t,t.length>0){const e=t[0],i=await this.wsClient.getFloorplan(e.id);this.history.reset(i),this.activeFloorplanId=i.id,this.activeFloorId=i.floors[0]?.id??"",this.updateHistoryFlags(),this.sync3DScene()}}catch(t){console.warn("Could not load floorplans via WebSocket; running in standalone mode",t)}}get currentDocument(){return this.history.current}get activeFloor(){return this.currentDocument.floors.find(t=>t.id===this.activeFloorId)??this.currentDocument.floors[0]}updateHistoryFlags(){this.canUndo=this.history.canUndo,this.canRedo=this.history.canRedo,this.isDirty=this.history.isDirty}pushHistory(t,e){this.history.push(t,e),this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate()}showToast(t){this.toastMessage=t,this.toastTimer&&window.clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>{this.toastMessage=null,this.toastTimer=null,this.requestUpdate()},3200),this.requestUpdate()}handleUndo(){this.history.undo()&&(this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast("Undo"))}handleRedo(){this.history.redo()&&(this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast("Redo"))}deleteSelection(){if(this.selection.kind==="none"||!this.selection.id)return;const{kind:t,id:e}=this.selection,i=structuredClone(this.currentDocument),s=i.floors.find(o=>o.id===this.activeFloorId);if(s){switch(t){case"wall":s.walls=s.walls.filter(o=>o.id!==e),s.openings=s.openings.filter(o=>o.wall_id!==e);break;case"room":s.rooms=s.rooms.filter(o=>o.id!==e);break;case"opening":s.openings=s.openings.filter(o=>o.id!==e);break;case"furniture":s.furniture=s.furniture.filter(o=>o.id!==e);break;case"entity":s.entities=s.entities.filter(o=>o.id!==e);break}this.selection={kind:"none",id:null},this.pushHistory(i,`Delete ${t}`),this.showToast(`Deleted ${t}`)}}sync3DScene(){this.scene3d&&this.scene3d.setDocument(this.currentDocument,this.activeFloorId,this.hass)}handleLayoutChangeEffect(){this.viewLayout==="2d"?this.scene3d&&(this.scene3d.dispose(),this.scene3d=null,this.sceneContainerEl=null):this.updateComplete.then(()=>{this.ensure3DSceneMounted()})}ensure3DSceneMounted(){if(this.viewLayout==="2d")return;const t=this.renderRoot.querySelector("#scene-3d-root");t&&(!this.scene3d||this.sceneContainerEl!==t?(this.scene3d?.dispose(),this.sceneContainerEl=t,this.scene3d=new at(t,{wallMode:"auto_cutaway",projection:"perspective",showRoomLabels:!0,showEntityBadges:!0,onCameraChanged:e=>{}}),this.scene3d.setDocument(this.currentDocument,this.activeFloorId,this.hass)):this.scene3d.resize())}handleFloorplanChange(t){const{floorplanId:e}=t.detail;e&&this.wsClient.getFloorplan(e).then(i=>{this.history.reset(i),this.activeFloorplanId=i.id,this.activeFloorId=i.floors[0]?.id??"",this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Loaded floorplan: ${i.name}`)}).catch(i=>{this.showToast(`Failed to load floorplan: ${i.message}`)})}handleFloorplanNew(){const t=`floorplan_${Date.now().toString(36)}`,e=`Floorplan ${this.floorplans.length+1}`,i=q(t,e);this.history.reset(i),this.activeFloorplanId=i.id,this.activeFloorId=i.floors[0]?.id??"",this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Created new floorplan: ${e}`)}async handleFloorplanDelete(){if(this.floorplans.length<=1){this.showToast("Cannot delete the only remaining floorplan.");return}if(window.confirm(`Are you sure you want to delete the floorplan "${this.currentDocument.name}"?`))try{await this.wsClient.deleteFloorplan(this.activeFloorplanId),this.showToast("Floorplan deleted."),await this.loadInitialData()}catch(e){this.showToast(`Failed to delete: ${e?.message||e}`)}}handleFloorChange(t){this.activeFloorId=t.detail.floorId,this.selection={kind:"none",id:null},this.scene3d?.setActiveFloor(this.activeFloorId),this.requestUpdate()}handleFloorAdd(){const t=structuredClone(this.currentDocument),e=Math.max(...t.floors.map(r=>r.level_index),0),i=Math.max(...t.floors.map(r=>r.elevation),0),s=e+1,o=i+(this.activeFloor?.wall_height??2.6),n=`floor_${Date.now().toString(36)}`,a={id:n,name:`Level ${s}`,level_index:s,elevation:o,wall_height:2.6,slab_thickness:.15,ha_floor_id:null,blueprint:null,default_camera:null,nodes:[],walls:[],openings:[],rooms:[],furniture:[],entities:[]};t.floors.push(a),this.activeFloorId=n,this.pushHistory(t,`Add Floor Level ${s}`),this.showToast(`Added Floor: ${a.name}`)}handleDuplicatePerimeter(){const t=structuredClone(this.currentDocument),e=t.floors.find(l=>l.id===this.activeFloorId);if(!e)return;const i=[...t.floors].filter(l=>l.level_index<e.level_index).sort((l,g)=>g.level_index-l.level_index)[0];if(!i){this.showToast("No floor level found below the current level.");return}const s=i.walls.filter(l=>l.is_exterior);if(s.length===0){this.showToast("Floor below has no exterior walls to duplicate.");return}const o=new Set;for(const l of s)o.add(l.start_node_id),o.add(l.end_node_id);const n=new Map,a=[];for(const l of i.nodes)if(o.has(l.id)){const g=`n_${Math.random().toString(36).substring(2,9)}`;n.set(l.id,g),a.push({id:g,x:l.x,y:l.y})}const r=s.map(l=>({id:`w_${Math.random().toString(36).substring(2,9)}`,start_node_id:n.get(l.start_node_id),end_node_id:n.get(l.end_node_id),thickness:l.thickness,height_override:l.height_override,is_exterior:!0,color_override:l.color_override}));e.nodes.push(...a),e.walls.push(...r),this.pushHistory(t,"Duplicate Perimeter from Below"),this.showToast(`Duplicated ${r.length} perimeter walls from ${i.name}`)}handleSaveCamera(){if(!this.scene3d){this.showToast("3D scene view is not active.");return}const t=this.scene3d.getCurrentCameraBookmark(),e=structuredClone(this.currentDocument),i=e.floors.find(s=>s.id===this.activeFloorId);i&&(i.default_camera=t,this.pushHistory(e,"Save 3D Camera as Default"),this.showToast("Saved current 3D camera as floor default."))}handleImportJsonClick(){this.renderRoot.querySelector("#json-file-input")?.click()}handleJsonFileSelected(t){const e=t.target;if(!e.files||e.files.length===0)return;const i=e.files[0],s=new FileReader;s.onload=o=>{try{const n=JSON.parse(o.target?.result);if(!n.id||!Array.isArray(n.floors))throw new Error("Invalid floorplan JSON schema: missing id or floors array");n.updated_at=new Date().toISOString(),this.history.push(n,"Import Floorplan JSON"),this.activeFloorplanId=n.id,this.activeFloorId=n.floors[0]?.id??"",this.updateHistoryFlags(),this.sync3DScene(),this.requestUpdate(),this.showToast(`Imported floorplan: ${n.name}`)}catch(n){this.showToast(`Failed to parse JSON: ${n?.message||n}`)}},s.readAsText(i),e.value=""}handleExportJson(){const t=JSON.stringify(this.currentDocument,null,2),e=new Blob([t],{type:"application/json"}),i=URL.createObjectURL(e),s=document.createElement("a");s.href=i,s.download=`${this.currentDocument.id||"floorplan"}.json`,s.click(),URL.revokeObjectURL(i),this.showToast("Exported floorplan JSON")}async handleSaveFloorplan(){try{const t=this.currentDocument;t.updated_at=new Date().toISOString();const e=await this.wsClient.saveFloorplan(t,t.revision);this.history.markSaved(),this.updateHistoryFlags(),this.showToast(`Floorplan saved (Rev ${e.revision})`);const i=await this.wsClient.listFloorplans();this.floorplans=i}catch(t){this.showToast(`Failed to save: ${t?.message||t}`)}}handleDocumentMutate(t){this.pushHistory(t.detail.document,t.detail.description)}handleSelectionChange(t){this.selection=t.detail.selection,this.requestUpdate()}handlePalettePlace(t){const e=t.detail,i=structuredClone(this.currentDocument),s=i.floors.find(o=>o.id===this.activeFloorId);if(s){if(e.kind==="entity"&&e.entityId){const o={id:`ent_${Math.random().toString(36).substring(2,9)}`,entity_id:e.entityId,domain:e.domain||e.entityId.split(".")[0]||"sensor",room_id:null,x:0,y:0,z_elevation:e.domain==="light"?2.4:1.2,rotation_deg:0,mesh_type:e.domain==="light"?"ceiling_light":"none",mesh_scale:[1,1,1],badge:{visible:!0,style:"icon_only",label_override:null,icon_override:null},tap_action:{action:"default"},hold_action:{action:"none"},double_tap_action:{action:"none"}};s.entities.push(o),this.selection={kind:"entity",id:o.id},this.pushHistory(i,`Place Entity ${e.entityId}`),this.showToast(`Placed entity: ${e.entityId}`)}else if(e.kind==="furniture"&&e.furnitureType){const o={id:`furn_${Math.random().toString(36).substring(2,9)}`,catalog_type:e.furnitureType,label:e.label||"Furniture",x:0,y:0,z_elevation:0,width:e.defaultWidth??1.5,depth:e.defaultDepth??.8,height:e.defaultHeight??.8,rotation_deg:0,color:null};s.furniture.push(o),this.selection={kind:"furniture",id:o.id},this.pushHistory(i,`Add ${o.label}`),this.showToast(`Added ${o.label}`)}else if(e.kind==="opening"&&e.openingType){if(s.walls.length===0){this.showToast("Please draw walls first before adding doors or windows.");return}const o=s.walls[0],n={id:`open_${Math.random().toString(36).substring(2,9)}`,wall_id:o.id,type:e.openingType,t:.5,width:e.defaultWidth??.9,sill_height:e.openingType.includes("window")?.9:0,head_height:2.1,swing_direction:"left_in",bound_entity_id:null};s.openings.push(n),this.selection={kind:"opening",id:n.id},this.pushHistory(i,`Add ${e.label||"Opening"}`),this.showToast(`Added ${e.label||"Opening"} to wall`)}}}handleBlueprintCalibrated(t){const e=t.detail,i=structuredClone(this.currentDocument),s=i.floors.find(o=>o.id===this.activeFloorId);s&&(s.blueprint={image_url:e.imageUrl,opacity:e.opacity,locked:!1,offset_x:0,offset_y:0,rotation_deg:0,meters_per_pixel:e.metersPerPixel,natural_width_px:e.naturalWidthPx,natural_height_px:e.naturalHeightPx},this.pushHistory(i,"Calibrate Blueprint Reference"),this.isBlueprintModalOpen=!1,this.showToast("Blueprint scale calibrated successfully"))}render(){const t=this.activeFloor,i=(this.selection.kind==="room"?t?.rooms.find(o=>o.id===this.selection.id):null)?.ha_area_id??null,s=t?[...this.currentDocument.floors].filter(o=>o.level_index<t.level_index).sort((o,n)=>n.level_index-o.level_index)[0]??null:null;return d`
      <!-- Top CAD Command Bar -->
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
        @floorplan-change=${this.handleFloorplanChange}
        @floorplan-new=${this.handleFloorplanNew}
        @floorplan-delete=${this.handleFloorplanDelete}
        @floor-change=${this.handleFloorChange}
        @floor-add=${this.handleFloorAdd}
        @duplicate-perimeter=${this.handleDuplicatePerimeter}
        @toggle-onion-skin=${o=>this.onionSkin=o.detail.onionSkin}
        @tool-change=${o=>this.activeTool=o.detail.tool}
        @calibrate-blueprint=${()=>this.isBlueprintModalOpen=!0}
        @grid-size-change=${o=>this.gridSize=o.detail.gridSize}
        @snap-toggle=${o=>this.snapToGrid=o.detail.snap}
        @undo=${this.handleUndo}
        @redo=${this.handleRedo}
        @layout-change=${o=>this.viewLayout=o.detail.layout}
        @save-camera=${this.handleSaveCamera}
        @import-json=${this.handleImportJsonClick}
        @export-json=${this.handleExportJson}
        @save-floorplan=${this.handleSaveFloorplan}
      ></floorplan-editor-toolbar>

      <!-- Main Editor Body -->
      <div class="editor-body">
        <!-- Left Dock: Entity & Catalog Palette -->
        <floorplan-entity-palette
          .hass=${this.hass}
          .activeFloor=${t}
          .selectedRoomAreaId=${i}
          @palette-place=${this.handlePalettePlace}
        ></floorplan-entity-palette>

        <!-- Center Viewport: 2D CAD Canvas + Split/3D Live Preview -->
        <div class="center-viewport">
          <!-- 2D Viewport Pane -->
          <div class="viewport-pane ${this.viewLayout==="3d"?"hidden":""}">
            <floorplan-canvas-2d
              .document=${this.currentDocument}
              .floor=${t}
              .tool=${this.activeTool}
              .gridSize=${this.gridSize}
              .snapToGrid=${this.snapToGrid}
              .onionSkinFloor=${this.onionSkin?s:null}
              .selection=${this.selection}
              .hass=${this.hass}
              @selection-change=${this.handleSelectionChange}
              @document-mutate=${this.handleDocumentMutate}
              @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
              @palette-place=${this.handlePalettePlace}
            ></floorplan-canvas-2d>
          </div>

          ${this.viewLayout==="split"?d`<div class="viewport-divider"></div>`:""}

          <!-- 3D Preview Pane -->
          <div class="viewport-pane ${this.viewLayout==="2d"?"hidden":""}">
            <div class="scene-3d-container" id="scene-3d-root"></div>
          </div>
        </div>

        <!-- Right Dock: Context-Sensitive Property Inspector -->
        <floorplan-property-inspector
          .hass=${this.hass}
          .document=${this.currentDocument}
          .floor=${t}
          .selection=${this.selection}
          @document-mutate=${this.handleDocumentMutate}
          @delete-selected=${()=>this.deleteSelection()}
          @open-blueprint-modal=${()=>this.isBlueprintModalOpen=!0}
        ></floorplan-property-inspector>
      </div>

      <!-- Blueprint 2-Point Calibration Modal -->
      <floorplan-blueprint-modal
        .open=${this.isBlueprintModalOpen}
        .floorplanId=${this.currentDocument.id}
        .floorId=${this.activeFloorId}
        .currentBlueprint=${t?.blueprint??null}
        .uploadCallback=${o=>this.wsClient.uploadBlueprint(o)}
        @blueprint-calibrated=${this.handleBlueprintCalibrated}
        @modal-close=${()=>this.isBlueprintModalOpen=!1}
      ></floorplan-blueprint-modal>

      <!-- Toast Overlay -->
      ${this.toastMessage?d`<div class="toast-overlay">${this.toastMessage}</div>`:""}

      <!-- Hidden file input for JSON import -->
      <input
        type="file"
        id="json-file-input"
        class="file-input-hidden"
        accept=".json,application/json"
        @change=${this.handleJsonFileSelected}
      />
    `}};$.styles=E`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      background: #090d16;
      color: #f8fafc;
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

    .center-viewport {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
      background: #090d16;
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
      width: 4px;
      background: #1e293b;
      border-left: 1px solid #334155;
      border-right: 1px solid #334155;
      cursor: col-resize;
      flex-shrink: 0;
    }

    .scene-3d-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #0f172a;
    }

    .toast-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #3b82f6;
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

    /* Narrow mode styling */
    :host([narrow]) .editor-body {
      flex-direction: column;
    }
  `;k([h({attribute:!1})],$.prototype,"hass",2);k([h({type:Boolean})],$.prototype,"narrow",2);k([c()],$.prototype,"floorplans",2);k([c()],$.prototype,"activeFloorplanId",2);k([c()],$.prototype,"activeFloorId",2);k([c()],$.prototype,"activeTool",2);k([c()],$.prototype,"viewLayout",2);k([c()],$.prototype,"gridSize",2);k([c()],$.prototype,"snapToGrid",2);k([c()],$.prototype,"onionSkin",2);k([c()],$.prototype,"selection",2);k([c()],$.prototype,"isBlueprintModalOpen",2);k([c()],$.prototype,"isDirty",2);k([c()],$.prototype,"canUndo",2);k([c()],$.prototype,"canRedo",2);k([c()],$.prototype,"toastMessage",2);$=k([B("floorplan-editor-panel")],$);
