/**
 * Leaderboard State management for Circuit Racer.
 * Tracks and persists fastest lap times and race records per circuit in localStorage.
 */

const STORAGE_KEY = 'circuit_racer_leaderboards_clean_v1';

const SEED_DATA = {
  'workbench-gp': [],
  'velocity-oval': [],
  'figure-8': [],
};

let inMemoryBoards = null;

function loadAllBoards() {
  if (inMemoryBoards) return inMemoryBoards;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryBoards = {
          'workbench-gp': Array.isArray(parsed['workbench-gp']) ? parsed['workbench-gp'] : [],
          'velocity-oval': Array.isArray(parsed['velocity-oval']) ? parsed['velocity-oval'] : [],
          'figure-8': Array.isArray(parsed['figure-8']) ? parsed['figure-8'] : [],
        };
        return inMemoryBoards;
      }
    }
  } catch (e) {
    // fallback
  }
  inMemoryBoards = JSON.parse(JSON.stringify(SEED_DATA));
  return inMemoryBoards;
}

function saveAllBoards(data) {
  inMemoryBoards = data;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn('Failed to save leaderboards to localStorage:', e);
  }
}

export const LeaderboardState = {
  getLeaderboard(trackId = 'workbench-gp') {
    const all = loadAllBoards();
    return all[trackId] || SEED_DATA[trackId] || [];
  },

  getBestLap(trackId = 'workbench-gp') {
    const board = this.getLeaderboard(trackId);
    return board.length > 0 ? board[0].lapTime : null;
  },

  getPersonalBest(trackId = 'workbench-gp', playerName = null) {
    const board = this.getLeaderboard(trackId);
    let userEntries;
    if (playerName) {
      userEntries = board.filter((e) => e.playerName.toLowerCase() === playerName.toLowerCase());
    } else {
      userEntries = board.filter((e) => e.isPlayer);
    }
    return userEntries.length > 0 ? userEntries[0].lapTime : null;
  },

  recordLapTime(trackId, { playerName = 'Guest', lapTime, kartName = 'Proto-Buggy #87', cleanRun = true }) {
    if (typeof lapTime !== 'number' || isNaN(lapTime) || lapTime <= 0) {
      return { isNewRecord: false, isPersonalBest: false, rank: null };
    }

    const all = loadAllBoards();
    const currentList = all[trackId] || [...(SEED_DATA[trackId] || [])];

    const prevPB = this.getPersonalBest(trackId, playerName);
    const prevOverallBest = currentList.length > 0 ? currentList[0].lapTime : Infinity;

    const isPersonalBest = prevPB === null || lapTime < prevPB;
    const isNewRecord = lapTime < prevOverallBest;

    const newEntry = {
      playerName,
      kartName,
      lapTime: Number(lapTime.toFixed(2)),
      cleanRun: Boolean(cleanRun),
      date: new Date().toISOString().split('T')[0],
      isPlayer: true,
    };

    currentList.push(newEntry);
    currentList.sort((a, b) => a.lapTime - b.lapTime);

    // Re-index ranks
    currentList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // Keep top 12
    const trimmed = currentList.slice(0, 12);
    all[trackId] = trimmed;
    saveAllBoards(all);

    const rank = trimmed.findIndex((e) => e === newEntry) + 1;

    return {
      isNewRecord,
      isPersonalBest,
      rank: rank > 0 ? rank : null,
      previousPersonalBest: prevPB,
    };
  },

  clearAll() {
    inMemoryBoards = {
      'workbench-gp': [],
      'velocity-oval': [],
      'figure-8': [],
    };
    saveAllBoards(inMemoryBoards);
  },

  resetToDefaults(trackId) {
    const all = loadAllBoards();
    if (trackId) {
      all[trackId] = [...(SEED_DATA[trackId] || [])];
    } else {
      Object.assign(all, JSON.parse(JSON.stringify(SEED_DATA)));
    }
    saveAllBoards(all);
  },
};

export { STORAGE_KEY, SEED_DATA };
