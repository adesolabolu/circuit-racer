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

    // 1. Embedded flush base track strip
    const baseGeo = new THREE.BoxGeometry(0.024, 0.0002, 0.034);
    const base = new THREE.Mesh(baseGeo, baseMat);
    padRoot.add(base);

    // 2. Triple forward-pointing high-tech cyan chevrons
    const chevronGeo = new THREE.BoxGeometry(0.016, 0.0004, 0.0045);
    for (const zOffset of [-0.0085, 0.0, 0.0085]) {
      const c = new THREE.Mesh(chevronGeo, chevronMat);
      c.position.set(0, 0.0002, zOffset);
      padRoot.add(c);
    }

    // 3. Flush neon side indicator tracks (no vertical obstacles!)
    const edgeGeo = new THREE.BoxGeometry(0.0012, 0.0004, 0.032);
    for (const sx of [-0.0115, 0.0115]) {
      const edge = new THREE.Mesh(edgeGeo, chevronMat);
      edge.position.set(sx, 0.0002, 0);
      padRoot.add(edge);
    }

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

      // Check within 18mm trigger zone along track and within wider road width
      if (ds <= 0.018 && Math.abs(kartLateralOffset || 0) <= 0.013) {
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
