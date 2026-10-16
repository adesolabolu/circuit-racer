const STORAGE_KEY = 'circuit_racer:profile_v1';

export class ProfileState {
  constructor(options = {}) {
    this.mockStorage = options.mockStorage || false;
    this.data = {
      coins: 250, // 250 Starting Coins as specified!
      selectedKart: 'proto_buggy',
      unlockedKarts: ['proto_buggy'],
      unlockedTracks: ['breadboard_loop'],
      upgrades: {
        motorKv: 1,
        capacitors: 1,
        siliconeGrip: 1,
      },
      customization: {
        underglowColor: '#00ffcc',
        wireColor: '#ff2222',
      },
      stats: {
        totalRaces: 0,
        bestTimes: {},
      },
    };

    this.load();
  }

  load() {
    if (this.mockStorage || typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.warn('Could not read saved profile', e);
    }
  }

  save() {
    if (this.mockStorage || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save profile', e);
    }
  }

  getCoins() {
    return this.data.coins;
  }

  addCoins(amount) {
    if (typeof amount === 'number' && amount > 0) {
      this.data.coins += Math.floor(amount);
      this.save();
    }
    return this.data.coins;
  }

  spendCoins(amount) {
    if (typeof amount === 'number' && amount > 0 && this.data.coins >= amount) {
      this.data.coins -= Math.floor(amount);
      this.save();
      return true;
    }
    return false;
  }

  getSelectedKart() {
    return this.data.selectedKart;
  }

  getUnlockedKarts() {
    return this.data.unlockedKarts;
  }

  getCustomization() {
    return this.data.customization;
  }

  setUnderglowColor(colorHex) {
    this.data.customization.underglowColor = colorHex;
    this.save();
  }
}

export const profileState = new ProfileState();
