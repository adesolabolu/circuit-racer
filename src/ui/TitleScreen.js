import { signInUrl } from '../platform/startng.js';
import { getSelectedTrack } from '../scene/TrackRegistry.js';

export function createTitleScreen({
  onStartRace,
  onOpenGarage,
  onOpenTrackSelect,
  onOpenLeaderboard,
  profileState,
  player,
}) {
  const container = document.createElement('div');
  container.id = 'title-screen-overlay';
  container.className = 'title-overlay';

  const coins = profileState.getCoins();
  const playerName = player ? player.name : 'Guest Hacker';
  const playerColor = player?.style?.primaryColor || '#00ffcc';
  const activeTrack = getSelectedTrack();

  container.innerHTML = `
    <div class="title-card">
      <div class="circuit-eyebrow">LATE-NIGHT HACKER WORKBENCH // 1:87 SCALE</div>
      <h1 class="circuit-title">CIRCUIT RACER</h1>
      
      <div class="title-user-badge">
        <div class="user-avatar-circle" style="background-color: ${playerColor}">
          <span>${playerName.charAt(0).toUpperCase()}</span>
        </div>
        <div class="user-info-stack">
          <div class="user-name">${playerName}</div>
          <div class="user-wallet">🪙 <span id="title-coin-count">${coins}</span> BITS</div>
        </div>
        ${!player ? `<a href="${signInUrl()}" class="btn-signin-link">Sign In</a>` : ''}
      </div>

      <!-- Active Circuit Banner -->
      <div class="title-circuit-pill" id="title-circuit-pill" title="Click to change track">
        <span class="track-tag">STAGE</span>
        <span class="track-name-display" id="title-track-name">${activeTrack.name}</span>
        <span class="track-diff-badge">${activeTrack.difficulty}</span>
      </div>

      <div class="title-menu-actions">
        <button id="btn-start-race" class="btn-menu-primary" type="button">
          START RACE <span class="kbd-hint">[ENTER]</span>
        </button>
        <div class="title-secondary-btn-row">
          <button id="btn-select-track" class="btn-menu-secondary" type="button">
            🏁 MAPS <span class="kbd-hint">[T]</span>
          </button>
          <button id="btn-open-garage" class="btn-menu-secondary" type="button">
            🛠️ GARAGE <span class="kbd-hint">[G]</span>
          </button>
          <button id="btn-open-lb" class="btn-menu-secondary" type="button">
            🏆 RANKS <span class="kbd-hint">[L]</span>
          </button>
        </div>
      </div>

      <div class="title-controls-hints">
        <span><b>W / ↑</b> Accelerate</span>
        <span><b>A / D / ← →</b> Steer</span>
        <span><b>S / ↓</b> Brake</span>
        <span><b>C</b> Camera</span>
        <span><b>T</b> Change Map</span>
        <span><b>L</b> Records</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const btnStart = container.querySelector('#btn-start-race');
  btnStart.addEventListener('click', () => {
    window.removeEventListener('keydown', handleKeydown);
    container.classList.add('fade-out');
    setTimeout(() => {
      container.remove();
    }, 400);
    if (onStartRace) onStartRace();
  });

  const btnGarage = container.querySelector('#btn-open-garage');
  if (btnGarage) {
    btnGarage.addEventListener('click', () => {
      if (onOpenGarage) onOpenGarage();
    });
  }

  const btnTrack = container.querySelector('#btn-select-track');
  const circuitPill = container.querySelector('#title-circuit-pill');
  if (btnTrack) {
    btnTrack.addEventListener('click', () => {
      if (onOpenTrackSelect) onOpenTrackSelect();
    });
  }
  if (circuitPill) {
    circuitPill.addEventListener('click', () => {
      if (onOpenTrackSelect) onOpenTrackSelect();
    });
  }

  const btnLb = container.querySelector('#btn-open-lb');
  if (btnLb) {
    btnLb.addEventListener('click', () => {
      if (onOpenLeaderboard) onOpenLeaderboard();
    });
  }

  const handleKeydown = (e) => {
    if (!document.getElementById('title-screen-overlay')) return;
    if (document.getElementById('garage-modal-root')) return;
    if (document.getElementById('leaderboard-modal-root')) return;
    if (document.getElementById('track-select-modal-root')) return;

    if (e.key === 'Enter' || e.code === 'Space') {
      btnStart.click();
    } else if (e.code === 'KeyG') {
      if (btnGarage) btnGarage.click();
    } else if (e.code === 'KeyT') {
      if (btnTrack) btnTrack.click();
    } else if (e.code === 'KeyL') {
      if (btnLb) btnLb.click();
    }
  };
  window.addEventListener('keydown', handleKeydown);

  return {
    element: container,
    hide: () => {
      container.remove();
    },
    updateCoins: (newCoins) => {
      const el = container.querySelector('#title-coin-count');
      if (el) el.textContent = newCoins;
    },
    updateTrack: (track) => {
      const el = container.querySelector('#title-track-name');
      const badge = container.querySelector('.track-diff-badge');
      if (el && track) el.textContent = track.name;
      if (badge && track) badge.textContent = track.difficulty;
    },
  };
}
