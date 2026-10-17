export function createHudOverlay({ player, profileState, onToggleMusic, onOpenLeaderboard }) {
  const hudContainer = document.createElement('div');
  hudContainer.id = 'hud-root';
  hudContainer.className = 'game-hud';

  const playerName = player ? player.name : 'Guest';
  const playerColor = player?.style?.primaryColor || '#00ffcc';

  hudContainer.innerHTML = `
    <!-- Top Left: Player Profile & Coin Badge -->
    <div class="hud-profile-pill">
      <div class="hud-avatar-disc" style="background-color: ${playerColor}">
        <span>${playerName.charAt(0).toUpperCase()}</span>
      </div>
      <div class="hud-profile-details">
        <span class="hud-player-name">${playerName}</span>
        <span class="hud-coin-badge">🪙 <b id="hud-coins-val">${profileState.getCoins()}</b></span>
      </div>
    </div>

    <!-- Top Right: Music Toggle, Leaderboard Shortcut, Lap Counter & Timer -->
    <div class="hud-lap-panel">
      <button class="hud-btn-icon" id="hud-music-btn" title="Toggle Music [M]" type="button">
        <span id="hud-music-icon">🎵</span>
      </button>
      <button class="hud-btn-icon" id="hud-lb-btn" title="View Leaderboards [L]" type="button">
        <span>🏆</span>
      </button>
      <div class="hud-lap-indicator">LAP <span id="hud-lap-num">1</span>/3</div>
      <div class="hud-timer-display" id="hud-timer-val">00:00.00</div>
    </div>

    <!-- Bottom Right: Professional Radial Tachometer & Speedometer Cluster -->
    <div class="hud-speedometer-cluster">
      <svg class="speedo-gauge-svg" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="speedoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00ffee" />
            <stop offset="45%" stop-color="#38bdf8" />
            <stop offset="75%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#ff0055" />
          </linearGradient>
          <filter id="speedoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Background Track Arc (240 deg sweep) -->
        <circle class="speedo-track-bg" cx="80" cy="80" r="64" />
        <!-- Glowing Active Tachometer Arc -->
        <circle class="speedo-track-fill" id="speedo-arc-fill" cx="80" cy="80" r="64" />
      </svg>

      <div class="speedo-center-stack">
        <div class="speedo-gear-row">
          <span class="gear-lbl">GEAR</span>
          <span class="gear-val" id="hud-gear-val">1</span>
        </div>
        <div class="hud-speed-val" id="hud-speed-val">0</div>
        <div class="hud-speed-unit">KM/H</div>
        <div class="speedo-nitro-meter" title="Turbo Charge">
          <div class="nitro-segment" id="nitro-seg-1"></div>
          <div class="nitro-segment" id="nitro-seg-2"></div>
          <div class="nitro-segment" id="nitro-seg-3"></div>
        </div>
      </div>
    </div>

    <!-- Center Screen Alerts (e.g. READY, GO!, LAP COMPLETED) -->
    <div class="hud-center-alert hidden" id="hud-center-alert"></div>
  `;

  document.body.appendChild(hudContainer);

  const elCoins = hudContainer.querySelector('#hud-coins-val');
  const elLap = hudContainer.querySelector('#hud-lap-num');
  const elTimer = hudContainer.querySelector('#hud-timer-val');
  const elSpeed = hudContainer.querySelector('#hud-speed-val');
  const elGear = hudContainer.querySelector('#hud-gear-val');
  const elArcFill = hudContainer.querySelector('#speedo-arc-fill');
  const elAlert = hudContainer.querySelector('#hud-center-alert');
  const btnMusic = hudContainer.querySelector('#hud-music-btn');
  const btnLb = hudContainer.querySelector('#hud-lb-btn');
  const iconMusic = hudContainer.querySelector('#hud-music-icon');
  const nitroSeg1 = hudContainer.querySelector('#nitro-seg-1');
  const nitroSeg2 = hudContainer.querySelector('#nitro-seg-2');
  const nitroSeg3 = hudContainer.querySelector('#nitro-seg-3');

  if (btnMusic && typeof onToggleMusic === 'function') {
    btnMusic.addEventListener('click', () => {
      onToggleMusic();
    });
  }

  if (btnLb && typeof onOpenLeaderboard === 'function') {
    btnLb.addEventListener('click', () => {
      onOpenLeaderboard();
    });
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  const ARC_LENGTH = 268.08;

  return {
    setCoins: (c) => {
      if (elCoins) elCoins.textContent = c;
    },
    setLap: (lap) => {
      if (elLap) elLap.textContent = lap;
    },
    setTime: (s) => {
      if (elTimer) elTimer.textContent = formatTime(s);
    },
    setSpeed: (spd, gear = null, boostActive = false) => {
      const numSpd = Math.round(spd) || 0;
      if (elSpeed) elSpeed.textContent = numSpd;

      // Update SVG dial arc
      if (elArcFill) {
        const frac = Math.min(1.0, Math.max(0.0, numSpd / 320.0));
        elArcFill.style.strokeDashoffset = (ARC_LENGTH * (1.0 - frac)).toFixed(1);
      }

      // Update Gear display
      if (elGear) {
        if (gear) {
          elGear.textContent = gear;
        } else {
          if (boostActive) elGear.textContent = 'BST';
          else if (numSpd <= 0) elGear.textContent = 'N';
          else if (numSpd < 50) elGear.textContent = '1';
          else if (numSpd < 105) elGear.textContent = '2';
          else if (numSpd < 160) elGear.textContent = '3';
          else if (numSpd < 215) elGear.textContent = '4';
          else if (numSpd < 270) elGear.textContent = '5';
          else elGear.textContent = '6';
        }
        elGear.classList.toggle('gear-boost', Boolean(boostActive));
      }

      // Update Nitro LED segments
      if (nitroSeg1 && nitroSeg2 && nitroSeg3) {
        nitroSeg1.classList.toggle('active', boostActive || numSpd > 60);
        nitroSeg2.classList.toggle('active', boostActive || numSpd > 140);
        nitroSeg3.classList.toggle('active', boostActive || numSpd > 220);
        nitroSeg3.classList.toggle('blinking', Boolean(boostActive));
      }
    },
    setMusicMuted: (isMuted) => {
      if (iconMusic) {
        iconMusic.textContent = isMuted ? '🔇' : '🎵';
      }
      if (btnMusic) {
        btnMusic.classList.toggle('muted', isMuted);
      }
    },
    showAlert: (msg, duration = 1800) => {
      if (!elAlert) return;
      elAlert.textContent = msg;
      elAlert.classList.remove('hidden');
      elAlert.classList.add('pop-anim');
      setTimeout(() => {
        elAlert.classList.add('hidden');
        elAlert.classList.remove('pop-anim');
      }, duration);
    },
  };
}
