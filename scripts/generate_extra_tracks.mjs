import * as THREE from 'three';
import fs from 'node:fs/promises';

/**
 * Generates an orthonormal Frenet-Serret frame along a closed CatmullRomCurve3
 * with smooth minimal-rotation banking and specified track width.
 */
function buildTrackSplineJson({
  name,
  trackWidthM = 0.034,
  curbWidthM = 0.0028,
  railHeightM = 0.0028,
  sectors,
  controlPointsWithBankAndSector,
  numSamples = 720,
}) {
  const points = controlPointsWithBankAndSector.map(
    (cp) => new THREE.Vector3(cp[0], cp[1], cp[2])
  );
  const banks = controlPointsWithBankAndSector.map((cp) => cp[3]);
  const secIds = controlPointsWithBankAndSector.map((cp) => cp[4]);

  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);

  const samples = [];
  let totalLength = 0;
  const tempPos = [];

  // 1. Gather raw positions along curve
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const p = curve.getPointAt(t);
    tempPos.push(p);
    if (i > 0) {
      totalLength += p.distanceTo(tempPos[i - 1]);
    }
  }
  totalLength += tempPos[0].distanceTo(tempPos[numSamples - 1]);

  let currentArc = 0;
  let lastNormal = new THREE.Vector3(0, 1, 0);

  // 2. Compute smooth Frenet frames
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const p = tempPos[i];
    if (i > 0) {
      currentArc += p.distanceTo(tempPos[i - 1]);
    }

    const tangent = curve.getTangentAt(t).normalize();

    // Interpolate bank angle and sector from control points
    const cpIndexFloat = t * controlPointsWithBankAndSector.length;
    const cpIdx0 = Math.floor(cpIndexFloat) % controlPointsWithBankAndSector.length;
    const cpIdx1 = (cpIdx0 + 1) % controlPointsWithBankAndSector.length;
    const frac = cpIndexFloat - Math.floor(cpIndexFloat);

    const bank0 = banks[cpIdx0];
    const bank1 = banks[cpIdx1];
    const bankDeg = THREE.MathUtils.lerp(bank0, bank1, frac);
    const sector = secIds[cpIdx0];

    // Compute base up normal perpendicular to tangent
    let baseUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(tangent.dot(baseUp)) > 0.95) {
      baseUp.set(0, 0, 1);
    }
    const right = new THREE.Vector3().crossVectors(tangent, baseUp).normalize();
    const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

    // Apply banking angle around tangent axis
    const bankRad = THREE.MathUtils.degToRad(bankDeg);
    right.applyAxisAngle(tangent, bankRad);
    normal.applyAxisAngle(tangent, bankRad);

    samples.push({
      index: i,
      t: Number(t.toFixed(6)),
      sector,
      position: [Number(p.x.toFixed(5)), Number(p.y.toFixed(5)), Number(p.z.toFixed(5))],
      tangent: [Number(tangent.x.toFixed(5)), Number(tangent.y.toFixed(5)), Number(tangent.z.toFixed(5))],
      right: [Number(right.x.toFixed(5)), Number(right.y.toFixed(5)), Number(right.z.toFixed(5))],
      normal: [Number(normal.x.toFixed(5)), Number(normal.y.toFixed(5)), Number(normal.z.toFixed(5))],
      bank_deg: Number(bankDeg.toFixed(2)),
      arc_length_m: Number(currentArc.toFixed(5)),
    });
  }

  return {
    name,
    is_closed_periodic_loop: true,
    track_width_m: trackWidthM,
    curb_width_m: curbWidthM,
    rail_height_m: railHeightM,
    total_length_m: Number(totalLength.toFixed(4)),
    scale_equivalent_length_m: Number((totalLength * 87).toFixed(1)),
    num_control_points: controlPointsWithBankAndSector.length,
    num_samples: numSamples,
    sectors,
    control_points: controlPointsWithBankAndSector,
    samples,
  };
}

// -----------------------------------------------------------------------------
// TRACK 2: NEON VELOCITY OVAL (Super Tri-Oval)
// High speed, banked sweeping turns across desk perimeter
// -----------------------------------------------------------------------------
const OVAL_CPS = [
  // Sector 1: G915 Front Superstretch (East-West along desk front)
  [0.000, 0.035, 0.255, 0.0, 1],
  [-0.220, 0.035, 0.255, 2.0, 1],
  [-0.380, 0.038, 0.245, 8.0, 1],
  // Turn 1 Banked Sweeper (West turn around soldering station)
  [-0.485, 0.055, 0.160, 18.0, 1],
  [-0.510, 0.078, 0.020, 22.0, 2],
  [-0.470, 0.088, -0.120, 22.0, 2],
  // Sector 2: Monitor Backstretch (Along back of desk under monitor)
  [-0.350, 0.075, -0.220, 14.0, 2],
  [-0.150, 0.065, -0.245, 4.0, 2],
  [0.080, 0.065, -0.245, 0.0, 2],
  [0.260, 0.070, -0.225, 8.0, 3],
  // Turn 2 & 3 High-Bank East Carousel (around mouse mat)
  [0.440, 0.068, -0.140, 18.0, 3],
  [0.495, 0.052, -0.010, 24.0, 3],
  [0.480, 0.040, 0.140, 18.0, 3],
  [0.360, 0.036, 0.235, 8.0, 3],
  [0.200, 0.035, 0.255, 2.0, 1],
];

const OVAL_SECTORS = [
  { id: 1, name: "G915 Front Superstretch & Turn 1 Entry" },
  { id: 2, name: "Monitor Backstretch High-Speed Draft" },
  { id: 3, name: "Razer High-Bank Carousel & Final Straight" }
];

// -----------------------------------------------------------------------------
// TRACK 3: BREADBOARD FIGURE-8 (Crossover Bridge & Drift Arena)
// Figure-8 with elevated overpass flyover at (0.0, 0.09, 0.0) and technical hairpins
// -----------------------------------------------------------------------------
const FIG8_CPS = [
  // Sector 1: Start/Finish on Viaduct
  [0.000, 0.035, 0.255, 0.0, 1],
  [-0.180, 0.035, 0.248, -4.0, 1],
  [-0.340, 0.038, 0.210, -14.0, 1],
  // South-West Hairpin around ESP32
  [-0.440, 0.045, 0.110, -20.0, 1],
  [-0.410, 0.055, -0.020, -16.0, 2],
  [-0.280, 0.070, -0.040, -6.0, 2],
  // Climb towards Center Crossover Overpass Bridge (Y = 0.095m)
  [-0.120, 0.088, -0.015, 2.0, 2],
  [0.000, 0.095, 0.000, 0.0, 2], // Center Overpass Flyover!
  [0.120, 0.088, 0.015, 4.0, 3],
  // North-East High Carousel
  [0.280, 0.075, 0.060, 16.0, 3],
  [0.420, 0.060, 0.020, 22.0, 3],
  [0.450, 0.045, -0.110, 22.0, 3],
  [0.340, 0.038, -0.210, 14.0, 4],
  [0.180, 0.035, -0.180, 4.0, 4],
  // Center Lower Underpass (Y = 0.035m - crosses beneath overpass)
  [0.000, 0.035, 0.000, 0.0, 4], // Underpass tunnel!
  [-0.160, 0.036, 0.080, 8.0, 4],
  [-0.080, 0.035, 0.190, 4.0, 1],
  [0.000, 0.035, 0.255, 0.0, 1]
];

const FIG8_SECTORS = [
  { id: 1, name: "Viaduct Straight & ESP32 Hairpin" },
  { id: 2, name: "Bridge Sky-Climb & Center Flyover" },
  { id: 3, name: "Breadboard Carousel & Drift Descent" },
  { id: 4, name: "Lower Underpass Tunnel & Final Chute" }
];

async function main() {
  const ovalTrack = buildTrackSplineJson({
    name: "Neon Velocity Speedway (Tri-Oval)",
    sectors: OVAL_SECTORS,
    controlPointsWithBankAndSector: OVAL_CPS,
  });

  const fig8Track = buildTrackSplineJson({
    name: "Breadboard Figure-8 (Overpass Flyover)",
    sectors: FIG8_SECTORS,
    controlPointsWithBankAndSector: FIG8_CPS,
  });

  await fs.writeFile('public/assets/data/track_oval.json', JSON.stringify(ovalTrack, null, 2));
  console.log('Generated public/assets/data/track_oval.json, length:', ovalTrack.total_length_m, 'm');

  await fs.writeFile('public/assets/data/track_figure8.json', JSON.stringify(fig8Track, null, 2));
  console.log('Generated public/assets/data/track_figure8.json, length:', fig8Track.total_length_m, 'm');
}

main().catch(console.error);
