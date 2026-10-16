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
  afro: 0.3,
  braids: 0.08,
  bun: 0.08,
  ponytail: 0.08,
  dreads: 0.08,
  bald: 0,
};

const BLACK = new THREE.MeshStandardMaterial({ color: '#1b1b22', roughness: 0.5 });
const GOLD = new THREE.MeshStandardMaterial({ color: '#ffcf4d', metalness: 0.6, roughness: 0.3 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
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
 * Creates an articulated 3D driver styled to the start.ng user profile schema.
 * Configured in a seated kart-driving posture facing -Z.
 */
export function createDriver(initialStyle = DEFAULT_STYLE) {
  const mats = {
    primary: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    secondary: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    skin: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
  };

  const root = new THREE.Group();
  root.name = 'DriverRoot';

  // Base driver scale factor to match 1:87 HO micro-kart (~6mm tall seated)
  const DRIVER_SCALE = 0.0035;
  root.scale.setScalar(DRIVER_SCALE);

  const seatPivot = new THREE.Group();
  root.add(seatPivot);

  const torso = box(0.72, 0.82, 0.44, mats.primary, 0, 0.75, 0);
  seatPivot.add(torso);

  // Seated legs extending forward towards -Z (into the kart pedal well)
  const legL = box(0.24, 0.26, 0.75, mats.secondary, -0.2, 0.22, -0.32);
  const legR = box(0.24, 0.26, 0.75, mats.secondary, 0.2, 0.22, -0.32);
  seatPivot.add(legL, legR);

  // Arms extending forward and angled to grasp steering wheel
  const armL = box(0.18, 0.18, 0.62, mats.primary, -0.38, 0.82, -0.26);
  armL.rotation.x = 0.28;
  armL.rotation.y = 0.22;
  const handL = box(0.15, 0.15, 0.15, mats.skin, -0.32, 0.84, -0.58);

  const armR = box(0.18, 0.18, 0.62, mats.primary, 0.38, 0.82, -0.26);
  armR.rotation.x = 0.28;
  armR.rotation.y = -0.22;
  const handR = box(0.15, 0.15, 0.15, mats.skin, 0.32, 0.84, -0.58);

  seatPivot.add(armL, handL, armR, handR);

  // Head
  const head = new THREE.Group();
  head.position.y = 1.48;
  seatPivot.add(head);

  // Face cube + eyes
  head.add(box(0.58, 0.58, 0.58, mats.skin));
  head.add(box(0.09, 0.11, 0.02, BLACK, -0.13, 0.05, -0.30));
  head.add(box(0.09, 0.11, 0.02, BLACK, 0.13, 0.05, -0.30));

  const hairSlot = new THREE.Group();
  head.add(hairSlot);

  const hatSlot = new THREE.Group();
  hatSlot.position.y = 0.3;
  head.add(hatSlot);

  const accessorySlot = new THREE.Group();
  head.add(accessorySlot);

  // Swappable Hats
  const hats = {
    none: () => [],
    cap: () => [
      box(0.62, 0.18, 0.62, mats.secondary, 0, 0.08, 0),
      box(0.54, 0.04, 0.34, mats.secondary, 0, 0.02, -0.42),
    ],
    beanie: () => [
      box(0.64, 0.30, 0.64, mats.secondary, 0, 0.1, 0),
      mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.primary, 0, 0.32, 0),
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

  const hairTop = () => [
    box(0.62, 0.12, 0.62, mats.hair, 0, 0.32, 0),
    box(0.62, 0.4, 0.08, mats.hair, 0, 0.1, 0.3),
  ];

  // Swappable Hairs
  const hairs = {
    bald: () => [],
    short: () => [box(0.62, 0.12, 0.62, mats.hair, 0, 0.32, 0), box(0.62, 0.28, 0.08, mats.hair, 0, 0.16, 0.3)],
    afro: () => {
      const s = mesh(new THREE.SphereGeometry(0.4, 12, 10), mats.hair, 0, 0.22, 0.04);
      s.scale.y = 0.9;
      return [s];
    },
    braids: () => [
      ...hairTop(),
      ...[-0.22, -0.11, 0, 0.11, 0.22].map((x) => box(0.08, 0.7, 0.08, mats.hair, x, -0.18, 0.33)),
    ],
    bun: () => [...hairTop(), mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.hair, 0, 0.44, 0.15)],
    ponytail: () => {
      const tail = box(0.12, 0.52, 0.12, mats.hair, 0, -0.04, 0.4);
      tail.rotation.x = -0.32;
      return [...hairTop(), tail, box(0.16, 0.07, 0.16, mats.primary, 0, 0.18, 0.34)];
    },
    dreads: () => [
      ...hairTop(),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = -1.9 + i * 0.55;
        return mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), mats.hair, Math.sin(a) * 0.31, -0.08, Math.cos(a) * 0.31);
      }),
    ],
  };

  // Swappable Accessories
  const accessories = {
    none: () => [],
    earrings: () => [
      mesh(new THREE.SphereGeometry(0.045, 8, 6), GOLD, -0.31, 0.02, 0),
      mesh(new THREE.SphereGeometry(0.045, 8, 6), GOLD, 0.31, 0.02, 0),
    ],
    beard: () => [box(0.5, 0.2, 0.08, mats.hair, 0, -0.18, -0.3)],
    glasses: () => [
      box(0.19, 0.13, 0.03, BLACK, -0.13, 0.05, -0.31),
      box(0.19, 0.13, 0.03, BLACK, 0.13, 0.05, -0.31),
      box(0.09, 0.03, 0.02, BLACK, 0, 0.07, -0.31),
    ],
    scarf: () => [
      box(0.68, 0.15, 0.48, mats.secondary, 0, -0.28, 0),
      box(0.15, 0.4, 0.06, mats.secondary, 0.16, -0.45, 0.24),
    ],
    backpack: () => [
      box(0.52, 0.58, 0.24, mats.secondary, 0, -0.15, 0.32),
      box(0.54, 0.12, 0.26, mats.primary, 0, 0.1, 0.32),
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

    if (s.hair !== currentHair) {
      clear(hairSlot);
      fill(hairSlot, (hairs[s.hair] ?? hairs.short)());
      hatSlot.position.y = 0.3 + (HAT_LIFT[s.hair] ?? HAT_LIFT.short);
      currentHair = s.hair;
    }

    if (s.hat !== currentHat) {
      clear(hatSlot);
      fill(hatSlot, (hats[s.hat] ?? hats.none)());
      currentHat = s.hat;
    }

    if (s.accessory !== currentAccessory) {
      clear(accessorySlot);
      fill(accessorySlot, (accessories[s.accessory] ?? accessories.none)());
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
