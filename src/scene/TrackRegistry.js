/**
 * Track Registry for Circuit Racer.
 * Defines available maps, difficulty ratings, and metadata.
 */
export const TRACK_LIST = [
  {
    id: 'workbench-gp',
    name: 'WORKBENCH GRAND PRIX',
    subtitle: 'Technical 6-Sector Diorama',
    difficulty: 'ADVANCED',
    stars: '⭐⭐⭐',
    lengthMeters: 3.61,
    scaleLengthMeters: 314,
    laps: 3,
    file: './assets/data/track_spline.json',
    accentColor: '#00ffcc',
    description: 'The signature creator desk loop. Features the laptop stand climb, ginger cat banked helix, blue mic ridge, and key-light corkscrew.',
  },
  {
    id: 'velocity-oval',
    name: 'NEON VELOCITY SPEEDWAY',
    subtitle: 'High-Speed Banked Tri-Oval',
    difficulty: 'EASY / SPEED',
    stars: '⭐',
    lengthMeters: 2.60,
    scaleLengthMeters: 226,
    laps: 3,
    file: './assets/data/track_oval.json',
    accentColor: '#ff0077',
    description: 'High-octane perimeter tri-oval with sweeping 24° banked turns and full-throttle straightaways engineered for maximum velocity.',
  },
  {
    id: 'figure-8',
    name: 'BREADBOARD FIGURE-8',
    subtitle: 'Crossover Flyover & Drift Arena',
    difficulty: 'TECHNICAL DRIFT',
    stars: '⭐⭐',
    lengthMeters: 2.76,
    scaleLengthMeters: 240,
    laps: 3,
    file: './assets/data/track_figure8.json',
    accentColor: '#ffaa00',
    description: 'Dynamic figure-8 layout featuring an elevated center bridge flyover directly over the breadboard and hairpin drift apexes.',
  },
];

const STORAGE_KEY = 'circuit_racer_selected_track_v1';
let memorySelectedTrackId = 'workbench-gp';

export function getSelectedTrackId() {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY) || memorySelectedTrackId;
    } catch {
      return memorySelectedTrackId;
    }
  }
  return memorySelectedTrackId;
}

export function setSelectedTrackId(id) {
  const exists = TRACK_LIST.some((t) => t.id === id);
  if (exists) {
    memorySelectedTrackId = id;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
    }
  }
}

export function getSelectedTrack() {
  const id = getSelectedTrackId();
  return TRACK_LIST.find((t) => t.id === id) || TRACK_LIST[0];
}
