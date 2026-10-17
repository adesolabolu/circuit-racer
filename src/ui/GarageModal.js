import { KART_CATALOG, UPGRADE_CONFIG, UNDERGLOW_PALETTE } from '../state/ProfileState.js';

export function createGarageModal({
  profileState,
  onClose,
  onStartRace,
  onKartChanged,
  onUnderglowChanged,
}) {
  const container = document.createElement('div');
  container.id = 'garage-modal-root';
  container.className = 'garage-overlay';

  let currentTab = 'chassis'; // 'chassis' | 'upgrades'

  function render() {
    const coins = profileState.getCoins();
    const selectedKartId = profileState.getSelectedKart();
    const unlockedKarts = profileState.getUnlockedKarts();
    const upgrades = profileState.getUpgrades();
    const currentUnderglow = profileState.getUnderglowColor();

    container.innerHTML = `
      <div class="garage-card modal-pop-anim">
        <!-- Header -->
        <div class="garage-header">
          <div>
            <div class="circuit-eyebrow">LATE-NIGHT HACKER WORKBENCH // PHASE 3</div>
            <h2 class="garage-title">KART GARAGE & TUNING</h2>
          </div>
          <div class="garage-wallet">
            🪙 <span id="garage-coins">${coins}</span> BITS
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="garage-tabs">
          <button id="tab-chassis" class="garage-tab-btn ${currentTab === 'chassis' ? 'active' : ''}" type="button">
            CHASSIS BAY
          </button>
          <button id="tab-upgrades" class="garage-tab-btn ${currentTab === 'upgrades' ? 'active' : ''}" type="button">
            PERFORMANCE & LEDS
          </button>
        </div>

        <!-- Tab Content -->
        <div class="garage-content-scroll">
          ${currentTab === 'chassis' ? renderChassisBay(selectedKartId, unlockedKarts, coins) : renderUpgradesBay(upgrades, currentUnderglow, coins)}
        </div>

        <!-- Action Footer -->
        <div class="garage-footer">
          <button id="btn-garage-close" class="btn-secondary" type="button">
            ← BACK TO WORKBENCH [ESC]
          </button>
          ${onStartRace ? `
          <button id="btn-garage-race" class="btn-primary" type="button">
            RACE NOW [ENTER] →
          </button>
          ` : ''}
        </div>
      </div>
    `;

    attachEvents();
  }

  function renderChassisBay(selectedKartId, unlockedKarts, coins) {
    return `
      <div class="chassis-grid">
        ${KART_CATALOG.map((kart) => {
          const isUnlocked = unlockedKarts.includes(kart.id);
          const isSelected = selectedKartId === kart.id;
          const canAfford = coins >= kart.price;

          let actionBtn = '';
          if (isSelected) {
            actionBtn = `<button class="btn-kart-action equipped" disabled>EQUIPPED</button>`;
          } else if (isUnlocked) {
            actionBtn = `<button class="btn-kart-action select" data-action="select" data-id="${kart.id}">SELECT KART</button>`;
          } else {
            actionBtn = `<button class="btn-kart-action buy ${canAfford ? '' : 'disabled'}" data-action="buy" data-id="${kart.id}" ${canAfford ? '' : 'disabled'}>
              UNLOCK (${kart.price} BITS)
            </button>`;
          }

          return `
            <div class="chassis-card ${isSelected ? 'selected' : ''}">
              <div class="chassis-card-header">
                <span class="chassis-class-tag">${kart.class}</span>
                <span class="chassis-color-dot" style="background-color: ${kart.accentColor}"></span>
              </div>
              <h3 class="chassis-name">${kart.name}</h3>
              <p class="chassis-tagline">${kart.tagline}</p>
              
              <div class="chassis-stats">
                <div class="stat-bar-row">
                  <span>TOP SPEED</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${kart.stats.speed}%; background-color: ${kart.accentColor}"></div>
                  </div>
                </div>
                <div class="stat-bar-row">
                  <span>ACCELERATION</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${kart.stats.accel}%; background-color: ${kart.accentColor}"></div>
                  </div>
                </div>
                <div class="stat-bar-row">
                  <span>CORNERING</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${kart.stats.handling}%; background-color: ${kart.accentColor}"></div>
                  </div>
                </div>
              </div>

              <p class="chassis-desc">${kart.description}</p>
              <div class="chassis-action-wrap">
                ${actionBtn}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderUpgradesBay(upgrades, currentUnderglow, coins) {
    return `
      <div class="upgrades-section">
        <h4 class="section-title">HARDWARE BENCH UPGRADES</h4>
        <div class="upgrades-grid">
          ${Object.entries(UPGRADE_CONFIG).map(([key, cfg]) => {
            const currentLevel = upgrades[key] || 1;
            const isMax = currentLevel >= cfg.maxLevel;
            const cost = profileState.getUpgradeCost(key);
            const canAfford = coins >= cost;

            const dots = Array.from({ length: cfg.maxLevel }, (_, i) => 
              `<span class="upgrade-dot ${i < currentLevel ? 'active' : ''}"></span>`
            ).join('');

            return `
              <div class="upgrade-card">
                <div class="upgrade-info">
                  <div class="upgrade-name">${cfg.name}</div>
                  <div class="upgrade-desc">${cfg.desc}</div>
                  <div class="upgrade-levels">
                    ${dots}
                    <span class="upgrade-level-num">LVL ${currentLevel}/${cfg.maxLevel}</span>
                  </div>
                </div>
                <div class="upgrade-action">
                  ${isMax 
                    ? `<button class="btn-upgrade maxed" disabled>MAX TIER</button>` 
                    : `<button class="btn-upgrade buy ${canAfford ? '' : 'disabled'}" data-upgrade="${key}" ${canAfford ? '' : 'disabled'}>
                        UPGRADE (${cost} BITS)
                      </button>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <h4 class="section-title" style="margin-top: 1.8rem;">NEON LED UNDERGLOW CHASSIS</h4>
        <div class="underglow-palette">
          ${UNDERGLOW_PALETTE.map((pal) => `
            <button 
              class="underglow-swatch ${currentUnderglow === pal.hex ? 'active' : ''}" 
              data-color="${pal.hex}" 
              style="--swatch-color: ${pal.hex}"
              type="button"
              title="${pal.name}"
            >
              <span class="swatch-indicator"></span>
              <span class="swatch-name">${pal.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function attachEvents() {
    // Tab switching
    const tabChassis = container.querySelector('#tab-chassis');
    const tabUpgrades = container.querySelector('#tab-upgrades');
    if (tabChassis) {
      tabChassis.addEventListener('click', () => {
        currentTab = 'chassis';
        render();
      });
    }
    if (tabUpgrades) {
      tabUpgrades.addEventListener('click', () => {
        currentTab = 'upgrades';
        render();
      });
    }

    // Kart select/buy
    container.querySelectorAll('.btn-kart-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.id;
        if (action === 'select') {
          profileState.selectKart(id);
          if (onKartChanged) onKartChanged(id);
          render();
        } else if (action === 'buy') {
          if (profileState.unlockKart(id)) {
            if (onKartChanged) onKartChanged(id);
            render();
          }
        }
      });
    });

    // Upgrade buy
    container.querySelectorAll('.btn-upgrade[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const statKey = e.currentTarget.dataset.upgrade;
        if (profileState.upgradeStat(statKey)) {
          render();
        }
      });
    });

    // Underglow selection
    container.querySelectorAll('.underglow-swatch').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        const color = e.currentTarget.dataset.color;
        profileState.setUnderglowColor(color);
        if (onUnderglowChanged) onUnderglowChanged(color);
        render();
      });
    });

    // Close button
    const btnClose = container.querySelector('#btn-garage-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        close();
      });
    }

    // Race now button
    const btnRace = container.querySelector('#btn-garage-race');
    if (btnRace) {
      btnRace.addEventListener('click', () => {
        close();
        if (onStartRace) onStartRace();
      });
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Enter' && onStartRace) {
      close();
      onStartRace();
    }
  }

  function close() {
    window.removeEventListener('keydown', handleKeydown);
    container.classList.add('fade-out');
    setTimeout(() => {
      container.remove();
    }, 200);
    if (onClose) onClose();
  }

  window.addEventListener('keydown', handleKeydown);
  document.body.appendChild(container);
  render();

  return {
    element: container,
    close,
  };
}
