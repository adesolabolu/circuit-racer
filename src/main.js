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
import { createSynthwaveMusicEngine } from './audio/SynthwaveMusicEngine.js';
import { getPlayer, onUserChange, saveScore } from './platform/startng.js';
import { profileState, KART_CATALOG } from './state/ProfileState.js';
import { TRACK_LIST, getSelectedTrack, setSelectedTrackId } from './scene/TrackRegistry.js';
import { LeaderboardState } from './state/LeaderboardState.js';
import { createTitleScreen } from './ui/TitleScreen.js';
import { createHudOverlay } from './ui/HudOverlay.js';
import { createResultsModal } from './ui/ResultsModal.js';
import { createGarageModal } from './ui/GarageModal.js';
import { createTrackSelectModal } from './ui/TrackSelectModal.js';
import { createLeaderboardModal } from './ui/LeaderboardModal.js';
import { createTrackMinimap } from './ui/TrackMinimap.js';

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

  // 3. FETCH MANIFEST & SELECTED TRACK SPLINE
  let currentTrack = getSelectedTrack();
  console.log(`[CircuitRacer] 3. Fetching manifest & track spline for: ${currentTrack.name}`);
  const [manifestRes, splineRes] = await Promise.all([
    fetch('./assets/data/desk_manifest.json'),
    fetch(currentTrack.file),
  ]);
  const manifest = await manifestRes.json();
  let splineData = await splineRes.json();

  // 4. BUILD COASTER TRACK
  console.log('[CircuitRacer] 4. Building coaster track');
  let coaster = buildCoasterTrack(splineData);
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
  let physics = await createKartPhysicsController(
    splineData,
    manifest,
    coaster.roadGeo
  );
  console.log('[CircuitRacer] 7b. Physics initialized');

  const audio = createWebAudioSynth({ masterVolume: 0.65 });
  const music = createSynthwaveMusicEngine({ volume: 0.38 });

  // Unlock and resume audio on user gesture
  const resumeAudioOnce = () => {
    audio.setEnabled(true);
    music.start();
    if (gameState === 'ATTRACT') {
      music.setMode('MENU');
    }
  };
  window.addEventListener('pointerdown', resumeAudioOnce, { once: true });
  window.addEventListener('keydown', resumeAudioOnce, { once: true });

  // Initialize kart pose from physics starting gate
  const initSt = physics.state;
  kart.kartRoot.position.copy(initSt.position);
  kart.kartRoot.quaternion.copy(initSt.quaternion);

  // 8. GAMEPLAY MECHANICS (COLLECTIBLES, BOOST PADS, JUMP RAMP, HAZARD MANAGER)
  const hud = createHudOverlay({
    player,
    profileState,
    onToggleMusic: () => {
      const isMuted = music.toggleMute();
      hud.setMusicMuted(isMuted);
      hud.showAlert(isMuted ? 'MUSIC: MUTED' : 'MUSIC: ON', 900);
    },
    onOpenLeaderboard: () => {
      openLeaderboardModal(currentTrack.id);
    },
  });

  let minimap = createTrackMinimap(splineData);
  hudContainerVisibility(false);

  function hudContainerVisibility(visible) {
    const el = document.getElementById('hud-root');
    if (el) el.style.display = visible ? 'block' : 'none';
    if (minimap) minimap.setVisible(visible);
  }

  function createGameplayObjects(trackData) {
    const coll = createTrackCollectibles(trackData, scene, {
      chipCount: 16,
      onCollect: (chip, amount) => {
        profileState.addCoins(amount);
        hud.setCoins(profileState.getCoins());
        hud.showAlert('+10 BITS', 800);
        audio.playChipPickup();
      },
    });

    const bp = createBoostPads(trackData, scene, {
      padCount: 4,
      onBoost: () => {
        physics.state.boostActive = 1.0;
        physics.state.speed = Math.max(physics.state.speed, 0.285);
        audio.playBoostPad();
        hud.showAlert('TURBO BOOST!', 900);
      },
    });

    const rampS = (trackData.total_length_m || 3.0) * 0.48;
    const jr = createJumpRamp(trackData, scene, {
      arcLength: rampS,
      onLaunch: (launchVel) => {
        physics.state.hopVel = launchVel;
        audio.playJumpLaunch();
      },
    });

    const hm = createHazardManager(trackData, {
      onFall: () => {
        audio.playFallGlitch();
        hud.showAlert('OFF TRACK! RESPAWNING...', 1200);
      },
      onRespawn: () => {
        audio.playRespawnSound();
      },
    });

    return { coll, bp, jr, hm };
  }

  let { coll: collectibles, bp: boostPads, jr: jumpRamp, hm: hazardManager } = createGameplayObjects(splineData);

  function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  // Wire physics callbacks
  function wirePhysicsCallbacks() {
    physics.onRailImpact((severity) => {
      audio.playRailImpact(severity);
    });

    physics.onLapComplete((lapTime, bestLap, completedLap, totalTime, isFinal) => {
      // Record lap time in Leaderboard
      const selectedKartId = profileState.getSelectedKart();
      const kartConfig = KART_CATALOG.find((k) => k.id === selectedKartId);
      const isClean = hazardManager ? hazardManager.isCleanRun() : true;

      const lbResult = LeaderboardState.recordLapTime(currentTrack.id, {
        playerName: player ? player.name : 'Guest Hacker',
        lapTime,
        kartName: kartConfig?.name || 'Proto-Buggy',
        cleanRun: isClean,
        isPlayer: true,
      });

      if (lbResult?.isNewRecord) {
        hud.showAlert(`⚡ NEW ALL-TIME RECORD! ${formatTime(lapTime)}`, 2200);
      } else if (lbResult?.isPersonalBest) {
        hud.showAlert(`🔥 PERSONAL BEST! ${formatTime(lapTime)}`, 1800);
      } else if (!isFinal) {
        hud.showAlert(`LAP ${completedLap + 1}!`);
      }

      if (!isFinal) {
        collectibles.resetForNewLap();
        hud.setLap(completedLap + 1);
        audio.playLapChime();
      }
    });

    physics.onRaceFinish(async (totalTime, lapTimes, bestLapTime) => {
      gameState = 'FINISHED';
      audio.playRaceFinishFanfare();
      music.duck(0.18, 2.2);

      const chipsCount = collectibles.getCollectedCount();
      const chipsBonus = chipsCount * 10;
      const completionBonus = 50;
      const cleanRunBonus = hazardManager.isCleanRun() ? 100 : 0;
      const totalEarned = chipsBonus + completionBonus + cleanRunBonus;

      // Add completion and clean run bonuses (chip coins were added live on pickup)
      profileState.addCoins(completionBonus + cleanRunBonus);
      hud.setCoins(profileState.getCoins());

      // Submit score to start.ng matching startng.json
      const finalScore = Math.max(
        10,
        Math.floor(10000 - totalTime * 80) + (hazardManager.isCleanRun() ? 1000 : 0)
      );
      const lapTimeSeconds = Math.max(1, Math.round(bestLapTime || totalTime));
      let scoreResult = null;
      try {
        scoreResult = await saveScore({
          score: finalScore,
          stats: {
            time: lapTimeSeconds,
            chips: chipsCount,
          },
        });
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
          openGarageModal();
        },
        onLeaderboard: () => {
          openLeaderboardModal(currentTrack.id, true);
        },
        onMainMenu: () => {
          returnToMainMenu();
        },
      });
    });
  }

  wirePhysicsCallbacks();

  // 9. GAME STATE & UI
  let gameState = 'ATTRACT'; // 'ATTRACT' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
  let raceTimer = 0;
  let wasAirborne = false;

  // Camera modes and settings (calibrated for 0.95x aerodynamic racer on 34mm widened track)
  const CAMERA_MODES = [
    { name: 'CHASE', dist: -0.058, height: 0.027, lookAhead: 0.042, lookHeight: 0.007 },
    { name: 'FAR CHASE', dist: -0.088, height: 0.042, lookAhead: 0.050, lookHeight: 0.008 },
    { name: 'HOOD CAM', dist: 0.008, height: 0.008, lookAhead: 0.052, lookHeight: 0.004 },
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

  let titleScreenRef = null;
  let garageModalRef = null;
  let trackSelectModalRef = null;
  let leaderboardModalRef = null;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC') {
      currentCamModeIdx = (currentCamModeIdx + 1) % CAMERA_MODES.length;
      const mode = CAMERA_MODES[currentCamModeIdx];
      hud.showAlert(`CAM: ${mode.name}`, 1000);
    } else if (e.code === 'KeyM') {
      const isMuted = music.toggleMute();
      hud.setMusicMuted(isMuted);
      hud.showAlert(isMuted ? 'MUSIC: MUTED' : 'MUSIC: ON', 900);
    } else if (e.code === 'KeyG') {
      if (!garageModalRef && (gameState === 'ATTRACT' || gameState === 'FINISHED')) {
        openGarageModal();
      }
    } else if (e.code === 'KeyT') {
      if (!trackSelectModalRef && (gameState === 'ATTRACT' || gameState === 'FINISHED')) {
        openTrackSelectModal();
      }
    } else if (e.code === 'KeyL') {
      if (!leaderboardModalRef) {
        openLeaderboardModal(currentTrack.id);
      }
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
    currentTrack: currentTrack.id,
  });

  function applyKartCustomization() {
    const selectedKartId = profileState.getSelectedKart();
    const currentKartConfig = KART_CATALOG.find((k) => k.id === selectedKartId) || KART_CATALOG[0];
    if (kart.setChassisColor) {
      kart.setChassisColor(currentKartConfig.accentColor);
    }
    if (kart.setUnderglowColor) {
      kart.setUnderglowColor(profileState.getUnderglowColor());
    }
    physics.applyProfileUpgrades(profileState.getUpgrades(), selectedKartId);
  }

  // Apply customizations at startup
  applyKartCustomization();

  function openGarageModal() {
    if (garageModalRef) return;
    music.start();
    music.setMode('MENU');
    audio.setEnabled(true);

    garageModalRef = createGarageModal({
      profileState,
      onKartChanged: (kartId) => {
        applyKartCustomization();
        hud.setCoins(profileState.getCoins());
        titleScreenRef?.updateCoins?.(profileState.getCoins());
      },
      onUnderglowChanged: (hex) => {
        kart.setUnderglowColor(hex);
      },
      onStartRace: () => {
        garageModalRef = null;
        if (titleScreenRef) {
          titleScreenRef.hide();
          titleScreenRef = null;
        }
        startRaceSequence();
      },
      onClose: () => {
        garageModalRef = null;
        applyKartCustomization();
        hud.setCoins(profileState.getCoins());
        titleScreenRef?.updateCoins?.(profileState.getCoins());
        if (gameState === 'FINISHED') {
          returnToMainMenu();
        }
      },
    });
  }

  function openTrackSelectModal() {
    if (trackSelectModalRef) return;
    trackSelectModalRef = createTrackSelectModal({
      currentTrackId: currentTrack.id,
      onSelectTrack: async (chosenTrack) => {
        trackSelectModalRef = null;
        if (chosenTrack && chosenTrack.id !== currentTrack.id) {
          await switchTrack(chosenTrack);
        }
        if (gameState === 'FINISHED') {
          returnToMainMenu();
        }
      },
      onClose: () => {
        trackSelectModalRef = null;
        if (gameState === 'FINISHED') {
          returnToMainMenu();
        }
      },
    });
  }

  function openLeaderboardModal(trackId = null, isPostRace = false) {
    if (leaderboardModalRef) return;
    const postRaceMode = isPostRace || gameState === 'FINISHED';
    leaderboardModalRef = createLeaderboardModal({
      initialTrackId: trackId || currentTrack.id,
      isPostRace: postRaceMode,
      onRaceAgain: () => {
        leaderboardModalRef = null;
        restartRaceSequence();
      },
      onClose: () => {
        leaderboardModalRef = null;
        if (gameState === 'FINISHED') {
          returnToMainMenu();
        }
      },
    });
  }

  async function switchTrack(newTrackConfig) {
    currentTrack = newTrackConfig;
    setSelectedTrackId(newTrackConfig.id);

    hud.showAlert(`LOADING ${newTrackConfig.name}...`, 1200);

    // 1. Remove previous track visual groups
    if (coaster) {
      scene.remove(coaster.trackGroup);
      if (coaster.underTrackLedGroup) scene.remove(coaster.underTrackLedGroup);
    }
    if (collectibles) scene.remove(collectibles.collectiblesGroup);
    if (boostPads) scene.remove(boostPads.padsGroup);
    if (jumpRamp) scene.remove(jumpRamp.mesh);
    if (minimap) minimap.destroy();
    if (physics) physics.dispose();

    // 2. Fetch new spline data
    const res = await fetch(newTrackConfig.file);
    splineData = await res.json();

    // 3. Rebuild Coaster Track
    coaster = buildCoasterTrack(splineData);
    scene.add(coaster.trackGroup);
    if (coaster.underTrackLedGroup) {
      scene.add(coaster.underTrackLedGroup);
    }

    // 4. Rebuild Physics
    physics = await createKartPhysicsController(
      splineData,
      manifest,
      coaster.roadGeo
    );
    applyKartCustomization();
    wirePhysicsCallbacks();

    // 5. Rebuild Gameplay Objects & Minimap
    const objs = createGameplayObjects(splineData);
    collectibles = objs.coll;
    boostPads = objs.bp;
    jumpRamp = objs.jr;
    hazardManager = objs.hm;
    minimap = createTrackMinimap(splineData);

    // 6. Reposition kart to new start position
    const newInitSt = physics.state;
    kart.kartRoot.position.copy(newInitSt.position);
    kart.kartRoot.quaternion.copy(newInitSt.quaternion);

    const curCam = CAMERA_MODES[currentCamModeIdx];
    chasePos.copy(newInitSt.position)
      .addScaledVector(newInitSt.tangent, curCam.dist)
      .addScaledVector(newInitSt.normal, curCam.height);
    chaseLook.copy(newInitSt.position)
      .addScaledVector(newInitSt.tangent, curCam.lookAhead)
      .addScaledVector(newInitSt.normal, curCam.lookHeight);

    // 7. Update Title Screen UI if visible
    if (titleScreenRef?.updateTrack) {
      titleScreenRef.updateTrack(newTrackConfig);
    }

    hud.showAlert(`${newTrackConfig.name} READY!`, 1500);
  }

  function showTitleScreen() {
    titleScreenRef = createTitleScreen({
      player,
      profileState,
      onStartRace: () => {
        startRaceSequence();
      },
      onOpenGarage: () => {
        openGarageModal();
      },
      onOpenTrackSelect: () => {
        openTrackSelectModal();
      },
      onOpenLeaderboard: () => {
        openLeaderboardModal(currentTrack.id);
      },
    });
  }

  showTitleScreen();

  function startRaceSequence() {
    audio.setEnabled(true);
    music.start();
    music.setMode('COUNTDOWN');
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
      music.setMode('RACING');
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
    music.setMode('MENU');
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

      // HUD Telemetry & Radial Speedometer Gauge with Exaggerated Arcade Speed
      const baseSpeed = Math.abs(physicsState.speed);
      const isBoosting = (physicsState.boostActive || 0) > 0;
      const boostBonus = (isBoosting ? 38 : 0) + ((physicsState.hopHeight || 0) > 0.001 ? 22 : 0);
      const speedKmh = Math.min(340, Math.round(baseSpeed * 680 + boostBonus));

      // Calculate simulated gear for tachometer cluster
      let simulatedGear = '1';
      if (isBoosting) {
        simulatedGear = 'BST';
      } else if (speedKmh <= 0) {
        simulatedGear = 'N';
      } else if (speedKmh < 60) {
        simulatedGear = '1';
      } else if (speedKmh < 120) {
        simulatedGear = '2';
      } else if (speedKmh < 185) {
        simulatedGear = '3';
      } else if (speedKmh < 245) {
        simulatedGear = '4';
      } else if (speedKmh < 295) {
        simulatedGear = '5';
      } else {
        simulatedGear = '6';
      }

      hud.setSpeed(speedKmh, simulatedGear, isBoosting);
      minimap.update(physicsState.position, dt);

      // Dynamic Camera FOV widening for adrenaline rush / exaggerated speed sensation
      const targetFov = 60 + (speedKmh / 340) * 8.5 + (isBoosting ? 4.5 : 0);
      camera.fov += (targetFov - camera.fov) * Math.min(1.0, dt * 8.0);
      camera.updateProjectionMatrix();

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
