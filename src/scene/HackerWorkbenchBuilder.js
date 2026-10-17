import * as THREE from 'three';

/**
 * Procedurally generates the Late-Night Hacker / Creator Workbench diorama.
 * Features: cutting mat, soldering station with glowing tip, ESP32 microcontroller,
 * breadboard with jumpers, digital multimeter, solder spool, and ceramic coffee mug.
 */
export function buildHackerWorkbenchDiorama(scene) {
  const workbenchGroup = new THREE.Group();
  workbenchGroup.name = 'HackerWorkbenchDiorama';

  const MAT_DARK_WOOD = new THREE.MeshStandardMaterial({
    color: 0x1f1712,
    roughness: 0.85,
    metalness: 0.05,
  });

  const MAT_MATTE_BLACK = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.7,
    metalness: 0.1,
  });

  const MAT_CHROME = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.25,
    metalness: 0.85,
  });

  const MAT_BRASS = new THREE.MeshStandardMaterial({
    color: 0xd4a03e,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 1. Tabletop (1.1m x 0.6m, y: -0.015)
  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.03, 0.7),
    MAT_DARK_WOOD
  );
  deskTop.position.set(0, -0.015, 0);
  deskTop.receiveShadow = true;
  workbenchGroup.add(deskTop);

  // 2. Self-Healing Grid Cutting Mat (0.9m x 0.52m x 0.003m)
  const cuttingMatCanvas = document.createElement('canvas');
  cuttingMatCanvas.width = 1024;
  cuttingMatCanvas.height = 512;
  const ctx = cuttingMatCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f2c24'; // deep green
    ctx.fillRect(0, 0, 1024, 512);

    // Draw 1cm grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Border line & ruler ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 1024 - 32, 512 - 32);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('HACKER WORKBENCH // 1:87 HO CIRCUIT', 32, 42);
    ctx.fillText('ESD PROTECTED // 1000V PROBES', 740, 42);
  }
  const matTex = new THREE.CanvasTexture(cuttingMatCanvas);
  matTex.wrapS = THREE.ClampToEdgeWrapping;
  matTex.wrapT = THREE.ClampToEdgeWrapping;

  const cuttingMat = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.003, 0.52),
    new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.8,
      metalness: 0.05,
    })
  );
  cuttingMat.position.set(0, 0.0015, 0.02);
  cuttingMat.receiveShadow = true;
  workbenchGroup.add(cuttingMat);

  // 3. Soldering Station (Position: -0.38, 0, -0.14)
  const stationBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.065, 0.10),
    new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.45, metalness: 0.3 })
  );
  stationBase.position.set(-0.38, 0.0325, -0.14);
  stationBase.castShadow = true;
  stationBase.receiveShadow = true;
  workbenchGroup.add(stationBase);

  // Station LCD display
  const stationDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.022),
    new THREE.MeshStandardMaterial({
      color: 0x051a14,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    })
  );
  stationDisplay.position.set(-0.38, 0.045, -0.089);
  workbenchGroup.add(stationDisplay);

  // Soldering Iron Stand (spiraled wire cradle)
  const standCradle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.010, 0.08, 12, 1, true),
    MAT_CHROME
  );
  standCradle.position.set(-0.32, 0.042, -0.14);
  standCradle.rotation.z = -0.55;
  workbenchGroup.add(standCradle);

  // Soldering Iron Pencil resting in cradle
  const ironHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
  );
  ironHandle.position.set(-0.30, 0.052, -0.14);
  ironHandle.rotation.z = -0.55;
  workbenchGroup.add(ironHandle);

  // Ceramic heated tip (Glowing orange/red)
  const ironTipMat = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff4400,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  const ironTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.0035, 0.025, 8),
    ironTipMat
  );
  ironTip.position.set(-0.345, 0.025, -0.14);
  ironTip.rotation.z = Math.PI - 0.55;
  workbenchGroup.add(ironTip);

  // Brass wire sponge cup
  const spongeCup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.022, 16),
    MAT_BRASS
  );
  spongeCup.position.set(-0.34, 0.011, -0.07);
  workbenchGroup.add(spongeCup);

  // 4. Microcontroller Board (ESP32 Dev Board) (Position: -0.16, 0, -0.12)
  const pcbBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.004, 0.028),
    new THREE.MeshStandardMaterial({ color: 0x003318, roughness: 0.6, metalness: 0.2 })
  );
  pcbBoard.position.set(-0.16, 0.003, -0.12);
  pcbBoard.castShadow = true;
  workbenchGroup.add(pcbBoard);

  // ESP32 Metal RF shield can
  const rfShield = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.003, 0.015),
    MAT_CHROME
  );
  rfShield.position.set(-0.17, 0.0055, -0.12);
  workbenchGroup.add(rfShield);

  // Status LEDs (Power Red + TX/RX Blue)
  const ledPowerMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1.5,
  });
  const ledPower = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.002), ledPowerMat);
  ledPower.position.set(-0.142, 0.006, -0.128);
  workbenchGroup.add(ledPower);

  const ledStatusMat = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    emissive: 0x0088ff,
    emissiveIntensity: 2.0,
  });
  const ledStatus = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.002), ledStatusMat);
  ledStatus.position.set(-0.142, 0.006, -0.118);
  workbenchGroup.add(ledStatus);

  // 5. White Solderless Breadboard (Position: -0.14, 0, 0.04)
  const breadboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.082, 0.008, 0.055),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85 })
  );
  breadboard.position.set(-0.14, 0.005, 0.04);
  breadboard.castShadow = true;
  workbenchGroup.add(breadboard);

  // Colorful Jumper Wire Arches on Breadboard
  const jumperColors = [0xff2222, 0x2288ff, 0xffaa00, 0x22cc44];
  jumperColors.forEach((col, idx) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.16 + idx * 0.01, 0.009, 0.025),
      new THREE.Vector3(-0.155 + idx * 0.01, 0.022, 0.04),
      new THREE.Vector3(-0.15 + idx * 0.01, 0.009, 0.055),
    ]);
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 10, 0.001, 6, false),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
    );
    workbenchGroup.add(wire);
  });

  // 6. Digital Multimeter (Position: 0.28, 0, -0.16)
  const dmmBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.025, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.65 }) // yellow-orange shock holster
  );
  dmmBody.position.set(0.28, 0.014, -0.16);
  dmmBody.rotation.y = -0.15;
  dmmBody.castShadow = true;
  workbenchGroup.add(dmmBody);

  // DMM LCD Screen
  const dmmLcd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.025),
    new THREE.MeshStandardMaterial({
      color: 0x9fb5a2,
      roughness: 0.2,
      emissive: 0x446655,
      emissiveIntensity: 0.3,
    })
  );
  dmmLcd.position.set(0.28, 0.027, -0.19);
  dmmLcd.rotation.x = -Math.PI / 2;
  dmmLcd.rotation.z = -0.15;
  workbenchGroup.add(dmmLcd);

  // Rotary Dial
  const dmmDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.005, 16),
    MAT_MATTE_BLACK
  );
  dmmDial.position.set(0.28, 0.027, -0.15);
  workbenchGroup.add(dmmDial);

  // 7. Solder Wire Spool (Positioned cleanly on desk edge)
  const spoolFlange1 = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.003, 18), new THREE.MeshStandardMaterial({ color: 0x0055bb }));
  const spoolFlange2 = spoolFlange1.clone();
  const spoolCore = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.026, 18), MAT_CHROME);

  spoolFlange1.position.set(0.46, 0.003, 0.06);
  spoolCore.position.set(0.46, 0.016, 0.06);
  spoolFlange2.position.set(0.46, 0.029, 0.06);
  workbenchGroup.add(spoolFlange1, spoolCore, spoolFlange2);

  // 8. Ceramic Coffee Mug (Positioned safely on desk corner, zero camera clipping!)
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.023, 0.052, 20),
    new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.4 })
  );
  mug.position.set(0.48, 0.026, 0.22);
  mug.castShadow = true;
  workbenchGroup.add(mug);

  // Coffee liquid surface
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 16),
    new THREE.MeshStandardMaterial({ color: 0x1f1208, roughness: 0.2 })
  );
  coffee.position.set(0.48, 0.046, 0.22);
  coffee.rotation.x = -Math.PI / 2;
  workbenchGroup.add(coffee);

  // Mug handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.014, 0.004, 8, 14, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.4 })
  );
  handle.position.set(0.508, 0.026, 0.22);
  handle.rotation.y = Math.PI / 2;
  handle.rotation.z = Math.PI / 2;
  workbenchGroup.add(handle);

  scene.add(workbenchGroup);

  return {
    workbenchGroup,
    updateLeds: (time) => {
      // Pulse status LED like genuine UART transmission
      const pulse = Math.sin(time * 14) * 0.5 + Math.sin(time * 28) * 0.5;
      ledStatusMat.emissiveIntensity = pulse > 0.2 ? 2.2 : 0.2;

      // Subtle breathing on ceramic soldering tip
      ironTipMat.emissiveIntensity = 2.0 + Math.sin(time * 2.5) * 0.4;
    },
  };
}
