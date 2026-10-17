import * as THREE from 'three';

export const HAIRS = ['short', 'afro', 'braids', 'bun', 'ponytail', 'dreads', 'bald'];
export const HATS = ['none', 'cap', 'beanie', 'tophat', 'crown'];
export const ACCESSORIES = ['none', 'glasses', 'earrings', 'beard', 'scarf', 'backpack'];

export const DEFAULT_STYLE = {
  body: 'male',
  primaryColor: '#1dd1a1',
  secondaryColor: '#222f3e',
  skinColor: '#8d5524',
  hairColor: '#17120f',
  hair: 'short',
  hat: 'none',
  accessory: 'none',
};

const HAT_LIFT = {
  short: 0.08,
  afro: 0.28,
  braids: 0.08,
  bun: 0.08,
  ponytail: 0.08,
  dreads: 0.08,
  bald: 0,
};

const BLACK = new THREE.MeshStandardMaterial({ color: '#16181f', roughness: 0.45, metalness: 0.2 });
const CHROME = new THREE.MeshStandardMaterial({ color: '#d8e2ec', roughness: 0.15, metalness: 0.92 });
const GOLD = new THREE.MeshStandardMaterial({ color: '#ffcf4d', metalness: 0.7, roughness: 0.25 });
const GLOVE_MAT = new THREE.MeshStandardMaterial({ color: '#181b22', roughness: 0.75, metalness: 0.1 });
const HARNESS_MAT = new THREE.MeshStandardMaterial({ color: '#0d0f14', roughness: 0.8, metalness: 0.1 });

function mesh(geometry, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}

function fill(slot, parts) {
  if (parts && parts.length) slot.add(...parts);
}

function clear(slot) {
  for (const child of [...slot.children]) {
    slot.remove(child);
    if (child.geometry) child.geometry.dispose();
  }
}

/**
 * Creates an organically sculpted, smooth 3D racing driver.
 * Replaces blocky box meshes with aerodynamic contoured surfaces,
 * full-face racing helmet, curved tinted visor, anatomical suit, and gloves.
 */
export function createDriver(initialStyle = DEFAULT_STYLE) {
  const mats = {
    primary: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 }),
    secondary: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 }),
    skin: new THREE.MeshStandardMaterial({ roughness: 0.70 }),
    hair: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.08,
      metalness: 0.90,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 1.5,
    }),
  };

  const root = new THREE.Group();
  root.name = 'DriverRoot';

  // Base driver scale factor to match 1:87 HO micro-kart (~6mm tall seated)
  const DRIVER_SCALE = 0.0035;
  root.scale.setScalar(DRIVER_SCALE);

  const seatPivot = new THREE.Group();
  seatPivot.name = 'SeatPivot';
  root.add(seatPivot);

  // 1. ANATOMICAL RACING SUIT TORSO (Smooth contoured cylinder & shoulders)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.72, 0);

  // Chest / ribcage (tapered rounded cylinder)
  const chestGeo = new THREE.CylinderGeometry(0.35, 0.30, 0.78, 16);
  const chest = new THREE.Mesh(chestGeo, mats.primary);
  chest.scale.set(1.0, 1.0, 0.72); // Natural torso oval cross-section
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Ergonomic shoulder caps
  for (const sx of [-0.34, 0.34]) {
    const shoulder = mesh(new THREE.SphereGeometry(0.13, 12, 10), mats.secondary, sx, 0.32, 0);
    torsoGroup.add(shoulder);
  }

  // Racing neck collar / HANS support
  const collar = mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), mats.secondary, 0, 0.40, 0, Math.PI / 2, 0, 0);
  torsoGroup.add(collar);

  // 5-Point Racing Harness Straps across chest
  const strapL = mesh(new THREE.BoxGeometry(0.065, 0.72, 0.02), HARNESS_MAT, -0.12, 0.02, -0.27, 0, 0, 0.08);
  const strapR = mesh(new THREE.BoxGeometry(0.065, 0.72, 0.02), HARNESS_MAT, 0.12, 0.02, -0.27, 0, 0, -0.08);
  const latch = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), CHROME, 0, -0.05, -0.28, Math.PI / 2, 0, 0);
  torsoGroup.add(strapL, strapR, latch);

  seatPivot.add(torsoGroup);

  // 2. SEATED LEGS EXTENDING FORWARD INTO PEDAL WELL (Smooth tapered cylinders)
  for (const sx of [-0.18, 0.18]) {
    const leg = mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.74, 12), mats.secondary, sx, 0.22, -0.32, Math.PI / 2 - 0.22, 0, 0);
    const knee = mesh(new THREE.SphereGeometry(0.12, 10, 8), mats.secondary, sx, 0.26, -0.66);
    seatPivot.add(leg, knee);
  }

  // 3. ARTICULATED SMOOTH ARMS & RACING GLOVES (Grasping steering wheel)
  // Left arm
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.36, 0.98, -0.04);
  const upperArmL = mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.40, 10), mats.primary, 0, -0.16, -0.12, 0.55, 0.20, 0);
  const elbowL = mesh(new THREE.SphereGeometry(0.085, 8, 8), mats.primary, 0.02, -0.32, -0.25);
  const forearmL = mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.38, 10), mats.primary, 0.05, -0.22, -0.42, 0.22, 0.25, 0);
  const gloveL = mesh(new THREE.SphereGeometry(0.09, 10, 8), GLOVE_MAT, 0.08, -0.14, -0.58);
  armLGroup.add(upperArmL, elbowL, forearmL, gloveL);
  seatPivot.add(armLGroup);

  // Right arm
  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.36, 0.98, -0.04);
  const upperArmR = mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.40, 10), mats.primary, 0, -0.16, -0.12, 0.55, -0.20, 0);
  const elbowR = mesh(new THREE.SphereGeometry(0.085, 8, 8), mats.primary, -0.02, -0.32, -0.25);
  const forearmR = mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.38, 10), mats.primary, -0.05, -0.22, -0.42, 0.22, -0.25, 0);
  const gloveR = mesh(new THREE.SphereGeometry(0.09, 10, 8), GLOVE_MAT, -0.08, -0.14, -0.58);
  armRGroup.add(upperArmR, elbowR, forearmR, gloveR);
  seatPivot.add(armRGroup);

  // 4. HEAD ASSEMBLY
  const head = new THREE.Group();
  head.name = 'DriverHeadAssembly';
  head.position.y = 1.46;
  seatPivot.add(head);

  // Neck
  const neck = mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.20, 12), mats.skin, 0, -0.12, 0);
  head.add(neck);

  // Slot for racing helmet or avatar face
  const headBaseSlot = new THREE.Group();
  head.add(headBaseSlot);

  const hairSlot = new THREE.Group();
  head.add(hairSlot);

  const hatSlot = new THREE.Group();
  hatSlot.position.y = 0.32;
  head.add(hatSlot);

  const accessorySlot = new THREE.Group();
  head.add(accessorySlot);

  // -------------------------------------------------------------------------
  // FULL-FACE AERODYNAMIC GRAND PRIX RACING HELMET (Smooth & Contoured)
  // -------------------------------------------------------------------------
  function createFullFaceHelmet() {
    const helmetParts = [];

    // Main contoured helmet dome (smooth sphere with aerodynamic teardrop scaling)
    const shellGeo = new THREE.SphereGeometry(0.36, 24, 20);
    const shell = new THREE.Mesh(shellGeo, mats.primary);
    shell.scale.set(0.98, 1.05, 1.14);
    shell.castShadow = true;
    helmetParts.push(shell);

    // Aerodynamic crown accent stripe
    const crownStripe = mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.42, 12),
      mats.secondary,
      0,
      0.18,
      0.02,
      Math.PI / 2,
      0,
      0
    );
    crownStripe.scale.set(1.0, 0.35, 1.0);
    helmetParts.push(crownStripe);

    // Curved wrap-around aerodynamic visor (cyan mirror glass)
    const visorGeo = new THREE.CylinderGeometry(
      0.368,
      0.368,
      0.15,
      24,
      1,
      false,
      -Math.PI * 0.42,
      Math.PI * 0.84
    );
    const visor = new THREE.Mesh(visorGeo, mats.visor);
    visor.position.set(0, 0.03, -0.04);
    visor.rotation.y = Math.PI; // Face forward towards -Z
    helmetParts.push(visor);

    // Matte black rubber/carbon visor gasket frame
    const gasketGeo = new THREE.CylinderGeometry(
      0.365,
      0.365,
      0.17,
      24,
      1,
      false,
      -Math.PI * 0.44,
      Math.PI * 0.88
    );
    const gasket = new THREE.Mesh(gasketGeo, BLACK);
    gasket.position.set(0, 0.03, -0.04);
    gasket.rotation.y = Math.PI;
    helmetParts.push(gasket);

    // Visor tear-off pivot bolts on left & right
    for (const sx of [-0.34, 0.34]) {
      const bolt = mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.015, 8),
        CHROME,
        sx,
        0.03,
        -0.08,
        0,
        0,
        Math.PI / 2
      );
      helmetParts.push(bolt);
    }

    // Aerodynamic chin bar intake vent
    const chinVent = mesh(
      new THREE.BoxGeometry(0.14, 0.03, 0.06),
      BLACK,
      0,
      -0.18,
      -0.34
    );
    helmetParts.push(chinVent);

    // Rear teardrop aerodynamic ducktail spoiler
    const aeroSpoiler = mesh(
      new THREE.BoxGeometry(0.24, 0.035, 0.12),
      mats.secondary,
      0,
      0.16,
      0.28,
      -0.35,
      0,
      0
    );
    helmetParts.push(aeroSpoiler);

    return helmetParts;
  }

  // -------------------------------------------------------------------------
  // ANATOMICAL OPEN-FACE HEAD (Used when a specific hat/hair is selected)
  // -------------------------------------------------------------------------
  function createOpenFaceHead() {
    const headParts = [];

    // Smooth rounded cranial sphere (not a box!)
    const skullGeo = new THREE.SphereGeometry(0.32, 20, 16);
    const skull = new THREE.Mesh(skullGeo, mats.skin);
    skull.scale.set(0.96, 1.06, 1.02);
    skull.castShadow = true;
    headParts.push(skull);

    // Stylized friendly eyes
    headParts.push(
      mesh(new THREE.SphereGeometry(0.045, 8, 6), BLACK, -0.12, 0.04, -0.30),
      mesh(new THREE.SphereGeometry(0.045, 8, 6), BLACK, 0.12, 0.04, -0.30)
    );

    // Rounded nose
    const nose = mesh(new THREE.ConeGeometry(0.04, 0.10, 8), mats.skin, 0, -0.02, -0.32, -0.20, 0, 0);
    headParts.push(nose);

    // Rounded ears
    for (const sx of [-0.31, 0.31]) {
      const ear = mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.skin, sx, 0, -0.02);
      ear.scale.set(0.5, 1.0, 0.8);
      headParts.push(ear);
    }

    return headParts;
  }

  // Swappable Hats (all smooth curved meshes)
  const hats = {
    none: () => [],
    cap: () => [
      // Curved baseball cap dome + curved brim
      mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.secondary, 0, 0.04, 0),
      mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.76), mats.secondary, 0, 0.02, -0.12, 0.18, Math.PI, 0),
    ],
    beanie: () => [
      // Ribbed rounded dome + pom-pom
      mesh(new THREE.SphereGeometry(0.35, 16, 14), mats.secondary, 0, 0.06, 0),
      mesh(new THREE.SphereGeometry(0.08, 10, 8), mats.primary, 0, 0.40, 0),
    ],
    tophat: () => [
      mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 16), BLACK, 0, 0.03, 0),
      mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.52, 16), BLACK, 0, 0.29, 0),
      mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 16), mats.secondary, 0, 0.1, 0),
    ],
    crown: () => [
      mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 8, 1, true), GOLD, 0, 0.11, 0),
      ...Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return mesh(new THREE.ConeGeometry(0.06, 0.16, 4), GOLD, Math.sin(a) * 0.28, 0.28, Math.cos(a) * 0.28);
      }),
    ],
  };

  // Swappable Hair styles (smooth organic meshes)
  const hairs = {
    bald: () => [],
    short: () => [
      mesh(new THREE.SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.05, -0.02),
    ],
    afro: () => {
      const s = mesh(new THREE.SphereGeometry(0.42, 16, 14), mats.hair, 0, 0.18, 0.02);
      s.scale.set(1.05, 0.95, 1.05);
      return [s];
    },
    braids: () => [
      mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.05, 0),
      ...[-0.22, -0.11, 0, 0.11, 0.22].map((x) =>
        mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.65, 8), mats.hair, x, -0.16, 0.28, 0.15, 0, 0)
      ),
    ],
    bun: () => [
      mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.05, 0),
      mesh(new THREE.SphereGeometry(0.16, 12, 10), mats.hair, 0, 0.38, 0.18),
    ],
    ponytail: () => {
      const tail = mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.52, 8), mats.hair, 0, -0.08, 0.38, -0.35, 0, 0);
      const ring = mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), mats.primary, 0, 0.12, 0.28);
      return [
        mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.05, 0),
        tail,
        ring,
      ];
    },
    dreads: () => [
      mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.05, 0),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = -1.9 + i * 0.55;
        return mesh(
          new THREE.CylinderGeometry(0.04, 0.035, 0.55, 6),
          mats.hair,
          Math.sin(a) * 0.30,
          -0.08,
          Math.cos(a) * 0.30
        );
      }),
    ],
  };

  // Swappable Accessories
  const accessories = {
    none: () => [],
    earrings: () => [
      mesh(new THREE.SphereGeometry(0.045, 8, 6), GOLD, -0.32, 0.0, -0.02),
      mesh(new THREE.SphereGeometry(0.045, 8, 6), GOLD, 0.32, 0.0, -0.02),
    ],
    beard: () => [
      mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 12, 1, false, -Math.PI * 0.45, Math.PI * 0.9), mats.hair, 0, -0.16, -0.22, 0, Math.PI, 0),
    ],
    glasses: () => [
      mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12), BLACK, -0.13, 0.04, -0.32),
      mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12), BLACK, 0.13, 0.04, -0.32),
      mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.10, 6), BLACK, 0, 0.05, -0.32, 0, 0, Math.PI / 2),
    ],
    scarf: () => [
      mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 16), mats.secondary, 0, -0.18, 0, Math.PI / 2, 0, 0),
    ],
    backpack: () => [
      mesh(new THREE.BoxGeometry(0.48, 0.52, 0.22), mats.secondary, 0, -0.12, 0.34),
    ],
  };

  let currentHair = null;
  let currentHat = null;
  let currentAccessory = null;

  function applyStyle(next) {
    const s = { ...DEFAULT_STYLE, ...next };
    mats.primary.color.set(s.primaryColor || DEFAULT_STYLE.primaryColor);
    mats.secondary.color.set(s.secondaryColor || DEFAULT_STYLE.secondaryColor);
    mats.skin.color.set(s.skinColor || DEFAULT_STYLE.skinColor);
    mats.hair.color.set(s.hairColor || DEFAULT_STYLE.hairColor);

    const isHelmetMode = s.hat === 'none' && (s.hair === 'short' || s.hair === 'bald');

    // Update head base: Full-Face Aerodynamic Helmet or Open-Face Head
    clear(headBaseSlot);
    if (isHelmetMode) {
      fill(headBaseSlot, createFullFaceHelmet());
      clear(hairSlot);
      clear(hatSlot);
      currentHair = null;
      currentHat = null;
    } else {
      fill(headBaseSlot, createOpenFaceHead());

      if (s.hair !== currentHair) {
        clear(hairSlot);
        fill(hairSlot, (hairs[s.hair] ?? hairs.short)());
        hatSlot.position.y = 0.30 + (HAT_LIFT[s.hair] ?? HAT_LIFT.short);
        currentHair = s.hair;
      }

      if (s.hat !== currentHat) {
        clear(hatSlot);
        fill(hatSlot, (hats[s.hat] ?? hats.none)());
        currentHat = s.hat;
      }
    }

    if (s.accessory !== currentAccessory) {
      clear(accessorySlot);
      if (!isHelmetMode) {
        fill(accessorySlot, (accessories[s.accessory] ?? accessories.none)());
      }
      currentAccessory = s.accessory;
    }
  }

  function lean(turnAmount) {
    // turnAmount ranges from -1 (hard left) to +1 (hard right)
    seatPivot.rotation.z = -turnAmount * 0.22;
    head.rotation.y = -turnAmount * 0.18;
    head.rotation.z = -turnAmount * 0.12;
  }

  applyStyle(initialStyle);

  return {
    root,
    applyStyle,
    lean,
  };
}
