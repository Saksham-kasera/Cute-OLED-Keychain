/* ==========================================================================
   MULTI-GAME WEB AUDIO SYNTHESIZER
   Zero-dependency procedural sound effects & chiptune EDM music generator
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
    this.masterGain = null;
    
    // Music Sequencer State (Geometry Dash)
    this.bpm = 136;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;

    this.bassPattern = [
      110, 0, 110, 165,  146.8, 0, 130.8, 110,
      98,  0, 98,  146.8, 130.8, 0, 123.5, 98,
      87.3, 0, 87.3, 130.8, 123.5, 0, 110, 87.3,
      98,  110, 123.5, 146.8, 164.8, 174.6, 196, 220
    ];

    this.leadPattern = [
      440, 0, 440, 659.2, 587.3, 0, 523.2, 440,
      392, 0, 392, 587.3, 523.2, 0, 493.9, 392,
      349.2, 0, 349.2, 523.2, 493.9, 0, 440, 349.2,
      392, 440, 493.9, 587.3, 659.2, 0, 880, 0
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- COMMON GAME SWITCH SOUND ---
  playSwitch() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, this.ctx.currentTime);
    osc.frequency.setValueAtTime(784, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // --- GEOMETRY DASH SOUND EFFECTS ---
  playJump() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playPad() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playOrb() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playPortal() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
  }

  playCrash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.25);
  }

  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.12;
      const duration = 0.25;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  // --- FLAPPY BIRD SOUND EFFECTS ---
  playFlap() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playScore() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(988, this.ctx.currentTime);
    gain1.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.08);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318, this.ctx.currentTime + 0.07);
    gain2.gain.setValueAtTime(0.45, this.ctx.currentTime + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(this.ctx.currentTime + 0.07);
    osc2.stop(this.ctx.currentTime + 0.18);
  }

  playHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  playDie() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }

  // --- CHROME DINO SOUND EFFECTS ---
  playDinoJump() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playDinoMilestone() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const o1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(880, this.ctx.currentTime);
    g1.gain.setValueAtTime(0.4, this.ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
    o1.connect(g1); g1.connect(this.masterGain);
    o1.start(); o1.stop(this.ctx.currentTime + 0.07);

    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(1174, this.ctx.currentTime + 0.07);
    g2.gain.setValueAtTime(0.45, this.ctx.currentTime + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
    o2.connect(g2); g2.connect(this.masterGain);
    o2.start(this.ctx.currentTime + 0.07);
    o2.stop(this.ctx.currentTime + 0.16);
  }

  playDinoHit() {
    this.playHit();
  }

  // --- CHIPTUNE EDM SEQUENCER (Geometry Dash) ---
  startMusic() {
    this.ensureContext();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleNotes();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  scheduleNotes() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const secondsPer16th = (60 / this.bpm) / 4;

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextNoteTime, secondsPer16th);
      this.nextNoteTime += secondsPer16th;
      this.step = (this.step + 1) % this.bassPattern.length;
    }

    this.timerId = setTimeout(() => this.scheduleNotes(), 40);
  }

  playStep(stepIdx, time, dur) {
    if (this.isMuted) return;

    const bassFreq = this.bassPattern[stepIdx];
    if (bassFreq > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      const bFilter = this.ctx.createBiquadFilter();

      bOsc.type = 'square';
      bOsc.frequency.setValueAtTime(bassFreq, time);

      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(600, time);
      bFilter.frequency.exponentialRampToValueAtTime(150, time + dur * 0.9);

      bGain.gain.setValueAtTime(0.22, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.85);

      bOsc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.masterGain);

      bOsc.start(time);
      bOsc.stop(time + dur * 0.9);
    }

    const leadFreq = this.leadPattern[stepIdx];
    if (leadFreq > 0) {
      const lOsc = this.ctx.createOscillator();
      const lGain = this.ctx.createGain();

      lOsc.type = 'sawtooth';
      lOsc.frequency.setValueAtTime(leadFreq, time);

      lGain.gain.setValueAtTime(0.12, time);
      lGain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.7);

      lOsc.connect(lGain);
      lGain.connect(this.masterGain);

      lOsc.start(time);
      lOsc.stop(time + dur * 0.75);
    }

    if (stepIdx % 4 === 0) {
      const kOsc = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(140, time);
      kOsc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

      kGain.gain.setValueAtTime(0.35, time);
      kGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      kOsc.connect(kGain);
      kGain.connect(this.masterGain);
      kOsc.start(time);
      kOsc.stop(time + 0.09);
    } else if (stepIdx % 2 === 0) {
      const bufferSize = this.ctx.sampleRate * 0.03;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const nSource = this.ctx.createBufferSource();
      nSource.buffer = buffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'highpass';
      nFilter.frequency.setValueAtTime(6000, time);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.08, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      nSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);

      nSource.start(time);
      nSource.stop(time + 0.03);
    }
  }

  // --- PET CHIRP & SYSTEM MENU SOUNDS ---
  playPetChirp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.06);
    gain1.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc1.connect(gain1); gain1.connect(this.masterGain);
    osc1.start(); osc1.stop(this.ctx.currentTime + 0.08);
  }

  playMenuOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1174, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  playMenuClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.03);
  }

  playMenuConfirm() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [659, 880, 1318];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = this.ctx.currentTime + i * 0.045;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(time); osc.stop(time + 0.08);
    });
  }

  // --- CAR RACING SFX ---
  playCarSwerve() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.08);
  }

  playCarPass() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(310, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  playCarCrash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
    noise.connect(nGain); nGain.connect(this.masterGain);
    noise.start();

    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.3);
  }

  playCarCoin() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(988, this.ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);
    osc1.connect(gain1); gain1.connect(this.masterGain);
    osc1.start(); osc1.stop(this.ctx.currentTime + 0.07);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318, this.ctx.currentTime + 0.06);
    gain2.gain.setValueAtTime(0.3, this.ctx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    osc2.connect(gain2); gain2.connect(this.masterGain);
    osc2.start(this.ctx.currentTime + 0.06); osc2.stop(this.ctx.currentTime + 0.22);
  }

  playCarNitro() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.28);
  }

  // --- RETRO SNAKE SFX ---
  playSnakeEat() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(659, this.ctx.currentTime);
    osc.frequency.setValueAtTime(988, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  playSnakeDie() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.38);
  }

  playSnakeTurn() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.025);
  }

  // --- SPACE INVADERS SFX ---
  playInvadersShoot() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  playInvadersHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.value = 1.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    noise.start(); noise.stop(this.ctx.currentTime + 0.1);
  }

  playInvadersStep(step) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [175, 160, 145, 130];
    const freq = notes[step % 4];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.05);
  }

  playInvadersUfo() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(520, this.ctx.currentTime + 0.06);
    osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.14);
  }

  playPlayerExplode() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    noise.connect(gain); gain.connect(this.masterGain);
    noise.start(); noise.stop(this.ctx.currentTime + 0.4);
  }

  // --- PET COMPANION ADVANCED EMOTION SFX ---
  playPetPurr() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(25, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(25, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain); gain.connect(this.masterGain);
    lfo.start(); osc.start();
    lfo.stop(this.ctx.currentTime + 0.25);
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playPetHeart() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [1046, 1318, 1568, 2093]; // C6, E6, G6, C7
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = this.ctx.currentTime + i * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(time); osc.stop(time + 0.12);
    });
  }

  playPetWake() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [784, 1046];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = this.ctx.currentTime + i * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(time); osc.stop(time + 0.15);
    });
  }

  playPetBlush() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1580, this.ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }
}

window.soundEngine = new SoundEngine();
