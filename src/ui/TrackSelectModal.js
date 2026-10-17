import { TRACK_LIST, getSelectedTrackId, setSelectedTrackId } from '../scene/TrackRegistry.js';
import { LeaderboardState } from '../state/LeaderboardState.js';

export function createTrackSelectModal({ currentTrackId, onSelectTrack, onClose }) {
  const container = document.createElement('div');
  container.id = 'track-select-modal-root';
  container.className = 'track-select-overlay';

  let activeTrackId = currentTrackId || getSelectedTrackId();

  function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  function renderTrackCard(track) {
    const isSelected = track.id === activeTrackId;
    const bestLap = LeaderboardState.getBestLap(track.id);

    return `
      <div class="track-card ${isSelected ? 'selected' : ''}" data-track-id="${track.id}">
        <div class="track-badge-row">
          <span class="track-diff-tag">${track.difficulty}</span>
          <span class="track-stars">${track.stars}</span>
        </div>
        <h3 class="track-card-title">${track.name}</h3>
        <div class="track-card-subtitle">${track.subtitle}</div>
        
        <p class="track-card-desc">${track.description}</p>

        <div class="track-card-specs">
          <div class="spec-col">
            <span class="spec-label">LENGTH</span>
            <span class="spec-val">${track.lengthMeters}m (${track.scaleLengthMeters}m scale)</span>
          </div>
          <div class="spec-col">
            <span class="spec-label">RECORD LAP</span>
            <span class="spec-val record-val">⚡ ${bestLap ? formatTime(bestLap) : '--:--.--'}</span>
          </div>
        </div>

        <button class="btn-select-track ${isSelected ? 'btn-active-track' : ''}" type="button">
          ${isSelected ? 'CURRENT CIRCUIT ✓' : 'SELECT CIRCUIT'}
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="track-select-dialog modal-pop-anim">
      <div class="ts-header">
        <div class="ts-subheading">CIRCUIT RACER // SELECT STAGE</div>
        <h2 class="ts-title">CHOOSE RACING CIRCUIT</h2>
      </div>

      <div class="track-cards-grid">
        ${TRACK_LIST.map((t) => renderTrackCard(t)).join('')}
      </div>

      <div class="ts-footer">
        <button id="btn-close-track-select" class="btn-secondary" type="button">CLOSE [ESC]</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  function attachCardListeners() {
    const cards = container.querySelectorAll('.track-card');
    cards.forEach((card) => {
      const trackId = card.getAttribute('data-track-id');
      const btn = card.querySelector('.btn-select-track');

      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        selectAndConfirm(trackId);
      });

      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectAndConfirm(trackId);
        });
      }
    });

    const btnClose = container.querySelector('#btn-close-track-select');
    if (btnClose) {
      btnClose.addEventListener('click', close);
    }
  }

  function selectAndConfirm(trackId) {
    activeTrackId = trackId;
    setSelectedTrackId(trackId);
    const chosenTrack = TRACK_LIST.find((t) => t.id === trackId);
    close();
    if (typeof onSelectTrack === 'function') {
      onSelectTrack(chosenTrack);
    }
  }

  function close() {
    window.removeEventListener('keydown', handleKey);
    container.classList.add('fade-out');
    setTimeout(() => {
      container.remove();
      if (typeof onClose === 'function') onClose();
    }, 250);
  }

  function handleKey(e) {
    if (e.key === 'Escape') {
      close();
    }
  }

  window.addEventListener('keydown', handleKey);
  attachCardListeners();

  return {
    element: container,
    close,
  };
}
