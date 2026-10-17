import { LeaderboardState } from '../state/LeaderboardState.js';
import { TRACK_LIST } from '../scene/TrackRegistry.js';

export function createLeaderboardModal({
  initialTrackId = 'workbench-gp',
  isPostRace = false,
  onRaceAgain,
  onClose,
}) {
  const container = document.createElement('div');
  container.id = 'leaderboard-modal-root';
  container.className = 'leaderboard-overlay';

  let currentTrackId = initialTrackId;

  function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  function renderTableRows(trackId) {
    const list = LeaderboardState.getLeaderboard(trackId);
    if (!list || list.length === 0) {
      return `<tr><td colspan="5" class="empty-board">No lap times recorded yet! Complete a lap to set a record.</td></tr>`;
    }

    return list
      .map((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const isPlayerClass = entry.isPlayer ? 'player-entry-row' : '';
        const cleanBadge = entry.cleanRun ? '<span class="clean-badge">🌟 CLEAN</span>' : '<span class="offtrack-badge">OFF-TRACK</span>';

        return `
          <tr class="${isPlayerClass}">
            <td class="col-rank">${medal}</td>
            <td class="col-player">
              <b>${entry.playerName}</b>
              ${entry.isPlayer ? '<span class="you-badge">YOU</span>' : ''}
            </td>
            <td class="col-kart">${entry.kartName || 'Proto-Buggy'}</td>
            <td class="col-clean">${cleanBadge}</td>
            <td class="col-time">${formatTime(entry.lapTime)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderModalHtml() {
    return `
      <div class="leaderboard-card modal-pop-anim">
        <div class="lb-header">
          <div class="lb-subheading">CIRCUIT RACER // HALL OF SPEED</div>
          <h2 class="lb-title">CIRCUIT LEADERBOARDS</h2>
        </div>

        <!-- Track Tabs -->
        <div class="lb-track-tabs">
          ${TRACK_LIST.map(
            (t) => `
            <button class="lb-tab-btn ${t.id === currentTrackId ? 'active' : ''}" data-track="${t.id}" type="button">
              <span class="tab-stars">${t.stars}</span>
              <span class="tab-name">${t.name}</span>
            </button>
          `
          ).join('')}
        </div>

        <!-- Table Container -->
        <div class="lb-table-wrapper">
          <table class="lb-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>DRIVER</th>
                <th>CHASSIS</th>
                <th>RUN</th>
                <th>BEST LAP</th>
              </tr>
            </thead>
            <tbody id="lb-table-body">
              ${renderTableRows(currentTrackId)}
            </tbody>
          </table>
        </div>

        <!-- Footer Actions -->
        <div class="lb-footer">
          ${
            isPostRace
              ? `
            <button id="btn-race-again-lb" class="btn-primary" type="button">🏎️ BACK TO RACE [ENTER]</button>
            <button id="btn-close-lb" class="btn-secondary" type="button">🏠 MAIN MENU [ESC]</button>
          `
              : `
            <button id="btn-close-lb" class="btn-primary" type="button">CLOSE [ESC]</button>
          `
          }
        </div>
      </div>
    `;
  }

  container.innerHTML = renderModalHtml();
  document.body.appendChild(container);

  function attachEvents() {
    const tabBtns = container.querySelectorAll('.lb-tab-btn');
    const tbody = container.querySelector('#lb-table-body');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTrackId = btn.getAttribute('data-track');
        tbody.innerHTML = renderTableRows(currentTrackId);
      });
    });

    const btnRaceAgain = container.querySelector('#btn-race-again-lb');
    if (btnRaceAgain) {
      btnRaceAgain.addEventListener('click', () => {
        close(false);
        if (typeof onRaceAgain === 'function') onRaceAgain();
      });
    }

    const btnClose = container.querySelector('#btn-close-lb');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        close(true);
      });
    }
  }

  function close(triggerOnClose = true) {
    window.removeEventListener('keydown', handleKey);
    container.classList.add('fade-out');
    setTimeout(() => {
      container.remove();
      if (triggerOnClose && typeof onClose === 'function') onClose();
    }, 250);
  }

  function handleKey(e) {
    if (e.key === 'Escape' || e.code === 'KeyL') {
      close(true);
    } else if (e.key === 'Enter' && isPostRace) {
      close(false);
      if (typeof onRaceAgain === 'function') onRaceAgain();
    }
  }

  window.addEventListener('keydown', handleKey);
  attachEvents();

  return {
    element: container,
    close,
  };
}
