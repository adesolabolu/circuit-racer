const STORAGE_KEY = 'circuit_racer:profile_v1';

export const KART_CATALOG = [
  {
    id: 'proto_buggy',
    name: 'PROTO-BUGGY #87',
    tagline: 'Standard Issue Breadboard Racer',
    class: 'ALL-ROUNDER',
    price: 0,
    accentColor: '#ff2b1e',
    stats: { speed: 75, accel: 80, handling: 75 },
    description: 'Factory-tuned miniature prototype with lightweight carbon floorpan and balanced magnetic downforce.',
  },
  {
    id: 'resistor_rod',
    name: 'RESISTOR ROD',
    tagline: 'High-Torque Ceramic Muscle',
    class: 'TOP SPEED',
    price: 150,
    accentColor: '#ffaa00',
    stats: { speed: 95, accel: 65, handling: 70 },
    description: 'Stripped-down hotrod chassis featuring dual wound copper coils and an extended top speed curve.',
  },
  {
    id: 'micro_f1',
    name: 'MICRO-F1 AERO',
    tagline: 'Precision Ground-Effect Monocoque',
    class: 'PRO CORNERING',
    price: 300,
    accentColor: '#00ffcc',
    stats: { speed: 88, accel: 85, handling: 95 },
    description: 'Aero-sculpted single-seater featuring negative-pressure side skirts and razor-sharp rail clearance.',
  },
];

export const UPGRADE_CONFIG = {
  motorKv: {
    name: 'CORE MOTOR KV',
    desc: 'Increases top speed velocity limit (+5% per tier).',
    maxLevel: 5,
    baseCost: 40,
  },
  capacitors: {
    name: 'CAPACITOR BANK',
    desc: 'Amplifies turbo boost thrust and duration (+8% per tier).',
    maxLevel: 5,
    baseCost: 40,
  },
  siliconeGrip: {
    name: 'SILICONE GRIPPERS',
    desc: 'Increases lateral grip and reduces rail rub deceleration.',
    maxLevel: 5,
    baseCost: 40,
  },
};

export const UNDERGLOW_PALETTE = [
  { name: 'NEON CYAN', hex: '#00ffcc' },
  { name: 'CYBER PINK', hex: '#ff007f' },
  { name: 'ACID GREEN', hex: '#39ff14' },
  { name: 'AMBER GOLD', hex: '#ffaa00' },
  { name: 'ELECTRIC VIOLET', hex: '#9d00ff' },
];

export class ProfileState {
  constructor(options = {}) {
    this.mockStorage = options.mockStorage || false;
    this.data = {
      coins: 250, // 250 Starting Coins bankroll
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
        this.data = {
          ...this.data,
          ...parsed,
          upgrades: { ...this.data.upgrades, ...(parsed.upgrades || {}) },
          customization: { ...this.data.customization, ...(parsed.customization || {}) },
        };
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

  selectKart(kartId) {
    if (this.data.unlockedKarts.includes(kartId)) {
      this.data.selectedKart = kartId;
      this.save();
      return true;
    }
    return false;
  }

  getUnlockedKarts() {
    return this.data.unlockedKarts;
  }

  unlockKart(kartId) {
    const item = KART_CATALOG.find((k) => k.id === kartId);
    if (!item) return false;
    if (this.data.unlockedKarts.includes(kartId)) return true;

    if (this.spendCoins(item.price)) {
      this.data.unlockedKarts.push(kartId);
      this.data.selectedKart = kartId;
      this.save();
      return true;
    }
    return false;
  }

  getUpgrades() {
    return this.data.upgrades;
  }

  getUpgradeCost(statKey) {
    const cfg = UPGRADE_CONFIG[statKey];
    if (!cfg) return 9999;
    const currentLvl = this.data.upgrades[statKey] || 1;
    if (currentLvl >= cfg.maxLevel) return 0;
    return currentLvl * cfg.baseCost;
  }

  upgradeStat(statKey) {
    const cfg = UPGRADE_CONFIG[statKey];
    if (!cfg) return false;
    const currentLvl = this.data.upgrades[statKey] || 1;
    if (currentLvl >= cfg.maxLevel) return false;

    const cost = this.getUpgradeCost(statKey);
    if (this.spendCoins(cost)) {
      this.data.upgrades[statKey] = currentLvl + 1;
      this.save();
      return true;
    }
    return false;
  }

  getCustomization() {
    return this.data.customization;
  }

  getUnderglowColor() {
    return this.data.customization.underglowColor || '#00ffcc';
  }

  setUnderglowColor(colorHex) {
    this.data.customization.underglowColor = colorHex;
    this.save();
  }
}

export const profileState = new ProfileState();
