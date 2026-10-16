import * as THREE from 'three';

/**
 * Creates glowing capacitor boost pads mounted directly on the coaster track.
 *
 * @param {Object} splineData Parsed track_spline.json
 * @param {THREE.Scene} scene The main Three.js scene
 * @param {Object} options Optional config
 */
export function createBoostPads(splineData, scene, options = {}) {
  const padCount = options.padCount || 4;
  const onBoost = options.onBoost || null;

  const padsGroup = new THREE.Group();
  padsGroup.name = 'BoostPadsGroup';
  scene.add(padsGroup);

  const samples = splineData.samples;
  const totalLength = splineData.total_length_m || 3.8371;
  const step = Math.floor(samples.length / padCount);

  // Chevron glowing material
  const chevronMat = new THREE.MeshStandardMaterial({
    color: 0x00ffee,
    emissive: 0x00ccdd,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.6,
  });

  // Base panel material
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111622,
    roughness: 0.8,
    metalness: 0.3,
  });

  // Capacitor can material (blue electrolytic wrapper + silver top)
  const capBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1144aa,
    roughness: 0.4,
    metalness: 0.6,
  });
  const capTopMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.2,
    metalness: 0.9,
  });

  function buildPadMesh() {
    const padRoot = new THREE.Group();

    // 1. Base embedded track strip
    const baseGeo = new THREE.BoxGeometry(0.015, 0.0004, 0.024);
    const base = new THREE.Mesh(baseGeo, baseMat);
    padRoot.add(base);

    // 2. Dual forward-pointing chevrons
    const chevronGeo = new THREE.BoxGeometry(0.011, 0.0006, 0.0035);
    const c1 = new THREE.Mesh(chevronGeo, chevronMat);
    c1.position.set(0, 0.0003, -0.0045);
    padRoot.add(c1);

    const c2 = new THREE.Mesh(chevronGeo, chevronMat);
    c2.position.set(0, 0.0003, 0.0045);
    padRoot.add(c2);

    // 3. Dual side electrolytic capacitors (stands beside track rail)
    const capGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.006, 12);
    const capTopGeo = new THREE.CylinderGeometry(0.0021, 0.0021, 0.0004, 12);

    // Left cap
    const capLeft = new THREE.Mesh(capGeo, capBodyMat);
    capLeft.position.set(-0.011, 0.003, 0);
    const capTopL = new THREE.Mesh(capTopGeo, capTopMat);
    capTopL.position.set(-0.011, 0.0062, 0);
    padRoot.add(capLeft);
    padRoot.add(capTopL);

    // Right cap
    const capRight = new THREE.Mesh(capGeo, capBodyMat);
    capRight.position.set(0.011, 0.003, 0);
    const capTopR = new THREE.Mesh(capTopGeo, capTopMat);
    capTopR.position.set(0.011, 0.0062, 0);
    padRoot.add(capRight);
    padRoot.add(capTopR);

    return padRoot;
  }

  const pads = [];

  for (let i = 0; i < padCount; i++) {
    const sampleIdx = (i * step + Math.floor(step * 0.25)) % samples.length;
    const sample = samples[sampleIdx];

    const pos = new THREE.Vector3().fromArray(sample.position);
    const tangent = new THREE.Vector3().fromArray(sample.tangent).normalize();
    const normal = new THREE.Vector3().fromArray(sample.normal).normalize();
    const right = new THREE.Vector3().fromArray(sample.right).normalize();

    const mesh = buildPadMesh();

    // Construct orthonormal rotation matrix aligned with track frame
    // +X = right, +Y = normal, +Z = tangent
    const rotMat = new THREE.Matrix4().makeBasis(right, normal, tangent);
    mesh.quaternion.setFromRotationMatrix(rotMat);
    mesh.position.copy(pos).addScaledVector(normal, 0.0002);

    padsGroup.add(mesh);

    pads.push({
      id: i,
      arc_length_m: sample.arc_length_m,
      position: pos,
      mesh,
      cooldown: 0.0,
    });
  }

  function checkTrigger(kartS, kartLateralOffset) {
    if (typeof kartS !== 'number') return false;

    for (const pad of pads) {
      if (pad.cooldown > 0) continue;

      // Distance along circular loop
      let ds = Math.abs(kartS - pad.arc_length_m);
      if (ds > totalLength * 0.5) {
        ds = totalLength - ds;
      }

      // Check within 18mm trigger zone along track and within road width
      if (ds <= 0.018 && Math.abs(kartLateralOffset || 0) <= 0.008) {
        pad.cooldown = 1.4; // 1.4s cooldown
        if (typeof onBoost === 'function') {
          onBoost(pad);
        }
        return true;
      }
    }
    return false;
  }

  function update(dt, time = performance.now() * 0.001) {
    // Pulse chevron glow
    const pulse = Math.sin(time * 9.0) * 0.35 + 0.85;
    chevronMat.emissiveIntensity = pulse;

    for (const pad of pads) {
      if (pad.cooldown > 0) {
        pad.cooldown = Math.max(0, pad.cooldown - dt);
      }
    }
  }

  return {
    pads,
    padsGroup,
    checkTrigger,
    update,
  };
}
