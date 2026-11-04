import * as THREE from 'three';
import type {
  EntityPlacement,
  FurnitureCatalogType,
  FurnitureItem,
  WallEdge,
  WallNode,
  WallOpening
} from '../types/floorplan';
import type { ResolvedEntityVisualState } from './contracts';

/**
 * Procedural 3D Catalog Engine (`src/engine/ProceduralCatalog3D.ts`)
 *
 * Implements low-poly, wall-tablet optimized 3D procedural meshes:
 * - 19 Furniture variants with multi-part geometry, architectural color palettes, and shadows.
 * - Parametric wall openings (doors with animated swing hinges, sliding panels, windows with glass, archways).
 * - Live Home Assistant entity meshes (ceiling lights, wall sconces, glowing LED strips, TVs, spinning ceiling fans, thermostats, speakers).
 * - Full WebGL resource disposal to prevent memory leaks on long-running wall tablets.
 */
export class ProceduralCatalog3D {
  // ---------------------------------------------------------------------------
  // 1. FURNITURE PROCEDURAL MESH BUILDER
  // ---------------------------------------------------------------------------

  /**
   * Builds a procedural 3D furniture mesh group positioned at (item.x, floorElevation + item.z_elevation, item.y)
   * and rotated around Y by -item.rotation_deg (in radians).
   */
  public static buildFurnitureMesh(
    item: FurnitureItem,
    floorElevation: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(item.x, floorElevation + item.z_elevation, item.y);
    group.rotation.y = -item.rotation_deg * (Math.PI / 180);
    group.userData = {
      furnitureId: item.id,
      catalogType: item.catalog_type
    };

    const w = Math.max(0.05, item.width);
    const d = Math.max(0.05, item.depth);
    const h = Math.max(0.05, item.height);

    const userColor = item.color ? new THREE.Color(item.color) : null;

    switch (item.catalog_type) {
      case 'sofa_straight':
        ProceduralCatalog3D.buildSofaStraight(group, w, h, d, userColor);
        break;
      case 'sofa_l_shape':
        ProceduralCatalog3D.buildSofaLShape(group, w, h, d, userColor);
        break;
      case 'bed_double':
        ProceduralCatalog3D.buildBed(group, w, h, d, userColor, true);
        break;
      case 'bed_single':
        ProceduralCatalog3D.buildBed(group, w, h, d, userColor, false);
        break;
      case 'dining_table':
        ProceduralCatalog3D.buildDiningTable(group, w, h, d, userColor);
        break;
      case 'desk':
        ProceduralCatalog3D.buildDesk(group, w, h, d, userColor);
        break;
      case 'chair':
        ProceduralCatalog3D.buildChair(group, w, h, d, userColor);
        break;
      case 'tv_stand':
        ProceduralCatalog3D.buildTvStand(group, w, h, d, userColor);
        break;
      case 'kitchen_counter':
        ProceduralCatalog3D.buildKitchenCounter(group, w, h, d, userColor);
        break;
      case 'sink_cabinet':
        ProceduralCatalog3D.buildSinkCabinet(group, w, h, d, userColor);
        break;
      case 'refrigerator':
        ProceduralCatalog3D.buildRefrigerator(group, w, h, d, userColor);
        break;
      case 'stove':
        ProceduralCatalog3D.buildStove(group, w, h, d, userColor);
        break;
      case 'bathtub':
        ProceduralCatalog3D.buildBathtub(group, w, h, d, userColor);
        break;
      case 'shower_enclosure':
        ProceduralCatalog3D.buildShowerEnclosure(group, w, h, d, userColor);
        break;
      case 'toilet':
        ProceduralCatalog3D.buildToilet(group, w, h, d, userColor);
        break;
      case 'wardrobe':
        ProceduralCatalog3D.buildWardrobe(group, w, h, d, userColor);
        break;
      case 'bookcase':
        ProceduralCatalog3D.buildBookcase(group, w, h, d, userColor);
        break;
      case 'potted_plant':
        ProceduralCatalog3D.buildPottedPlant(group, w, h, d, userColor);
        break;
      case 'rug':
        ProceduralCatalog3D.buildRug(group, w, h, d, userColor);
        break;
      default:
        ProceduralCatalog3D.buildDefaultBox(group, w, h, d, userColor);
        break;
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // FURNITURE SUB-BUILDERS
  // ---------------------------------------------------------------------------

  private static buildSofaStraight(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const mainMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x475569,
      roughness: 0.85,
      metalness: 0.05
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: userColor ? userColor.clone().offsetHSL(0, -0.05, 0.08) : 0x64748b,
      roughness: 0.9,
      metalness: 0.02
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });

    const plinthH = h * 0.12;
    const seatH = h * 0.35;
    const backH = h;
    const armH = h * 0.65;
    const armW = Math.min(0.2, w * 0.14);
    const backD = Math.min(0.25, d * 0.24);

    // Plinth / feet base
    const plinth = ProceduralCatalog3D.createBox(
      w * 0.96,
      plinthH,
      d * 0.9,
      plinthMat,
      0,
      plinthH / 2,
      0
    );
    group.add(plinth);

    // Backrest (along -Z back edge)
    const backrest = ProceduralCatalog3D.createBox(
      w,
      backH - plinthH,
      backD,
      mainMat,
      0,
      plinthH + (backH - plinthH) / 2,
      -d / 2 + backD / 2
    );
    group.add(backrest);

    // Left and right armrests
    const leftArm = ProceduralCatalog3D.createBox(
      armW,
      armH - plinthH,
      d,
      mainMat,
      -w / 2 + armW / 2,
      plinthH + (armH - plinthH) / 2,
      0
    );
    const rightArm = ProceduralCatalog3D.createBox(
      armW,
      armH - plinthH,
      d,
      mainMat,
      w / 2 - armW / 2,
      plinthH + (armH - plinthH) / 2,
      0
    );
    group.add(leftArm);
    group.add(rightArm);

    // Seat cushions (between armrests and in front of backrest)
    const innerW = w - armW * 2 - 0.02;
    const innerD = d - backD - 0.02;
    const cushionCount = 2;
    const singleCushionW = innerW / cushionCount;

    for (let i = 0; i < cushionCount; i++) {
      const cx = -innerW / 2 + (i + 0.5) * singleCushionW;
      const cushion = ProceduralCatalog3D.createBox(
        singleCushionW - 0.015,
        seatH - plinthH,
        innerD,
        cushionMat,
        cx,
        plinthH + (seatH - plinthH) / 2,
        -d / 2 + backD + innerD / 2
      );
      group.add(cushion);

      // Back cushion
      const backCushionH = (backH - seatH) * 0.85;
      const backCushion = ProceduralCatalog3D.createBox(
        singleCushionW - 0.02,
        backCushionH,
        backD * 0.7,
        cushionMat,
        cx,
        seatH + backCushionH / 2,
        -d / 2 + backD + (backD * 0.7) / 2
      );
      group.add(backCushion);
    }
  }

  private static buildSofaLShape(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const mainMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x334155,
      roughness: 0.85,
      metalness: 0.05
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: userColor ? userColor.clone().offsetHSL(0, -0.05, 0.08) : 0x475569,
      roughness: 0.9,
      metalness: 0.02
    });

    const plinthH = h * 0.12;
    const seatH = h * 0.35;
    const backH = h;
    const armH = h * 0.65;
    const armW = Math.min(0.2, w * 0.12);
    const backD = Math.min(0.25, d * 0.22);

    const chaiseW = w * 0.4;
    const mainW = w - chaiseW;

    // Full backrest along the back
    const backrest = ProceduralCatalog3D.createBox(
      w,
      backH - plinthH,
      backD,
      mainMat,
      0,
      plinthH + (backH - plinthH) / 2,
      -d / 2 + backD / 2
    );
    group.add(backrest);

    // Left armrest
    const leftArm = ProceduralCatalog3D.createBox(
      armW,
      armH - plinthH,
      d * 0.65,
      mainMat,
      -w / 2 + armW / 2,
      plinthH + (armH - plinthH) / 2,
      -d / 2 + (d * 0.65) / 2
    );
    group.add(leftArm);

    // Main section seat
    const mainSeatW = mainW - armW;
    const mainSeatD = d * 0.65 - backD;
    const mainSeat = ProceduralCatalog3D.createBox(
      mainSeatW,
      seatH - plinthH,
      mainSeatD,
      cushionMat,
      -w / 2 + armW + mainSeatW / 2,
      plinthH + (seatH - plinthH) / 2,
      -d / 2 + backD + mainSeatD / 2
    );
    group.add(mainSeat);

    // Chaise lounge section extending forward to +d/2
    const chaiseD = d - backD;
    const chaise = ProceduralCatalog3D.createBox(
      chaiseW - 0.02,
      seatH - plinthH,
      chaiseD,
      cushionMat,
      w / 2 - chaiseW / 2,
      plinthH + (seatH - plinthH) / 2,
      -d / 2 + backD + chaiseD / 2
    );
    group.add(chaise);

    // Right short armrest
    const rightArm = ProceduralCatalog3D.createBox(
      armW,
      armH - plinthH,
      d * 0.45,
      mainMat,
      w / 2 - armW / 2,
      plinthH + (armH - plinthH) / 2,
      d / 2 - (d * 0.45) / 2
    );
    group.add(rightArm);
  }

  private static buildBed(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null,
    isDouble: boolean
  ): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x8b5a2b,
      roughness: 0.65,
      metalness: 0.1
    });
    const mattressMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      metalness: 0.02
    });
    const blanketMat = new THREE.MeshStandardMaterial({
      color: userColor ? userColor.clone().offsetHSL(0, 0.1, -0.15) : 0x2563eb,
      roughness: 0.85,
      metalness: 0.05
    });
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.95,
      metalness: 0.0
    });

    const frameH = h * 0.28;
    const mattressH = h * 0.26;
    const headboardD = Math.min(0.12, d * 0.08);

    // Headboard at back (-Z)
    const headboard = ProceduralCatalog3D.createBox(
      w,
      h,
      headboardD,
      frameMat,
      0,
      h / 2,
      -d / 2 + headboardD / 2
    );
    group.add(headboard);

    // Bed frame base
    const bedFrame = ProceduralCatalog3D.createBox(
      w * 0.98,
      frameH,
      d - headboardD - 0.02,
      frameMat,
      0,
      frameH / 2,
      -d / 2 + headboardD + (d - headboardD - 0.02) / 2
    );
    group.add(bedFrame);

    // Mattress
    const mattressW = w * 0.92;
    const mattressD = d - headboardD - 0.08;
    const mattress = ProceduralCatalog3D.createBox(
      mattressW,
      mattressH,
      mattressD,
      mattressMat,
      0,
      frameH + mattressH / 2,
      -d / 2 + headboardD + 0.04 + mattressD / 2
    );
    group.add(mattress);

    // Blanket accent covering front 60% of mattress
    const blanketD = mattressD * 0.6;
    const blanket = ProceduralCatalog3D.createBox(
      mattressW + 0.02,
      mattressH * 0.2,
      blanketD,
      blanketMat,
      0,
      frameH + mattressH + (mattressH * 0.2) / 2,
      -d / 2 + headboardD + 0.04 + (mattressD - blanketD / 2)
    );
    group.add(blanket);

    // Pillows
    const pillowW = isDouble ? mattressW * 0.42 : mattressW * 0.65;
    const pillowD = mattressD * 0.24;
    const pillowH = mattressH * 0.35;
    const pillowZ = -d / 2 + headboardD + 0.06 + pillowD / 2;
    const pillowY = frameH + mattressH + pillowH / 2;

    if (isDouble) {
      const leftPillow = ProceduralCatalog3D.createBox(
        pillowW,
        pillowH,
        pillowD,
        pillowMat,
        -mattressW * 0.24,
        pillowY,
        pillowZ
      );
      const rightPillow = ProceduralCatalog3D.createBox(
        pillowW,
        pillowH,
        pillowD,
        pillowMat,
        mattressW * 0.24,
        pillowY,
        pillowZ
      );
      group.add(leftPillow);
      group.add(rightPillow);
    } else {
      const pillow = ProceduralCatalog3D.createBox(
        pillowW,
        pillowH,
        pillowD,
        pillowMat,
        0,
        pillowY,
        pillowZ
      );
      group.add(pillow);
    }
  }

  private static buildDiningTable(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x96714e,
      roughness: 0.65,
      metalness: 0.1
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.6
    });

    const topThickness = 0.04;
    const legH = h - topThickness;
    const legSize = 0.045;
    const insetX = Math.min(0.08, w * 0.1);
    const insetZ = Math.min(0.08, d * 0.1);

    // Tabletop
    const tabletop = ProceduralCatalog3D.createBox(
      w,
      topThickness,
      d,
      woodMat,
      0,
      h - topThickness / 2,
      0
    );
    group.add(tabletop);

    // 4 Legs
    const legPositions: [number, number][] = [
      [-w / 2 + insetX, -d / 2 + insetZ],
      [w / 2 - insetX, -d / 2 + insetZ],
      [w / 2 - insetX, d / 2 - insetZ],
      [-w / 2 + insetX, d / 2 - insetZ]
    ];

    for (const [lx, lz] of legPositions) {
      const leg = ProceduralCatalog3D.createBox(
        legSize,
        legH,
        legSize,
        legMat,
        lx,
        legH / 2,
        lz
      );
      group.add(leg);
    }
  }

  private static buildDesk(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const topMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xd4a373,
      roughness: 0.6,
      metalness: 0.1
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.5
    });

    const topThickness = 0.04;
    const bodyH = h - topThickness;

    // Desktop
    const top = ProceduralCatalog3D.createBox(
      w,
      topThickness,
      d,
      topMat,
      0,
      h - topThickness / 2,
      0
    );
    group.add(top);

    // Left legs
    const legSize = 0.04;
    const leftLeg1 = ProceduralCatalog3D.createBox(
      legSize,
      bodyH,
      legSize,
      frameMat,
      -w / 2 + 0.05,
      bodyH / 2,
      -d / 2 + 0.05
    );
    const leftLeg2 = ProceduralCatalog3D.createBox(
      legSize,
      bodyH,
      legSize,
      frameMat,
      -w / 2 + 0.05,
      bodyH / 2,
      d / 2 - 0.05
    );
    group.add(leftLeg1);
    group.add(leftLeg2);

    // Right drawer pedestal
    const pedestalW = Math.min(0.45, w * 0.32);
    const pedestalD = d * 0.88;
    const pedestal = ProceduralCatalog3D.createBox(
      pedestalW,
      bodyH,
      pedestalD,
      frameMat,
      w / 2 - pedestalW / 2 - 0.02,
      bodyH / 2,
      0
    );
    group.add(pedestal);

    // Drawer handle accents
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8
    });
    for (let i = 0; i < 3; i++) {
      const hy = bodyH * 0.2 + i * (bodyH * 0.3);
      const handle = ProceduralCatalog3D.createBox(
        pedestalW * 0.4,
        0.015,
        0.015,
        handleMat,
        w / 2 - pedestalW / 2 - 0.02,
        hy,
        pedestalD / 2 + 0.01
      );
      group.add(handle);
    }

    // Rear modesty panel
    const modestyW = w - pedestalW - 0.15;
    const modestyH = bodyH * 0.5;
    const modesty = ProceduralCatalog3D.createBox(
      modestyW,
      modestyH,
      0.02,
      frameMat,
      -w / 2 + 0.05 + modestyW / 2,
      bodyH - modestyH / 2,
      -d / 2 + 0.04
    );
    group.add(modesty);
  }

  private static buildChair(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const seatMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x475569,
      roughness: 0.8,
      metalness: 0.05
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.6,
      metalness: 0.1
    });

    const seatH = h * 0.48;
    const seatThickness = 0.04;
    const legSize = 0.035;

    // 4 Legs
    const insetX = w * 0.15;
    const insetZ = d * 0.15;
    const legPositions: [number, number][] = [
      [-w / 2 + insetX, -d / 2 + insetZ],
      [w / 2 - insetX, -d / 2 + insetZ],
      [w / 2 - insetX, d / 2 - insetZ],
      [-w / 2 + insetX, d / 2 - insetZ]
    ];
    for (const [lx, lz] of legPositions) {
      const leg = ProceduralCatalog3D.createBox(
        legSize,
        seatH,
        legSize,
        legMat,
        lx,
        seatH / 2,
        lz
      );
      group.add(leg);
    }

    // Seat cushion
    const seat = ProceduralCatalog3D.createBox(
      w,
      seatThickness,
      d * 0.9,
      seatMat,
      0,
      seatH + seatThickness / 2,
      d * 0.02
    );
    group.add(seat);

    // Backrest (along -Z back)
    const backH = h - seatH - seatThickness;
    const backrest = ProceduralCatalog3D.createBox(
      w * 0.88,
      backH,
      0.03,
      seatMat,
      0,
      seatH + seatThickness + backH / 2,
      -d / 2 + 0.04
    );
    group.add(backrest);
  }

  private static buildTvStand(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x1e293b,
      roughness: 0.7,
      metalness: 0.2
    });
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.1
    });
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.7
    });

    const footH = Math.min(0.08, h * 0.15);
    const bodyH = h - footH;

    // 4 Feet
    const footSize = 0.04;
    const footPositions: [number, number][] = [
      [-w / 2 + 0.06, -d / 2 + 0.06],
      [w / 2 - 0.06, -d / 2 + 0.06],
      [w / 2 - 0.06, d / 2 - 0.06],
      [-w / 2 + 0.06, d / 2 - 0.06]
    ];
    for (const [fx, fz] of footPositions) {
      const foot = ProceduralCatalog3D.createBox(
        footSize,
        footH,
        footSize,
        footMat,
        fx,
        footH / 2,
        fz
      );
      group.add(foot);
    }

    // Main cabinet body
    const body = ProceduralCatalog3D.createBox(
      w,
      bodyH,
      d,
      cabinetMat,
      0,
      footH + bodyH / 2,
      0
    );
    group.add(body);

    // Front center shelf opening accent
    const centerShelfW = w * 0.4;
    const centerShelfH = bodyH * 0.65;
    const shelfCutout = ProceduralCatalog3D.createBox(
      centerShelfW,
      centerShelfH,
      0.03,
      shelfMat,
      0,
      footH + bodyH / 2,
      d / 2 + 0.015
    );
    group.add(shelfCutout);
  }

  private static buildKitchenCounter(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const baseMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xf8fafc,
      roughness: 0.5,
      metalness: 0.1
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.35,
      metalness: 0.1
    });
    const toeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.2
    });

    const toeH = 0.08;
    const topThickness = 0.04;
    const cabinetH = h - toeH - topThickness;

    // Toe-kick (inset at front +Z)
    const toeKick = ProceduralCatalog3D.createBox(
      w,
      toeH,
      d * 0.9,
      toeMat,
      0,
      toeH / 2,
      -d * 0.05
    );
    group.add(toeKick);

    // Cabinet body
    const cabinet = ProceduralCatalog3D.createBox(
      w,
      cabinetH,
      d * 0.96,
      baseMat,
      0,
      toeH + cabinetH / 2,
      -d * 0.02
    );
    group.add(cabinet);

    // Countertop slab with overhang
    const top = ProceduralCatalog3D.createBox(
      w * 1.01,
      topThickness,
      d * 1.02,
      stoneMat,
      0,
      h - topThickness / 2,
      0
    );
    group.add(top);
  }

  private static buildSinkCabinet(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    ProceduralCatalog3D.buildKitchenCounter(group, w, h, d, userColor);

    const sinkMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.2,
      metalness: 0.85
    });

    // Recessed sink basin
    const sinkW = Math.min(0.5, w * 0.6);
    const sinkD = Math.min(0.4, d * 0.6);
    const sink = ProceduralCatalog3D.createBox(
      sinkW,
      0.02,
      sinkD,
      sinkMat,
      0,
      h + 0.005,
      0
    );
    group.add(sink);

    // Faucet fixture
    const faucetH = 0.2;
    const faucetRiser = ProceduralCatalog3D.createCylinder(
      0.012,
      0.012,
      faucetH,
      sinkMat,
      0,
      h + faucetH / 2,
      -sinkD / 2 - 0.03
    );
    const faucetSpout = ProceduralCatalog3D.createBox(
      0.018,
      0.018,
      0.1,
      sinkMat,
      0,
      h + faucetH,
      -sinkD / 2 + 0.02
    );
    group.add(faucetRiser);
    group.add(faucetSpout);
  }

  private static buildRefrigerator(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const metalMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x94a3b8,
      roughness: 0.25,
      metalness: 0.65
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.2,
      metalness: 0.8
    });

    // Fridge main body
    const body = ProceduralCatalog3D.createBox(w, h, d, metalMat, 0, h / 2, 0);
    group.add(body);

    // Door split groove: Top door 38%, Bottom door 58%
    const seamY = h * 0.6;
    const seam = ProceduralCatalog3D.createBox(
      w * 0.98,
      0.015,
      0.01,
      handleMat,
      0,
      seamY,
      d / 2 + 0.005
    );
    group.add(seam);

    // Two vertical handles on front right edge
    const topHandle = ProceduralCatalog3D.createBox(
      0.02,
      h * 0.25,
      0.025,
      handleMat,
      w / 2 - 0.06,
      h * 0.75,
      d / 2 + 0.02
    );
    const btmHandle = ProceduralCatalog3D.createBox(
      0.02,
      h * 0.35,
      0.025,
      handleMat,
      w / 2 - 0.06,
      h * 0.35,
      d / 2 + 0.02
    );
    group.add(topHandle);
    group.add(btmHandle);
  }

  private static buildStove(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x1e293b,
      roughness: 0.3,
      metalness: 0.7
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9
    });
    const burnerMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.8,
      metalness: 0.4
    });

    // Body
    const body = ProceduralCatalog3D.createBox(w, h, d, bodyMat, 0, h / 2, 0);
    group.add(body);

    // Oven glass door window on front (+Z)
    const ovenW = w * 0.75;
    const ovenH = h * 0.45;
    const ovenWindow = ProceduralCatalog3D.createBox(
      ovenW,
      ovenH,
      0.02,
      glassMat,
      0,
      h * 0.35,
      d / 2 + 0.008
    );
    group.add(ovenWindow);

    // 4 Burner rings on top
    const burnerRadius = Math.min(0.09, Math.min(w, d) * 0.18);
    const burnerOffsets: [number, number][] = [
      [-w * 0.24, -d * 0.22],
      [w * 0.24, -d * 0.22],
      [-w * 0.24, d * 0.22],
      [w * 0.24, d * 0.22]
    ];
    for (const [bx, bz] of burnerOffsets) {
      const burner = ProceduralCatalog3D.createCylinder(
        burnerRadius,
        burnerRadius,
        0.008,
        burnerMat,
        bx,
        h + 0.004,
        bz
      );
      group.add(burner);
    }
  }

  private static buildBathtub(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const tubMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xffffff,
      roughness: 0.15,
      metalness: 0.05
    });
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.1
    });

    // Tub outer shell
    const outer = ProceduralCatalog3D.createBox(w, h, d, tubMat, 0, h / 2, 0);
    group.add(outer);

    // Tub recessed basin interior
    const rim = 0.08;
    const basin = ProceduralCatalog3D.createBox(
      w - rim * 2,
      0.02,
      d - rim * 2,
      basinMat,
      0,
      h + 0.002,
      0
    );
    group.add(basin);
  }

  private static buildShowerEnclosure(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const trayMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xf8fafc,
      roughness: 0.3,
      metalness: 0.1
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.32
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.85
    });

    const trayH = 0.06;
    const glassH = h - trayH;

    // Shower tray base
    const tray = ProceduralCatalog3D.createBox(
      w,
      trayH,
      d,
      trayMat,
      0,
      trayH / 2,
      0
    );
    group.add(tray);

    // Front glass panel
    const frontGlass = ProceduralCatalog3D.createBox(
      w,
      glassH,
      0.015,
      glassMat,
      0,
      trayH + glassH / 2,
      d / 2 - 0.01,
      false
    );
    // Side glass panel
    const sideGlass = ProceduralCatalog3D.createBox(
      0.015,
      glassH,
      d,
      glassMat,
      w / 2 - 0.01,
      trayH + glassH / 2,
      0,
      false
    );
    group.add(frontGlass);
    group.add(sideGlass);

    // Corner frame post
    const post = ProceduralCatalog3D.createBox(
      0.03,
      glassH,
      0.03,
      chromeMat,
      w / 2 - 0.015,
      trayH + glassH / 2,
      d / 2 - 0.015
    );
    group.add(post);
  }

  private static buildToilet(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xffffff,
      roughness: 0.15,
      metalness: 0.05
    });
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.05
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.85
    });

    const bowlH = h * 0.48;
    const tankD = Math.min(0.22, d * 0.35);
    const tankH = h - bowlH;

    // Rear water tank / cistern
    const tank = ProceduralCatalog3D.createBox(
      w * 0.75,
      h,
      tankD,
      porcelainMat,
      0,
      h / 2,
      -d / 2 + tankD / 2
    );
    group.add(tank);

    // Flush button on top of tank
    const button = ProceduralCatalog3D.createCylinder(
      0.025,
      0.025,
      0.01,
      chromeMat,
      0,
      h + 0.005,
      -d / 2 + tankD / 2
    );
    group.add(button);

    // Pedestal & bowl
    const bowlD = d - tankD;
    const bowl = ProceduralCatalog3D.createBox(
      w * 0.6,
      bowlH,
      bowlD,
      porcelainMat,
      0,
      bowlH / 2,
      -d / 2 + tankD + bowlD / 2
    );
    group.add(bowl);

    // Seat lid
    const lid = ProceduralCatalog3D.createBox(
      w * 0.62,
      0.025,
      bowlD * 0.95,
      seatMat,
      0,
      bowlH + 0.015,
      -d / 2 + tankD + bowlD / 2
    );
    group.add(lid);
  }

  private static buildWardrobe(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x5c4033,
      roughness: 0.6,
      metalness: 0.1
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.85
    });

    const body = ProceduralCatalog3D.createBox(w, h, d, woodMat, 0, h / 2, 0);
    group.add(body);

    // Center vertical door seam line
    const seam = ProceduralCatalog3D.createBox(
      0.01,
      h * 0.9,
      0.008,
      handleMat,
      0,
      h / 2,
      d / 2 + 0.004
    );
    group.add(seam);

    // Two door handles
    const leftHandle = ProceduralCatalog3D.createBox(
      0.02,
      h * 0.15,
      0.02,
      handleMat,
      -0.04,
      h * 0.5,
      d / 2 + 0.015
    );
    const rightHandle = ProceduralCatalog3D.createBox(
      0.02,
      h * 0.15,
      0.02,
      handleMat,
      0.04,
      h * 0.5,
      d / 2 + 0.015
    );
    group.add(leftHandle);
    group.add(rightHandle);
  }

  private static buildBookcase(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x3e2723,
      roughness: 0.65,
      metalness: 0.1
    });
    const panelThickness = 0.03;

    // Back panel
    const back = ProceduralCatalog3D.createBox(
      w,
      h,
      0.02,
      frameMat,
      0,
      h / 2,
      -d / 2 + 0.01
    );
    group.add(back);

    // Left and right side walls
    const leftWall = ProceduralCatalog3D.createBox(
      panelThickness,
      h,
      d,
      frameMat,
      -w / 2 + panelThickness / 2,
      h / 2,
      0
    );
    const rightWall = ProceduralCatalog3D.createBox(
      panelThickness,
      h,
      d,
      frameMat,
      w / 2 - panelThickness / 2,
      h / 2,
      0
    );
    group.add(leftWall);
    group.add(rightWall);

    // 4 Shelves
    const shelfCount = 4;
    const shelfSpacing = (h - panelThickness) / (shelfCount - 1);
    const innerW = w - panelThickness * 2;

    for (let i = 0; i < shelfCount; i++) {
      const sy = panelThickness / 2 + i * shelfSpacing;
      const shelf = ProceduralCatalog3D.createBox(
        innerW,
        panelThickness,
        d * 0.95,
        frameMat,
        0,
        sy,
        0.01
      );
      group.add(shelf);
    }

    // Decorative book block on shelf 1
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.8,
      metalness: 0.0
    });
    const bookBlock = ProceduralCatalog3D.createBox(
      innerW * 0.35,
      shelfSpacing * 0.55,
      d * 0.6,
      bookMat,
      -innerW * 0.2,
      shelfSpacing + (shelfSpacing * 0.55) / 2 + panelThickness,
      0
    );
    group.add(bookBlock);
  }

  private static buildPottedPlant(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const potMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0xc2410c,
      roughness: 0.85,
      metalness: 0.05
    });
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.95,
      metalness: 0.0
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7,
      metalness: 0.0
    });

    const potH = h * 0.35;
    const potRTop = Math.min(w, d) * 0.35;
    const potRBtm = Math.min(w, d) * 0.25;

    // Terracotta pot
    const pot = ProceduralCatalog3D.createCylinder(
      potRTop,
      potRBtm,
      potH,
      potMat,
      0,
      potH / 2,
      0
    );
    group.add(pot);

    // Soil
    const soil = ProceduralCatalog3D.createCylinder(
      potRTop * 0.95,
      potRTop * 0.95,
      0.02,
      soilMat,
      0,
      potH + 0.005,
      0
    );
    group.add(soil);

    // Foliage spheres cluster
    const foliageH = h - potH;
    const leafOffsets: [number, number, number, number][] = [
      [0, potH + foliageH * 0.5, 0, potRTop * 1.1],
      [-potRTop * 0.3, potH + foliageH * 0.35, potRTop * 0.2, potRTop * 0.85],
      [potRTop * 0.35, potH + foliageH * 0.4, -potRTop * 0.2, potRTop * 0.8],
      [0, potH + foliageH * 0.85, 0, potRTop * 0.7]
    ];

    for (const [lx, ly, lz, lr] of leafOffsets) {
      const leafGeo = new THREE.SphereGeometry(lr, 8, 6);
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafMesh.position.set(lx, ly, lz);
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;
      group.add(leafMesh);
    }
  }

  private static buildRug(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const rugMat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x64748b,
      roughness: 0.95,
      metalness: 0.0
    });

    const rug = ProceduralCatalog3D.createBox(
      w,
      0.012,
      d,
      rugMat,
      0,
      0.006,
      0,
      false, // Rug doesn't need to cast shadows on the floor
      true
    );
    group.add(rug);
  }

  private static buildDefaultBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    userColor: THREE.Color | null
  ): void {
    const mat = new THREE.MeshStandardMaterial({
      color: userColor ?? 0x94a3b8,
      roughness: 0.6,
      metalness: 0.1
    });
    const box = ProceduralCatalog3D.createBox(w, h, d, mat, 0, h / 2, 0);
    group.add(box);
  }

  // ---------------------------------------------------------------------------
  // 2. WALL OPENING PROCEDURAL MESH BUILDER
  // ---------------------------------------------------------------------------

  /**
   * Builds an opening mesh group along the wall edge at parameter t.
   */
  public static buildOpeningMesh(
    opening: WallOpening,
    wall: WallEdge,
    startNode: WallNode,
    endNode: WallNode,
    floorElevation: number,
    initialOpenProgress = 0
  ): THREE.Group {
    const px = startNode.x + opening.t * (endNode.x - startNode.x);
    const py = startNode.y + opening.t * (endNode.y - startNode.y);
    const wallAngle = Math.atan2(endNode.y - startNode.y, endNode.x - startNode.x);

    const group = new THREE.Group();
    group.position.set(px, floorElevation, py);
    group.rotation.y = -wallAngle;
    group.userData = {
      openingId: opening.id,
      openingType: opening.type,
      swingDirection: opening.swing_direction,
      width: opening.width,
      openProgress: initialOpenProgress
    };

    const wallThickness = wall.thickness || 0.15;
    const sillH = opening.sill_height || 0;
    const headH = opening.head_height || 2.1;
    const openH = Math.max(0.2, headH - sillH);
    const openW = Math.max(0.2, opening.width);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.2
    });
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.1
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.2,
      metalness: 0.85
    });

    const jambW = 0.05;
    const jambD = wallThickness + 0.02;

    switch (opening.type) {
      case 'door_single': {
        // Frame jambs + header
        const leftJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          -openW / 2 + jambW / 2,
          sillH + openH / 2,
          0
        );
        const rightJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          openW / 2 - jambW / 2,
          sillH + openH / 2,
          0
        );
        const header = ProceduralCatalog3D.createBox(
          openW,
          jambW,
          jambD,
          frameMat,
          0,
          headH - jambW / 2,
          0
        );
        group.add(leftJamb);
        group.add(rightJamb);
        group.add(header);

        // Hinge sub-group
        const doorW = openW - jambW * 2 - 0.01;
        const doorH = openH - jambW - 0.02;
        const doorThick = 0.04;
        const isLeftHinge = opening.swing_direction.startsWith('left');

        const hingePivot = new THREE.Group();
        if (isLeftHinge) {
          hingePivot.position.set(-openW / 2 + jambW + 0.01, sillH, 0);
          const leaf = ProceduralCatalog3D.createBox(
            doorW,
            doorH,
            doorThick,
            doorLeafMat,
            doorW / 2,
            doorH / 2,
            0
          );
          hingePivot.add(leaf);

          // Handle lever
          const handle = ProceduralCatalog3D.createBox(
            0.08,
            0.02,
            0.08,
            chromeMat,
            doorW - 0.06,
            1.0,
            0
          );
          hingePivot.add(handle);

          group.userData.hingePivotLeft = hingePivot;
        } else {
          hingePivot.position.set(openW / 2 - jambW - 0.01, sillH, 0);
          const leaf = ProceduralCatalog3D.createBox(
            doorW,
            doorH,
            doorThick,
            doorLeafMat,
            -doorW / 2,
            doorH / 2,
            0
          );
          hingePivot.add(leaf);

          const handle = ProceduralCatalog3D.createBox(
            0.08,
            0.02,
            0.08,
            chromeMat,
            -doorW + 0.06,
            1.0,
            0
          );
          hingePivot.add(handle);

          group.userData.hingePivotRight = hingePivot;
        }

        group.add(hingePivot);
        break;
      }

      case 'door_double': {
        const leftJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          -openW / 2 + jambW / 2,
          sillH + openH / 2,
          0
        );
        const rightJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          openW / 2 - jambW / 2,
          sillH + openH / 2,
          0
        );
        const header = ProceduralCatalog3D.createBox(
          openW,
          jambW,
          jambD,
          frameMat,
          0,
          headH - jambW / 2,
          0
        );
        group.add(leftJamb);
        group.add(rightJamb);
        group.add(header);

        const leafW = (openW - jambW * 2 - 0.02) / 2;
        const doorH = openH - jambW - 0.02;
        const doorThick = 0.04;

        // Left hinge
        const leftPivot = new THREE.Group();
        leftPivot.position.set(-openW / 2 + jambW + 0.01, sillH, 0);
        const leftLeaf = ProceduralCatalog3D.createBox(
          leafW,
          doorH,
          doorThick,
          doorLeafMat,
          leafW / 2,
          doorH / 2,
          0
        );
        leftPivot.add(leftLeaf);
        const leftHandle = ProceduralCatalog3D.createBox(
          0.06,
          0.02,
          0.08,
          chromeMat,
          leafW - 0.04,
          1.0,
          0
        );
        leftPivot.add(leftHandle);
        group.userData.hingePivotLeft = leftPivot;
        group.add(leftPivot);

        // Right hinge
        const rightPivot = new THREE.Group();
        rightPivot.position.set(openW / 2 - jambW - 0.01, sillH, 0);
        const rightLeaf = ProceduralCatalog3D.createBox(
          leafW,
          doorH,
          doorThick,
          doorLeafMat,
          -leafW / 2,
          doorH / 2,
          0
        );
        rightPivot.add(rightLeaf);
        const rightHandle = ProceduralCatalog3D.createBox(
          0.06,
          0.02,
          0.08,
          chromeMat,
          -leafW + 0.04,
          1.0,
          0
        );
        rightPivot.add(rightHandle);
        group.userData.hingePivotRight = rightPivot;
        group.add(rightPivot);
        break;
      }

      case 'door_sliding': {
        const leftJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          -openW / 2 + jambW / 2,
          sillH + openH / 2,
          0
        );
        const rightJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          openW / 2 - jambW / 2,
          sillH + openH / 2,
          0
        );
        const header = ProceduralCatalog3D.createBox(
          openW,
          jambW,
          jambD,
          frameMat,
          0,
          headH - jambW / 2,
          0
        );
        group.add(leftJamb);
        group.add(rightJamb);
        group.add(header);

        const slidingPanel = new THREE.Group();
        const panelW = openW * 0.52;
        const panelH = openH - jambW - 0.02;
        const initialX = -openW * 0.23;
        slidingPanel.userData.initialX = initialX;
        slidingPanel.position.set(initialX, sillH, 0.02);

        const panel = ProceduralCatalog3D.createBox(
          panelW,
          panelH,
          0.035,
          doorLeafMat,
          0,
          panelH / 2,
          0
        );
        slidingPanel.add(panel);
        group.userData.slidingPanel = slidingPanel;
        group.add(slidingPanel);
        break;
      }

      case 'window_standard':
      case 'window_floor_to_ceiling': {
        const leftJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          -openW / 2 + jambW / 2,
          sillH + openH / 2,
          0
        );
        const rightJamb = ProceduralCatalog3D.createBox(
          jambW,
          openH,
          jambD,
          frameMat,
          openW / 2 - jambW / 2,
          sillH + openH / 2,
          0
        );
        const header = ProceduralCatalog3D.createBox(
          openW,
          jambW,
          jambD,
          frameMat,
          0,
          headH - jambW / 2,
          0
        );
        const sill = ProceduralCatalog3D.createBox(
          openW * 1.05,
          0.04,
          jambD + 0.04,
          frameMat,
          0,
          sillH + 0.02,
          0
        );
        group.add(leftJamb);
        group.add(rightJamb);
        group.add(header);
        group.add(sill);

        // Glass pane
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x88c0d0,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.32
        });
        const glass = ProceduralCatalog3D.createBox(
          openW - jambW * 2,
          openH - jambW - 0.04,
          0.015,
          glassMat,
          0,
          sillH + 0.04 + (openH - jambW - 0.04) / 2,
          0,
          false
        );
        group.add(glass);

        // Center mullion bar if wide
        if (openW >= 1.0) {
          const mullion = ProceduralCatalog3D.createBox(
            0.03,
            openH - jambW - 0.04,
            0.03,
            frameMat,
            0,
            sillH + 0.04 + (openH - jambW - 0.04) / 2,
            0
          );
          group.add(mullion);
        }
        break;
      }

      case 'archway': {
        const pillarW = 0.08;
        const leftPillar = ProceduralCatalog3D.createBox(
          pillarW,
          openH,
          jambD,
          frameMat,
          -openW / 2 + pillarW / 2,
          sillH + openH / 2,
          0
        );
        const rightPillar = ProceduralCatalog3D.createBox(
          pillarW,
          openH,
          jambD,
          frameMat,
          openW / 2 - pillarW / 2,
          sillH + openH / 2,
          0
        );
        const topTrim = ProceduralCatalog3D.createBox(
          openW * 1.04,
          0.08,
          jambD * 1.05,
          frameMat,
          0,
          headH - 0.04,
          0
        );
        group.add(leftPillar);
        group.add(rightPillar);
        group.add(topTrim);
        break;
      }
    }

    ProceduralCatalog3D.updateOpeningSwing(group, initialOpenProgress);
    return group;
  }

  /**
   * Sets the opening swing rotation / translation progress [0..1].
   */
  public static updateOpeningSwing(
    openingGroup: THREE.Group,
    openProgress: number
  ): void {
    const clamped = Math.max(0, Math.min(1, openProgress));
    openingGroup.userData.openProgress = clamped;
    const swingDir = (openingGroup.userData.swingDirection as string) || 'left_in';
    const maxRad = 82 * (Math.PI / 180);

    const leftPivot = openingGroup.userData.hingePivotLeft as THREE.Group | undefined;
    const rightPivot = openingGroup.userData.hingePivotRight as THREE.Group | undefined;
    const slidingPanel = openingGroup.userData.slidingPanel as THREE.Group | undefined;

    if (openingGroup.userData.openingType === 'door_single') {
      if (leftPivot) {
        const sign = swingDir === 'left_in' ? 1 : -1;
        leftPivot.rotation.y = sign * maxRad * clamped;
      } else if (rightPivot) {
        const sign = swingDir === 'right_in' ? -1 : 1;
        rightPivot.rotation.y = sign * maxRad * clamped;
      }
    } else if (openingGroup.userData.openingType === 'door_double') {
      if (leftPivot && rightPivot) {
        const isIn = swingDir.endsWith('_in');
        const leftSign = isIn ? 1 : -1;
        const rightSign = isIn ? -1 : 1;
        leftPivot.rotation.y = leftSign * maxRad * clamped;
        rightPivot.rotation.y = rightSign * maxRad * clamped;
      }
    } else if (openingGroup.userData.openingType === 'door_sliding' && slidingPanel) {
      const initX = (slidingPanel.userData.initialX as number) || 0;
      const width = (openingGroup.userData.width as number) || 1.0;
      slidingPanel.position.x = initX + clamped * width * 0.85;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. ENTITY 3D MESH BUILDER
  // ---------------------------------------------------------------------------

  /**
   * Builds an interactive 3D entity mesh group positioned at (placement.x, floorElevation + placement.z_elevation, placement.y).
   */
  public static buildEntityMesh(
    placement: EntityPlacement,
    visualState: ResolvedEntityVisualState,
    floorElevation: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(
      placement.x,
      floorElevation + placement.z_elevation,
      placement.y
    );
    group.rotation.y = -placement.rotation_deg * (Math.PI / 180);
    group.userData = {
      placementId: placement.id,
      entityId: placement.entity_id,
      meshType: placement.mesh_type,
      fanSpeed: visualState.fanPercentage,
      isActive: visualState.isActive
    };

    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.7
    });

    const emissiveColor = new THREE.Color(
      visualState.rgb[0],
      visualState.rgb[1],
      visualState.rgb[2]
    );
    const emissiveIntensity = visualState.isActive
      ? Math.max(0.4, visualState.brightness * 2.0)
      : 0.05;

    const emissiveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: emissiveColor,
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.1
    });
    group.userData.emissiveMaterial = emissiveMat;

    switch (placement.mesh_type) {
      case 'ceiling_light': {
        // Sleek flush ceiling canopy
        const canopy = ProceduralCatalog3D.createCylinder(
          0.14,
          0.14,
          0.025,
          housingMat,
          0,
          0.012,
          0
        );
        // Translucent bulb dome
        const bulb = ProceduralCatalog3D.createSphere(
          0.09,
          emissiveMat,
          0,
          -0.04,
          0
        );
        group.add(canopy);
        group.add(bulb);
        break;
      }

      case 'wall_sconce': {
        // Wall mounting plate against wall (-Z)
        const wallPlate = ProceduralCatalog3D.createBox(
          0.08,
          0.12,
          0.02,
          housingMat,
          0,
          0,
          -0.01
        );
        // Arm bracket
        const arm = ProceduralCatalog3D.createBox(
          0.02,
          0.02,
          0.1,
          housingMat,
          0,
          0,
          0.05
        );
        // Upward/downward shade
        const shade = ProceduralCatalog3D.createCylinder(
          0.06,
          0.06,
          0.14,
          emissiveMat,
          0,
          0,
          0.1
        );
        group.add(wallPlate);
        group.add(arm);
        group.add(shade);
        break;
      }

      case 'led_strip': {
        const stripPoints = placement.light_config?.strip_points;
        if (Array.isArray(stripPoints) && stripPoints.length >= 2) {
          // Transform 2D polyline relative to placement
          const cosR = Math.cos(placement.rotation_deg * (Math.PI / 180));
          const sinR = Math.sin(placement.rotation_deg * (Math.PI / 180));

          for (let i = 0; i < stripPoints.length - 1; i++) {
            const p1 = stripPoints[i];
            const p2 = stripPoints[i + 1];

            // Local coordinates relative to placement origin
            const dx1 = p1.x - placement.x;
            const dy1 = p1.y - placement.y;
            const lx1 = dx1 * cosR - dy1 * sinR;
            const lz1 = dx1 * sinR + dy1 * cosR;

            const dx2 = p2.x - placement.x;
            const dy2 = p2.y - placement.y;
            const lx2 = dx2 * cosR - dy2 * sinR;
            const lz2 = dx2 * sinR + dy2 * cosR;

            const segLen = Math.hypot(lx2 - lx1, lz2 - lz1);
            if (segLen > 0.001) {
              const segAngle = Math.atan2(lz2 - lz1, lx2 - lx1);
              const segMesh = ProceduralCatalog3D.createBox(
                segLen,
                0.015,
                0.025,
                emissiveMat,
                (lx1 + lx2) / 2,
                0,
                (lz1 + lz2) / 2
              );
              segMesh.rotation.y = -segAngle;
              group.add(segMesh);
            }
          }
        } else {
          // Default 1.2m linear strip along local X
          const strip = ProceduralCatalog3D.createBox(
            1.2,
            0.015,
            0.025,
            emissiveMat,
            0,
            0,
            0
          );
          group.add(strip);
        }
        break;
      }

      case 'tv_screen': {
        // Slim chassis
        const chassis = ProceduralCatalog3D.createBox(
          1.1,
          0.65,
          0.035,
          housingMat,
          0,
          0,
          0
        );
        // Active screen face
        const screenMat = new THREE.MeshStandardMaterial({
          color: 0x050505,
          emissive: visualState.isActive || visualState.mediaPlaying
            ? emissiveColor
            : new THREE.Color(0x020202),
          emissiveIntensity: visualState.isActive || visualState.mediaPlaying ? 1.4 : 0.05,
          roughness: 0.1,
          metalness: 0.1
        });
        group.userData.emissiveMaterial = screenMat;

        const screenFace = ProceduralCatalog3D.createBox(
          1.06,
          0.61,
          0.005,
          screenMat,
          0,
          0,
          0.018
        );
        group.add(chassis);
        group.add(screenFace);
        break;
      }

      case 'ceiling_fan': {
        // Ceiling mounting canopy
        const canopy = ProceduralCatalog3D.createCylinder(
          0.08,
          0.08,
          0.02,
          housingMat,
          0,
          0.01,
          0
        );
        // Downrod
        const downrod = ProceduralCatalog3D.createCylinder(
          0.014,
          0.014,
          0.25,
          housingMat,
          0,
          -0.125,
          0
        );
        // Motor hub
        const motorHub = ProceduralCatalog3D.createCylinder(
          0.1,
          0.1,
          0.06,
          housingMat,
          0,
          -0.28,
          0
        );
        // Center light kit
        const lightKit = ProceduralCatalog3D.createSphere(
          0.06,
          emissiveMat,
          0,
          -0.32,
          0
        );

        group.add(canopy);
        group.add(downrod);
        group.add(motorHub);
        group.add(lightKit);

        // Rotating blades group
        const bladesGroup = new THREE.Group();
        bladesGroup.position.set(0, -0.28, 0);
        bladesGroup.userData.isFanBlades = true;

        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.5,
          metalness: 0.1
        });
        const bladeLen = 0.45;
        const bladeW = 0.11;
        const bladeThick = 0.008;

        for (let i = 0; i < 4; i++) {
          const bladeAngle = (i * Math.PI) / 2;
          const blade = ProceduralCatalog3D.createBox(
            bladeLen,
            bladeThick,
            bladeW,
            bladeMat,
            0.1 + bladeLen / 2,
            0,
            0
          );
          blade.rotation.x = 0.12; // aerodynamic tilt pitch

          const bladeArm = new THREE.Group();
          bladeArm.rotation.y = bladeAngle;
          bladeArm.add(blade);
          bladesGroup.add(bladeArm);
        }

        group.userData.bladesGroup = bladesGroup;
        group.add(bladesGroup);
        break;
      }

      case 'thermostat': {
        // Wall puck
        const puck = ProceduralCatalog3D.createCylinder(
          0.06,
          0.06,
          0.025,
          housingMat,
          0,
          0,
          0
        );
        puck.rotation.x = Math.PI / 2;
        // Accent ring
        const ring = ProceduralCatalog3D.createCylinder(
          0.05,
          0.05,
          0.005,
          emissiveMat,
          0,
          0,
          0.013
        );
        ring.rotation.x = Math.PI / 2;
        group.add(puck);
        group.add(ring);
        break;
      }

      case 'speaker': {
        // Modern cylinder speaker
        const speaker = ProceduralCatalog3D.createCylinder(
          0.065,
          0.065,
          0.13,
          housingMat,
          0,
          0.065,
          0
        );
        // Top touch LED indicator ring
        const indicator = ProceduralCatalog3D.createCylinder(
          0.045,
          0.045,
          0.005,
          emissiveMat,
          0,
          0.132,
          0
        );
        group.add(speaker);
        group.add(indicator);
        break;
      }

      case 'none':
      default: {
        // Subtle indicator orb if active
        if (visualState.isActive || placement.domain === 'light') {
          const orb = ProceduralCatalog3D.createSphere(0.035, emissiveMat, 0, 0, 0);
          group.add(orb);
        }
        break;
      }
    }

    if (Array.isArray(placement.mesh_scale) && placement.mesh_scale.length === 3) {
      group.scale.set(
        placement.mesh_scale[0],
        placement.mesh_scale[1],
        placement.mesh_scale[2]
      );
    }

    ProceduralCatalog3D.updateEntityMeshState(group, visualState);
    return group;
  }

  /**
   * Updates an entity group's emissive color, intensity, and fan speed in-place.
   */
  public static updateEntityMeshState(
    entityGroup: THREE.Group,
    visualState: ResolvedEntityVisualState
  ): void {
    entityGroup.userData.isActive = visualState.isActive;
    entityGroup.userData.fanSpeed = visualState.fanPercentage;

    const mat = entityGroup.userData.emissiveMaterial as
      | THREE.MeshStandardMaterial
      | undefined;
    if (mat) {
      if (entityGroup.userData.meshType === 'tv_screen') {
        const active = visualState.isActive || visualState.mediaPlaying;
        if (active) {
          const r = visualState.rgb[0] > 0.05 ? visualState.rgb[0] : 0.6;
          const g = visualState.rgb[1] > 0.05 ? visualState.rgb[1] : 0.8;
          const b = visualState.rgb[2] > 0.05 ? visualState.rgb[2] : 1.0;
          mat.emissive.setRGB(r, g, b);
          mat.emissiveIntensity = 1.2;
        } else {
          mat.emissive.setRGB(0.02, 0.02, 0.03);
          mat.emissiveIntensity = 0.05;
        }
      } else {
        mat.emissive.setRGB(
          visualState.rgb[0],
          visualState.rgb[1],
          visualState.rgb[2]
        );
        mat.emissiveIntensity = visualState.isActive
          ? Math.max(0.4, visualState.brightness * 2.0)
          : 0.05;
      }
    }
  }

  /**
   * Ticks continuous entity animations (e.g. spinning ceiling fans).
   * Returns true if any continuous animation is currently active.
   */
  public static tickEntityAnimations(
    entitiesGroup: THREE.Group,
    dtSec: number
  ): boolean {
    let anyAnimating = false;
    if (!entitiesGroup || !entitiesGroup.children) return false;

    for (const child of entitiesGroup.children) {
      if (child.userData?.meshType === 'ceiling_fan') {
        const isActive = child.userData.isActive === true;
        const fanSpeed =
          typeof child.userData.fanSpeed === 'number'
            ? child.userData.fanSpeed
            : 0;

        if (isActive || fanSpeed > 0) {
          const bladesGroup = (child.userData.bladesGroup ||
            child.getObjectByProperty('userData', {
              isFanBlades: true
            })) as THREE.Group | undefined;

          if (bladesGroup) {
            const speedFactor = 2.5 + (fanSpeed / 100) * 6.0;
            bladesGroup.rotation.y += dtSec * speedFactor;
            anyAnimating = true;
          }
        }
      }
    }

    return anyAnimating;
  }

  // ---------------------------------------------------------------------------
  // 4. RESOURCE DISPOSAL
  // ---------------------------------------------------------------------------

  /**
   * Traverses and disposes all geometries, materials, and textures on a 3D object.
   */
  public static disposeObject3D(obj: THREE.Object3D): void {
    if (!obj) return;
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          for (const m of mesh.material) {
            ProceduralCatalog3D.disposeMaterial(m);
          }
        } else {
          ProceduralCatalog3D.disposeMaterial(mesh.material);
        }
      }
    });
  }

  private static disposeMaterial(mat: THREE.Material): void {
    const std = mat as unknown as Record<string, unknown>;
    const textureKeys = [
      'map',
      'lightMap',
      'bumpMap',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'emissiveMap',
      'alphaMap',
      'envMap'
    ];
    for (const key of textureKeys) {
      const tex = std[key] as THREE.Texture | undefined;
      if (tex && typeof tex.dispose === 'function') {
        tex.dispose();
      }
    }
    mat.dispose();
  }

  // ---------------------------------------------------------------------------
  // PRIMITIVE CREATION HELPERS
  // ---------------------------------------------------------------------------

  private static createBox(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }

  private static createCylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    radialSegments = 16,
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments
    );
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }

  private static createSphere(
    radius: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    widthSegments = 16,
    heightSegments = 12,
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}
