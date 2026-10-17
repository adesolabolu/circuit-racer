import * as THREE from 'three';

const FALL_OFFSET_THRESHOLD = 0.0125; // 12.5mm off track center (track is 18mm wide, curb at 7.8mm)
const FALL_DURATION = 1.0; // 1.0s drop tumble animation
const INVULNERABLE_DURATION = 1.5; // 1.5s post-respawn immunity

/**
 * Monitors kart boundaries, detects track-falls, manages safe checkpoints,
 * handles respawns, and tracks the Clean Run bonus.
 *
 * @param {Object} splineData Parsed track_spline.json
 * @param {Object} options Optional callbacks
 */
export function createHazardManager(splineData, options = {}) {
  const onFall = options.onFall || null;
  const onRespawn = options.onRespawn || null;

  const fallThreshold =
    options.fallThreshold ??
    (splineData?.track_width_m ? splineData.track_width_m * 0.5 + 0.004 : FALL_OFFSET_THRESHOLD);

  const samples = splineData.samples;
  const totalLength = splineData.total_length_m || 3.8371;

  // Generate safe checkpoints evenly spaced around the circuit
  const numCheckpoints = options.checkpointCount || 6;
  const checkpoints = [];
  const stepInterval = Math.floor(samples.length / numCheckpoints);

  for (let i = 0; i < numCheckpoints; i++) {
    const sIdx = (i * stepInterval) % samples.length;
    const s = samples[sIdx];
    checkpoints.push({
      id: i,
      arc_length_m: s.arc_length_m,
      position: new THREE.Vector3().fromArray(s.position),
      tangent: new THREE.Vector3().fromArray(s.tangent).normalize(),
      normal: new THREE.Vector3().fromArray(s.normal).normalize(),
      right: new THREE.Vector3().fromArray(s.right).normalize(),
      sector: s.sector,
    });
  }

  let cleanRun = true;
  let falling = false;
  let fallTimer = 0.0;
  let invulnerableTimer = 0.0;
  let lastCheckpointIndex = 0;

  function updateCheckpoint(kartS) {
    if (typeof kartS !== 'number') return;
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      let dist = kartS - cp.arc_length_m;
      if (dist < 0) dist += totalLength;
      if (dist >= 0 && dist < totalLength / numCheckpoints) {
        lastCheckpointIndex = i;
        break;
      }
    }
  }

  function step(dt, physicsState) {
    if (invulnerableTimer > 0) {
      invulnerableTimer = Math.max(0, invulnerableTimer - dt);
    }

    if (falling) {
      fallTimer += dt;
      if (fallTimer >= FALL_DURATION) {
        // Respawn!
        falling = false;
        fallTimer = 0.0;
        invulnerableTimer = INVULNERABLE_DURATION;

        const cp = checkpoints[lastCheckpointIndex];
        if (physicsState) {
          physicsState.s = cp.arc_length_m;
          physicsState.lateralOffset = 0.0;
          physicsState.lateralVel = 0.0;
          physicsState.headingYaw = 0.0;
          physicsState.speed = 0.08;
          physicsState.hopHeight = 0.0;
          physicsState.hopVel = 0.0;
        }

        if (typeof onRespawn === 'function') {
          onRespawn(cp);
        }
      }
      return { falling: true, invulnerable: false };
    }

    if (!physicsState) return { falling: false, invulnerable: invulnerableTimer > 0 };

    updateCheckpoint(physicsState.s);

    // Only detect falls if not currently invulnerable
    if (invulnerableTimer <= 0) {
      const absLat = Math.abs(physicsState.lateralOffset || 0);
      const isOutOfBounds =
        absLat > fallThreshold ||
        (physicsState.position && physicsState.position.y < -0.01);

      if (isOutOfBounds) {
        falling = true;
        fallTimer = 0.0;
        cleanRun = false;

        if (typeof onFall === 'function') {
          onFall();
        }
        return { falling: true, invulnerable: false };
      }
    }

    return { falling: false, invulnerable: invulnerableTimer > 0 };
  }

  function reset() {
    cleanRun = true;
    falling = false;
    fallTimer = 0.0;
    invulnerableTimer = 0.0;
    lastCheckpointIndex = 0;
  }

  return {
    checkpoints,
    step,
    updateCheckpoint,
    reset,
    isFalling: () => falling,
    isCleanRun: () => cleanRun,
    isInvulnerable: () => invulnerableTimer > 0,
    getLastCheckpoint: () => checkpoints[lastCheckpointIndex],
  };
}
