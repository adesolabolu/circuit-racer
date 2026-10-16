import * as THREE from 'three';

/**
 * Creates an arcade jump ramp on the coaster track for ballistic air launches.
 *
 * @param {Object} splineData Parsed track_spline.json
 * @param {THREE.Scene} scene The main Three.js scene
 * @param {Object} options Optional config
 */
export function createJumpRamp(splineData, scene, options = {}) {
  const arcLength = options.arcLength ?? 1.85; // Default Sector 3 jump
  const onLaunch = options.onLaunch || null;

  const samples = splineData.samples;
  const totalLength = splineData.total_length_m || 3.8371;

  // Find nearest spline sample to arcLength
  let closestSample = samples[0];
  let minDiff = Infinity;
  for (const s of samples) {
    const diff = Math.abs(s.arc_length_m - arcLength);
    if (diff < minDiff) {
      minDiff = diff;
      closestSample = s;
    }
  }

  const pos = new THREE.Vector3().fromArray(closestSample.position);
  const tangent = new THREE.Vector3().fromArray(closestSample.tangent).normalize();
  const normal = new THREE.Vector3().fromArray(closestSample.normal).normalize();
  const right = new THREE.Vector3().fromArray(closestSample.right).normalize();

  const rampGroup = new THREE.Group();
  rampGroup.name = 'JumpRampGroup';

  // 1. Hazard striped ramp wedge
  // Slanted box geometry
  const rampGeo = new THREE.BoxGeometry(0.016, 0.0028, 0.018);
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    roughness: 0.4,
    metalness: 0.6,
    emissive: 0x442200,
  });

  const rampMesh = new THREE.Mesh(rampGeo, rampMat);
  rampMesh.rotation.x = -0.14; // Incline angle
  rampMesh.position.y = 0.0012;
  rampGroup.add(rampMesh);

  // 2. Warning LED indicator beacons on the sides
  const ledGeo = new THREE.CylinderGeometry(0.0008, 0.0008, 0.003, 8);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

  const ledLeft = new THREE.Mesh(ledGeo, ledMat);
  ledLeft.position.set(-0.0095, 0.002, 0.004);
  rampGroup.add(ledLeft);

  const ledRight = new THREE.Mesh(ledGeo, ledMat);
  ledRight.position.set(0.0095, 0.002, 0.004);
  rampGroup.add(ledRight);

  // Align ramp with track orthonormal basis
  const rotMat = new THREE.Matrix4().makeBasis(right, normal, tangent);
  rampGroup.quaternion.setFromRotationMatrix(rotMat);
  rampGroup.position.copy(pos).addScaledVector(normal, 0.0003);

  scene.add(rampGroup);

  let cooldown = 0.0;

  function checkTrigger(kartS, kartSpeed = 0) {
    if (typeof kartS !== 'number') return 0;
    if (cooldown > 0) return 0;

    let ds = Math.abs(kartS - closestSample.arc_length_m);
    if (ds > totalLength * 0.5) {
      ds = totalLength - ds;
    }

    if (ds <= 0.016 && kartSpeed > 0.06) {
      cooldown = 1.5;
      const launchVel = 0.048 + Math.min(0.035, kartSpeed * 0.16);

      if (typeof onLaunch === 'function') {
        onLaunch(launchVel);
      }
      return launchVel;
    }
    return 0;
  }

  function update(dt, time = performance.now() * 0.001) {
    if (cooldown > 0) {
      cooldown = Math.max(0, cooldown - dt);
    }
    // Blink LEDs
    const blink = Math.sin(time * 12.0) > 0;
    ledMat.color.setHex(blink ? 0xff3300 : 0x440800);
  }

  return {
    mesh: rampGroup,
    arcLength: closestSample.arc_length_m,
    position: pos,
    checkTrigger,
    update,
  };
}
