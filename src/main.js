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
  console.log('[CircuitRacer] 1. Creating scene and renderer');
  container.appendChild(renderer.domElement);

  // 2. ATMOSPHERE & LATE-NIGHT HACKER WORKBENCH DIORAMA
  console.log('[CircuitRacer] 2. Building atmosphere & diorama');
  const atmosphere = buildAtmosphere(scene);
  const diorama = buildHackerWorkbenchDiorama(scene);

  // 3. FETCH MANIFEST & TRACK SPLINE
  console.log('[CircuitRacer] 3. Fetching manifest & track spline');
  const [manifestRes, splineRes] = await Promise.all([
    fetch('/assets/data/desk_manifest.json'),
    fetch('/assets/data/track_spline.json'),
  ]);
  const manifest = await manifestRes.json();
  const splineData = await splineRes.json();

  // 4. BUILD COASTER TRACK
  console.log('[CircuitRacer] 4. Building coaster track');
  const coaster = buildCoasterTrack(splineData);
  scene.add(coaster.trackGroup);
  if (coaster.underTrackLedGroup) {
    scene.add(coaster.underTrackLedGroup);
  }

  // 5. MICRO-KART & DRIVER
  console.log('[CircuitRacer] 5. Building micro-kart');
  const kart = buildMicroKart();
  scene.add(kart.kartRoot);

  // 6. FETCH START.NG PLAYER & APPLY AVATAR STYLE
  console.log('[CircuitRacer] 6. Fetching start.ng player');
  const player = await getPlayer();
  console.log('[CircuitRacer] 6b. Player:', player);
  if (player && player.style && kart.driver) {
    kart.driver.applyStyle(player.style);
  }

  onUserChange((updatedPlayer) => {
    if (updatedPlayer && updatedPlayer.style && kart.driver) {
      kart.driver.applyStyle(updatedPlayer.style);
    }
  });

  // 7. RAPIER3D PHYSICS CONTROLLER & AUDIO SYNTH
  console.log('[CircuitRacer] 7. Initializing physics controller');
  const physics = await createKartPhysicsController(
    splineData,
    manifest,
    coaster.roadGeo
  );
  console.log('[CircuitRacer] 7b. Physics initialized');

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
  const chasePos = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, -0.0154)
    .addScaledVector(initSt.normal, 0.0074);
  const chaseLook = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, 0.024)
    .addScaledVector(initSt.normal, 0.0030);
  let attractOrbitAngle = 0.5;

  window.__debugCamera = () => ({
    cameraPos: camera.position.toArray(),
    cameraLook: chaseLook.toArray(),
    cameraUp: camera.up.toArray(),
    kartPos: kart.kartRoot.position.toArray(),
    physicsPos: physics?.state?.position?.toArray(),
    speed: physics?.state?.speed,
    gameState,
  });

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
      physics.notifyLightsOut?.();
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
      camera.up.set(0, 1, 0);
      camera.lookAt(target.x, target.y + 0.006, target.z);

      // Idle audio & wheel update
      kart.updateKartVisuals(dt, { speed: 0, steerInput: 0 });
    } else {
      // Racing / Countdown / Finished
      const physicsState = physics.stepPhysics(dt);

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

      // Smooth 3rd person chase camera aligned with track normal & tangent
      const camForward = physicsState.tangent
        .clone()
        .applyAxisAngle(physicsState.normal, (physicsState.headingYaw || 0.0) * 0.40)
        .normalize();

      const desiredCamPos = physicsState.position
        .clone()
        .addScaledVector(camForward, -0.0154)
        .addScaledVector(physicsState.normal, 0.0074 + (physicsState.hopHeight || 0) * 0.38);

      const desiredCamLook = physicsState.position
        .clone()
        .addScaledVector(camForward, 0.024)
        .addScaledVector(physicsState.normal, 0.0030 + (physicsState.hopHeight || 0) * 0.22);

      const smoothFactor = 1.0 - Math.exp(-dt * 18.0);
      chasePos.lerp(desiredCamPos, smoothFactor);
      chaseLook.lerp(desiredCamLook, smoothFactor);

      camera.position.copy(chasePos);
      camera.up.copy(physicsState.normal);
      camera.lookAt(chaseLook);
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
