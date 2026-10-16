import { signInUrl } from '../platform/startng.js';

export function createTitleScreen({ onStartRace, profileState, player }) {
  const container = document.createElement('div');
  container.id = 'title-screen-overlay';
  container.className = 'title-overlay';

  const coins = profileState.getCoins();
  const playerName = player ? player.name : 'Guest Hacker';
  const playerColor = player?.style?.primaryColor || '#00ffcc';

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

      <div class="title-menu-actions">
        <button id="btn-start-race" class="btn-menu-primary" type="button">
          START RACE <span class="kbd-hint">[ENTER]</span>
        </button>
        <button id="btn-open-garage" class="btn-menu-secondary" type="button">
          GARAGE (PHASE 3)
        </button>
      </div>

      <div class="title-controls-hints">
        <span><b>W / ↑</b> Accelerate</span>
        <span><b>A / D / ← →</b> Steer</span>
        <span><b>S / ↓</b> Brake</span>
        <span><b>C</b> Cycle Camera</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const btnStart = container.querySelector('#btn-start-race');
  btnStart.addEventListener('click', () => {
    container.classList.add('fade-out');
    setTimeout(() => {
      container.remove();
    }, 400);
    if (onStartRace) onStartRace();
  });

  const handleKeydown = (e) => {
    if (e.key === 'Enter' || e.code === 'Space') {
      if (document.getElementById('title-screen-overlay')) {
        window.removeEventListener('keydown', handleKeydown);
        btnStart.click();
      }
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
  };
}
