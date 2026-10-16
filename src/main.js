import * as THREE from 'three';

import { buildAtmosphere } from './scene/AtmosphereBuilder.js';
import { buildHackerWorkbenchDiorama } from './scene/HackerWorkbenchBuilder.js';
import { buildCoasterTrack } from './scene/CoasterTrackBuilder.js';
import { buildMicroKart } from './scene/MicroKartBuilder.js';
import { createKartPhysicsController } from './physics/KartPhysicsController.js';
import { createWebAudioSynth } from './audio/WebAudioSynth.js';
import { getPlayer, onUserChange, saveScore } from './platform/startng.js';
import { profileState } from './state/ProfileState.js';
import { createTitleScreen } from './ui/TitleScreen.js';
import { createHudOverlay } from './ui/HudOverlay.js';

async function initCircuitRacer() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. THREE.JS SCENE, RENDERER & CAMERA
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    52,
    window.innerWidth / window.innerHeight,
    0.002,
    15.0
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);

  // 2. ATMOSPHERE & LATE-NIGHT HACKER WORKBENCH DIORAMA
  const atmosphere = buildAtmosphere(scene);
  const diorama = buildHackerWorkbenchDiorama(scene);

  // 3. FETCH MANIFEST & TRACK SPLINE
  const [manifestRes, splineRes] = await Promise.all([
    fetch('/assets/data/desk_manifest.json'),
    fetch('/assets/data/track_spline.json'),
  ]);
  const manifest = await manifestRes.json();
  const splineData = await splineRes.json();

  // 4. BUILD COASTER TRACK
  const coaster = buildCoasterTrack(splineData);
  scene.add(coaster.trackGroup);
  if (coaster.underTrackLedGroup) {
    scene.add(coaster.underTrackLedGroup);
  }

  // 5. MICRO-KART & DRIVER
  const kart = buildMicroKart();
  scene.add(kart.kartRoot);

  // 6. FETCH START.NG PLAYER & APPLY AVATAR STYLE
  const player = await getPlayer();
  if (player && player.style && kart.driver) {
    kart.driver.applyStyle(player.style);
  }

  onUserChange((updatedPlayer) => {
    if (updatedPlayer && updatedPlayer.style && kart.driver) {
      kart.driver.applyStyle(updatedPlayer.style);
    }
  });

  // 7. RAPIER3D PHYSICS CONTROLLER & AUDIO SYNTH
  const physics = await createKartPhysicsController(
    splineData,
    manifest,
    coaster.roadGeo
  );

  const audio = createWebAudioSynth();

  // Initialize kart pose from physics starting gate
  const initSt = physics.state;
  kart.kartRoot.position.copy(initSt.position);
  kart.kartRoot.quaternion.copy(initSt.quaternion);

  // 8. INPUT HANDLING
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    boost: false,
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.forward = true;
    if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.backward = true;
    if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.right = true;
    if (e.code === 'Space') keys.drift = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.boost = true;
    if (e.code === 'KeyM') audio.toggleMute?.();
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.forward = false;
    if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.backward = false;
    if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.right = false;
    if (e.code === 'Space') keys.drift = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.boost = false;
  });

  // 9. GAME STATE & UI
  let gameState = 'ATTRACT'; // 'ATTRACT' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
  let raceTimer = 0;
  let currentLap = 1;
  const TOTAL_LAPS = 3;

  const hud = createHudOverlay({ player, profileState });
  hudContainerVisibility(false);

  function hudContainerVisibility(visible) {
    const el = document.getElementById('hud-root');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  // Camera settings
  const chasePos = new THREE.Vector3();
  const chaseLook = new THREE.Vector3();
  let attractOrbitAngle = 0.5;

  createTitleScreen({
    player,
    profileState,
    onStartRace: () => {
      startRaceSequence();
    },
  });

  function startRaceSequence() {
    audio.startAudio?.();
    gameState = 'COUNTDOWN';
    hudContainerVisibility(true);
    hud.showAlert('READY...');

    setTimeout(() => {
      hud.showAlert('SET...');
    }, 1000);

    setTimeout(() => {
      hud.showAlert('GO!', 1200);
      gameState = 'RACING';
      raceTimer = 0;
    }, 2000);
  }

  // 10. ANIMATION LOOP
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Update diorama status LEDs & glowing heating elements
    diorama.updateLeds(now * 0.001);

    if (gameState === 'ATTRACT') {
      // Cinematic slow turntable orbit around the kart parked on the start gantry
      attractOrbitAngle += dt * 0.35;
      const target = initSt.position;
      const radius = 0.085;
      camera.position.set(
        target.x + Math.cos(attractOrbitAngle) * radius,
        target.y + 0.042,
        target.z + Math.sin(attractOrbitAngle) * radius
      );
      camera.lookAt(target.x, target.y + 0.006, target.z);

      // Idle audio & wheel update
      kart.updateKartVisuals(dt, { speed: 0, steerInput: 0 });
    } else {
      // Racing / Countdown / Finished
      if (physics) {
        let steerInput = 0;
        if (keys.left) steerInput -= 1.0;
        if (keys.right) steerInput += 1.0;

        let throttleInput = 0;
        if (gameState === 'RACING') {
          if (keys.forward) throttleInput += 1.0;
          if (keys.backward) throttleInput -= 0.65;
        }

        const physicsState = physics.step(dt, {
          throttle: throttleInput,
          steer: steerInput,
          drift: keys.drift,
          boost: keys.boost,
        });

        // Sync 3D kart position and orientation with physics controller
        kart.kartRoot.position.copy(physicsState.position);
        kart.kartRoot.quaternion.copy(physicsState.quaternion);

        // Update visuals & audio
        kart.updateKartVisuals(dt, physicsState);
        audio.update?.(dt, physicsState);

        // HUD Telemetry
        const speedKmh = Math.abs(physicsState.speed) * 120;
        hud.setSpeed(speedKmh);

        if (gameState === 'RACING') {
          raceTimer += dt;
          hud.setTime(raceTimer);

          // Lap detection
          if (physicsState.lapCompleted) {
            currentLap++;
            if (currentLap <= TOTAL_LAPS) {
              hud.setLap(currentLap);
              hud.showAlert(`LAP ${currentLap}!`);
            } else {
              // Race finished
              gameState = 'FINISHED';
              hud.showAlert('FINISH!', 4000);

              // Reward coins: 50 completion + 100 clean run bonus
              const bonusCoins = 150;
              profileState.addCoins(bonusCoins);
              hud.setCoins(profileState.getCoins());

              // Submit score to start.ng
              const finalScore = Math.max(10, Math.floor(10000 - raceTimer * 80));
              saveScore(finalScore).catch((e) => console.warn('Score submission error', e));
            }
          }
        }

        // Smooth 3rd person chase camera
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(physicsState.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(physicsState.quaternion);

        const targetCamPos = physicsState.position
          .clone()
          .sub(forward.clone().multiplyScalar(0.048))
          .add(up.clone().multiplyScalar(0.022));

        chasePos.lerp(targetCamPos, Math.min(1, dt * 10));
        camera.position.copy(chasePos);

        const targetLook = physicsState.position
          .clone()
          .add(forward.clone().multiplyScalar(0.025))
          .add(up.clone().multiplyScalar(0.006));

        chaseLook.lerp(targetLook, Math.min(1, dt * 12));
        camera.lookAt(chaseLook);
      }
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Immediate launch checking document readiness
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCircuitRacer().catch((err) => console.error('Initialization error:', err));
  });
} else {
  initCircuitRacer().catch((err) => console.error('Initialization error:', err));
}
