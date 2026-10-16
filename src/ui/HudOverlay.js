export function createHudOverlay({ player, profileState }) {
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

    <!-- Top Right: Lap Counter & Timer -->
    <div class="hud-lap-panel">
      <div class="hud-lap-indicator">LAP <span id="hud-lap-num">1</span>/3</div>
      <div class="hud-timer-display" id="hud-timer-val">00:00.00</div>
    </div>

    <!-- Bottom Center: Speedometer -->
    <div class="hud-speedometer-panel">
      <div class="hud-speed-val" id="hud-speed-val">0</div>
      <div class="hud-speed-unit">KM/H</div>
    </div>

    <!-- Center Screen Alerts (e.g. READY, GO!, LAP COMPLETED) -->
    <div class="hud-center-alert hidden" id="hud-center-alert"></div>
  `;

  document.body.appendChild(hudContainer);

  const elCoins = hudContainer.querySelector('#hud-coins-val');
  const elLap = hudContainer.querySelector('#hud-lap-num');
  const elTimer = hudContainer.querySelector('#hud-timer-val');
  const elSpeed = hudContainer.querySelector('#hud-speed-val');
  const elAlert = hudContainer.querySelector('#hud-center-alert');

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

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
    setSpeed: (spd) => {
      if (elSpeed) elSpeed.textContent = Math.round(spd);
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
