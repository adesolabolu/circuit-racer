export function createResultsModal({
  totalTime,
  bestLap,
  chipsCollected,
  chipsBonus,
  completionBonus,
  cleanRunBonus,
  totalEarned,
  walletBalance,
  scoreResult,
  onRaceAgain,
  onGarage,
  onLeaderboard,
  onMainMenu,
}) {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'results-modal-root';
  modalContainer.className = 'results-overlay';

  function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  const cleanRunText = cleanRunBonus > 0
    ? `<span class="bonus-highlight">+${cleanRunBonus} BITS</span>`
    : `<span class="bonus-forfeit">FORFEITED (OFF-TRACK)</span>`;

  const rankText = scoreResult?.rank
    ? `<div class="results-rank-badge">GLOBAL RANK: #${scoreResult.rank}</div>`
    : `<div class="results-rank-badge">SCORE SAVED LOCALLY</div>`;

  modalContainer.innerHTML = `
    <div class="results-card modal-pop-anim">
      <div class="results-subheading">CIRCUIT RACER // RACE DEBRIEF</div>
      <h2 class="results-title">FINISH LINE</h2>

      ${rankText}

      <div class="results-stats-grid">
        <div class="stat-row">
          <span class="stat-label">TOTAL TIME</span>
          <span class="stat-value time-val">${formatTime(totalTime)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">BEST LAP</span>
          <span class="stat-value time-val">${formatTime(bestLap)}</span>
        </div>
        
        <div class="divider"></div>

        <div class="stat-row">
          <span class="stat-label">MICROCHIPS (${chipsCollected})</span>
          <span class="stat-value">+${chipsBonus} BITS</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">COMPLETION BONUS</span>
          <span class="stat-value">+${completionBonus} BITS</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">CLEAN RUN BONUS</span>
          <span class="stat-value">${cleanRunText}</span>
        </div>

        <div class="divider"></div>

        <div class="stat-row total-row">
          <span class="stat-label">TOTAL EARNED</span>
          <span class="stat-value total-val">+${totalEarned} BITS</span>
        </div>
        <div class="stat-row wallet-row">
          <span class="stat-label">WALLET BALANCE</span>
          <span class="stat-value wallet-val">🪙 ${walletBalance} BITS</span>
        </div>
      </div>

      <div class="results-button-row">
        <button id="btn-race-again" class="btn-primary">RACE AGAIN [ENTER]</button>
        <button id="btn-lb-results" class="btn-secondary">🏆 LEADERBOARD</button>
        <button id="btn-garage-results" class="btn-secondary">GARAGE</button>
        <button id="btn-menu-results" class="btn-tertiary">MAIN MENU</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const btnRaceAgain = modalContainer.querySelector('#btn-race-again');
  const btnLb = modalContainer.querySelector('#btn-lb-results');
  const btnGarage = modalContainer.querySelector('#btn-garage-results');
  const btnMenu = modalContainer.querySelector('#btn-menu-results');

  function cleanup() {
    window.removeEventListener('keydown', handleKey);
    modalContainer.remove();
  }

  function handleKey(e) {
    if (e.key === 'Enter') {
      cleanup();
      if (typeof onRaceAgain === 'function') onRaceAgain();
    }
  }

  window.addEventListener('keydown', handleKey);

  btnRaceAgain.addEventListener('click', () => {
    cleanup();
    if (typeof onRaceAgain === 'function') onRaceAgain();
  });

  if (btnLb) {
    btnLb.addEventListener('click', () => {
      cleanup();
      if (typeof onLeaderboard === 'function') onLeaderboard();
    });
  }

  btnGarage.addEventListener('click', () => {
    cleanup();
    if (typeof onGarage === 'function') onGarage();
  });

  btnMenu.addEventListener('click', () => {
    cleanup();
    if (typeof onMainMenu === 'function') onMainMenu();
  });

  return {
    destroy: cleanup,
  };
}
