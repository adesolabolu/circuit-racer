/**
 * SynthwaveMusicEngine.js
 * High-Energy 124 BPM Procedural Web Audio Synthwave / Cyberpunk Engine
 * for Circuit Racer ("Neon Overdrive").
 *
 * Fully procedural: Zero MP3/WAV assets to load, zero network latency,
 * instant start, dynamic intensity across Menu, Garage, Countdown, and Race!
 */

export function createSynthwaveMusicEngine(options = {}) {
  let ctx = options.audioContext || null;
  let masterGain = null;
  let musicGain = null;
  let sidechainGain = null;

  let isPlaying = false;
  let isMuted = false;
  let currentVolume = options.volume ?? 0.38;
  let currentMode = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACING' | 'OFF'

  const BPM = 124;
  const stepDuration = (60 / BPM) / 4; // 16th note in seconds (~0.121s)

  let nextStepTime = 0;
  let currentStep = 0;
  let timerId = null;

  // Chord progression: Am (A2/A3) -> F (F2/F3) -> C (C3/C4) -> G (G2/G3)
  // 4 beats per chord = 16 sixteenth-notes per bar
  const CHORD_ROOTS = [
    { rootFreq: 110.00, notes: [220.00, 261.63, 329.63, 392.00] }, // Am7 (A3, C4, E4, G4)
    { rootFreq: 87.31,  notes: [174.61, 220.00, 261.63, 329.63] }, // Fmaj7 (F3, A3, C4, E4)
    { rootFreq: 130.81, notes: [261.63, 329.63, 392.00, 493.88] }, // Cmaj7 (C4, E4, G4, B4)
    { rootFreq: 98.00,  notes: [196.00, 246.94, 293.66, 392.00] }, // G7 (G3, B3, D4, G4)
  ];

  // Lead melody notes (Hz) for Racing Mode over 64 sixteenth-notes (4 bars)
  const LEAD_MELODY = [
    // Bar 1 (Am)
    440.00, 0, 523.25, 0,  659.25, 0, 523.25, 0,  440.00, 0, 392.00, 0,  440.00, 0, 0, 0,
    // Bar 2 (F)
    349.23, 0, 440.00, 0,  523.25, 0, 440.00, 0,  349.23, 0, 392.00, 0,  349.23, 0, 0, 0,
    // Bar 3 (C)
    523.25, 0, 659.25, 0,  783.99, 0, 659.25, 0,  523.25, 0, 493.88, 0,  523.25, 0, 0, 0,
    // Bar 4 (G)
    392.00, 0, 493.88, 0,  587.33, 0, 493.88, 0,  659.25, 0, 587.33, 0,  392.00, 0, 0, 0,
  ];

  // Noise buffer for punchy Linn/808-style snare and hi-hats
  let noiseBuffer = null;

  function initNoiseBuffer() {
    if (!ctx || noiseBuffer) return;
    const bufferSize = ctx.sampleRate * 1.5;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  function initAudioNodes() {
    if (musicGain) return;
    if (!ctx) {
      const AudioContextClass = typeof window !== 'undefined'
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (!AudioContextClass) return;
      ctx = new AudioContextClass();
    }

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0.0001 : currentVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Music master gain
    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(1.0, ctx.currentTime);
    musicGain.connect(masterGain);

    // Sidechain gain for bass and arp pump
    sidechainGain = ctx.createGain();
    sidechainGain.gain.setValueAtTime(1.0, ctx.currentTime);
    sidechainGain.connect(musicGain);

    initNoiseBuffer();
  }

  // --- DRUM SYNTHESIS ---

  function triggerKick(time) {
    if (!ctx || isMuted) return;

    // 1. Pitch sweep sine
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145.0, time);
    osc.frequency.exponentialRampToValueAtTime(42.0, time + 0.082);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.92, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

    osc.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc.stop(time + 0.25);

    // 2. Click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320.0, time);
    clickOsc.frequency.exponentialRampToValueAtTime(80.0, time + 0.018);

    clickGain.gain.setValueAtTime(0.35, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(musicGain);

    clickOsc.start(time);
    clickOsc.stop(time + 0.025);

    // 3. Sidechain ducking on bass & arps for authentic electronic pumping
    if (sidechainGain) {
      sidechainGain.gain.cancelScheduledValues(time);
      sidechainGain.gain.setValueAtTime(0.35, time);
      sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.095);
    }
  }

  function triggerSnare(time) {
    if (!ctx || !noiseBuffer || isMuted) return;

    // Noise body through bandpass
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850.0, time);
    filter.Q.setValueAtTime(1.8, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.48, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    noise.start(time);
    noise.stop(time + 0.18);

    // Tone snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(220.0, time);
    snapOsc.frequency.exponentialRampToValueAtTime(95.0, time + 0.05);

    snapGain.gain.setValueAtTime(0.30, time);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    snapOsc.connect(snapGain);
    snapGain.connect(musicGain);

    snapOsc.start(time);
    snapOsc.stop(time + 0.065);
  }

  function triggerHiHat(time, isOpen = false) {
    if (!ctx || !noiseBuffer || isMuted) return;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500.0, time);

    const gain = ctx.createGain();
    const dur = isOpen ? 0.18 : 0.045;
    const vol = isOpen ? 0.28 : 0.16;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  // --- SYNTH BASS & ARPEGGIO ---

  function triggerBass(time, freq, isAccent = false) {
    if (!ctx || isMuted) return;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterEnvStart = isAccent ? 1400.0 : 920.0;
    filter.frequency.setValueAtTime(filterEnvStart, time);
    filter.frequency.exponentialRampToValueAtTime(320.0, time + 0.095);
    filter.Q.setValueAtTime(3.5, time);

    const gain = ctx.createGain();
    const peakGain = isAccent ? 0.44 : 0.32;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.115);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sidechainGain);

    osc.start(time);
    osc.stop(time + 0.125);
  }

  function triggerArp(time, freq) {
    if (!ctx || isMuted) return;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600.0, time);
    filter.frequency.exponentialRampToValueAtTime(750.0, time + 0.09);
    filter.Q.setValueAtTime(2.0, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.10);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sidechainGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  function triggerLead(time, freq) {
    if (!ctx || isMuted || freq <= 0) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.004, time); // Subtle detune for lush supersaw stereo feel

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400.0, time);
    filter.Q.setValueAtTime(1.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.015);
    gain.gain.setValueAtTime(0.14, time + stepDuration * 1.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + stepDuration * 2.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + stepDuration * 2.3);
    osc2.stop(time + stepDuration * 2.3);
  }

  // --- STEP SCHEDULER ---

  function scheduleStep(stepIdx, time) {
    const barIdx = Math.floor((stepIdx % 64) / 16);
    const stepInBar = stepIdx % 16;
    const chord = CHORD_ROOTS[barIdx % CHORD_ROOTS.length];

    if (currentMode === 'RACING') {
      // 1. Kick on 1, 5, 9, 13 (four-on-the-floor beat)
      if (stepInBar % 4 === 0) {
        triggerKick(time);
      }

      // 2. Snare on 5, 13 (beats 2 and 4)
      if (stepInBar === 4 || stepInBar === 12) {
        triggerSnare(time);
      }

      // 3. Hi-Hats: 16th notes with open hat on off-beat accents
      const isOpenHat = stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14;
      triggerHiHat(time, isOpenHat);

      // 4. Rolling 16th-Note Bassline (alternates root and octave)
      const isOctave = stepInBar % 2 === 1;
      const bassFreq = isOctave ? chord.rootFreq * 2.0 : chord.rootFreq;
      triggerBass(time, bassFreq, stepInBar % 4 === 0);

      // 5. Synth Arpeggios (cycles through chord notes)
      const noteIdx = stepInBar % chord.notes.length;
      triggerArp(time, chord.notes[noteIdx]);

      // 6. Lead Hook (every 2 bars in the loop)
      const leadFreq = LEAD_MELODY[stepIdx % 64];
      if (leadFreq > 0) {
        triggerLead(time, leadFreq);
      }

    } else if (currentMode === 'MENU') {
      // Ambient Chillout Groove: Soft pumping bass + gentle arpeggios + light hats
      if (stepInBar === 0 || stepInBar === 8) {
        triggerKick(time);
      }
      if (stepInBar % 2 === 0) {
        triggerHiHat(time, false);
      }

      // Half-time bass
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
        triggerBass(time, chord.rootFreq, true);
      }

      // Gentle arpeggio
      const noteIdx = (stepInBar >> 1) % chord.notes.length;
      triggerArp(time, chord.notes[noteIdx]);

    } else if (currentMode === 'COUNTDOWN') {
      // Tense pulsing bass and kick anticipation
      if (stepInBar % 4 === 0) {
        triggerKick(time);
        triggerBass(time, 110.0, true);
      }
      triggerHiHat(time, false);
    }
  }

  function tick() {
    if (!isPlaying || !ctx) return;

    const lookAheadTime = 0.12; // Schedule ahead in 120ms window
    while (nextStepTime < ctx.currentTime + lookAheadTime) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += stepDuration;
      currentStep++;
    }

    timerId = setTimeout(tick, 25);
  }

  function start() {
    initAudioNodes();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (isPlaying) return;
    isPlaying = true;
    nextStepTime = ctx.currentTime + 0.05;
    currentStep = 0;
    tick();
  }

  function stop() {
    isPlaying = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function setMode(mode) {
    if (['MENU', 'COUNTDOWN', 'RACING', 'OFF'].includes(mode)) {
      currentMode = mode;
      if (mode === 'OFF') {
        stop();
      } else if (!isPlaying) {
        start();
      }
    }
  }

  function setVolume(vol) {
    currentVolume = Math.max(0.0, Math.min(1.0, Number(vol) || 0.0));
    if (masterGain && ctx && !isMuted) {
      masterGain.gain.setTargetAtTime(currentVolume, ctx.currentTime, 0.04);
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0.0001 : currentVolume, ctx.currentTime, 0.04);
    }
    return isMuted;
  }

  function duck(duckFactor = 0.25, durationS = 1.0) {
    if (!musicGain || !ctx) return;
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(duckFactor, now + 0.04);
    musicGain.gain.setValueAtTime(duckFactor, now + durationS * 0.7);
    musicGain.gain.linearRampToValueAtTime(1.0, now + durationS);
  }

  return {
    start,
    stop,
    setMode,
    setVolume,
    toggleMute,
    duck,
    isMuted: () => isMuted,
    isPlaying: () => isPlaying,
    getMode: () => currentMode,
  };
}
