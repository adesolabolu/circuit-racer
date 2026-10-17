/**
 * TrackMinimap.js
 * Crisp 2D HUD Minimap rendering the coaster track layout and real-time kart position,
 * matching the user's reference design with high-DPI canvas rendering.
 */

export function createTrackMinimap(splineData, options = {}) {
  const container = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (container) {
    container.id = 'hud-minimap-root';
    container.className = 'hud-minimap-container';
  }

  const width = options.width || 230;
  const height = options.height || 120;
  const padding = options.padding || 14;

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  if (canvas) {
    canvas.className = 'hud-minimap-canvas';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  if (container && canvas) {
    container.appendChild(canvas);
  }
  const parent = options.parent || (typeof document !== 'undefined' ? (document.getElementById('hud-root') || document.body) : null);
  if (parent && container) {
    parent.appendChild(container);
  }

  const ctx = canvas ? canvas.getContext('2d') : null;
  if (ctx) {
    ctx.scale(dpr, dpr);
  }

  // Compute track bounds across all spline samples
  const samples = splineData?.samples || [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of samples) {
    const pos = s.position || [0, 0, 0];
    const x = pos[0];
    const z = pos[2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  if (!isFinite(minX)) {
    minX = -0.525; maxX = 0.430;
    minZ = -0.190; maxZ = 0.260;
  }

  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / rangeX, drawH / rangeZ);
  const offsetX = padding + (drawW - rangeX * scale) / 2;
  const offsetY = padding + (drawH - rangeZ * scale) / 2;

  function toCanvas(x, z) {
    return {
      cx: offsetX + (x - minX) * scale,
      cy: offsetY + (z - minZ) * scale,
    };
  }

  // Pre-render static track layers (dark casing, bright white ribbon, sector tick marks, start/finish line)
  let trackCanvas = null;
  if (typeof document !== 'undefined') {
    trackCanvas = document.createElement('canvas');
    trackCanvas.width = width * dpr;
    trackCanvas.height = height * dpr;
    const tCtx = trackCanvas.getContext('2d');
    if (tCtx) {
      tCtx.scale(dpr, dpr);
      preRenderTrack(tCtx);
    }
  }

  function preRenderTrack(tCtx) {
    if (samples.length < 2) return;

    // 1. Draw track outer casing / dark border
    tCtx.lineCap = 'round';
    tCtx.lineJoin = 'round';

    tCtx.strokeStyle = '#0e121a';
    tCtx.lineWidth = 8.5;
    tCtx.beginPath();
    const p0 = toCanvas(samples[0].position[0], samples[0].position[2]);
    tCtx.moveTo(p0.cx, p0.cy);
    for (let i = 1; i < samples.length; i++) {
      const p = toCanvas(samples[i].position[0], samples[i].position[2]);
      tCtx.lineTo(p.cx, p.cy);
    }
    tCtx.closePath();
    tCtx.stroke();

    // 2. Draw white/light-silver inner road ribbon
    tCtx.strokeStyle = '#f1f5f9';
    tCtx.lineWidth = 5.0;
    tCtx.beginPath();
    tCtx.moveTo(p0.cx, p0.cy);
    for (let i = 1; i < samples.length; i++) {
      const p = toCanvas(samples[i].position[0], samples[i].position[2]);
      tCtx.lineTo(p.cx, p.cy);
    }
    tCtx.closePath();
    tCtx.stroke();

    // 3. Draw sector divider tick marks
    tCtx.strokeStyle = '#334155';
    tCtx.lineWidth = 1.6;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].sector !== samples[i - 1].sector) {
        const curr = toCanvas(samples[i].position[0], samples[i].position[2]);
        const prev = toCanvas(samples[i - 1].position[0], samples[i - 1].position[2]);
        const dx = curr.cx - prev.cx;
        const dy = curr.cy - prev.cy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        tCtx.beginPath();
        tCtx.moveTo(curr.cx - nx * 3.4, curr.cy - ny * 3.4);
        tCtx.lineTo(curr.cx + nx * 3.4, curr.cy + ny * 3.4);
        tCtx.stroke();
      }
    }

    // 4. Start/Finish Line marker
    const sf = toCanvas(samples[0].position[0], samples[0].position[2]);
    const sfNext = toCanvas(samples[1].position[0], samples[1].position[2]);
    const sfdx = sfNext.cx - sf.cx;
    const sfdy = sfNext.cy - sf.cy;
    const sflen = Math.hypot(sfdx, sfdy) || 1;
    const sfnx = -sfdy / sflen;
    const sfny = sfdx / sflen;

    tCtx.strokeStyle = '#ffaa00';
    tCtx.lineWidth = 2.4;
    tCtx.beginPath();
    tCtx.moveTo(sf.cx - sfnx * 3.6, sf.cy - sfny * 3.6);
    tCtx.lineTo(sf.cx + sfnx * 3.6, sf.cy + sfny * 3.6);
    tCtx.stroke();
  }

  // Animation pulse timer for the glowing cyan kart marker
  let pulseTimer = 0;

  function update(playerPos, dt = 0.016) {
    if (!ctx || !trackCanvas || !playerPos) return;
    pulseTimer += dt * 4.0;

    ctx.clearRect(0, 0, width, height);

    // Blit pre-rendered static track
    ctx.drawImage(trackCanvas, 0, 0, width, height);

    // Map player position
    const px = playerPos.x !== undefined ? playerPos.x : (playerPos[0] || 0);
    const pz = playerPos.z !== undefined ? playerPos.z : (playerPos[2] || 0);
    const { cx, cy } = toCanvas(px, pz);

    // Glowing cyan blip
    const pulseScale = 1.0 + Math.sin(pulseTimer) * 0.16;

    // 1. Radial cyan halo bloom
    const grad = ctx.createRadialGradient(cx, cy, 1.2, cx, cy, 9.0 * pulseScale);
    grad.addColorStop(0, 'rgba(0, 255, 204, 0.95)');
    grad.addColorStop(0.40, 'rgba(0, 255, 204, 0.45)');
    grad.addColorStop(1, 'rgba(0, 255, 204, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 9.0 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cyan bead core
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Crisp white center highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    element: container,
    update,
    setVisible: (visible) => {
      if (container) container.style.display = visible ? 'block' : 'none';
    },
    destroy: () => {
      if (container) container.remove();
    },
  };
}
