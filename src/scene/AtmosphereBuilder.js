import * as THREE from 'three';

/**
 * Builds the moody, warm late-night lighting atmosphere for the hacker workbench.
 */
export function buildAtmosphere(scene) {
  // Midnight warm fog
  scene.background = new THREE.Color(0x100e14);
  scene.fog = new THREE.FogExp2(0x100e14, 0.016);

  // Soft cool-tinted fill light simulating moonlight/room ambient
  const ambientLight = new THREE.AmbientLight(0x283044, 0.65);
  scene.add(ambientLight);

  // Directional desk fill
  const dirFill = new THREE.DirectionalLight(0x506888, 0.35);
  dirFill.position.set(-1.0, 1.2, 0.8);
  scene.add(dirFill);

  // Primary warm halogen/LED overhead architect desk lamp
  const deskLampLight = new THREE.SpotLight(0xffeed8, 3.2);
  deskLampLight.position.set(0.32, 0.48, -0.08);
  deskLampLight.target.position.set(0.0, 0.0, 0.0);
  deskLampLight.angle = Math.PI / 3.2;
  deskLampLight.penumbra = 0.55;
  deskLampLight.decay = 1.6;
  deskLampLight.distance = 2.5;
  deskLampLight.castShadow = true;
  deskLampLight.shadow.mapSize.width = 2048;
  deskLampLight.shadow.mapSize.height = 2048;
  deskLampLight.shadow.camera.near = 0.05;
  deskLampLight.shadow.camera.far = 2.5;
  deskLampLight.shadow.bias = -0.00015;
  deskLampLight.shadow.radius = 2.5;

  scene.add(deskLampLight);
  scene.add(deskLampLight.target);

  // Subtle warm amber point light at the soldering iron tip for heat glow
  const solderHeatLight = new THREE.PointLight(0xff4400, 0.8, 0.35);
  solderHeatLight.position.set(-0.35, 0.05, -0.12);
  scene.add(solderHeatLight);

  return {
    ambientLight,
    dirFill,
    deskLampLight,
    solderHeatLight,
  };
}
