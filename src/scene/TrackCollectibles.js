import * as THREE from 'three';

const PICKUP_RADIUS_SQ = 0.020 * 0.020; // ~20mm pickup radius
const CHIP_VALUE = 10; // +10 Coins/Bits per chip

/**
 * Creates 3D collectible microchip tokens along the coaster track spline.
 *
 * @param {Object} splineData Parsed track_spline.json
 * @param {THREE.Scene} scene The main Three.js scene
 * @param {Object} options Optional config
 */
export function createTrackCollectibles(splineData, scene, options = {}) {
  const chipCount = options.chipCount || 16;
  const onCollect = options.onCollect || null;

  const collectiblesGroup = new THREE.Group();
  collectiblesGroup.name = 'TrackCollectiblesGroup';
  scene.add(collectiblesGroup);

  const samples = splineData.samples;
  const totalLength = splineData.total_length_m || 3.8371;
  const step = Math.floor(samples.length / chipCount);

  // Shared Geometries & Materials for efficiency
  const bodyGeo = new THREE.BoxGeometry(0.0055, 0.0016, 0.0038);
  const pinGeo = new THREE.BoxGeometry(0.0012, 0.0006, 0.0006);

  const chipMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    metalness: 0.88,
    roughness: 0.22,
    emissive: 0xff7700,
    emissiveIntensity: 0.45,
  });

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.95,
    roughness: 0.15,
  });

  const notchMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  function createChipMesh() {
    const chipRoot = new THREE.Group();

    // Main IC Body
    const body = new THREE.Mesh(bodyGeo, chipMat);
    chipRoot.add(body);

    // Pin 1 Index Notch (Tiny glowing cyan dot)
    const notchGeo = new THREE.CylinderGeometry(0.0004, 0.0004, 0.0003, 8);
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(-0.0018, 0.00085, -0.0012);
    chipRoot.add(notch);

    // 8 Silver IC Pins (4 on left side, 4 on right side)
    const pinOffsetsZ = [-0.0012, -0.0004, 0.0004, 0.0012];
    for (const pz of pinOffsetsZ) {
      // Left pin
      const pLeft = new THREE.Mesh(pinGeo, pinMat);
      pLeft.position.set(-0.0032, -0.0004, pz);
      chipRoot.add(pLeft);

      // Right pin
      const pRight = new THREE.Mesh(pinGeo, pinMat);
      pRight.position.set(0.0032, -0.0004, pz);
      chipRoot.add(pRight);
    }

    return chipRoot;
  }

  // Particle burst system for collections
  const MAX_PARTICLES = 48;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  const particleColors = new Float32Array(MAX_PARTICLES * 3);
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.0024,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  collectiblesGroup.add(particleSystem);

  const activeParticles = [];

  function spawnSparks(origin) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (activeParticles.length >= MAX_PARTICLES) activeParticles.shift();
      const speed = 0.018 + Math.random() * 0.035;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      activeParticles.push({
        pos: origin.clone(),
        vel: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          (Math.sin(phi) + 0.6) * speed,
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  const chips = [];

  for (let i = 0; i < chipCount; i++) {
    const sampleIdx = (i * step + Math.floor(step * 0.5)) % samples.length;
    const sample = samples[sampleIdx];

    const pos = new THREE.Vector3().fromArray(sample.position);
    const normal = new THREE.Vector3().fromArray(sample.normal).normalize();
    const right = new THREE.Vector3().fromArray(sample.right).normalize();

    // Lateral placement: alternate center, slightly left, slightly right along apex
    const latOffset = (i % 3 === 1) ? -0.0035 : (i % 3 === 2) ? 0.0035 : 0.0;
    const basePos = pos.clone()
      .addScaledVector(right, latOffset)
      .addScaledVector(normal, 0.0120); // Float 12mm above track cleanly

    const mesh = createChipMesh();
    mesh.position.copy(basePos);
    collectiblesGroup.add(mesh);

    chips.push({
      id: i,
      basePos,
      position: basePos.clone(),
      normal,
      mesh,
      active: true,
      phase: i * 0.7,
      sampleIdx,
      arc_length_m: sample.arc_length_m,
    });
  }

  let totalCollectedCount = 0;

  function checkCollisions(kartPosition) {
    const hits = [];
    if (!kartPosition) return hits;

    for (const chip of chips) {
      if (!chip.active) continue;
      const dx = kartPosition.x - chip.position.x;
      const dy = kartPosition.y - chip.position.y;
      const dz = kartPosition.z - chip.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= PICKUP_RADIUS_SQ) {
        chip.active = false;
        chip.mesh.visible = false;
        totalCollectedCount++;
        hits.push(chip);
        spawnSparks(chip.position);

        if (typeof onCollect === 'function') {
          onCollect(chip, CHIP_VALUE);
        }
      }
    }
    return hits;
  }

  function update(dt, time = performance.now() * 0.001) {
    // 1. Animate active chips (gentle vertical levitation and spin)
    for (const chip of chips) {
      if (!chip.active) continue;
      const bob = Math.sin(time * 3.8 + chip.phase) * 0.0014;
      chip.mesh.position.copy(chip.basePos).addScaledVector(chip.normal, bob);
      chip.position.copy(chip.mesh.position);
      chip.mesh.rotation.y += dt * 3.2;
    }

    // 2. Update spark particles
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        activeParticles.splice(i, 1);
        continue;
      }
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 0.12 * dt; // gravity
    }

    const posArr = particleGeo.attributes.position.array;
    const colArr = particleGeo.attributes.color.array;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = activeParticles[i];
      if (p) {
        posArr[i * 3 + 0] = p.pos.x;
        posArr[i * 3 + 1] = p.pos.y;
        posArr[i * 3 + 2] = p.pos.z;

        const alpha = p.life / p.maxLife;
        colArr[i * 3 + 0] = 1.0 * alpha; // Gold R
        colArr[i * 3 + 1] = 0.8 * alpha; // Gold G
        colArr[i * 3 + 2] = 0.1 * alpha; // Gold B
      } else {
        posArr[i * 3 + 0] = 0;
        posArr[i * 3 + 1] = -10;
        posArr[i * 3 + 2] = 0;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  function resetForNewLap() {
    for (const chip of chips) {
      chip.active = true;
      chip.mesh.visible = true;
    }
  }

  function resetAll() {
    resetForNewLap();
    totalCollectedCount = 0;
    activeParticles.length = 0;
  }

  return {
    chips,
    collectiblesGroup,
    checkCollisions,
    update,
    resetForNewLap,
    resetAll,
    getCollectedCount: () => totalCollectedCount,
  };
}
