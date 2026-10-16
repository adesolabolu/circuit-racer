import * as THREE from 'three';

import { buildAtmosphere } from './scene/AtmosphereBuilder.js';
import { buildHackerWorkbenchDiorama } from './scene/HackerWorkbenchBuilder.js';
import { buildCoasterTrack } from './scene/CoasterTrackBuilder.js';
import { buildMicroKart } from './scene/MicroKartBuilder.js';
import { createTrackCollectibles } from './scene/TrackCollectibles.js';
import { createBoostPads } from './scene/BoostPads.js';
import { createJumpRamp } from './scene/JumpRampBuilder.js';
import { createKartPhysicsController } from './physics/KartPhysicsController.js';
import { createHazardManager } from './physics/HazardManager.js';
import { createWebAudioSynth } from './audio/WebAudioSynth.js';
import { getPlayer, onUserChange, saveScore } from './platform/startng.js';
import { profileState } from './state/ProfileState.js';
import { createTitleScreen } from './ui/TitleScreen.js';
import { createHudOverlay } from './ui/HudOverlay.js';
import { createResultsModal } from './ui/ResultsModal.js';

async function initCircuitRacer() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. THREE.JS SCENE, RENDERER & CAMERA
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
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

  // 8. GAMEPLAY MECHANICS (COLLECTIBLES, BOOST PADS, JUMP RAMP, HAZARD MANAGER)
  const hud = createHudOverlay({ player, profileState });
  hudContainerVisibility(false);

  function hudContainerVisibility(visible) {
    const el = document.getElementById('hud-root');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  const collectibles = createTrackCollectibles(splineData, scene, {
    chipCount: 16,
    onCollect: (chip, amount) => {
      profileState.addCoins(amount);
      hud.setCoins(profileState.getCoins());
      hud.showAlert('+10 BITS', 800);
      audio.playChipPickup();
    },
  });

  const boostPads = createBoostPads(splineData, scene, {
    padCount: 4,
    onBoost: () => {
      physics.state.boostActive = 1.0;
      physics.state.speed = Math.max(physics.state.speed, 0.285);
      audio.playBoostPad();
      hud.showAlert('TURBO BOOST!', 900);
    },
  });

  const jumpRamp = createJumpRamp(splineData, scene, {
    arcLength: 1.85, // Sector 3 jump
    onLaunch: (launchVel) => {
      physics.state.hopVel = launchVel;
      audio.playJumpLaunch();
    },
  });

  const hazardManager = createHazardManager(splineData, {
    onFall: () => {
      audio.playFallGlitch();
      hud.showAlert('OFF TRACK! RESPAWNING...', 1200);
    },
    onRespawn: () => {
      audio.playRespawnSound();
    },
  });

  // Wire physics callbacks
  physics.onRailImpact((severity) => {
    audio.playRailImpact(severity);
  });

  physics.onLapComplete((lapTime, bestLap, completedLap, totalTime, isFinal) => {
    if (!isFinal) {
      collectibles.resetForNewLap();
      hud.setLap(completedLap + 1);
      hud.showAlert(`LAP ${completedLap + 1}!`);
      audio.playLapChime();
    }
  });

  physics.onRaceFinish(async (totalTime, lapTimes, bestLapTime) => {
    gameState = 'FINISHED';
    audio.playRaceFinishFanfare();

    const chipsCount = collectibles.getCollectedCount();
    const chipsBonus = chipsCount * 10;
    const completionBonus = 50;
    const cleanRunBonus = hazardManager.isCleanRun() ? 100 : 0;
    const totalEarned = chipsBonus + completionBonus + cleanRunBonus;

    // Add completion and clean run bonuses (chip coins were added live on pickup)
    profileState.addCoins(completionBonus + cleanRunBonus);
    hud.setCoins(profileState.getCoins());

    // Submit score to start.ng
    const finalScore = Math.max(
      10,
      Math.floor(10000 - totalTime * 80) + (hazardManager.isCleanRun() ? 1000 : 0)
    );
    let scoreResult = null;
    try {
      scoreResult = await saveScore(finalScore);
    } catch (e) {
      console.warn('Score submission error:', e);
    }

    createResultsModal({
      totalTime,
      bestLap: bestLapTime,
      chipsCollected: chipsCount,
      chipsBonus,
      completionBonus,
      cleanRunBonus,
      totalEarned,
      walletBalance: profileState.getCoins(),
      scoreResult,
      onRaceAgain: () => {
        restartRaceSequence();
      },
      onGarage: () => {
        hud.showAlert('GARAGE UNLOCKED IN PHASE 3!', 2000);
      },
      onMainMenu: () => {
        returnToMainMenu();
      },
    });
  });

  // 9. GAME STATE & UI
  let gameState = 'ATTRACT'; // 'ATTRACT' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
  let raceTimer = 0;
  let wasAirborne = false;

  // Camera modes and settings
  const CAMERA_MODES = [
    { name: 'CHASE', dist: -0.054, height: 0.024, lookAhead: 0.038, lookHeight: 0.006 },
    { name: 'FAR CHASE', dist: -0.086, height: 0.040, lookAhead: 0.048, lookHeight: 0.008 },
    { name: 'HOOD CAM', dist: 0.009, height: 0.008, lookAhead: 0.052, lookHeight: 0.004 },
  ];
  let currentCamModeIdx = 0;

  const curCamInit = CAMERA_MODES[currentCamModeIdx];
  const chasePos = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, curCamInit.dist)
    .addScaledVector(initSt.normal, curCamInit.height);
  const chaseLook = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, curCamInit.lookAhead)
    .addScaledVector(initSt.normal, curCamInit.lookHeight);
  let attractOrbitAngle = 0.5;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC') {
      currentCamModeIdx = (currentCamModeIdx + 1) % CAMERA_MODES.length;
      const mode = CAMERA_MODES[currentCamModeIdx];
      hud.showAlert(`CAM: ${mode.name}`, 1000);
    }
  });

  window.__debugCamera = () => ({
    cameraPos: camera.position.toArray(),
    cameraLook: chaseLook.toArray(),
    cameraUp: camera.up.toArray(),
    kartPos: kart.kartRoot.position.toArray(),
    physicsPos: physics?.state?.position?.toArray(),
    speed: physics?.state?.speed,
    gameState,
  });

  let titleScreenRef = null;

  function showTitleScreen() {
    titleScreenRef = createTitleScreen({
      player,
      profileState,
      onStartRace: () => {
        startRaceSequence();
      },
    });
  }

  showTitleScreen();

  function startRaceSequence() {
    audio.setEnabled(true);
    gameState = 'COUNTDOWN';
    hudContainerVisibility(true);
    hud.setLap(1);
    hud.setTime(0);
    hud.showAlert('READY...');
    audio.playF1CountdownBeep(false);

    setTimeout(() => {
      hud.showAlert('SET...');
      audio.playF1CountdownBeep(false);
    }, 1000);

    setTimeout(() => {
      hud.showAlert('GO!', 1200);
      audio.playF1CountdownBeep(true);
      gameState = 'RACING';
      raceTimer = 0;
      physics.notifyLightsOut?.();
    }, 2000);
  }

  function restartRaceSequence() {
    physics.resetToStart();
    collectibles.resetAll();
    hazardManager.reset();
    startRaceSequence();
  }

  function returnToMainMenu() {
    physics.resetToStart();
    collectibles.resetAll();
    hazardManager.reset();
    gameState = 'ATTRACT';
    hudContainerVisibility(false);
    showTitleScreen();
  }

  // 10. ANIMATION LOOP
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Update diorama status LEDs & glowing heating elements
    diorama.updateLeds(now * 0.001);

    // Update track collectibles, boost pads, and jump ramp
    collectibles.update(dt, now * 0.001);
    boostPads.update(dt, now * 0.001);
    jumpRamp.update(dt, now * 0.001);

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

      // Hazard & Fall Step
      const hazard = hazardManager.step(dt, physicsState);

      if (hazard.falling) {
        // Tumble kart downwards off track
        kart.kartRoot.rotation.x += dt * 7.5;
        kart.kartRoot.rotation.z += dt * 4.2;
        kart.kartRoot.position.y -= dt * 0.07;
      } else {
        // Sync 3D kart position and orientation with physics controller
        kart.kartRoot.position.copy(physicsState.position);
        kart.kartRoot.quaternion.copy(physicsState.quaternion);

        // Invulnerability flash
        if (hazard.invulnerable) {
          kart.kartRoot.visible = Math.floor(now * 0.015) % 2 === 0;
        } else {
          kart.kartRoot.visible = true;
        }
      }

      // Check Jump Air/Land transitions
      if (physicsState.hopHeight > 0.001) {
        wasAirborne = true;
      } else if (wasAirborne && physicsState.hopHeight <= 0.0005) {
        audio.playJumpLand();
        wasAirborne = false;
      }

      // Update visuals & audio
      kart.updateKartVisuals(dt, physicsState);
      audio.update?.(dt, physicsState);

      // HUD Telemetry
      const speedKmh = Math.abs(physicsState.speed) * 120;
      hud.setSpeed(speedKmh);

      if (gameState === 'RACING') {
        raceTimer += dt;
        hud.setTime(physicsState.totalRaceTime || raceTimer);
        hud.setLap(physicsState.lapCount || 1);

        // Check active track collisions
        collectibles.checkCollisions(physicsState.position);
        boostPads.checkTrigger(physicsState.s, physicsState.lateralOffset);
        jumpRamp.checkTrigger(physicsState.s, physicsState.speed);
      }

      // Dynamic chase camera aligned with track normal & tangent
      const curCam = CAMERA_MODES[currentCamModeIdx];
      const camForward = physicsState.tangent
        .clone()
        .applyAxisAngle(physicsState.normal, (physicsState.headingYaw || 0.0) * 0.40)
        .normalize();

      const desiredCamPos = physicsState.position
        .clone()
        .addScaledVector(camForward, curCam.dist)
        .addScaledVector(physicsState.normal, curCam.height + (physicsState.hopHeight || 0) * 0.38);

      const desiredCamLook = physicsState.position
        .clone()
        .addScaledVector(camForward, curCam.lookAhead)
        .addScaledVector(physicsState.normal, curCam.lookHeight + (physicsState.hopHeight || 0) * 0.22);

      const smoothFactor = 1.0 - Math.exp(-dt * 14.0);
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
