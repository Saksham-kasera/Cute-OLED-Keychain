/* ==========================================================================
   MULTI-GAME JAVASCRIPT ENGINE: GEOMETRY DASH + FLAPPY BIRD + CHROME DINO
   Full Physics, Dual Modes (Neon & ESP32 OLED), Web Audio, 3-in-1 Game Switcher
   ========================================================================== */

(function() {
  'use strict';

  // --- CANVAS & CONTEXT SETUP ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const V_WIDTH = 960;
  const V_HEIGHT = 540;

  // Offscreen canvas for ESP32 OLED 128x64 Simulation
  const oledCanvas = document.createElement('canvas');
  oledCanvas.width = 128;
  oledCanvas.height = 64;
  const oledCtx = oledCanvas.getContext('2d', { willReadFrequently: true });

  // DOM Elements
  const gameTitleHeading = document.getElementById('gameTitleHeading');
  const activeGameBadge = document.getElementById('activeGameBadge');
  const statLabel1 = document.getElementById('statLabel1');
  const statVal1 = document.getElementById('statVal1');
  const statLabel2 = document.getElementById('statLabel2');
  const statVal2 = document.getElementById('statVal2');

  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressMarker = document.getElementById('progressMarker');
  const progressVal = document.getElementById('progressVal');
  const practiceBadge = document.getElementById('practiceBadge');

  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const overlayStatLabel1 = document.getElementById('overlayStatLabel1');
  const overlayProgressVal = document.getElementById('overlayProgressVal');
  const overlayBestVal = document.getElementById('overlayBestVal');
  const overlayActionBtn = document.getElementById('overlayActionBtn');
  const overlaySwitchBtn = document.getElementById('overlaySwitchBtn');
  const gameOverlay = document.getElementById('gameOverlay');

  const toggleGameBtn = document.getElementById('toggleGameBtn');
  const toggleSoundBtn = document.getElementById('toggleSoundBtn');
  const toggleModeBtn = document.getElementById('toggleModeBtn');
  const togglePracticeBtn = document.getElementById('togglePracticeBtn');
  const customizerDeck = document.getElementById('customizerDeck');

  const systemMenuOverlay = document.getElementById('systemMenuOverlay');
  const openMenuBtn = document.getElementById('openMenuBtn');
  const systemMenuOptions = document.getElementById('systemMenuOptions');

  // --- ACTIVE GAME HUB & SYSTEM MENU ---
  // Games: 'face' -> 'geodash' -> 'flappy' -> 'dino' -> 'car' -> 'snake' -> 'invaders'
  const GAME_LIST = ['face', 'geodash', 'flappy', 'dino', 'car', 'snake', 'invaders'];
  let activeGame = 'face'; // Defaults to Cute Companion Pet Face!
  let isSwitchingGame = false;
  let switchBannerTimer = 0;
  let isSystemMenuOpen = false;
  let systemMenuSelection = 0;

  let displayMode = 'neon'; // 'neon' | 'oled'

  function sound() {
    return window.soundEngine;
  }

  // --- CUTE COMPANION PET FACE STATE (360° Living Irises & Patting Emotion Engine) ---
  const FACE_MOOD = {
    NORMAL: 0,
    BLINK: 1,
    HAPPY_SQUINT: 2,
    BLUSH: 3,
    WINK: 4,
    SLEEPY: 5,
    LOVE_OVERLOAD: 6,
    AFTERGLOW: 7
  };

  let faceMood = FACE_MOOD.NORMAL;
  let faceMoodTimer = 0;
  let faceLastInteract = performance.now();
  let faceNextBlink = performance.now() + 2500;
  let faceNextGlance = performance.now() + 3500;
  let faceNextExpression = performance.now() + 7000;
  let faceSleepDuration = 0;

  // Patting Emotion & Love Overload Engine
  let petStreak = 0;
  let petLastTap = 0;
  let petHearts = []; // Floating heart particles: { x, y, vy, size, sway, swaySpeed }

  // 360° Living Iris Mobility
  let irisCurX = 0;
  let irisCurY = 0;
  let irisTargetX = 0;
  let irisTargetY = 0;
  let irisOrbitAngle = 0;
  let isIrisOrbiting = false;
  let nextOrbitTime = performance.now() + 8000;

  function petFace(isContinuous) {
    sound().ensureContext();
    const now = performance.now();
    faceLastInteract = now;

    // If asleep, wake up immediately!
    if (faceMood === FACE_MOOD.SLEEPY) {
      sound().playPetWake();
      faceMood = FACE_MOOD.NORMAL;
      faceMoodTimer = 1.0;
      irisTargetX = 0;
      irisTargetY = 0;
      updateHUD();
      return;
    }

    if (now - petLastTap < 2200) {
      petStreak++;
    } else {
      petStreak = 1;
    }
    petLastTap = now;

    if (isContinuous || petStreak >= 4) {
      // Stage 4+: LOVE OVERLOAD / HEAVENLY MODE
      faceMood = FACE_MOOD.LOVE_OVERLOAD;
      faceMoodTimer = 3.0;
      irisTargetY = -2.5;
      sound().playPetPurr();
      sound().playPetHeart();

      // Spawn floating love hearts
      for (let i = 0; i < 4; i++) {
        petHearts.push({
          x: 400 + Math.random() * 160,
          y: 300 + Math.random() * 40,
          vy: -(80 + Math.random() * 90),
          size: 14 + Math.random() * 14,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 3 + Math.random() * 3,
          color: Math.random() > 0.4 ? '#ff0077' : '#ff66b2'
        });
      }
    } else if (petStreak === 3) {
      // Stage 3: Blushing Sparkles
      faceMood = FACE_MOOD.BLUSH;
      faceMoodTimer = 2.0;
      irisTargetX = 0;
      irisTargetY = -1.5;
      sound().playPetBlush();
      petHearts.push({
        x: 480,
        y: 280,
        vy: -70,
        size: 18,
        sway: 0,
        swaySpeed: 4,
        color: '#ff0077'
      });
    } else if (petStreak === 2) {
      // Stage 2: Ecstatic Squint ^ ^
      faceMood = FACE_MOOD.HAPPY_SQUINT;
      faceMoodTimer = 1.8;
      irisTargetX = 0;
      irisTargetY = 0;
      sound().playPetChirp();
    } else {
      // Stage 1: Gentle Pat (Hand tracking glance up)
      faceMood = FACE_MOOD.NORMAL;
      irisTargetY = -5.0; // Eyes look up toward petting hand
      irisTargetX = 0;
      faceMoodTimer = 1.2;
      sound().playPetChirp();
    }

    updateHUD();
  }

  function updateFace(dt) {
    const now = performance.now();

    // 1. Idle Sleepiness & Auto Wake-up
    if (faceMood !== FACE_MOOD.SLEEPY && (now - faceLastInteract > 15000)) {
      faceMood = FACE_MOOD.SLEEPY;
      faceMoodTimer = 0;
      faceSleepDuration = 0;
      irisTargetX = 0;
      irisTargetY = 3.0; // Droop down
      updateHUD();
    } else if (faceMood === FACE_MOOD.SLEEPY) {
      faceSleepDuration += dt;
      // Auto wake-up on its own after 5.5 seconds!
      if (faceSleepDuration > 5.5) {
        sound().playPetWake();
        faceMood = FACE_MOOD.NORMAL;
        faceMoodTimer = 1.5;
        faceLastInteract = now;
        irisTargetX = 0;
        irisTargetY = 0;
        updateHUD();
      }
    }

    // 2. Love Overload Floating Hearts Physics
    for (let i = petHearts.length - 1; i >= 0; i--) {
      const h = petHearts[i];
      h.y += h.vy * dt;
      h.sway += h.swaySpeed * dt;
      h.x += Math.sin(h.sway) * 40 * dt;
      if (h.y < 40) {
        petHearts.splice(i, 1);
      }
    }

    // 3. Mood Timer & State Transitions
    if (faceMoodTimer > 0) {
      faceMoodTimer -= dt;
      if (faceMoodTimer <= 0) {
        if (faceMood === FACE_MOOD.LOVE_OVERLOAD) {
          faceMood = FACE_MOOD.AFTERGLOW;
          faceMoodTimer = 2.4;
        } else {
          faceMood = FACE_MOOD.NORMAL;
          faceNextBlink = now + Math.random() * 2000 + 2500;
          faceNextGlance = now + Math.random() * 2500 + 3000;
        }
        updateHUD();
      }
    } else if (faceMood === FACE_MOOD.NORMAL) {
      // 4. 360° Circular Living Iris Orbit & Procedural Gaze
      if (isIrisOrbiting) {
        irisOrbitAngle += dt * 3.5;
        irisTargetX = Math.cos(irisOrbitAngle) * 5.5;
        irisTargetY = Math.sin(irisOrbitAngle) * 4.0;
        if (irisOrbitAngle > Math.PI * 2) {
          isIrisOrbiting = false;
          irisTargetX = 0;
          irisTargetY = 0;
          nextOrbitTime = now + Math.random() * 8000 + 10000;
        }
      } else if (now > nextOrbitTime) {
        isIrisOrbiting = true;
        irisOrbitAngle = 0;
      } else if (now > faceNextBlink) {
        faceMood = FACE_MOOD.BLINK;
        faceMoodTimer = 0.16;
      } else if (now > faceNextExpression) {
        // Spontaneous cute expressions
        const roll = Math.random();
        if (roll < 0.45) {
          faceMood = FACE_MOOD.BLUSH;
          faceMoodTimer = 1.6;
        } else if (roll < 0.8) {
          faceMood = FACE_MOOD.WINK;
          faceMoodTimer = 1.4;
        } else {
          faceMood = FACE_MOOD.HAPPY_SQUINT;
          faceMoodTimer = 1.5;
        }
        faceNextExpression = now + Math.random() * 7000 + 9000;
      } else if (now > faceNextGlance) {
        // Random 8-way cardinal / diagonal glance
        const glances = [
          [0, 0], [-5, 0], [5, 0], [0, -3.5], [0, 3],
          [-4, -3], [4, -3], [-3.5, 3], [3.5, 3]
        ];
        const g = glances[Math.floor(Math.random() * glances.length)];
        irisTargetX = g[0];
        irisTargetY = g[1];
        faceNextGlance = now + Math.random() * 2500 + 3500;
      }
    }

    // Smooth ease-out iris interpolation
    irisCurX += (irisTargetX - irisCurX) * Math.min(1, dt * 10);
    irisCurY += (irisTargetY - irisCurY) * Math.min(1, dt * 10);
  }

  // ==========================================================================
  //  SECTION 1: GEOMETRY DASH CONSTANTS & STATE
  // ==========================================================================
  const GD_FLOOR_Y = 430;
  const GD_CEILING_Y = 60;
  const GD_PLAYER_SCREEN_X = 160;
  const GD_CUBE_SIZE = 42;
  const GD_GAME_SPEED = 460;

  const GD_CUBE_GRAVITY = 1950;
  const GD_CUBE_JUMP_FORCE = -760;
  const GD_SHIP_GRAVITY = 950;
  const GD_SHIP_THRUST = -1450;
  const GD_SHIP_MAX_VY = 580;

  const GD_OBS = {
    SPIKE: 1, DOUBLE_SPIKE: 2, TRIPLE_SPIKE: 3, CEIL_SPIKE: 4,
    BLOCK: 5, PAD_JUMP: 6, ORB_JUMP: 7, PORTAL_SHIP: 8, PORTAL_CUBE: 9, FINISH: 10
  };

  const GD_LEVEL_TRACK = [
    { x: 500,  y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 800,  y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 1100, y: GD_FLOOR_Y - 44, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 1350, y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 1650, y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 1950, y: GD_FLOOR_Y - 42, w: 84, h: 42, type: GD_OBS.DOUBLE_SPIKE },
    { x: 2300, y: GD_FLOOR_Y - 44, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 2344, y: GD_FLOOR_Y - 88, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 2600, y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 2900, y: GD_FLOOR_Y - 14, w: 56, h: 14, type: GD_OBS.PAD_JUMP },
    { x: 2980, y: GD_FLOOR_Y - 42, w: 126, h: 42, type: GD_OBS.TRIPLE_SPIKE },
    { x: 3200, y: GD_FLOOR_Y - 44, w: 130, h: 44, type: GD_OBS.BLOCK },
    { x: 3244, y: GD_FLOOR_Y - 86, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 3550, y: GD_FLOOR_Y - 42, w: 84, h: 42, type: GD_OBS.DOUBLE_SPIKE },
    { x: 3750, y: GD_FLOOR_Y - 110, w: 48, h: 48, type: GD_OBS.ORB_JUMP },
    { x: 3820, y: GD_FLOOR_Y - 42, w: 126, h: 42, type: GD_OBS.TRIPLE_SPIKE },
    { x: 4200, y: GD_FLOOR_Y - 180, w: 48, h: 180, type: GD_OBS.PORTAL_SHIP },
    { x: 4500, y: GD_FLOOR_Y - 60,  w: 42, h: 60, type: GD_OBS.SPIKE },
    { x: 4750, y: GD_CEILING_Y,     w: 42, h: 70, type: GD_OBS.CEIL_SPIKE },
    { x: 5050, y: GD_FLOOR_Y - 90,  w: 42, h: 90, type: GD_OBS.SPIKE },
    { x: 5350, y: GD_CEILING_Y,     w: 42, h: 80, type: GD_OBS.CEIL_SPIKE },
    { x: 5650, y: GD_FLOOR_Y - 80,  w: 42, h: 80, type: GD_OBS.SPIKE },
    { x: 5950, y: GD_CEILING_Y,     w: 42, h: 100, type: GD_OBS.CEIL_SPIKE },
    { x: 6250, y: GD_FLOOR_Y - 100, w: 60, h: 50, type: GD_OBS.BLOCK },
    { x: 6550, y: GD_CEILING_Y,     w: 42, h: 80, type: GD_OBS.CEIL_SPIKE },
    { x: 6900, y: GD_FLOOR_Y - 180, w: 48, h: 180, type: GD_OBS.PORTAL_CUBE },
    { x: 7200, y: GD_FLOOR_Y - 44, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 7320, y: GD_FLOOR_Y - 44, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 7500, y: GD_FLOOR_Y - 14, w: 56, h: 14, type: GD_OBS.PAD_JUMP },
    { x: 7580, y: GD_FLOOR_Y - 42, w: 126, h: 42, type: GD_OBS.TRIPLE_SPIKE },
    { x: 7800, y: GD_FLOOR_Y - 44, w: 140, h: 44, type: GD_OBS.BLOCK },
    { x: 8050, y: GD_FLOOR_Y - 42, w: 126, h: 42, type: GD_OBS.TRIPLE_SPIKE },
    { x: 8300, y: GD_FLOOR_Y - 44, w: 44, h: 44, type: GD_OBS.BLOCK },
    { x: 8450, y: GD_FLOOR_Y - 42, w: 42, h: 42, type: GD_OBS.SPIKE },
    { x: 8800, y: GD_FLOOR_Y - 200, w: 60, h: 200, type: GD_OBS.FINISH }
  ];
  const GD_LEVEL_FINISH_X = 8800;

  const GD_STATE = { MENU: 0, PLAYING: 1, DEAD: 2, VICTORY: 3 };
  let gdGameState = GD_STATE.MENU;
  let gdPlayerMode = 'cube';

  let gdPlayer = {
    y: GD_FLOOR_Y - GD_CUBE_SIZE,
    vy: 0,
    angle: 0,
    isOnGround: true,
    color: '#00f0ff',
    faceStyle: 'classic'
  };

  let gdCameraX = 0;
  let gdAttempts = parseInt(localStorage.getItem('gd_attempts') || '1', 10);
  let gdBestPercent = parseInt(localStorage.getItem('gd_best') || '0', 10);
  let gdCurrentPercent = 0;

  let isJumpPressed = false;
  let jumpBufferTimer = 0;
  const JUMP_BUFFER_MS = 140;

  let isPracticeMode = false;
  let checkpoints = [];

  let particles = [];
  let screenShake = 0;
  let trailParticles = [];
  let confetti = [];

  // ==========================================================================
  //  SECTION 2: FLAPPY BIRD CONSTANTS & STATE
  // ==========================================================================
  const FB_FLOOR_Y = 460;
  const FB_CEILING_Y = 10;
  const FB_BIRD_X = 180;
  const FB_BIRD_SIZE = 36;
  const FB_PIPE_WIDTH = 70;
  const FB_PIPE_GAP = 140;
  const FB_PIPE_SPEED = 240;

  const FB_STATE = { MENU: 0, PLAYING: 1, DEAD: 2 };
  let fbGameState = FB_STATE.MENU;

  let fbBird = {
    y: 220,
    vy: 0,
    pitch: 0
  };

  const FB_GRAVITY = 1100;
  const FB_FLAP_IMPULSE = -380;

  let fbPipes = [];
  let fbScore = 0;
  let fbBestScore = parseInt(localStorage.getItem('fb_best') || '0', 10);
  let fbGroundScroll = 0;

  function initFBPipes() {
    fbPipes = [];
    for (let i = 0; i < 4; i++) {
      fbPipes.push({
        x: V_WIDTH + 100 + i * 280,
        gapY: Math.floor(Math.random() * 180) + 140,
        scored: false
      });
    }
  }

  // ==========================================================================
  //  SECTION 3: CHROME DINO (T-REX RUNNER) CONSTANTS & STATE
  // ==========================================================================
  const DINO_FLOOR_Y = 460;
  const DINO_X = 140;
  const DINO_W = 48;
  const DINO_H = 56;
  const DINO_BASE_SPEED = 420;

  const DINO_STATE = { MENU: 0, PLAYING: 1, DEAD: 2 };
  let dinoGameState = DINO_STATE.MENU;

  let dino = {
    y: DINO_FLOOR_Y - DINO_H,
    vy: 0,
    onGround: true,
    stepTimer: 0
  };

  const DINO_GRAVITY = 1850;
  const DINO_JUMP_FORCE = -820;

  let dinoObstacles = [];
  let dinoSpeed = DINO_BASE_SPEED;
  let dinoScore = 0;
  let dinoBestScore = parseInt(localStorage.getItem('dino_best') || '0', 10);
  let dinoScoreAcc = 0;
  let dinoGroundScroll = 0;

  function initDinoObstacles() {
    dinoObstacles = [];
    for (let i = 0; i < 3; i++) {
      let type = 'small_cactus';
      let w = 24, h = 42, y = DINO_FLOOR_Y - 42;

      // Generous first spacing: first cactus starts far ahead with ample reaction time
      const startX = (i === 0) 
        ? (V_WIDTH + 240) 
        : (dinoObstacles[i - 1].x + 420);

      // First obstacles are always clean single small cacti
      if (i > 1) {
        const typeRand = Math.random();
        if (typeRand < 0.5) {
          type = 'small_cactus'; w = 24; h = 42; y = DINO_FLOOR_Y - 42;
        } else {
          type = 'double_cactus'; w = 46; h = 42; y = DINO_FLOOR_Y - 42;
        }
      }

      dinoObstacles.push({
        x: startX,
        y, w, h, type
      });
    }
  }

  // ==========================================================================
  //  SECTION 4: STATS & UI MANAGEMENT
  // ==========================================================================
  function updateHUD() {
    if (activeGame === 'face') {
      gameTitleHeading.innerHTML = 'Companion Pet 😊 <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Mood';
      let moodStr = 'Curious';
      if (faceMood === FACE_MOOD.SLEEPY) moodStr = 'Zzz...';
      else if (faceMood === FACE_MOOD.HAPPY_SQUINT) moodStr = 'Happy ^_^';
      else if (faceMood === FACE_MOOD.BLUSH) moodStr = 'Blushing ✦';
      else if (faceMood === FACE_MOOD.WINK) moodStr = 'Winking ;)';
      else if (faceMood === FACE_MOOD.LOVE_OVERLOAD) moodStr = 'LOVE OVERLOAD ♥';
      else if (faceMood === FACE_MOOD.AFTERGLOW) moodStr = 'Dreamy ~';
      statVal1.textContent = moodStr;
      statLabel2.textContent = 'Pat Streak';
      statVal2.textContent = petStreak > 0 ? (petStreak + ' ♥') : 'Tap/Hold';

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';
      gameOverlay.classList.add('hidden');
    } else if (activeGame === 'geodash') {
      gameTitleHeading.innerHTML = 'Geometry Dash ⚡ <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Attempts';
      statVal1.textContent = gdAttempts;
      statLabel2.textContent = 'Best';
      statVal2.textContent = gdBestPercent + '%';

      progressContainer.style.display = 'flex';
      togglePracticeBtn.style.display = 'inline-flex';
      customizerDeck.style.display = 'block';

      overlayProgressVal.textContent = gdCurrentPercent + '%';
      overlayBestVal.textContent = gdBestPercent + '%';
    } else if (activeGame === 'flappy') {
      gameTitleHeading.innerHTML = 'Flappy Bird 🐥 <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Score';
      statVal1.textContent = fbScore;
      statLabel2.textContent = 'Best';
      statVal2.textContent = fbBestScore;

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';

      overlayProgressVal.textContent = fbScore;
      overlayBestVal.textContent = fbBestScore;
    } else if (activeGame === 'dino') {
      gameTitleHeading.innerHTML = 'Chrome Dino 🦖 <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Score';
      statVal1.textContent = dinoScore;
      statLabel2.textContent = 'High Score';
      statVal2.textContent = dinoBestScore;

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';

      overlayProgressVal.textContent = dinoScore;
      overlayBestVal.textContent = dinoBestScore;
    } else if (activeGame === 'car') {
      gameTitleHeading.innerHTML = 'Car Racing 🏎️ <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Distance';
      statVal1.textContent = carDistance + 'M';
      statLabel2.textContent = 'Best';
      statVal2.textContent = (carBestScore * 2) + 'M';

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';

      overlayProgressVal.textContent = carDistance + 'M';
      overlayBestVal.textContent = (carBestScore * 2) + 'M';
    } else if (activeGame === 'snake') {
      gameTitleHeading.innerHTML = 'Retro Snake 🐍 <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Length / Pts';
      statVal1.textContent = snakeLength + ' (' + snakeScore + ')';
      statLabel2.textContent = 'High Score';
      statVal2.textContent = snakeBestScore;

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';

      overlayProgressVal.textContent = snakeScore;
      overlayBestVal.textContent = snakeBestScore;
    } else if (activeGame === 'invaders') {
      gameTitleHeading.innerHTML = 'Space Invaders 👾 <span class="badge" id="activeGameBadge">ESP32 + WEB</span>';
      statLabel1.textContent = 'Score';
      statVal1.textContent = invScore;
      statLabel2.textContent = 'Wave / Best';
      statVal2.textContent = 'W' + invWave + ' • ' + invBestScore;

      progressContainer.style.display = 'none';
      togglePracticeBtn.style.display = 'none';
      customizerDeck.style.display = 'none';

      overlayProgressVal.textContent = invScore;
      overlayBestVal.textContent = invBestScore;
    }
  }
  updateHUD();

  function saveStats() {
    if (activeGame === 'geodash') {
      localStorage.setItem('gd_attempts', gdAttempts.toString());
      localStorage.setItem('gd_best', gdBestPercent.toString());
    } else if (activeGame === 'flappy') {
      localStorage.setItem('fb_best', fbBestScore.toString());
    } else if (activeGame === 'dino') {
      localStorage.setItem('dino_best', dinoBestScore.toString());
    } else if (activeGame === 'car') {
      localStorage.setItem('car_best', carBestScore.toString());
    } else if (activeGame === 'snake') {
      localStorage.setItem('snake_best', snakeBestScore.toString());
    } else if (activeGame === 'invaders') {
      localStorage.setItem('invaders_best', invBestScore.toString());
    }
    updateHUD();
  }

  function switchActiveGame() {
    sound().ensureContext();
    sound().playSwitch();
    sound().stopMusic();

    const curIdx = GAME_LIST.indexOf(activeGame);
    const nextIdx = (curIdx + 1) % GAME_LIST.length;
    selectGameFromMenu(GAME_LIST[nextIdx]);
  }

  // --- SYSTEM HUB MENU CONTROLLER ---
  function toggleSystemMenu(forceOpen) {
    sound().ensureContext();
    if (typeof forceOpen === 'boolean') {
      isSystemMenuOpen = forceOpen;
    } else {
      isSystemMenuOpen = !isSystemMenuOpen;
    }

    if (isSystemMenuOpen) {
      sound().playMenuOpen();
      systemMenuSelection = GAME_LIST.indexOf(activeGame);
      if (systemMenuSelection < 0) systemMenuSelection = 0;
      updateMenuUI();
      systemMenuOverlay.classList.remove('hidden');
    } else {
      systemMenuOverlay.classList.add('hidden');
    }
  }

  function updateMenuUI() {
    const items = systemMenuOptions.querySelectorAll('.hub-option');
    items.forEach((item, idx) => {
      item.classList.toggle('active', idx === systemMenuSelection);
    });
  }

  function selectGameFromMenu(gameId) {
    sound().ensureContext();
    sound().playMenuConfirm();
    sound().stopMusic();

    activeGame = gameId;
    isSystemMenuOpen = false;
    systemMenuOverlay.classList.add('hidden');

    if (activeGame === 'face') {
      faceMood = FACE_MOOD.NORMAL;
      faceLastInteract = performance.now();
      gameOverlay.classList.add('hidden');
    } else if (activeGame === 'geodash') {
      startGDGame();
    } else if (activeGame === 'flappy') {
      startFBGame();
    } else if (activeGame === 'dino') {
      startDinoGame();
    } else if (activeGame === 'car') {
      startCarGame();
    } else if (activeGame === 'snake') {
      startSnakeGame();
    } else if (activeGame === 'invaders') {
      startInvadersGame();
    }
    updateHUD();
  }

  toggleGameBtn.addEventListener('click', switchActiveGame);
  overlaySwitchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    switchActiveGame();
  });

  if (openMenuBtn) {
    openMenuBtn.addEventListener('click', () => toggleSystemMenu());
  }

  // Allow clicking and hovering directly on each hub option
  document.querySelectorAll('.hub-option').forEach((opt, idx) => {
    opt.addEventListener('click', () => {
      systemMenuSelection = idx;
      updateMenuUI();
      selectGameFromMenu(opt.dataset.game);
    });
    opt.addEventListener('mouseenter', () => {
      systemMenuSelection = idx;
      updateMenuUI();
    });
  });

  if (systemMenuOverlay) {
    systemMenuOverlay.addEventListener('click', (e) => {
      if (e.target === systemMenuOverlay) {
        toggleSystemMenu(false);
      }
    });
  }

  // ==========================================================================
  //  SECTION 5: GEOMETRY DASH LOGIC
  // ==========================================================================
  function startGDGame() {
    sound().ensureContext();
    sound().startMusic();

    if (isPracticeMode && checkpoints.length > 0) {
      const cp = checkpoints[checkpoints.length - 1];
      gdCameraX = cp.cameraX;
      gdPlayer.y = cp.playerY;
      gdPlayer.vy = cp.playerVy;
      gdPlayerMode = cp.playerMode;
      gdPlayer.angle = 0;
      gdPlayer.isOnGround = false;
      gdCurrentPercent = cp.percent;
    } else {
      gdCameraX = 0;
      gdPlayer.y = GD_FLOOR_Y - GD_CUBE_SIZE;
      gdPlayer.vy = 0;
      gdPlayer.angle = 0;
      gdPlayer.isOnGround = true;
      gdPlayerMode = 'cube';
      gdCurrentPercent = 0;
    }

    particles = [];
    trailParticles = [];
    confetti = [];
    screenShake = 0;
    gdGameState = GD_STATE.PLAYING;
    gameOverlay.classList.add('hidden');
  }

  function triggerGDDeath() {
    if (gdGameState !== GD_STATE.PLAYING) return;

    sound().playCrash();
    sound().stopMusic();

    gdGameState = GD_STATE.DEAD;
    screenShake = 18;

    spawnGDDeathExplosion(GD_PLAYER_SCREEN_X + GD_CUBE_SIZE / 2, gdPlayer.y + GD_CUBE_SIZE / 2);

    gdAttempts++;
    if (gdCurrentPercent > gdBestPercent) {
      gdBestPercent = gdCurrentPercent;
    }
    saveStats();

    if (isPracticeMode && checkpoints.length > 0) {
      setTimeout(() => startGDGame(), 500);
      return;
    }

    overlayTitle.textContent = 'CRASHED!';
    overlayTitle.className = 'overlay-title crashed';
    overlaySubtitle.textContent = `${gdCurrentPercent}% COMPLETE • ATTEMPT ${gdAttempts}`;
    overlayActionBtn.innerHTML = '<span>⚡ RETRY (SPACE)</span>';
    gameOverlay.classList.remove('hidden');
  }

  function triggerGDVictory() {
    if (gdGameState !== GD_STATE.PLAYING) return;

    sound().playVictory();
    sound().stopMusic();

    gdGameState = GD_STATE.VICTORY;
    gdBestPercent = 100;
    saveStats();

    spawnConfetti();

    overlayTitle.textContent = 'LEVEL COMPLETE!';
    overlayTitle.className = 'overlay-title victory';
    overlaySubtitle.textContent = `100% BEATEN IN ${gdAttempts} ATTEMPTS! GG!`;
    overlayActionBtn.innerHTML = '<span>🏆 PLAY AGAIN (SPACE)</span>';
    gameOverlay.classList.remove('hidden');
  }

  function spawnGDDeathExplosion(x, y) {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 450 + 100;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: Math.random() > 0.5 ? gdPlayer.color : '#ffffff',
        alpha: 1,
        life: Math.random() * 0.6 + 0.4
      });
    }
  }

  function spawnConfetti() {
    const colors = ['#00f0ff', '#ff0077', '#ffe600', '#00ff66', '#ffffff'];
    for (let i = 0; i < 100; i++) {
      confetti.push({
        x: Math.random() * V_WIDTH,
        y: -20,
        vx: (Math.random() - 0.5) * 150,
        vy: Math.random() * 250 + 150,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4
      });
    }
  }

  function checkGDCollision(px, py, pw, ph, obs) {
    if (px + pw - 6 < obs.x || px + 6 > obs.x + obs.w) return false;
    if (py + ph - 4 < obs.y || py + 4 > obs.y + obs.h) return false;

    if (obs.type === GD_OBS.SPIKE || obs.type === GD_OBS.DOUBLE_SPIKE || obs.type === GD_OBS.TRIPLE_SPIKE) {
      const playerCenterX = px + pw * 0.5;
      if (playerCenterX >= obs.x && playerCenterX <= obs.x + obs.w) {
        return (py + ph >= obs.y + 8);
      }
      return true;
    }
    if (obs.type === GD_OBS.CEIL_SPIKE) {
      return (py <= obs.y + obs.h - 8);
    }
    if (obs.type === GD_OBS.BLOCK) {
      const prevY = py - (gdPlayer.vy * 0.016);
      if (gdPlayer.vy >= 0 && prevY + ph <= obs.y + 12) {
        gdPlayer.y = obs.y - ph;
        gdPlayer.vy = 0;
        gdPlayer.isOnGround = true;
        return false;
      }
      return true;
    }
    return false;
  }

  function updateGD(dt) {
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 35);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 800 * dt;
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rotSpeed;
      if (c.y > V_HEIGHT + 20) confetti.splice(i, 1);
    }

    if (gdGameState !== GD_STATE.PLAYING) return;

    gdCameraX += GD_GAME_SPEED * dt;
    gdCurrentPercent = Math.min(100, Math.floor((gdCameraX / GD_LEVEL_FINISH_X) * 100));

    progressFill.style.width = gdCurrentPercent + '%';
    progressMarker.style.left = gdCurrentPercent + '%';
    progressVal.textContent = gdCurrentPercent + '%';

    if (jumpBufferTimer > 0) jumpBufferTimer -= dt * 1000;
    const wantJump = isJumpPressed || jumpBufferTimer > 0;

    if (gdPlayerMode === 'cube') {
      if (wantJump && gdPlayer.isOnGround) {
        gdPlayer.vy = GD_CUBE_JUMP_FORCE;
        gdPlayer.isOnGround = false;
        jumpBufferTimer = 0;
        sound().playJump();
      }

      gdPlayer.vy += GD_CUBE_GRAVITY * dt;
      gdPlayer.y += gdPlayer.vy * dt;

      if (!gdPlayer.isOnGround) {
        gdPlayer.angle += 420 * dt;
      } else {
        gdPlayer.angle = Math.round(gdPlayer.angle / 90) * 90;
      }

      if (gdPlayer.y >= GD_FLOOR_Y - GD_CUBE_SIZE) {
        gdPlayer.y = GD_FLOOR_Y - GD_CUBE_SIZE;
        gdPlayer.vy = 0;
        gdPlayer.isOnGround = true;
        gdPlayer.angle = Math.round(gdPlayer.angle / 90) * 90;
      } else {
        gdPlayer.isOnGround = false;
      }

      if (gdPlayer.isOnGround && Math.random() < 0.3) {
        trailParticles.push({
          x: GD_PLAYER_SCREEN_X,
          y: GD_FLOOR_Y - 4,
          vx: -150, vy: -30,
          size: 4, alpha: 0.8
        });
      }
    } else {
      if (isJumpPressed) {
        gdPlayer.vy += GD_SHIP_THRUST * dt;
      } else {
        gdPlayer.vy += GD_SHIP_GRAVITY * dt;
      }

      gdPlayer.vy = Math.max(-GD_SHIP_MAX_VY, Math.min(GD_SHIP_MAX_VY, gdPlayer.vy));
      gdPlayer.y += gdPlayer.vy * dt;
      gdPlayer.angle = (gdPlayer.vy / GD_SHIP_MAX_VY) * 28;

      if (isJumpPressed || Math.random() < 0.6) {
        trailParticles.push({
          x: GD_PLAYER_SCREEN_X - 10,
          y: gdPlayer.y + GD_CUBE_SIZE / 2 + (Math.random() - 0.5) * 8,
          vx: -350 - Math.random() * 100,
          vy: (Math.random() - 0.5) * 50,
          size: Math.random() * 6 + 3,
          alpha: 1,
          color: isJumpPressed ? '#ffe600' : '#ff7700'
        });
      }

      if (gdPlayer.y <= GD_CEILING_Y) {
        gdPlayer.y = GD_CEILING_Y;
        gdPlayer.vy = 50;
      }
      if (gdPlayer.y >= GD_FLOOR_Y - GD_CUBE_SIZE) {
        triggerGDDeath();
        return;
      }
    }

    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const tp = trailParticles[i];
      tp.x += tp.vx * dt;
      tp.y += tp.vy * dt;
      tp.alpha -= dt * 2.5;
      if (tp.alpha <= 0) trailParticles.splice(i, 1);
    }

    const worldPlayerX = gdCameraX + GD_PLAYER_SCREEN_X;

    for (let i = 0; i < GD_LEVEL_TRACK.length; i++) {
      const obs = GD_LEVEL_TRACK[i];
      if (obs.x + obs.w < gdCameraX - 100) continue;
      if (obs.x > gdCameraX + V_WIDTH + 100) break;

      if (obs.type === GD_OBS.PAD_JUMP) {
        if (worldPlayerX + GD_CUBE_SIZE > obs.x && worldPlayerX < obs.x + obs.w) {
          if (gdPlayer.y + GD_CUBE_SIZE >= obs.y && gdPlayer.y + GD_CUBE_SIZE <= obs.y + 24) {
            gdPlayer.vy = GD_CUBE_JUMP_FORCE * 1.35;
            gdPlayer.isOnGround = false;
            sound().playPad();
          }
        }
      } else if (obs.type === GD_OBS.ORB_JUMP) {
        if (wantJump) {
          const dx = (worldPlayerX + GD_CUBE_SIZE / 2) - (obs.x + obs.w / 2);
          const dy = (gdPlayer.y + GD_CUBE_SIZE / 2) - (obs.y + obs.h / 2);
          if (Math.hypot(dx, dy) < 48) {
            gdPlayer.vy = GD_CUBE_JUMP_FORCE * 1.15;
            gdPlayer.isOnGround = false;
            jumpBufferTimer = 0;
            sound().playOrb();
          }
        }
      } else if (obs.type === GD_OBS.PORTAL_SHIP) {
        if (worldPlayerX + GD_CUBE_SIZE >= obs.x && gdPlayerMode !== 'ship') {
          gdPlayerMode = 'ship';
          sound().playPortal();
        }
      } else if (obs.type === GD_OBS.PORTAL_CUBE) {
        if (worldPlayerX + GD_CUBE_SIZE >= obs.x && gdPlayerMode !== 'cube') {
          gdPlayerMode = 'cube';
          gdPlayer.angle = 0;
          sound().playPortal();
        }
      } else if (obs.type === GD_OBS.FINISH) {
        if (worldPlayerX >= obs.x) {
          triggerGDVictory();
          return;
        }
      } else {
        if (checkGDCollision(worldPlayerX, gdPlayer.y, GD_CUBE_SIZE, GD_CUBE_SIZE, obs)) {
          triggerGDDeath();
          return;
        }
      }
    }
  }

  // ==========================================================================
  //  SECTION 6: FLAPPY BIRD LOGIC
  // ==========================================================================
  function startFBGame() {
    sound().ensureContext();
    sound().playFlap();

    fbBird.y = 200;
    fbBird.vy = FB_FLAP_IMPULSE;
    fbBird.pitch = -25;
    fbScore = 0;
    initFBPipes();

    fbGameState = FB_STATE.PLAYING;
    gameOverlay.classList.add('hidden');
    updateHUD();
  }

  function triggerFBDeath() {
    if (fbGameState !== FB_STATE.PLAYING) return;

    sound().playHit();
    setTimeout(() => sound().playDie(), 120);

    fbGameState = FB_STATE.DEAD;
    screenShake = 14;

    if (fbScore > fbBestScore) {
      fbBestScore = fbScore;
    }
    saveStats();

    overlayTitle.textContent = 'GAME OVER';
    overlayTitle.className = 'overlay-title crashed';
    overlaySubtitle.textContent = `SCORE: ${fbScore} • BEST: ${fbBestScore}`;
    overlayActionBtn.innerHTML = '<span>🐥 RETRY (SPACE)</span>';
    overlaySwitchBtn.innerHTML = '<span>🦖 SWITCH TO CHROME DINO</span>';
    gameOverlay.classList.remove('hidden');
  }

  function updateFB(dt) {
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 35);
    fbGroundScroll += FB_PIPE_SPEED * dt;

    if (fbGameState !== FB_STATE.PLAYING) return;

    fbBird.vy += FB_GRAVITY * dt;
    fbBird.y += fbBird.vy * dt;

    if (fbBird.vy < 0) {
      fbBird.pitch = -22;
    } else {
      fbBird.pitch = Math.min(70, fbBird.pitch + 160 * dt);
    }

    if (fbBird.y <= FB_CEILING_Y) {
      fbBird.y = FB_CEILING_Y;
      fbBird.vy = 40;
    }
    if (fbBird.y + FB_BIRD_SIZE >= FB_FLOOR_Y) {
      fbBird.y = FB_FLOOR_Y - FB_BIRD_SIZE;
      triggerFBDeath();
      return;
    }

    for (let i = 0; i < fbPipes.length; i++) {
      const pipe = fbPipes[i];
      pipe.x -= FB_PIPE_SPEED * dt;

      if (!pipe.scored && (pipe.x + FB_PIPE_WIDTH < FB_BIRD_X)) {
        pipe.scored = true;
        fbScore++;
        sound().playScore();
        updateHUD();
      }

      if (pipe.x + FB_PIPE_WIDTH < -50) {
        let maxX = 0;
        for (let j = 0; j < fbPipes.length; j++) {
          if (fbPipes[j].x > maxX) maxX = fbPipes[j].x;
        }
        pipe.x = maxX + 280;
        pipe.gapY = Math.floor(Math.random() * 180) + 140;
        pipe.scored = false;
      }

      const bx = FB_BIRD_X + 4;
      const by = fbBird.y + 4;
      const bw = FB_BIRD_SIZE - 8;
      const bh = FB_BIRD_SIZE - 8;

      if (bx + bw > pipe.x && bx < pipe.x + FB_PIPE_WIDTH) {
        const topH = pipe.gapY - (FB_PIPE_GAP / 2);
        const botY = pipe.gapY + (FB_PIPE_GAP / 2);

        if (by < topH || by + bh > botY) {
          triggerFBDeath();
          return;
        }
      }
    }
  }

  // ==========================================================================
  //  SECTION 7: CHROME DINO (T-REX RUNNER) LOGIC
  // ==========================================================================
  function startDinoGame() {
    sound().ensureContext();

    dino.y = DINO_FLOOR_Y - DINO_H;
    dino.vy = 0;
    dino.onGround = true;
    dinoSpeed = DINO_BASE_SPEED;
    dinoScore = 0;
    dinoScoreAcc = 0;
    dinoGroundScroll = 0;
    initDinoObstacles();

    dinoGameState = DINO_STATE.PLAYING;
    gameOverlay.classList.add('hidden');
    updateHUD();
  }

  function triggerDinoDeath() {
    if (dinoGameState !== DINO_STATE.PLAYING) return;

    sound().playDinoHit();
    dinoGameState = DINO_STATE.DEAD;
    screenShake = 14;

    if (dinoScore > dinoBestScore) {
      dinoBestScore = dinoScore;
    }
    saveStats();

    overlayTitle.textContent = 'GAME OVER';
    overlayTitle.className = 'overlay-title crashed';
    overlaySubtitle.textContent = `SCORE: ${dinoScore} • HI SCORE: ${dinoBestScore}`;
    overlayActionBtn.innerHTML = '<span>🦖 RETRY (SPACE)</span>';
    overlaySwitchBtn.innerHTML = '<span>⚡ SWITCH TO GEOMETRY DASH</span>';
    gameOverlay.classList.remove('hidden');
  }

  function updateDino(dt) {
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 35);
    dinoGroundScroll += dinoSpeed * dt;

    if (dinoGameState !== DINO_STATE.PLAYING) return;

    // Gravity
    dino.vy += DINO_GRAVITY * dt;
    dino.y += dino.vy * dt;

    if (dino.y >= DINO_FLOOR_Y - DINO_H) {
      dino.y = DINO_FLOOR_Y - DINO_H;
      dino.vy = 0;
      dino.onGround = true;
    }

    // Score accumulation
    dinoScoreAcc += dinoSpeed * dt * 0.10;
    const prevScore = dinoScore;
    dinoScore = Math.floor(dinoScoreAcc);

    if (dinoScore > 0 && Math.floor(dinoScore / 100) > Math.floor(prevScore / 100)) {
      sound().playDinoMilestone();
      dinoSpeed = Math.min(750, dinoSpeed + 20);
    }
    updateHUD();

    // Obstacles
    for (let i = 0; i < dinoObstacles.length; i++) {
      const obs = dinoObstacles[i];
      obs.x -= dinoSpeed * dt;

      // Wrap around with generous spacing
      if (obs.x + obs.w < -60) {
        let maxX = V_WIDTH;
        for (let j = 0; j < dinoObstacles.length; j++) {
          if (dinoObstacles[j].x > maxX) maxX = dinoObstacles[j].x;
        }
        obs.x = maxX + Math.random() * 180 + 380;

        // Progressive difficulty based on score
        if (dinoScore < 60) {
          obs.type = 'small_cactus'; obs.w = 24; obs.h = 42; obs.y = DINO_FLOOR_Y - 42;
        } else if (dinoScore < 150) {
          const r = Math.random();
          if (r < 0.6) {
            obs.type = 'small_cactus'; obs.w = 24; obs.h = 42; obs.y = DINO_FLOOR_Y - 42;
          } else {
            obs.type = 'double_cactus'; obs.w = 46; obs.h = 42; obs.y = DINO_FLOOR_Y - 42;
          }
        } else {
          const r = Math.random();
          if (r < 0.4) {
            obs.type = 'small_cactus'; obs.w = 24; obs.h = 42; obs.y = DINO_FLOOR_Y - 42;
          } else if (r < 0.7) {
            obs.type = 'double_cactus'; obs.w = 46; obs.h = 42; obs.y = DINO_FLOOR_Y - 42;
          } else if (r < 0.88) {
            obs.type = 'large_cactus'; obs.w = 30; obs.h = 56; obs.y = DINO_FLOOR_Y - 56;
          } else {
            obs.type = 'bird'; obs.w = 44; obs.h = 28; obs.y = DINO_FLOOR_Y - (Math.random() > 0.5 ? 55 : 85);
          }
        }
      }

      // Hitbox Check (Generous inner margins matching visual sprites)
      const dx = DINO_X + 10;
      const dy = dino.y + 8;
      const dw = DINO_W - 20;
      const dh = DINO_H - 12;

      const ox = obs.x + 6;
      const oy = obs.y + 4;
      const ow = obs.w - 12;
      const oh = obs.h - 4;

      if (dx + dw > ox && dx < ox + ow) {
        if (dy + dh > oy && dy < oy + oh) {
          triggerDinoDeath();
          return;
        }
      }
    }
  }

  // ==========================================================================
  //  SECTION 4: CAR RACING (HIGHWAY OVERTAKE) ENGINE LOGIC
  // ==========================================================================
  const CAR_LANE_Y = [160, 270, 380];
  const CAR_PLAYER_X = 120;
  const CAR_PLAYER_W = 72;
  const CAR_PLAYER_H = 34;

  let carState = 'READY'; // 'READY' | 'PLAYING' | 'DEAD'
  let carPlayerLane = 1;  // 0: Top, 1: Mid, 2: Bot
  let carLaneDir = -1;    // -1 = steer up, +1 = steer down
  let carPlayerY = CAR_LANE_Y[1];
  let carRoadSpeed = 380;
  let carRoadScroll = 0;
  let carDistance = 0;
  let carScore = 0;
  let carBestScore = parseInt(localStorage.getItem('car_best') || '0', 10);
  let carScoreAcc = 0;
  let carNitroTimer = 0;
  let carTraffic = [];
  let carParticles = [];
  let carSmokeTimer = 0;

  function initCarTraffic() {
    carTraffic = [];
    for (let i = 0; i < 3; i++) {
      const type = (i === 1) ? 'truck' : 'car';
      carTraffic.push({
        x: V_WIDTH + 100 + i * 320,
        lane: (i === 0) ? 0 : ((i === 1) ? 2 : 1),
        type: type,
        w: (type === 'truck') ? 112 : 64,
        h: (type === 'truck') ? 34 : 28,
        speed: carRoadSpeed * 0.4,
        passed: false
      });
    }
  }

  function startCarGame() {
    sound().ensureContext();
    carPlayerLane = 1;
    carLaneDir = -1;
    carPlayerY = CAR_LANE_Y[1];
    carRoadSpeed = 380;
    carRoadScroll = 0;
    carDistance = 0;
    carScore = 0;
    carScoreAcc = 0;
    carNitroTimer = 0;
    carParticles = [];
    initCarTraffic();
    carState = 'PLAYING';
    gameOverlay.classList.add('hidden');
    updateHUD();
  }

  function steerCar(dir) {
    if (carState !== 'PLAYING') return;
    if (dir === -1 || dir === 1) {
      carPlayerLane = Math.max(0, Math.min(2, carPlayerLane + dir));
    } else {
      // Toggle lane on single action button click (Top -> Mid -> Bot -> Mid)
      if (carLaneDir === -1) {
        carPlayerLane--;
        if (carPlayerLane <= 0) { carPlayerLane = 0; carLaneDir = 1; }
      } else {
        carPlayerLane++;
        if (carPlayerLane >= 2) { carPlayerLane = 2; carLaneDir = -1; }
      }
    }
    sound().playCarSwerve();
    // Spawn swerve tire smoke
    for (let i = 0; i < 6; i++) {
      carParticles.push({
        x: CAR_PLAYER_X,
        y: carPlayerY + 16 + (Math.random() - 0.5) * 12,
        vx: -(80 + Math.random() * 80),
        vy: (Math.random() - 0.5) * 40,
        color: 'rgba(200, 240, 255, 0.65)',
        size: 8 + Math.random() * 6,
        life: 0.25
      });
    }
  }

  function triggerCarWreck() {
    sound().playCarCrash();
    carState = 'DEAD';
    screenShake = 16;

    // Spawn wreckage fire & spark particles
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 240;
      carParticles.push({
        x: CAR_PLAYER_X + CAR_PLAYER_W / 2,
        y: carPlayerY + CAR_PLAYER_H / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() > 0.4 ? '#ff7700' : '#ffe600',
        size: 6 + Math.random() * 8,
        life: 0.55 + Math.random() * 0.35
      });
    }

    if (carScore > carBestScore) {
      carBestScore = carScore;
      saveStats();
    }

    overlayTitle.textContent = 'WRECKED!';
    overlaySubtitle.textContent = 'PRESS SPACE / CLICK TO RETRY';
    overlayStatLabel1.textContent = 'Distance (Meters)';
    overlayProgressVal.textContent = carDistance + 'M';
    overlayBestVal.textContent = (carBestScore * 2) + 'M';
    overlayActionBtn.innerHTML = '<span>⚡ RETRY RACE (SPACE)</span>';
    gameOverlay.classList.remove('hidden');
    updateHUD();
  }

  function updateCar(dt) {
    // Update car particles
    for (let i = carParticles.length - 1; i >= 0; i--) {
      const p = carParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) carParticles.splice(i, 1);
    }

    if (carState !== 'PLAYING') return;

    const isNitro = carNitroTimer > 0;
    if (isNitro) carNitroTimer -= dt;

    const effectiveSpeed = isNitro ? (carRoadSpeed * 1.55) : carRoadSpeed;
    carRoadScroll += effectiveSpeed * dt;

    // Distance and score
    carScoreAcc += (effectiveSpeed * dt * 0.3);
    carScore = Math.floor(carScoreAcc);
    carDistance = carScore * 2;

    // Progressive speed increase
    if (carRoadSpeed < 820) {
      carRoadSpeed += dt * 14;
    }

    // Smooth lane interpolation
    const targetY = CAR_LANE_Y[carPlayerLane];
    carPlayerY += (targetY - carPlayerY) * Math.min(1, dt * 14);

    // Exhaust flame / smoke emission
    carSmokeTimer += dt;
    if (carSmokeTimer > (isNitro ? 0.03 : 0.08)) {
      carSmokeTimer = 0;
      carParticles.push({
        x: CAR_PLAYER_X - 10,
        y: carPlayerY + CAR_PLAYER_H / 2 + (Math.random() - 0.5) * 8,
        vx: -(120 + Math.random() * 80),
        vy: (Math.random() - 0.5) * 30,
        color: isNitro ? '#00f0ff' : '#ff7700',
        size: isNitro ? 10 : 6,
        life: isNitro ? 0.28 : 0.18
      });
    }

    // Traffic update and collisions
    for (let i = 0; i < carTraffic.length; i++) {
      const v = carTraffic[i];
      const relSpeed = effectiveSpeed - v.speed;
      v.x -= relSpeed * dt;

      // Overtake scoring
      if (!v.passed && (v.x + v.w < CAR_PLAYER_X)) {
        v.passed = true;
        if (v.type === 'car' || v.type === 'truck') {
          carScoreAcc += 30;
          sound().playCarPass();
        }
      }

      // Recycle offscreen traffic
      if (v.x + v.w < -60) {
        let maxX = V_WIDTH;
        for (let j = 0; j < carTraffic.length; j++) {
          if (carTraffic[j].x > maxX) maxX = carTraffic[j].x;
        }
        v.x = maxX + Math.floor(Math.random() * 160) + 260;
        
        // Pick fair lane
        const prevLane = carTraffic[(i === 0) ? 2 : (i - 1)].lane;
        v.lane = (prevLane + Math.floor(Math.random() * 2) + 1) % 3;

        // Randomize vehicle or pickup type
        const roll = Math.random();
        if (roll < 0.5) {
          v.type = 'car';
          v.w = 64; v.h = 28;
          v.speed = carRoadSpeed * 0.42;
        } else if (roll < 0.78) {
          v.type = 'truck';
          v.w = 112; v.h = 34;
          v.speed = carRoadSpeed * 0.35;
        } else if (roll < 0.89) {
          v.type = 'nitro';
          v.w = 32; v.h = 32;
          v.speed = 0;
        } else {
          v.type = 'coin';
          v.w = 28; v.h = 28;
          v.speed = 0;
        }
        v.passed = false;
      }

      // Collision detection (AABB)
      const obsY = CAR_LANE_Y[v.lane];
      if (CAR_PLAYER_X + CAR_PLAYER_W - 8 >= v.x &&
          CAR_PLAYER_X + 8 <= v.x + v.w &&
          carPlayerY + CAR_PLAYER_H - 6 >= obsY &&
          carPlayerY + 6 <= obsY + v.h) {

        if (v.type === 'coin') {
          carScoreAcc += 100;
          sound().playCarCoin();
          v.x = -100;
          updateHUD();
        } else if (v.type === 'nitro') {
          carNitroTimer = 3.5;
          sound().playCarNitro();
          v.x = -100;
          updateHUD();
        } else {
          if (isNitro) {
            // Smashed through in Nitro mode!
            carScoreAcc += 150;
            sound().playCarCrash();
            screenShake = 10;
            for (let k = 0; k < 16; k++) {
              carParticles.push({
                x: v.x + v.w / 2,
                y: obsY + v.h / 2,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                color: '#ff0077',
                size: 8,
                life: 0.35
              });
            }
            v.x = -100;
          } else {
            triggerCarWreck();
            return;
          }
        }
      }
    }
  }

  // ==========================================================================
  //  SECTION 5: RETRO SNAKE ENGINE LOGIC
  // ==========================================================================
  const SNAKE_COLS = 28;
  const SNAKE_ROWS = 16;
  const SNAKE_CELL = 30;
  const SNAKE_ARENA_X = 60;
  const SNAKE_ARENA_Y = 30;

  let snakeState = 'READY'; // 'READY' | 'PLAYING' | 'DEAD'
  let snakeBody = [];
  let snakeDir = { x: 1, y: 0 };
  let snakeNextDir = { x: 1, y: 0 };
  let snakeFood = { x: 14, y: 8, isGolden: false, goldenTimer: 0 };
  let snakeScore = 0;
  let snakeLength = 4;
  let snakeBestScore = parseInt(localStorage.getItem('snake_best') || '0', 10);
  let snakeMoveTimer = 0;
  let snakeMoveInterval = 0.12;
  let snakeParticles = [];

  function spawnSnakeFood() {
    let valid = false;
    let fx = 0, fy = 0;
    while (!valid) {
      fx = Math.floor(Math.random() * SNAKE_COLS);
      fy = Math.floor(Math.random() * SNAKE_ROWS);
      valid = true;
      for (let i = 0; i < snakeBody.length; i++) {
        if (snakeBody[i].x === fx && snakeBody[i].y === fy) {
          valid = false;
          break;
        }
      }
    }
    const isGold = Math.random() < 0.22;
    snakeFood = {
      x: fx,
      y: fy,
      isGolden: isGold,
      goldenTimer: isGold ? 7.0 : 0
    };
  }

  function startSnakeGame() {
    sound().ensureContext();
    snakeBody = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
      { x: 5, y: 8 }
    ];
    snakeDir = { x: 1, y: 0 };
    snakeNextDir = { x: 1, y: 0 };
    snakeScore = 0;
    snakeLength = 4;
    snakeMoveTimer = 0;
    snakeMoveInterval = 0.12;
    snakeParticles = [];
    spawnSnakeFood();
    snakeState = 'PLAYING';
    gameOverlay.classList.add('hidden');
    updateHUD();
  }

  function turnSnakeClockwise() {
    if (snakeState !== 'PLAYING') return;
    if (snakeDir.x === 1 && snakeDir.y === 0) setSnakeDir(0, 1);
    else if (snakeDir.x === 0 && snakeDir.y === 1) setSnakeDir(-1, 0);
    else if (snakeDir.x === -1 && snakeDir.y === 0) setSnakeDir(0, -1);
    else if (snakeDir.x === 0 && snakeDir.y === -1) setSnakeDir(1, 0);
  }

  function setSnakeDir(dx, dy) {
    if (snakeState !== 'PLAYING') return;
    // Disallow 180-degree reversing
    if (dx !== 0 && snakeDir.x === -dx) return;
    if (dy !== 0 && snakeDir.y === -dy) return;
    snakeNextDir = { x: dx, y: dy };
    sound().playSnakeTurn();
  }

  function triggerSnakeDeath() {
    sound().playSnakeDie();
    snakeState = 'DEAD';
    screenShake = 12;

    if (snakeScore > snakeBestScore) {
      snakeBestScore = snakeScore;
      saveStats();
    }

    overlayTitle.textContent = 'GAME OVER';
    overlaySubtitle.textContent = 'PRESS SPACE / CLICK TO PLAY AGAIN';
    overlayStatLabel1.textContent = 'Final Score';
    overlayProgressVal.textContent = snakeScore;
    overlayBestVal.textContent = snakeBestScore;
    overlayActionBtn.innerHTML = '<span>⚡ PLAY AGAIN (SPACE)</span>';
    gameOverlay.classList.remove('hidden');
    updateHUD();
  }

  function updateSnake(dt) {
    // Update snake particles
    for (let i = snakeParticles.length - 1; i >= 0; i--) {
      const p = snakeParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) snakeParticles.splice(i, 1);
    }

    if (snakeState !== 'PLAYING') return;

    if (snakeFood.isGolden) {
      snakeFood.goldenTimer -= dt;
      if (snakeFood.goldenTimer <= 0) {
        spawnSnakeFood();
      }
    }

    snakeMoveTimer += dt;
    if (snakeMoveTimer >= snakeMoveInterval) {
      snakeMoveTimer = 0;
      snakeDir = { ...snakeNextDir };

      const head = snakeBody[0];
      const newHead = { x: head.x + snakeDir.x, y: head.y + snakeDir.y };

      // Wall collision checks
      if (newHead.x < 0 || newHead.x >= SNAKE_COLS || newHead.y < 0 || newHead.y >= SNAKE_ROWS) {
        triggerSnakeDeath();
        return;
      }

      // Self collision checks
      for (let i = 0; i < snakeBody.length; i++) {
        if (snakeBody[i].x === newHead.x && snakeBody[i].y === newHead.y) {
          triggerSnakeDeath();
          return;
        }
      }

      snakeBody.unshift(newHead);

      // Check food consumption
      if (newHead.x === snakeFood.x && newHead.y === snakeFood.y) {
        sound().playSnakeEat();
        const pts = snakeFood.isGolden ? 50 : 10;
        snakeScore += pts;
        snakeLength = snakeBody.length;

        // Progressive speed ramp
        snakeMoveInterval = Math.max(0.065, 0.12 - (snakeLength * 0.0012));

        // Spawn sparkle burst
        const fx = SNAKE_ARENA_X + newHead.x * SNAKE_CELL + SNAKE_CELL / 2;
        const fy = SNAKE_ARENA_Y + newHead.y * SNAKE_CELL + SNAKE_CELL / 2;
        for (let k = 0; k < 12; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 120;
          snakeParticles.push({
            x: fx, y: fy,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: snakeFood.isGolden ? '#ffe600' : '#00ff66',
            size: 5 + Math.random() * 4,
            life: 0.35
          });
        }

        spawnSnakeFood();
        updateHUD();
      } else {
        snakeBody.pop();
      }
    }
  }

  // ==========================================================================
  //  SECTION 6: SPACE INVADERS ENGINE LOGIC
  // ==========================================================================
  const INV_COLS = 5;
  const INV_ROWS = 3;
  const INV_TOTAL = INV_COLS * INV_ROWS;

  let invState = 'READY'; // 'READY' | 'PLAYING' | 'DEAD' | 'VICTORY'
  let invAliens = [];
  let invFleetX = 140;
  let invFleetY = 60;
  let invFleetDir = 1;
  let invFleetStepTimer = 0;
  let invFleetStepInterval = 0.5;
  let invMarchStep = 0;

  let invPlayerX = V_WIDTH / 2;
  let invPlayerDir = 0;
  let invAutoDir = 1;
  let invPlayerSpeed = 450;
  let invPlayerLasers = [];
  let invAlienBombs = [];
  let invUfo = { x: -80, active: false, speed: 170, timer: 10, points: 150 };
  let invBunkers = [];
  let invLives = 3;
  let invScore = 0;
  let invBestScore = parseInt(localStorage.getItem('invaders_best') || '0', 10);
  let invWave = 1;
  let invExplosions = [];
  let invAlienAnimFrame = 0;
  let invBombTimer = 0;

  function initInvBunkers() {
    invBunkers = [];
    const bunkerXs = [200, 480, 760];
    for (let b = 0; b < 3; b++) {
      const bx = bunkerXs[b];
      const by = 410;
      const blocks = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (r === 2 && (c === 1 || c === 2)) continue; // bunker notch
          blocks.push({
            x: bx + c * 18 - 36,
            y: by + r * 14,
            w: 16,
            h: 12,
            hp: 3
          });
        }
      }
      invBunkers.push(blocks);
    }
  }

  function initInvFleet() {
    invAliens = [];
    for (let r = 0; r < INV_ROWS; r++) {
      for (let c = 0; c < INV_COLS; c++) {
        invAliens.push({
          row: r,
          col: c,
          alive: true,
          points: (r === 0) ? 30 : ((r === 1) ? 20 : 10),
          color: (r === 0) ? '#ff0077' : ((r === 1) ? '#00f0ff' : '#00ff66')
        });
      }
    }
    invFleetX = 140;
    invFleetY = 60 + (invWave - 1) * 14;
    invFleetDir = 1;
    invFleetStepInterval = Math.max(0.1, 0.52 - (invWave * 0.04));
    invFleetStepTimer = 0;
    invMarchStep = 0;
  }

  function startInvadersGame() {
    sound().ensureContext();
    invScore = 0;
    invLives = 3;
    invWave = 1;
    invPlayerX = V_WIDTH / 2;
    invPlayerLasers = [];
    invAlienBombs = [];
    invExplosions = [];
    invUfo = { x: -80, active: false, speed: 180, timer: 10, points: 150 };
    initInvFleet();
    initInvBunkers();
    invState = 'PLAYING';
    gameOverlay.classList.add('hidden');
    updateHUD();
  }

  function firePlayerLaser() {
    if (invState !== 'PLAYING') return;
    if (invPlayerLasers.length >= 2) return; // max 2 concurrent shots
    invPlayerLasers.push({
      x: invPlayerX,
      y: 472,
      vy: -680
    });
    sound().playInvadersShoot();
  }

  function triggerInvadersDeath() {
    sound().playPlayerExplode();
    invState = 'DEAD';
    screenShake = 16;

    if (invScore > invBestScore) {
      invBestScore = invScore;
      saveStats();
    }

    overlayTitle.textContent = 'ARMADA OVERRUN!';
    overlaySubtitle.textContent = 'PRESS SPACE / CLICK TO RETRY';
    overlayStatLabel1.textContent = 'Final Score';
    overlayProgressVal.textContent = invScore;
    overlayBestVal.textContent = invBestScore;
    overlayActionBtn.innerHTML = '<span>⚡ RETRY MISSION (SPACE)</span>';
    gameOverlay.classList.remove('hidden');
    updateHUD();
  }

  function updateInvaders(dt) {
    // Particle updates
    for (let i = invExplosions.length - 1; i >= 0; i--) {
      const p = invExplosions[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) invExplosions.splice(i, 1);
    }

    if (invState !== 'PLAYING') return;

    // Cannon movement: active arrow/WASD steering, or smooth auto-patrol if 1-button/touch
    if (invPlayerDir !== 0) {
      invPlayerX += invPlayerDir * invPlayerSpeed * dt;
    } else {
      invPlayerX += invAutoDir * (invPlayerSpeed * 0.42) * dt;
      if (invPlayerX >= V_WIDTH - 80) { invPlayerX = V_WIDTH - 80; invAutoDir = -1; }
      else if (invPlayerX <= 80) { invPlayerX = 80; invAutoDir = 1; }
    }
    invPlayerX = Math.max(60, Math.min(V_WIDTH - 60, invPlayerX));

    // Player lasers
    for (let i = invPlayerLasers.length - 1; i >= 0; i--) {
      const laser = invPlayerLasers[i];
      laser.y += laser.vy * dt;

      // Offscreen check
      if (laser.y < 20) {
        invPlayerLasers.splice(i, 1);
        continue;
      }

      let laserHit = false;

      // UFO hit check
      if (invUfo.active && Math.abs(laser.x - invUfo.x) < 32 && Math.abs(laser.y - 44) < 16) {
        sound().playInvadersHit();
        invScore += invUfo.points;
        invUfo.active = false;
        laserHit = true;
        // Explosion
        for (let k = 0; k < 18; k++) {
          const a = Math.random() * Math.PI * 2;
          invExplosions.push({
            x: invUfo.x, y: 44,
            vx: Math.cos(a) * (60 + Math.random() * 140),
            vy: Math.sin(a) * (60 + Math.random() * 140),
            color: '#ffe600', size: 6, life: 0.45
          });
        }
      }

      // Alien hit check
      if (!laserHit) {
        for (let a = 0; a < invAliens.length; a++) {
          const al = invAliens[a];
          if (!al.alive) continue;
          const ax = invFleetX + al.col * 110;
          const ay = invFleetY + al.row * 50;
          if (laser.x >= ax - 28 && laser.x <= ax + 28 && laser.y >= ay - 18 && laser.y <= ay + 18) {
            al.alive = false;
            laserHit = true;
            sound().playInvadersHit();
            invScore += al.points;

            // Alien explosion sparks
            for (let k = 0; k < 12; k++) {
              const ang = Math.random() * Math.PI * 2;
              invExplosions.push({
                x: ax, y: ay,
                vx: Math.cos(ang) * (40 + Math.random() * 120),
                vy: Math.sin(ang) * (40 + Math.random() * 120),
                color: al.color, size: 5, life: 0.35
              });
            }

            // Speed up fleet march as aliens fall!
            const aliveCount = invAliens.filter(x => x.alive).length;
            invFleetStepInterval = Math.max(0.08, 0.08 + (aliveCount / INV_TOTAL) * 0.42);

            // Wave clear check!
            if (aliveCount === 0) {
              invScore += 500; // Wave clear bonus
              invWave++;
              initInvFleet();
              initInvBunkers();
              sound().playPetHeart();
            }
            updateHUD();
            break;
          }
        }
      }

      // Bunker hit check
      if (!laserHit) {
        for (let b = 0; b < invBunkers.length; b++) {
          const blocks = invBunkers[b];
          for (let k = blocks.length - 1; k >= 0; k--) {
            const blk = blocks[k];
            if (laser.x >= blk.x && laser.x <= blk.x + blk.w &&
                laser.y >= blk.y && laser.y <= blk.y + blk.h) {
              blk.hp--;
              if (blk.hp <= 0) blocks.splice(k, 1);
              laserHit = true;
              break;
            }
          }
          if (laserHit) break;
        }
      }

      if (laserHit) {
        invPlayerLasers.splice(i, 1);
      }
    }

    // Alien fleet march
    invFleetStepTimer += dt;
    if (invFleetStepTimer >= invFleetStepInterval) {
      invFleetStepTimer = 0;
      invAlienAnimFrame = 1 - invAlienAnimFrame;

      // Find fleet boundaries among alive aliens
      let minCol = INV_COLS, maxCol = -1;
      let maxRow = -1;
      for (let a = 0; a < invAliens.length; a++) {
        if (invAliens[a].alive) {
          if (invAliens[a].col < minCol) minCol = invAliens[a].col;
          if (invAliens[a].col > maxCol) maxCol = invAliens[a].col;
          if (invAliens[a].row > maxRow) maxRow = invAliens[a].row;
        }
      }

      if (maxCol >= 0) {
        const leftEdge = invFleetX + minCol * 110 - 30;
        const rightEdge = invFleetX + maxCol * 110 + 30;

        if ((invFleetDir === 1 && rightEdge >= V_WIDTH - 60) ||
            (invFleetDir === -1 && leftEdge <= 60)) {
          invFleetDir *= -1;
          invFleetY += 24; // Drop down!

          // Check if fleet reached cannon line
          const bottomY = invFleetY + maxRow * 50;
          if (bottomY >= 450) {
            triggerInvadersDeath();
            return;
          }
        } else {
          invFleetX += invFleetDir * 24;
        }
      }

      sound().playInvadersStep(invMarchStep++);
    }

    // Alien bomb drops
    invBombTimer += dt;
    if (invBombTimer > (0.9 - Math.min(0.5, invWave * 0.08))) {
      invBombTimer = 0;
      const aliveAliens = invAliens.filter(a => a.alive);
      if (aliveAliens.length > 0) {
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        invAlienBombs.push({
          x: invFleetX + shooter.col * 110,
          y: invFleetY + shooter.row * 50 + 16,
          vy: 280 + Math.random() * 80
        });
      }
    }

    // Alien bombs update & collisions
    for (let i = invAlienBombs.length - 1; i >= 0; i--) {
      const b = invAlienBombs[i];
      b.y += b.vy * dt;

      // Off bottom
      if (b.y > V_HEIGHT) {
        invAlienBombs.splice(i, 1);
        continue;
      }

      let bombHit = false;

      // Hit bunkers
      for (let bk = 0; bk < invBunkers.length; bk++) {
        const blocks = invBunkers[bk];
        for (let k = blocks.length - 1; k >= 0; k--) {
          const blk = blocks[k];
          if (b.x >= blk.x && b.x <= blk.x + blk.w &&
              b.y >= blk.y && b.y <= blk.y + blk.h) {
            blk.hp--;
            if (blk.hp <= 0) blocks.splice(k, 1);
            bombHit = true;
            break;
          }
        }
        if (bombHit) break;
      }

      // Hit player cannon!
      if (!bombHit && Math.abs(b.x - invPlayerX) < 28 && Math.abs(b.y - 485) < 16) {
        bombHit = true;
        sound().playPlayerExplode();
        screenShake = 14;
        invLives--;
        updateHUD();

        for (let k = 0; k < 20; k++) {
          const a = Math.random() * Math.PI * 2;
          invExplosions.push({
            x: invPlayerX, y: 485,
            vx: Math.cos(a) * (80 + Math.random() * 160),
            vy: Math.sin(a) * (80 + Math.random() * 160),
            color: '#ff0077', size: 6, life: 0.5
          });
        }

        if (invLives <= 0) {
          triggerInvadersDeath();
          return;
        }
      }

      if (bombHit) {
        invAlienBombs.splice(i, 1);
      }
    }

    // Mystery Flying Saucer (UFO)
    if (!invUfo.active) {
      invUfo.timer -= dt;
      if (invUfo.timer <= 0) {
        invUfo.active = true;
        invUfo.x = -60;
        invUfo.timer = 14 + Math.random() * 10;
        sound().playInvadersUfo();
      }
    } else {
      invUfo.x += invUfo.speed * dt;
      if (invUfo.x > V_WIDTH + 80) {
        invUfo.active = false;
      }
    }
  }

  // ==========================================================================
  //  SECTION 8: RENDER PIPELINE (NEON & OLED)
  // ==========================================================================
  let lastTime = performance.now();

  function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (isSwitchingGame) {
      switchBannerTimer -= dt;
      if (switchBannerTimer <= 0) isSwitchingGame = false;
    }

    if (activeGame === 'face') {
      updateFace(dt);
    } else if (activeGame === 'geodash') {
      updateGD(dt);
    } else if (activeGame === 'flappy') {
      updateFB(dt);
    } else if (activeGame === 'dino') {
      updateDino(dt);
    } else if (activeGame === 'car') {
      updateCar(dt);
    } else if (activeGame === 'snake') {
      updateSnake(dt);
    } else if (activeGame === 'invaders') {
      updateInvaders(dt);
    }

    render();

    requestAnimationFrame(gameLoop);
  }

  function render() {
    if (displayMode === 'oled') {
      renderOLED();
    } else {
      renderNeon();
    }
  }

  // --- NEON RENDERER ---
  function renderNeon() {
    ctx.save();
    if (canvas.width !== V_WIDTH || canvas.height !== V_HEIGHT) {
      canvas.width = V_WIDTH;
      canvas.height = V_HEIGHT;
    }

    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake * 1.5;
      const sy = (Math.random() - 0.5) * screenShake * 1.5;
      ctx.translate(sx, sy);
    }

    if (activeGame === 'face') {
      renderFaceNeon();
    } else if (activeGame === 'geodash') {
      renderGDNeon();
    } else if (activeGame === 'flappy') {
      renderFBNeon();
    } else if (activeGame === 'dino') {
      renderDinoNeon();
    } else if (activeGame === 'car') {
      renderCarNeon();
    } else if (activeGame === 'snake') {
      renderSnakeNeon();
    } else if (activeGame === 'invaders') {
      renderInvadersNeon();
    }

    if (isSwitchingGame) {
      renderSwitchOverlayNeon();
    }

    ctx.restore();
  }

  // --- CUTE COMPANION PET FACE NEON RENDERER (Living 360° Irises & Patting Emotions) ---
  function renderFaceNeon() {
    const now = performance.now();

    // Dark cyber gradient background
    let bg = ctx.createRadialGradient(V_WIDTH / 2, V_HEIGHT / 2, 40, V_WIDTH / 2, V_HEIGHT / 2, 480);
    bg.addColorStop(0, '#0a1626');
    bg.addColorStop(1, '#040710');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Subtle ambient breathing float
    const bob = Math.sin(now * 0.0032) * 8;
    const baseY = 160 + bob;

    const lex = 240;
    const rex = 580;
    const eyeW = 140;
    const eyeH = 150;
    const eyeR = 36;

    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;

    if (faceMood === FACE_MOOD.HAPPY_SQUINT) {
      // Photo 2: Happy Squint Crescent Arcs ^ ^
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#00f0ff';

      ctx.beginPath();
      ctx.moveTo(lex, baseY + 90);
      ctx.quadraticCurveTo(lex + eyeW / 2, baseY + 10, lex + eyeW, baseY + 90);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rex, baseY + 90);
      ctx.quadraticCurveTo(rex + eyeW / 2, baseY + 10, rex + eyeW, baseY + 90);
      ctx.stroke();

      // Cheerful open mouth smile
      ctx.beginPath();
      ctx.arc(480, baseY + 155, 32, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

    } else if (faceMood === FACE_MOOD.WINK) {
      // Winking Expression: Left Eye Arc ^, Right Eye Open
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#00f0ff';

      ctx.beginPath();
      ctx.moveTo(lex, baseY + 90);
      ctx.quadraticCurveTo(lex + eyeW / 2, baseY + 10, lex + eyeW, baseY + 90);
      ctx.stroke();

      // Right eye socket
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(rex, baseY, eyeW, eyeH, eyeR);
      ctx.fill();
      ctx.stroke();

      // Iris in right eye
      const rIrisX = rex + eyeW / 2 + irisCurX * 6;
      const rIrisY = baseY + eyeH / 2 + irisCurY * 6;
      ctx.fillStyle = '#060a14';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(rIrisX, rIrisY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Glossy highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rIrisX - 8, rIrisY - 8, 8, 0, Math.PI * 2);
      ctx.arc(rIrisX + 10, rIrisY + 10, 3, 0, Math.PI * 2);
      ctx.fill();

      // Cheek blush on winking side
      ctx.strokeStyle = 'rgba(255, 0, 119, 0.7)';
      ctx.lineWidth = 5;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(lex + 20 + s * 14, baseY + eyeH + 10);
        ctx.lineTo(lex + 32 + s * 14, baseY + eyeH + 28);
        ctx.stroke();
      }

      // Cheeky smirk
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(460, baseY + 155);
      ctx.quadraticCurveTo(500, baseY + 175, 520, baseY + 145);
      ctx.stroke();

    } else if (faceMood === FACE_MOOD.BLUSH) {
      // Blushing: Rounded eyes with Star Sparkle Pupils + Cheek Slashes
      ctx.beginPath();
      ctx.roundRect(lex, baseY, eyeW, eyeH, eyeR);
      ctx.roundRect(rex, baseY, eyeW, eyeH, eyeR);
      ctx.fill();
      ctx.stroke();

      // Star sparkle pupils
      const lIx = lex + eyeW / 2 + irisCurX * 5;
      const lIy = baseY + eyeH / 2 + irisCurY * 5;
      const rIx = rex + eyeW / 2 + irisCurX * 5;
      const rIy = baseY + eyeH / 2 + irisCurY * 5;

      ctx.fillStyle = '#060a14';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(lIx, lIy, 26, 0, Math.PI * 2);
      ctx.arc(rIx, rIy, 26, 0, Math.PI * 2);
      ctx.fill();

      // Glowing 4-point sparkle star in each eye
      ctx.fillStyle = '#ffe600';
      [lIx, rIx].forEach(cx => {
        ctx.beginPath();
        ctx.moveTo(cx, lIy - 16);
        ctx.quadraticCurveTo(cx, lIy, cx + 16, lIy);
        ctx.quadraticCurveTo(cx, lIy, cx, lIy + 16);
        ctx.quadraticCurveTo(cx, lIy, cx - 16, lIy);
        ctx.quadraticCurveTo(cx, lIy, cx, lIy - 16);
        ctx.fill();
      });

      // Cheek blush slashes on both cheeks
      ctx.strokeStyle = 'rgba(255, 0, 119, 0.85)';
      ctx.lineWidth = 5;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(lex + 15 + s * 14, baseY + eyeH + 10);
        ctx.lineTo(lex + 27 + s * 14, baseY + eyeH + 28);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rex + 65 + s * 14, baseY + eyeH + 10);
        ctx.lineTo(rex + 77 + s * 14, baseY + eyeH + 28);
        ctx.stroke();
      }

      // Bashful smiling mouth
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(480, baseY + 150, 24, 0.2, Math.PI - 0.2, false);
      ctx.stroke();

    } else if (faceMood === FACE_MOOD.LOVE_OVERLOAD) {
      // Heavenly Mode: Wide glowing eyes with Heart Pupils!
      ctx.shadowColor = '#ff0077';
      ctx.shadowBlur = 45;
      ctx.fillStyle = '#ff66b2';
      ctx.beginPath();
      ctx.roundRect(lex, baseY, eyeW, eyeH, eyeR);
      ctx.roundRect(rex, baseY, eyeW, eyeH, eyeR);
      ctx.fill();

      // Heart-shaped pupil in each eye
      const lIx = lex + eyeW / 2 + irisCurX * 4;
      const lIy = baseY + eyeH / 2 + irisCurY * 4;
      const rIx = rex + eyeW / 2 + irisCurX * 4;
      const rIy = baseY + eyeH / 2 + irisCurY * 4;

      ctx.fillStyle = '#ff0077';
      ctx.shadowBlur = 0;
      [lIx, rIx].forEach(cx => {
        ctx.save();
        ctx.translate(cx, lIy - 6);
        ctx.scale(1.4, 1.4);
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(0, -5, -16, -5, -16, 5);
        ctx.bezierCurveTo(-16, 15, 0, 24, 0, 28);
        ctx.bezierCurveTo(0, 24, 16, 15, 16, 5);
        ctx.bezierCurveTo(16, -5, 0, -5, 0, 5);
        ctx.fill();
        ctx.restore();
      });

      // Blissful wide open smile
      ctx.shadowColor = '#ff0077';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#ff0077';
      ctx.beginPath();
      ctx.arc(480, baseY + 155, 36, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      // Floating Hearts
      for (let i = 0; i < petHearts.length; i++) {
        const h = petHearts[i];
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 15;
        const s = h.size / 20;
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(0, -5, -14, -5, -14, 5);
        ctx.bezierCurveTo(-14, 14, 0, 22, 0, 26);
        ctx.bezierCurveTo(0, 22, 14, 14, 14, 5);
        ctx.bezierCurveTo(14, -5, 0, -5, 0, 5);
        ctx.fill();
        ctx.restore();
      }

    } else if (faceMood === FACE_MOOD.AFTERGLOW) {
      // Content half-closed eyes with soft blush
      ctx.beginPath();
      ctx.roundRect(lex, baseY + 30, eyeW, eyeH - 40, 24);
      ctx.roundRect(rex, baseY + 30, eyeW, eyeH - 40, 24);
      ctx.fill();

      // Soft dream smile
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(480, baseY + 150, 22, 0.2, Math.PI - 0.2, false);
      ctx.stroke();

    } else if (faceMood === FACE_MOOD.BLINK) {
      // Eyelid blink animation
      ctx.beginPath();
      ctx.roundRect(lex, baseY + eyeH / 2 - 8, eyeW, 16, 8);
      ctx.roundRect(rex, baseY + eyeH / 2 - 8, eyeW, 16, 8);
      ctx.fill();

      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(435, baseY + 150);
      ctx.quadraticCurveTo(480, baseY + 185, 525, baseY + 150);
      ctx.stroke();

    } else if (faceMood === FACE_MOOD.SLEEPY) {
      // Droopy sleepy eye bars
      ctx.beginPath();
      ctx.roundRect(lex + 10, baseY + 60, eyeW - 20, 18, 9);
      ctx.roundRect(rex + 10, baseY + 60, eyeW - 20, 18, 9);
      ctx.fill();

      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(455, baseY + 155);
      ctx.lineTo(505, baseY + 155);
      ctx.stroke();

      // Floating 'z' and 'Z' particles
      const zTime = (now / 400) % 1;
      ctx.font = '800 32px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, ' + (1 - zTime) + ')';
      ctx.fillText('z', 760 - zTime * 40, 140 - zTime * 90);
      ctx.font = '800 48px JetBrains Mono, monospace';
      ctx.fillText('Z', 820 - zTime * 60, 100 - zTime * 110);

    } else {
      // Normal Living Pet Face with 360° Living Irises
      ctx.beginPath();
      ctx.roundRect(lex, baseY, eyeW, eyeH, eyeR);
      ctx.roundRect(rex, baseY, eyeW, eyeH, eyeR);
      ctx.fill();
      ctx.stroke();

      // 360° Dynamic Living Irises (Smoothly gliding in all directions)
      const lIx = lex + eyeW / 2 + irisCurX * 7;
      const lIy = baseY + eyeH / 2 + irisCurY * 7;
      const rIx = rex + eyeW / 2 + irisCurX * 7;
      const rIy = baseY + eyeH / 2 + irisCurY * 7;

      ctx.fillStyle = '#060a14';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(lIx, lIy, 26, 0, Math.PI * 2);
      ctx.arc(rIx, rIy, 26, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlight Glossy Cutouts
      ctx.fillStyle = '#ffffff';
      [lIx, rIx].forEach(cx => {
        ctx.beginPath();
        ctx.arc(cx - 8, lIy - 8, 8, 0, Math.PI * 2);
        ctx.arc(cx + 9, lIy + 9, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cheerful curved smile
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(480, baseY + 145, 26, 0.2, Math.PI - 0.2, false);
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Bottom prompt hint
    ctx.font = '700 15px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText('CLICK / TAP SENSOR: PET COMPANION (STREAK: ' + petStreak + ')   •   KEY M / B: ARCADE MENU', V_WIDTH / 2, V_HEIGHT - 35);

    ctx.restore();
  }

  // --- CAR RACING (HIGHWAY OVERTAKE) NEON RENDERER ---
  function renderCarNeon() {
    // 1. Dark Neon Speedway Background
    let bg = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    bg.addColorStop(0, '#060b18');
    bg.addColorStop(0.5, '#0d152a');
    bg.addColorStop(1, '#050812');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // 2. Roadside Telephone Poles & Horizon Lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 2;
    const poleShift = (carRoadScroll * 0.4) % 180;
    for (let px = -poleShift; px < V_WIDTH; px += 180) {
      ctx.beginPath();
      ctx.moveTo(px, 70); ctx.lineTo(px, 120);
      ctx.moveTo(px - 14, 80); ctx.lineTo(px + 14, 80);
      ctx.stroke();
    }

    // 3. Checkered Rumble Curbs (Top Y=125, Bottom Y=445)
    const curbW = 32;
    const curbShift = (carRoadScroll) % (curbW * 2);
    for (let cx = -curbShift; cx < V_WIDTH + 64; cx += curbW) {
      const isAlt = (Math.floor((cx + curbShift) / curbW) % 2 === 0);
      ctx.fillStyle = isAlt ? '#ff0077' : '#ffffff';
      ctx.fillRect(cx, 125, curbW, 10);
      ctx.fillStyle = isAlt ? '#00f0ff' : '#ffffff';
      ctx.fillRect(cx, 445, curbW, 10);
    }

    // 4. Scrolling Dashed White Lane Dividers (Y=215 and Y=325)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 4;
    ctx.setLineDash([36, 28]);
    ctx.lineDashOffset = -carRoadScroll * 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 215); ctx.lineTo(V_WIDTH, 215);
    ctx.moveTo(0, 325); ctx.lineTo(V_WIDTH, 325);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 5. Traffic Vehicles & Pickups
    for (let i = 0; i < carTraffic.length; i++) {
      const v = carTraffic[i];
      const vy = CAR_LANE_Y[v.lane];

      if (v.type === 'car') {
        // Sleek Magenta / Orange Sports Car
        ctx.save();
        ctx.shadowColor = '#ff0077';
        ctx.shadowBlur = 15;
        // Body
        ctx.fillStyle = '#ff0077';
        ctx.beginPath();
        ctx.roundRect(v.x + 8, vy + 4, v.w - 16, v.h - 8, 6);
        ctx.fill();
        // Nose cone
        ctx.fillRect(v.x, vy + 8, 10, v.h - 16);
        // Cockpit
        ctx.fillStyle = '#0a1020';
        ctx.fillRect(v.x + 22, vy + 8, 18, v.h - 16);
        // Wheels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(v.x + 12, vy - 2, 10, 4);
        ctx.fillRect(v.x + 12, vy + v.h - 2, 10, 4);
        ctx.fillRect(v.x + 42, vy - 2, 10, 4);
        ctx.fillRect(v.x + 42, vy + v.h - 2, 10, 4);
        ctx.restore();
      } else if (v.type === 'truck') {
        // Massive Semi-Truck Trailer
        ctx.save();
        ctx.shadowColor = '#9d00ff';
        ctx.shadowBlur = 15;
        // Cab
        ctx.fillStyle = '#9d00ff';
        ctx.beginPath();
        ctx.roundRect(v.x, vy + 4, 30, v.h - 8, 4);
        ctx.fill();
        // Trailer
        ctx.fillStyle = '#1c2438';
        ctx.strokeStyle = '#9d00ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(v.x + 34, vy, v.w - 36, v.h, 6);
        ctx.fill();
        ctx.stroke();
        // Trailer ribbed stripes
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.4)';
        for (let tx = v.x + 50; tx < v.x + v.w - 10; tx += 18) {
          ctx.beginPath();
          ctx.moveTo(tx, vy + 4); ctx.lineTo(tx, vy + v.h - 4);
          ctx.stroke();
        }
        ctx.restore();
      } else if (v.type === 'nitro') {
        // Glowing Lightning Bolt Canister
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x + v.w / 2, vy + v.h / 2, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bolt
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        const bx = v.x + v.w / 2, by = vy + v.h / 2;
        ctx.moveTo(bx + 4, by - 12);
        ctx.lineTo(bx - 6, by + 1);
        ctx.lineTo(bx + 2, by + 1);
        ctx.lineTo(bx - 3, by + 12);
        ctx.lineTo(bx + 7, by - 1);
        ctx.lineTo(bx - 1, by - 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Spinning Gold Coin
        ctx.save();
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc(v.x + v.w / 2, vy + v.h / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aa8800';
        ctx.beginPath();
        ctx.arc(v.x + v.w / 2, vy + v.h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 6. Particle Bursts & Smoke
    for (let i = 0; i < carParticles.length; i++) {
      const p = carParticles[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Player Supercar
    const isNitro = carNitroTimer > 0;
    ctx.save();
    if (isNitro) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 35;
      // Nitro shield aura
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(CAR_PLAYER_X + CAR_PLAYER_W / 2, carPlayerY + CAR_PLAYER_H / 2, CAR_PLAYER_W / 2 + 15, CAR_PLAYER_H / 2 + 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 18;
    }

    // Formula Supercar Chassis
    ctx.fillStyle = isNitro ? '#00f0ff' : '#00ff66';
    ctx.beginPath();
    ctx.roundRect(CAR_PLAYER_X + 10, carPlayerY + 5, CAR_PLAYER_W - 16, CAR_PLAYER_H - 10, 6);
    ctx.fill();
    // Aerodynamic Nose cone
    ctx.beginPath();
    ctx.moveTo(CAR_PLAYER_X + CAR_PLAYER_W - 6, carPlayerY + 8);
    ctx.lineTo(CAR_PLAYER_X + CAR_PLAYER_W + 12, carPlayerY + CAR_PLAYER_H / 2);
    ctx.lineTo(CAR_PLAYER_X + CAR_PLAYER_W - 6, carPlayerY + CAR_PLAYER_H - 8);
    ctx.closePath();
    ctx.fill();
    // Dark Cockpit cutout
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(CAR_PLAYER_X + 26, carPlayerY + 8, 18, CAR_PLAYER_H - 16);
    // Driver Helmet
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(CAR_PLAYER_X + 34, carPlayerY + CAR_PLAYER_H / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    // Rear Aerodynamic Wing Spoiler
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(CAR_PLAYER_X, carPlayerY + 2, 8, CAR_PLAYER_H - 4);
    // Wheels
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(CAR_PLAYER_X + 16, carPlayerY - 3, 12, 5);
    ctx.fillRect(CAR_PLAYER_X + 16, carPlayerY + CAR_PLAYER_H - 2, 12, 5);
    ctx.fillRect(CAR_PLAYER_X + 48, carPlayerY - 3, 12, 5);
    ctx.fillRect(CAR_PLAYER_X + 48, carPlayerY + CAR_PLAYER_H - 2, 12, 5);

    // Exhaust Flames
    if (isNitro) {
      ctx.fillStyle = '#00f0ff';
      const fLen = 25 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(CAR_PLAYER_X - 2, carPlayerY + 10);
      ctx.lineTo(CAR_PLAYER_X - fLen, carPlayerY + 12);
      ctx.lineTo(CAR_PLAYER_X - 2, carPlayerY + 14);
      ctx.moveTo(CAR_PLAYER_X - 2, carPlayerY + CAR_PLAYER_H - 14);
      ctx.lineTo(CAR_PLAYER_X - fLen, carPlayerY + CAR_PLAYER_H - 12);
      ctx.lineTo(CAR_PLAYER_X - 2, carPlayerY + CAR_PLAYER_H - 10);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff7700';
      const fLen = 10 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(CAR_PLAYER_X - 2, carPlayerY + CAR_PLAYER_H / 2 - 4);
      ctx.lineTo(CAR_PLAYER_X - fLen, carPlayerY + CAR_PLAYER_H / 2);
      ctx.lineTo(CAR_PLAYER_X - 2, carPlayerY + CAR_PLAYER_H / 2 + 4);
      ctx.fill();
    }
    ctx.restore();

    // 8. Cyberpunk Dashboard HUD (Speedometer & Distance)
    ctx.save();
    ctx.font = '800 20px JetBrains Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SPEED: ' + Math.floor((isNitro ? carRoadSpeed * 1.55 : carRoadSpeed) * 0.45) + ' KM/H', 40, 50);
    ctx.fillText('DISTANCE: ' + carDistance + 'M', 360, 50);

    if (isNitro) {
      ctx.font = '900 22px Outfit, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillText('⚡ NITRO BOOST ACTIVE! (' + carNitroTimer.toFixed(1) + 's)', 650, 50);
    }
    ctx.restore();
  }

  // --- RETRO SNAKE NEON RENDERER ---
  function renderSnakeNeon() {
    // 1. Dark Neon Grid Background
    let bg = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    bg.addColorStop(0, '#060914');
    bg.addColorStop(1, '#03050a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // 2. Arena Outer Glowing Border
    const arenaW = SNAKE_COLS * SNAKE_CELL;
    const arenaH = SNAKE_ROWS * SNAKE_CELL;
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(SNAKE_ARENA_X, SNAKE_ARENA_Y, arenaW, arenaH);
    ctx.restore();

    // Subtle Grid Dots
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    for (let c = 1; c < SNAKE_COLS; c++) {
      for (let r = 1; r < SNAKE_ROWS; r++) {
        ctx.fillRect(SNAKE_ARENA_X + c * SNAKE_CELL - 1, SNAKE_ARENA_Y + r * SNAKE_CELL - 1, 2, 2);
      }
    }

    // 3. Snake Food (Apple)
    const fx = SNAKE_ARENA_X + snakeFood.x * SNAKE_CELL + SNAKE_CELL / 2;
    const fy = SNAKE_ARENA_Y + snakeFood.y * SNAKE_CELL + SNAKE_CELL / 2;
    ctx.save();
    if (snakeFood.isGolden) {
      // Golden Apple with countdown ring
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(fx, fy, 12, 0, Math.PI * 2);
      ctx.fill();

      // Countdown Ring
      const prog = snakeFood.goldenTimer / 7.0;
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fx, fy, 17, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
    } else {
      // Juicy Red Apple with Green Leaf
      ctx.shadowColor = '#ff0077';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff0077';
      ctx.beginPath();
      ctx.arc(fx, fy + 2, 11, 0, Math.PI * 2);
      ctx.fill();

      // Green Leaf
      ctx.fillStyle = '#00ff66';
      ctx.beginPath();
      ctx.ellipse(fx + 4, fy - 9, 6, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Snake Body
    for (let i = snakeBody.length - 1; i >= 0; i--) {
      const seg = snakeBody[i];
      const sx = SNAKE_ARENA_X + seg.x * SNAKE_CELL;
      const sy = SNAKE_ARENA_Y + seg.y * SNAKE_CELL;
      const ratio = 1 - (i / snakeBody.length);

      ctx.save();
      if (i === 0) {
        // Head: Glowing Neon Cyan
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, SNAKE_CELL - 4, SNAKE_CELL - 4, 10);
        ctx.fill();

        // Animated Eyes that look in movement direction
        const eyeOffset = 6;
        let elx = sx + 8 + snakeDir.x * 3;
        let ely = sy + 8 + snakeDir.y * 3;
        let erx = sx + SNAKE_CELL - 12 + snakeDir.x * 3;
        let ery = sy + SNAKE_CELL - 12 + snakeDir.y * 3;

        ctx.fillStyle = '#060a14';
        ctx.beginPath();
        ctx.arc(elx, ely, 3.5, 0, Math.PI * 2);
        ctx.arc(erx, ery, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Little cute flicking tongue
        if (Math.sin(performance.now() * 0.01) > 0.6) {
          ctx.fillStyle = '#ff0077';
          ctx.beginPath();
          ctx.fillRect(sx + SNAKE_CELL / 2 + snakeDir.x * 12 - 2, sy + SNAKE_CELL / 2 + snakeDir.y * 12 - 2, 4, 4);
        }
      } else {
        // Body segments: Gradient cyan -> purple
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `hsl(${180 + (1 - ratio) * 100}, 100%, ${45 + ratio * 20}%)`;
        ctx.beginPath();
        ctx.roundRect(sx + 3, sy + 3, SNAKE_CELL - 6, SNAKE_CELL - 6, 8);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Sparkle Particles
    for (let i = 0; i < snakeParticles.length; i++) {
      const p = snakeParticles[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Top Status Bar
    ctx.font = '800 18px JetBrains Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LENGTH: ' + snakeLength, SNAKE_ARENA_X, SNAKE_ARENA_Y - 8);
    ctx.fillText('SCORE: ' + snakeScore, SNAKE_ARENA_X + 240, SNAKE_ARENA_Y - 8);
    ctx.fillText('BEST: ' + snakeBestScore, SNAKE_ARENA_X + 460, SNAKE_ARENA_Y - 8);
  }

  // --- SPACE INVADERS NEON RENDERER ---
  function renderInvadersNeon() {
    // 1. Cosmic Deep Space Background
    let bg = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    bg.addColorStop(0, '#04060e');
    bg.addColorStop(1, '#0b0d1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let s = 0; s < 45; s++) {
      const sx = ((s * 97) % V_WIDTH);
      const sy = ((s * 139) % (V_HEIGHT - 60));
      ctx.fillRect(sx, sy, 2, 2);
    }

    // 2. Mystery UFO Flying Saucer
    if (invUfo.active) {
      ctx.save();
      ctx.shadowColor = '#ff0077';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#ff0077';
      // Dome
      ctx.beginPath();
      ctx.arc(invUfo.x, 38, 14, Math.PI, 0, false);
      ctx.fill();
      // Saucer Body
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.ellipse(invUfo.x, 42, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Alien Fleet
    for (let a = 0; a < invAliens.length; a++) {
      const al = invAliens[a];
      if (!al.alive) continue;

      const ax = invFleetX + al.col * 110;
      const ay = invFleetY + al.row * 50;

      ctx.save();
      ctx.shadowColor = al.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = al.color;

      if (al.row === 0) {
        // Squid Invader
        ctx.beginPath();
        ctx.roundRect(ax - 16, ay - 14, 32, 20, 8);
        ctx.fill();
        // Tentacles
        if (invAlienAnimFrame === 0) {
          ctx.fillRect(ax - 14, ay + 6, 6, 8);
          ctx.fillRect(ax + 8, ay + 6, 6, 8);
        } else {
          ctx.fillRect(ax - 8, ay + 6, 6, 8);
          ctx.fillRect(ax + 2, ay + 6, 6, 8);
        }
        // Eyes
        ctx.fillStyle = '#060a14';
        ctx.fillRect(ax - 8, ay - 6, 5, 5);
        ctx.fillRect(ax + 3, ay - 6, 5, 5);

      } else if (al.row === 1) {
        // Crab Invader
        ctx.beginPath();
        ctx.roundRect(ax - 20, ay - 12, 40, 22, 6);
        ctx.fill();
        // Claws
        if (invAlienAnimFrame === 0) {
          ctx.fillRect(ax - 24, ay - 6, 6, 12);
          ctx.fillRect(ax + 18, ay - 6, 6, 12);
        } else {
          ctx.fillRect(ax - 24, ay - 12, 6, 12);
          ctx.fillRect(ax + 18, ay - 12, 6, 12);
        }
        // Eyes
        ctx.fillStyle = '#060a14';
        ctx.fillRect(ax - 10, ay - 4, 6, 6);
        ctx.fillRect(ax + 4, ay - 4, 6, 6);

      } else {
        // Octopus Invader
        ctx.beginPath();
        ctx.arc(ax, ay - 2, 16, Math.PI, 0, false);
        ctx.fillRect(ax - 16, ay - 2, 32, 14);
        // Arms
        if (invAlienAnimFrame === 0) {
          ctx.fillRect(ax - 18, ay + 12, 6, 6);
          ctx.fillRect(ax + 12, ay + 12, 6, 6);
        } else {
          ctx.fillRect(ax - 12, ay + 12, 6, 6);
          ctx.fillRect(ax + 6, ay + 12, 6, 6);
        }
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#060a14';
        ctx.fillRect(ax - 8, ay - 2, 5, 5);
        ctx.fillRect(ax + 3, ay - 2, 5, 5);
      }
      ctx.restore();
    }

    // 4. Bunkers / Defensive Shields
    for (let b = 0; b < invBunkers.length; b++) {
      const blocks = invBunkers[b];
      for (let k = 0; k < blocks.length; k++) {
        const blk = blocks[k];
        ctx.save();
        ctx.fillStyle = blk.hp === 3 ? '#00f0ff' : (blk.hp === 2 ? '#00b4cc' : '#006680');
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = blk.hp * 4;
        ctx.fillRect(blk.x, blk.y, blk.w, blk.h);
        ctx.restore();
      }
    }

    // 5. Player Lasers
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < invPlayerLasers.length; i++) {
      const l = invPlayerLasers[i];
      ctx.fillRect(l.x - 2, l.y, 4, 16);
    }
    ctx.restore();

    // 6. Alien Laser Bombs
    ctx.save();
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff0077';
    for (let i = 0; i < invAlienBombs.length; i++) {
      const b = invAlienBombs[i];
      ctx.fillRect(b.x - 2, b.y, 4, 14);
    }
    ctx.restore();

    // 7. Explosions
    for (let i = 0; i < invExplosions.length; i++) {
      const p = invExplosions[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Player Laser Cannon
    ctx.save();
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#00ff66';
    // Base tank tracks
    ctx.beginPath();
    ctx.roundRect(invPlayerX - 26, 485, 52, 14, 4);
    ctx.fill();
    // Armored turret
    ctx.fillRect(invPlayerX - 14, 477, 28, 8);
    // Laser Muzzle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(invPlayerX - 3, 468, 6, 9);
    ctx.restore();

    // 9. Top HUD Bar
    ctx.font = '800 18px JetBrains Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SCORE: ' + invScore, 60, 40);
    ctx.fillText('WAVE ' + invWave, 420, 40);

    // Mini Cannon Lives indicator
    ctx.fillText('LIVES: ', 740, 40);
    for (let i = 0; i < invLives; i++) {
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(820 + i * 30, 28, 20, 8);
      ctx.fillRect(828 + i * 30, 23, 4, 5);
    }
  }

  function renderGDNeon() {
    let bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    if (gdPlayerMode === 'ship') {
      bgGrad.addColorStop(0, '#1a082b'); bgGrad.addColorStop(1, '#0c0414');
    } else {
      bgGrad.addColorStop(0, '#0a1024'); bgGrad.addColorStop(1, '#050711');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Parallax Grid
    ctx.strokeStyle = gdPlayerMode === 'ship' ? 'rgba(255, 0, 119, 0.08)' : 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridOffset = (gdCameraX * 0.3) % 40;
    for (let x = -gridOffset; x < V_WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GD_FLOOR_Y); ctx.stroke();
    }
    for (let y = 0; y < GD_FLOOR_Y; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(V_WIDTH, y); ctx.stroke();
    }

    // Floor
    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, GD_FLOOR_Y, V_WIDTH, V_HEIGHT - GD_FLOOR_Y);
    const groundScroll = gdCameraX % 60;
    for (let gx = -groundScroll; gx < V_WIDTH; gx += 60) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(gx, GD_FLOOR_Y, 30, V_HEIGHT - GD_FLOOR_Y);
    }

    ctx.shadowColor = gdPlayerMode === 'ship' ? '#ff0077' : '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = gdPlayerMode === 'ship' ? '#ff0077' : '#00f0ff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, GD_FLOOR_Y); ctx.lineTo(V_WIDTH, GD_FLOOR_Y); ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 0; i < GD_LEVEL_TRACK.length; i++) {
      const obs = GD_LEVEL_TRACK[i];
      const screenX = obs.x - gdCameraX;
      if (screenX + obs.w < -50 || screenX > V_WIDTH + 50) continue;
      drawGDObstacleNeon(obs, screenX);
    }

    for (const tp of trailParticles) {
      ctx.fillStyle = tp.color || 'rgba(0, 240, 255, ' + tp.alpha + ')';
      ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2); ctx.fill();
    }

    if (gdGameState === GD_STATE.PLAYING) {
      drawGDPlayerNeon(GD_PLAYER_SCREEN_X, gdPlayer.y);
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rot * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.5);
      ctx.restore();
    }
  }

  function drawGDObstacleNeon(obs, sx) {
    ctx.save();
    if (obs.type === GD_OBS.SPIKE) {
      drawSpikeNeon(sx, obs.y, obs.w, obs.h);
    } else if (obs.type === GD_OBS.DOUBLE_SPIKE) {
      drawSpikeNeon(sx, obs.y, obs.w / 2, obs.h);
      drawSpikeNeon(sx + obs.w / 2, obs.y, obs.w / 2, obs.h);
    } else if (obs.type === GD_OBS.TRIPLE_SPIKE) {
      drawSpikeNeon(sx, obs.y, obs.w / 3, obs.h);
      drawSpikeNeon(sx + obs.w / 3, obs.y, obs.w / 3, obs.h);
      drawSpikeNeon(sx + (obs.w / 3) * 2, obs.y, obs.w / 3, obs.h);
    } else if (obs.type === GD_OBS.CEIL_SPIKE) {
      ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff0055';
      ctx.beginPath(); ctx.moveTo(sx + obs.w / 2, obs.y + obs.h);
      ctx.lineTo(sx + obs.w, obs.y); ctx.lineTo(sx, obs.y);
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    } else if (obs.type === GD_OBS.BLOCK) {
      ctx.fillStyle = '#121829'; ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 8;
      ctx.fillRect(sx, obs.y, obs.w, obs.h);
      ctx.strokeRect(sx, obs.y, obs.w, obs.h);
      ctx.shadowBlur = 0;
    } else if (obs.type === GD_OBS.PAD_JUMP) {
      ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.roundRect(sx, obs.y + obs.h - 10, obs.w, 10, 4); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx + obs.w / 2 - 8, obs.y + obs.h - 2);
      ctx.lineTo(sx + obs.w / 2, obs.y + obs.h - 8);
      ctx.lineTo(sx + obs.w / 2 + 8, obs.y + obs.h - 2); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (obs.type === GD_OBS.ORB_JUMP) {
      ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(255, 230, 0, 0.25)';
      ctx.beginPath(); ctx.arc(sx + obs.w / 2, obs.y + obs.h / 2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(sx + obs.w / 2, obs.y + obs.h / 2, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx + obs.w / 2, obs.y + obs.h / 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (obs.type === GD_OBS.PORTAL_SHIP || obs.type === GD_OBS.PORTAL_CUBE) {
      const isShip = obs.type === GD_OBS.PORTAL_SHIP;
      const pColor = isShip ? '#ff0077' : '#00f0ff';
      ctx.shadowColor = pColor; ctx.shadowBlur = 20;
      ctx.strokeStyle = pColor; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(sx + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke(); ctx.shadowBlur = 0;
    } else if (obs.type === GD_OBS.FINISH) {
      ctx.fillStyle = 'rgba(255, 230, 0, 0.15)'; ctx.fillRect(sx, obs.y, obs.w, obs.h);
      ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 4; ctx.strokeRect(sx, obs.y, obs.w, obs.h);
      ctx.fillStyle = '#ffe600';
      for (let fy = obs.y; fy < obs.y + obs.h; fy += 24) ctx.fillRect(sx + 4, fy, obs.w - 8, 12);
    }
    ctx.restore();
  }

  function drawSpikeNeon(x, y, w, h) {
    ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff0055';
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2 + 4, y + h - 4); ctx.lineTo(x + w / 2 - 4, y + h - 4);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }

  function drawGDPlayerNeon(x, y) {
    ctx.save();
    ctx.translate(x + GD_CUBE_SIZE / 2, y + GD_CUBE_SIZE / 2);
    ctx.rotate((gdPlayer.angle * Math.PI) / 180);

    if (gdPlayerMode === 'cube') {
      ctx.shadowColor = gdPlayer.color; ctx.shadowBlur = 15;
      ctx.fillStyle = gdPlayer.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.fillRect(-GD_CUBE_SIZE / 2, -GD_CUBE_SIZE / 2, GD_CUBE_SIZE, GD_CUBE_SIZE);
      ctx.strokeRect(-GD_CUBE_SIZE / 2, -GD_CUBE_SIZE / 2, GD_CUBE_SIZE, GD_CUBE_SIZE);
      ctx.shadowBlur = 0; ctx.fillStyle = '#0a0d17';
      ctx.fillRect(-GD_CUBE_SIZE / 4, -GD_CUBE_SIZE / 4, GD_CUBE_SIZE / 2, GD_CUBE_SIZE / 2);
      ctx.fillStyle = '#ffffff';
      if (gdPlayer.faceStyle === 'classic') ctx.fillRect(-4, -4, 8, 8);
      else if (gdPlayer.faceStyle === 'ninja') { ctx.fillRect(-8, -4, 6, 4); ctx.fillRect(2, -4, 6, 4); }
      else if (gdPlayer.faceStyle === 'x-eyes') { ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(-6, -6, 12, 12); }
    } else {
      ctx.shadowColor = '#ff7700'; ctx.shadowBlur = 15;
      ctx.fillStyle = gdPlayer.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GD_CUBE_SIZE / 2 + 8, 0); ctx.lineTo(-GD_CUBE_SIZE / 2, -GD_CUBE_SIZE / 2 + 4);
      ctx.lineTo(-GD_CUBE_SIZE / 2 + 6, 0); ctx.lineTo(-GD_CUBE_SIZE / 2, GD_CUBE_SIZE / 2 - 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function renderFBNeon() {
    let sky = ctx.createLinearGradient(0, 0, 0, FB_FLOOR_Y);
    sky.addColorStop(0, '#0c1b33'); sky.addColorStop(1, '#1b3b5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, V_WIDTH, FB_FLOOR_Y);

    for (let i = 0; i < fbPipes.length; i++) {
      drawFBPipeNeon(fbPipes[i]);
    }

    ctx.fillStyle = '#102216';
    ctx.fillRect(0, FB_FLOOR_Y, V_WIDTH, V_HEIGHT - FB_FLOOR_Y);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, FB_FLOOR_Y); ctx.lineTo(V_WIDTH, FB_FLOOR_Y); ctx.stroke();
    ctx.shadowBlur = 0;

    const gShift = fbGroundScroll % 40;
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.15)'; ctx.lineWidth = 3;
    for (let gx = -gShift; gx < V_WIDTH; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, FB_FLOOR_Y); ctx.lineTo(gx - 15, V_HEIGHT); ctx.stroke();
    }

    drawFBBirdNeon(FB_BIRD_X, fbBird.y, fbBird.pitch);

    if (fbGameState === FB_STATE.PLAYING) {
      ctx.font = '900 48px Outfit, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(fbScore, V_WIDTH / 2, 80);
    }
  }

  function drawFBPipeNeon(pipe) {
    const px = pipe.x;
    const topH = pipe.gapY - (FB_PIPE_GAP / 2);
    const botY = pipe.gapY + (FB_PIPE_GAP / 2);
    const botH = FB_FLOOR_Y - botY;

    ctx.save();
    ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#0d2d18'; ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 3;

    if (topH > 0) {
      ctx.fillRect(px, 0, FB_PIPE_WIDTH, topH);
      ctx.strokeRect(px, -4, FB_PIPE_WIDTH, topH + 4);
      ctx.fillRect(px - 6, topH - 24, FB_PIPE_WIDTH + 12, 24);
      ctx.strokeRect(px - 6, topH - 24, FB_PIPE_WIDTH + 12, 24);
    }
    if (botH > 0) {
      ctx.fillRect(px, botY, FB_PIPE_WIDTH, botH);
      ctx.strokeRect(px, botY, FB_PIPE_WIDTH, botH + 4);
      ctx.fillRect(px - 6, botY, FB_PIPE_WIDTH + 12, 24);
      ctx.strokeRect(px - 6, botY, FB_PIPE_WIDTH + 12, 24);
    }
    ctx.restore();
  }

  function drawFBBirdNeon(x, y, pitch) {
    ctx.save();
    ctx.translate(x + FB_BIRD_SIZE / 2, y + FB_BIRD_SIZE / 2);
    ctx.rotate((pitch * Math.PI) / 180);

    ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffe600'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, FB_BIRD_SIZE * 0.5, FB_BIRD_SIZE * 0.42, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(8, -5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(10, -5, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ff7700';
    ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(24, 2); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-6, 0, 9, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function renderDinoNeon() {
    // Desert Sunset Gradient
    let sky = ctx.createLinearGradient(0, 0, 0, DINO_FLOOR_Y);
    sky.addColorStop(0, '#15101a');
    sky.addColorStop(1, '#2b1822');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, V_WIDTH, DINO_FLOOR_Y);

    // Desert Ground Line
    ctx.fillStyle = '#160d14';
    ctx.fillRect(0, DINO_FLOOR_Y, V_WIDTH, V_HEIGHT - DINO_FLOOR_Y);
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff7700'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, DINO_FLOOR_Y); ctx.lineTo(V_WIDTH, DINO_FLOOR_Y); ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground pebbles
    const gShift = dinoGroundScroll % 48;
    ctx.fillStyle = 'rgba(255, 119, 0, 0.2)';
    for (let gx = -gShift; gx < V_WIDTH; gx += 48) {
      ctx.fillRect(gx + 10, DINO_FLOOR_Y + 10, 8, 3);
      ctx.fillRect(gx + 26, DINO_FLOOR_Y + 20, 14, 3);
    }

    // Obstacles (Cacti & Birds)
    for (let i = 0; i < dinoObstacles.length; i++) {
      drawDinoObstacleNeon(dinoObstacles[i]);
    }

    // T-Rex Player
    drawDinoPlayerNeon(DINO_X, dino.y);

    // Score HUD (HI 00000  00000)
    ctx.font = '800 24px JetBrains Mono, monospace';
    ctx.fillStyle = '#ffaa55';
    ctx.textAlign = 'right';
    const sStr = dinoScore.toString().padStart(5, '0');
    const bStr = dinoBestScore.toString().padStart(5, '0');
    ctx.fillText(`HI ${bStr}  ${sStr}`, V_WIDTH - 40, 50);
  }

  function drawDinoObstacleNeon(obs) {
    ctx.save();
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff66';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    if (obs.type === 'bird') {
      // Pterodactyl
      ctx.shadowColor = '#ff0055';
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, obs.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.beginPath();
      const wingFlap = Math.floor(Date.now() / 140) % 2 === 0;
      if (wingFlap) {
        ctx.moveTo(obs.x + 10, obs.y + 10);
        ctx.lineTo(obs.x + 24, obs.y - 12);
        ctx.lineTo(obs.x + 36, obs.y + 10);
      } else {
        ctx.moveTo(obs.x + 10, obs.y + 10);
        ctx.lineTo(obs.x + 24, obs.y + 32);
        ctx.lineTo(obs.x + 36, obs.y + 10);
      }
      ctx.stroke();
    } else {
      // Cacti
      ctx.beginPath();
      ctx.roundRect(obs.x + obs.w / 2 - 6, obs.y, 12, obs.h, 6);
      ctx.fill();
      ctx.stroke();

      // Cactus arms
      if (obs.type === 'double_cactus' || obs.type === 'large_cactus') {
        ctx.fillRect(obs.x, obs.y + 14, 10, 6);
        ctx.fillRect(obs.x, obs.y + 6, 6, 12);
        ctx.fillRect(obs.x + obs.w - 10, obs.y + 18, 10, 6);
        ctx.fillRect(obs.x + obs.w - 6, obs.y + 10, 6, 12);
      }
    }
    ctx.restore();
  }

  function drawDinoPlayerNeon(x, y) {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Head
    ctx.fillRect(x + 24, y, 24, 20);
    ctx.fillRect(x + 32, y + 8, 16, 12);

    // Eye
    ctx.fillStyle = '#0a0d17';
    if (dinoGameState !== DINO_STATE.DEAD) {
      ctx.fillRect(x + 28, y + 4, 4, 4);
    } else {
      ctx.strokeStyle = '#0a0d17';
      ctx.strokeRect(x + 28, y + 4, 4, 4);
    }

    // Body & Tail
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(x + 16, y + 16, 20, 24);
    ctx.fillRect(x + 4, y + 24, 16, 12);
    ctx.fillRect(x, y + 24, 6, 6);
    ctx.fillRect(x + 32, y + 26, 10, 6); // Arm

    // Legs
    if (!dino.onGround) {
      ctx.fillRect(x + 16, y + 40, 6, 12);
      ctx.fillRect(x + 28, y + 40, 6, 10);
    } else {
      const step = Math.floor(Date.now() / 90) % 2 === 0;
      if (step) {
        ctx.fillRect(x + 16, y + 40, 6, 16);
        ctx.fillRect(x + 28, y + 40, 6, 10);
      } else {
        ctx.fillRect(x + 16, y + 40, 6, 10);
        ctx.fillRect(x + 28, y + 40, 6, 16);
      }
    }
    ctx.restore();
  }

  function renderSwitchOverlayNeon() {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.85)';
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    ctx.font = '900 36px Outfit, sans-serif';
    ctx.fillStyle = '#ff7700';
    ctx.textAlign = 'center';
    ctx.fillText('SWITCHING GAME...', V_WIDTH / 2, V_HEIGHT / 2 - 30);

    ctx.font = '800 28px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    if (activeGame === 'geodash') {
      ctx.fillText('> GEOMETRY DASH <', V_WIDTH / 2, V_HEIGHT / 2 + 20);
    } else if (activeGame === 'flappy') {
      ctx.fillText('> FLAPPY BIRD 🐥 <', V_WIDTH / 2, V_HEIGHT / 2 + 20);
    } else {
      ctx.fillText('> CHROME DINO 🦖 <', V_WIDTH / 2, V_HEIGHT / 2 + 20);
    }
  }

  // --- OLED 128x64 CUTE FACE & SYSTEM MENU RENDERERS ---
  function renderFaceOLED() {
    const now = performance.now();
    const bob = Math.round(Math.sin(now * 0.0035) * 1.5);
    const baseY = 15 + bob;
    let lex = 26;
    let rex = 78;

    if (faceMood === FACE_MOOD.HAPPY_SQUINT) {
      // Photo 2: Exact Happy Curved Arcs ^ ^
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.lineWidth = 3;
      oledCtx.lineCap = 'round';

      // Left Eye Arc ^
      oledCtx.beginPath();
      oledCtx.moveTo(lex, baseY + 14);
      oledCtx.lineTo(lex + 11, baseY + 4);
      oledCtx.lineTo(lex + 23, baseY + 14);
      oledCtx.stroke();

      // Right Eye Arc ^
      oledCtx.beginPath();
      oledCtx.moveTo(rex, baseY + 14);
      oledCtx.lineTo(rex + 11, baseY + 4);
      oledCtx.lineTo(rex + 23, baseY + 14);
      oledCtx.stroke();

      // Wide open cheerful smile
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.arc(64, baseY + 26, 6, 0, Math.PI, false);
      oledCtx.fill();

    } else if (faceMood === FACE_MOOD.WINK) {
      // Winking: Left Eye Arc ^, Right Eye Open with pupil
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.lineWidth = 3;
      oledCtx.lineCap = 'round';

      oledCtx.beginPath();
      oledCtx.moveTo(lex, baseY + 14);
      oledCtx.lineTo(lex + 11, baseY + 4);
      oledCtx.lineTo(lex + 23, baseY + 14);
      oledCtx.stroke();

      // Right eye socket
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(rex, baseY, 24, 26, 7);
      oledCtx.fill();

      // Iris in right eye
      const rIx = Math.round(rex + 12 + irisCurX * 0.8);
      const rIy = Math.round(baseY + 13 + irisCurY * 0.8);
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(rIx - 4, rIy - 5, 8, 10);
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(rIx - 2, rIy - 3, 2, 2);

      // Blush marks on left cheek
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        oledCtx.beginPath();
        oledCtx.moveTo(lex + 2 + s * 4, baseY + 28);
        oledCtx.lineTo(lex + 5 + s * 4, baseY + 34);
        oledCtx.stroke();
      }

      // Cheeky smirk
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(60, baseY + 26, 12, 3);
      oledCtx.fillRect(70, baseY + 24, 3, 3);

    } else if (faceMood === FACE_MOOD.BLUSH) {
      // Blushing: Rounded eyes with Star Sparkle Pupils + Cheek Slashes
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex, baseY, 24, 26, 7);
      oledCtx.roundRect(rex, baseY, 24, 26, 7);
      oledCtx.fill();

      // Dark pupils
      const lIx = Math.round(lex + 12 + irisCurX * 0.7);
      const lIy = Math.round(baseY + 13 + irisCurY * 0.7);
      const rIx = Math.round(rex + 12 + irisCurX * 0.7);
      const rIy = Math.round(baseY + 13 + irisCurY * 0.7);

      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(lIx - 4, lIy - 5, 8, 10);
      oledCtx.fillRect(rIx - 4, rIy - 5, 8, 10);

      // Sparkle cross in pupils
      oledCtx.fillStyle = '#d4ffd4';
      [lIx, rIx].forEach(cx => {
        oledCtx.fillRect(cx - 2, lIy, 5, 1);
        oledCtx.fillRect(cx, lIy - 2, 1, 5);
      });

      // Cheek blush slashes
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        oledCtx.beginPath();
        oledCtx.moveTo(lex + 2 + s * 4, baseY + 28);
        oledCtx.lineTo(lex + 5 + s * 4, baseY + 34);
        oledCtx.stroke();

        oledCtx.beginPath();
        oledCtx.moveTo(rex + 10 + s * 4, baseY + 28);
        oledCtx.lineTo(rex + 13 + s * 4, baseY + 34);
        oledCtx.stroke();
      }

      // Shy smile
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(58, baseY + 26, 12, 5, 2);
      oledCtx.fill();
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(58, baseY + 26, 12, 2);

    } else if (faceMood === FACE_MOOD.LOVE_OVERLOAD) {
      // Heavenly Mode: Glowing Eyes with Heart Cutouts + Floating Hearts
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex, baseY, 24, 26, 7);
      oledCtx.roundRect(rex, baseY, 24, 26, 7);
      oledCtx.fill();

      // Heart cutout in eyes
      const lIx = Math.round(lex + 12 + irisCurX * 0.6);
      const lIy = Math.round(baseY + 12 + irisCurY * 0.6);
      const rIx = Math.round(rex + 12 + irisCurX * 0.6);
      const rIy = Math.round(baseY + 12 + irisCurY * 0.6);

      oledCtx.fillStyle = '#040804';
      [lIx, rIx].forEach(cx => {
        oledCtx.fillRect(cx - 4, lIy - 3, 3, 4);
        oledCtx.fillRect(cx + 1, lIy - 3, 3, 4);
        oledCtx.fillRect(cx - 3, lIy + 1, 6, 2);
        oledCtx.fillRect(cx - 2, lIy + 3, 4, 2);
        oledCtx.fillRect(cx - 1, lIy + 5, 2, 1);
      });

      // Blissful wide open smile
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.arc(64, baseY + 26, 6, 0, Math.PI, false);
      oledCtx.fill();

      // Floating Hearts
      const t = Math.floor(now / 120);
      oledCtx.fillStyle = '#d4ffd4';
      const h1Y = (baseY - 2 - (t % 16));
      oledCtx.fillRect(40, h1Y, 3, 2); oledCtx.fillRect(44, h1Y, 3, 2); oledCtx.fillRect(41, h1Y + 2, 5, 2);
      const h2Y = (baseY - 6 - ((t + 8) % 18));
      oledCtx.fillRect(84, h2Y, 3, 2); oledCtx.fillRect(88, h2Y, 3, 2); oledCtx.fillRect(85, h2Y + 2, 5, 2);

    } else if (faceMood === FACE_MOOD.AFTERGLOW) {
      // Content half-closed eyes
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex, baseY + 8, 24, 12, 4);
      oledCtx.roundRect(rex, baseY + 8, 24, 12, 4);
      oledCtx.fill();

      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(58, baseY + 26, 12, 5, 2);
      oledCtx.fill();
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(58, baseY + 26, 12, 2);

    } else if (faceMood === FACE_MOOD.BLINK) {
      // Blinking eyelids
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex, baseY + 11, 24, 4, 2);
      oledCtx.roundRect(rex, baseY + 11, 24, 4, 2);
      oledCtx.fill();

      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(56, baseY + 26, 16, 6, 3);
      oledCtx.fill();
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(56, baseY + 26, 16, 3);

    } else if (faceMood === FACE_MOOD.SLEEPY) {
      // Sleepy eyelids
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex + 2, baseY + 12, 20, 4, 2);
      oledCtx.roundRect(rex + 2, baseY + 12, 20, 4, 2);
      oledCtx.fill();

      oledCtx.fillRect(60, baseY + 27, 8, 2);

      // Floating 'z' and 'Z' particles
      const zShift = Math.floor((now / 180) % 26);
      oledCtx.font = '8px monospace';
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillText('z', 104 - Math.floor(zShift / 3), 26 - zShift);
      oledCtx.fillText('Z', 114 - Math.floor(zShift / 2), 16 - zShift);

    } else {
      // Normal living eyes with 360° Iris Tracking
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(lex, baseY, 24, 26, 7);
      oledCtx.roundRect(rex, baseY, 24, 26, 7);
      oledCtx.fill();

      // Living Irises
      const lIx = Math.round(lex + 12 + irisCurX * 0.9);
      const lIy = Math.round(baseY + 13 + irisCurY * 0.9);
      const rIx = Math.round(rex + 12 + irisCurX * 0.9);
      const rIy = Math.round(baseY + 13 + irisCurY * 0.9);

      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(lIx - 5, lIy - 6, 10, 12);
      oledCtx.fillRect(rIx - 5, rIy - 6, 10, 12);

      // Glossy specular highlight
      oledCtx.fillStyle = '#d4ffd4';
      [lIx, rIx].forEach(cx => {
        oledCtx.fillRect(cx - 3, lIy - 4, 3, 3);
        oledCtx.fillRect(cx + 2, lIy + 3, 1, 1);
      });

      // Curved smiling mouth
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.beginPath();
      oledCtx.roundRect(56, baseY + 26, 16, 6, 3);
      oledCtx.fill();
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(56, baseY + 26, 16, 3);
    }

    // Bottom prompt guide
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText('B1:PET   B1+2:MENU', 10, 60);
  }

  function renderSystemMenuOLED() {
    oledCtx.fillStyle = '#040804';
    oledCtx.fillRect(0, 0, 128, 64);
    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.strokeRect(0, 0, 128, 64);
    oledCtx.beginPath();
    oledCtx.moveTo(0, 11);
    oledCtx.lineTo(128, 11);
    oledCtx.moveTo(0, 53);
    oledCtx.lineTo(128, 53);
    oledCtx.stroke();

    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText('=== ARCADE HUB ===', 14, 9);

    const labels = [
      '1. HOME (PET FACE)',
      '2. GEOMETRY DASH',
      '3. FLAPPY BIRD',
      '4. CHROME DINO',
      '5. CAR RACING',
      '6. RETRO SNAKE',
      '7. SPACE INVADERS'
    ];

    // Smooth 5-item scrolling window
    const startIdx = Math.max(0, Math.min(labels.length - 5, systemMenuSelection - 2));
    for (let i = 0; i < 5; i++) {
      const idx = startIdx + i;
      if (idx >= labels.length) break;
      const itemY = 14 + i * 8;
      if (idx === systemMenuSelection) {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(2, itemY - 1, 124, 8);
        oledCtx.fillStyle = '#040804';
        oledCtx.fillText('> ' + labels[idx], 4, itemY + 6);
      } else {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillText('  ' + labels[idx], 4, itemY + 6);
      }
    }

    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText('B2:NEXT   B1:ENTER', 8, 61);
  }

  // --- OLED 128x64 RENDERER ---
  function renderOLED() {
    oledCtx.fillStyle = '#040804';
    oledCtx.fillRect(0, 0, 128, 64);

    if (isSystemMenuOpen) {
      renderSystemMenuOLED();
    } else if (activeGame === 'face') {
      renderFaceOLED();
    } else if (activeGame === 'geodash') {
      renderGDOLED();
    } else if (activeGame === 'flappy') {
      renderFBOLED();
    } else if (activeGame === 'dino') {
      renderDinoOLED();
    } else if (activeGame === 'car') {
      renderCarOLED();
    } else if (activeGame === 'snake') {
      renderSnakeOLED();
    } else if (activeGame === 'invaders') {
      renderInvadersOLED();
    }

    if (isSwitchingGame && !isSystemMenuOpen) {
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(10, 14, 108, 36);
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.strokeRect(10, 14, 108, 36);
      oledCtx.font = '8px monospace';
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillText('SWITCHING GAME...', 16, 26);
      let gName = 'GEOMETRY DASH';
      if (activeGame === 'flappy') gName = 'FLAPPY BIRD';
      else if (activeGame === 'dino') gName = 'CHROME DINO';
      else if (activeGame === 'car') gName = 'CAR RACING';
      else if (activeGame === 'snake') gName = 'RETRO SNAKE';
      else if (activeGame === 'invaders') gName = 'SPACE INVADERS';
      else if (activeGame === 'face') gName = 'COMPANION PET';
      oledCtx.fillText(gName, 18, 38);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oledCanvas, 0, 0, V_WIDTH, V_HEIGHT);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let sy = 0; sy < V_HEIGHT; sy += 4) {
      ctx.fillRect(0, sy, V_WIDTH, 2);
    }
  }

  function renderGDOLED() {
    const OLED_FLOOR_Y = 52;
    const OLED_CUBE_SIZE = 10;
    const OLED_PLAYER_X = 24;
    const oledCamX = gdCameraX * 0.18;

    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.beginPath();
    oledCtx.moveTo(0, OLED_FLOOR_Y);
    oledCtx.lineTo(128, OLED_FLOOR_Y);
    oledCtx.stroke();

    const scrollDot = Math.floor(oledCamX) % 8;
    for (let gx = -scrollDot; gx < 128; gx += 8) {
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(gx, OLED_FLOOR_Y + 4, 1, 1);
      oledCtx.fillRect(gx + 4, OLED_FLOOR_Y + 8, 1, 1);
    }

    oledCtx.strokeRect(0, 0, 128, 4);
    const fillW = Math.floor((gdCurrentPercent * 126) / 100);
    if (fillW > 0) {
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(1, 1, fillW, 2);
    }
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(gdCurrentPercent + '%', 100, 12);

    for (let i = 0; i < GD_LEVEL_TRACK.length; i++) {
      const obs = GD_LEVEL_TRACK[i];
      const ox = (obs.x * 0.18) - oledCamX;
      if (ox < -20 || ox > 140) continue;

      if (obs.type === GD_OBS.SPIKE) {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.beginPath();
        oledCtx.moveTo(ox + 4, OLED_FLOOR_Y - 9);
        oledCtx.lineTo(ox + 8, OLED_FLOOR_Y);
        oledCtx.lineTo(ox, OLED_FLOOR_Y);
        oledCtx.fill();
      } else if (obs.type === GD_OBS.BLOCK) {
        oledCtx.strokeRect(ox, OLED_FLOOR_Y - 10, 10, 10);
      } else if (obs.type === GD_OBS.PAD_JUMP) {
        oledCtx.fillRect(ox, OLED_FLOOR_Y - 3, 12, 3);
      }
    }

    const oledPlayerY = (gdPlayer.y / GD_FLOOR_Y) * (OLED_FLOOR_Y - OLED_CUBE_SIZE);
    if (gdGameState === GD_STATE.PLAYING) {
      oledCtx.save();
      oledCtx.translate(OLED_PLAYER_X + OLED_CUBE_SIZE / 2, oledPlayerY + OLED_CUBE_SIZE / 2);
      oledCtx.rotate((gdPlayer.angle * Math.PI) / 180);
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.strokeRect(-5, -5, 10, 10);
      oledCtx.strokeRect(-2, -2, 4, 4);
      oledCtx.restore();
    }
  }

  function renderFBOLED() {
    const OLED_FLOOR_Y = 56;
    const OLED_BIRD_X = 24;

    for (let i = 0; i < fbPipes.length; i++) {
      const p = fbPipes[i];
      const ox = p.x * (128 / V_WIDTH);
      const topH = (p.gapY - FB_PIPE_GAP / 2) * (64 / V_HEIGHT);
      const botY = (p.gapY + FB_PIPE_GAP / 2) * (64 / V_HEIGHT);
      const botH = OLED_FLOOR_Y - botY;

      if (ox < -20 || ox > 140) continue;

      oledCtx.strokeStyle = '#d4ffd4';
      if (topH > 0) {
        oledCtx.strokeRect(ox, 0, 12, topH);
        oledCtx.strokeRect(ox - 1, topH - 4, 14, 4);
      }
      if (botH > 0) {
        oledCtx.strokeRect(ox, botY, 12, botH);
        oledCtx.strokeRect(ox - 1, botY, 14, 4);
      }
    }

    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.beginPath();
    oledCtx.moveTo(0, OLED_FLOOR_Y);
    oledCtx.lineTo(128, OLED_FLOOR_Y);
    oledCtx.stroke();

    const oledBirdY = fbBird.y * (64 / V_HEIGHT);
    oledCtx.strokeRect(OLED_BIRD_X, oledBirdY, 9, 7);
    oledCtx.fillRect(OLED_BIRD_X + 5, oledBirdY + 2, 1, 1);
    oledCtx.fillRect(OLED_BIRD_X + 8, oledBirdY + 3, 2, 2);

    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(fbScore.toString(), 60, 10);
  }

  function renderDinoOLED() {
    const OLED_FLOOR_Y = 54;
    const OLED_DINO_X = 16;
    const OLED_DINO_H = 14;

    // Horizon line
    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.beginPath();
    oledCtx.moveTo(0, OLED_FLOOR_Y);
    oledCtx.lineTo(128, OLED_FLOOR_Y);
    oledCtx.stroke();

    // Pebbles
    const gShift = Math.floor(dinoGroundScroll * (128 / V_WIDTH)) % 12;
    for (let gx = -gShift; gx < 128; gx += 12) {
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(gx + 2, OLED_FLOOR_Y + 3, 1, 1);
      oledCtx.fillRect(gx + 7, OLED_FLOOR_Y + 6, 1, 1);
    }

    // Obstacles
    for (let i = 0; i < dinoObstacles.length; i++) {
      const obs = dinoObstacles[i];
      const ox = Math.round(OLED_DINO_X + ((obs.x - DINO_X) * (128 / V_WIDTH)));
      if (ox < -15 || ox > 135) continue;

      oledCtx.fillStyle = '#d4ffd4';
      if (obs.type === 'bird') {
        oledCtx.fillRect(ox + 3, OLED_FLOOR_Y - 14, 6, 3);
        oledCtx.fillRect(ox, OLED_FLOOR_Y - 13, 3, 1);
        oledCtx.fillRect(ox + 9, OLED_FLOOR_Y - 13, 1, 1);
      } else if (obs.type === 'double_cactus') {
        oledCtx.fillRect(ox + 1, OLED_FLOOR_Y - 9, 2, 9);
        oledCtx.fillRect(ox, OLED_FLOOR_Y - 6, 2, 3);
        oledCtx.fillRect(ox + 6, OLED_FLOOR_Y - 8, 2, 8);
        oledCtx.fillRect(ox + 7, OLED_FLOOR_Y - 5, 2, 3);
      } else if (obs.type === 'large_cactus') {
        oledCtx.fillRect(ox + 2, OLED_FLOOR_Y - 12, 2, 12);
        oledCtx.fillRect(ox, OLED_FLOOR_Y - 8, 2, 4);
        oledCtx.fillRect(ox + 4, OLED_FLOOR_Y - 9, 2, 5);
      } else {
        // Small cactus (5x9)
        oledCtx.fillRect(ox + 2, OLED_FLOOR_Y - 9, 2, 9);
        oledCtx.fillRect(ox, OLED_FLOOR_Y - 6, 2, 3);
        oledCtx.fillRect(ox + 3, OLED_FLOOR_Y - 7, 2, 4);
      }
    }

    // Dino Player (Sits directly on OLED_FLOOR_Y = 54)
    const jumpProgress = Math.max(0, (DINO_FLOOR_Y - DINO_H) - dino.y);
    const oledDinoY = Math.round((OLED_FLOOR_Y - OLED_DINO_H) - (jumpProgress * (28 / 180)));

    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillRect(OLED_DINO_X + 6, oledDinoY, 6, 5);
    oledCtx.fillRect(OLED_DINO_X + 8, oledDinoY + 2, 4, 3);
    oledCtx.fillRect(OLED_DINO_X + 5, oledDinoY + 4, 4, 6);
    oledCtx.fillRect(OLED_DINO_X + 2, oledDinoY + 6, 8, 4);
    oledCtx.fillRect(OLED_DINO_X + 9, oledDinoY + 7, 3, 2);
    oledCtx.fillRect(OLED_DINO_X, oledDinoY + 6, 3, 2);

    if (dino.onGround) {
      const step = Math.floor(Date.now() / 90) % 2 === 0;
      if (step) {
        oledCtx.fillRect(OLED_DINO_X + 4, oledDinoY + 10, 2, 4);
        oledCtx.fillRect(OLED_DINO_X + 8, oledDinoY + 10, 2, 2);
      } else {
        oledCtx.fillRect(OLED_DINO_X + 4, oledDinoY + 10, 2, 2);
        oledCtx.fillRect(OLED_DINO_X + 8, oledDinoY + 10, 2, 4);
      }
    } else {
      oledCtx.fillRect(OLED_DINO_X + 4, oledDinoY + 10, 2, 2);
      oledCtx.fillRect(OLED_DINO_X + 8, oledDinoY + 10, 2, 2);
    }

    // Score
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(dinoScore.toString().padStart(4, '0'), 95, 10);
  }

  function renderCarOLED() {
    // 3-Lane Highway OLED View
    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.strokeRect(0, 12, 128, 46);

    // Dashed lane divider lines at y = 27 and y = 43
    const dashShift = Math.floor((carRoadScroll * 0.15) % 12);
    for (let x = -dashShift; x < 128; x += 12) {
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillRect(x, 27, 6, 1);
      oledCtx.fillRect(x, 43, 6, 1);
    }

    // Traffic & Collectibles
    for (let i = 0; i < carTraffic.length; i++) {
      const v = carTraffic[i];
      const ox = Math.round(18 + ((v.x - CAR_PLAYER_X) * 0.14));
      if (ox < -24 || ox > 136) continue;

      const oy = 15 + v.lane * 15;
      oledCtx.fillStyle = '#d4ffd4';

      if (v.type === 'truck') {
        // Truck: 18x9 body with cab & wheels
        oledCtx.fillRect(ox, oy + 1, 18, 7);
        oledCtx.fillStyle = '#040804';
        oledCtx.fillRect(ox + 12, oy + 2, 3, 5);
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(ox + 2, oy, 3, 1);
        oledCtx.fillRect(ox + 8, oy, 3, 1);
        oledCtx.fillRect(ox + 13, oy, 3, 1);
        oledCtx.fillRect(ox + 2, oy + 8, 3, 1);
        oledCtx.fillRect(ox + 8, oy + 8, 3, 1);
        oledCtx.fillRect(ox + 13, oy + 8, 3, 1);
      } else if (v.type === 'nitro') {
        // Nitro Pickup: Flashy diamond with 'N'
        oledCtx.fillRect(ox + 2, oy + 1, 3, 5);
        oledCtx.fillRect(ox + 1, oy + 2, 5, 3);
        oledCtx.fillStyle = '#040804';
        oledCtx.fillRect(ox + 2, oy + 3, 1, 1);
      } else if (v.type === 'coin') {
        // Coin Pickup: 4x4 rounded coin
        oledCtx.fillRect(ox + 1, oy + 2, 5, 5);
        oledCtx.fillStyle = '#040804';
        oledCtx.fillRect(ox + 2, oy + 3, 3, 3);
      } else {
        // Sedan Car: 11x7 body
        oledCtx.fillRect(ox, oy + 1, 11, 5);
        oledCtx.fillStyle = '#040804';
        oledCtx.fillRect(ox + 4, oy + 2, 3, 3);
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(ox + 1, oy, 3, 1);
        oledCtx.fillRect(ox + 7, oy, 3, 1);
        oledCtx.fillRect(ox + 1, oy + 6, 3, 1);
        oledCtx.fillRect(ox + 7, oy + 6, 3, 1);
      }
    }

    // Player Car
    const playerOledY = Math.round(15 + carPlayerLane * 15);
    const px = 18;

    // Nitro exhaust flicker
    if (carNitroTimer > 0) {
      oledCtx.fillStyle = '#d4ffd4';
      const flameLen = Math.floor(Math.random() * 6) + 4;
      oledCtx.fillRect(px - flameLen, playerOledY + 2, flameLen, 3);
    }

    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillRect(px, playerOledY + 1, 12, 5);
    oledCtx.fillStyle = '#040804';
    oledCtx.fillRect(px + 6, playerOledY + 2, 3, 3);
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillRect(px + 2, playerOledY, 3, 1);
    oledCtx.fillRect(px + 7, playerOledY, 3, 1);
    oledCtx.fillRect(px + 2, playerOledY + 6, 3, 1);
    oledCtx.fillRect(px + 7, playerOledY + 6, 3, 1);

    // Status Header
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(`${carDistance}M`, 6, 9);
    if (carNitroTimer > 0) {
      oledCtx.fillText('⚡NITRO!', 44, 9);
    }
    oledCtx.fillText(`S:${carScore}`, 92, 9);

    if (carState === 'DEAD') {
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(24, 20, 80, 24);
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.strokeRect(24, 20, 80, 24);
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillText('CRASHED!', 42, 31);
      oledCtx.fillText('B1: RETRY', 40, 40);
    }
  }

  function renderSnakeOLED() {
    // 28x16 Grid mapped to OLED screen
    oledCtx.strokeStyle = '#d4ffd4';
    oledCtx.strokeRect(7, 11, 114, 50);

    // Food
    const fx = 8 + snakeFood.x * 4;
    const fy = 12 + snakeFood.y * 3;
    oledCtx.fillStyle = '#d4ffd4';
    if (snakeFood.isGolden) {
      const flash = Math.floor(performance.now() / 100) % 2 === 0;
      if (flash) {
        oledCtx.fillRect(fx, fy, 4, 3);
        oledCtx.fillRect(fx - 1, fy + 1, 6, 1);
      } else {
        oledCtx.strokeRect(fx, fy, 4, 3);
      }
    } else {
      oledCtx.fillRect(fx + 1, fy + 1, 2, 2);
      oledCtx.fillRect(fx + 1, fy, 1, 1);
    }

    // Snake Body & Head
    for (let i = 0; i < snakeBody.length; i++) {
      const b = snakeBody[i];
      const sx = 8 + b.x * 4;
      const sy = 12 + b.y * 3;

      if (i === 0) {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(sx, sy, 4, 3);
        oledCtx.fillStyle = '#040804';
        if (snakeDir.x === 1) oledCtx.fillRect(sx + 2, sy + 1, 1, 1);
        else if (snakeDir.x === -1) oledCtx.fillRect(sx + 1, sy + 1, 1, 1);
        else if (snakeDir.y === 1) oledCtx.fillRect(sx + 1, sy + 1, 1, 1);
        else oledCtx.fillRect(sx + 1, sy, 1, 1);
      } else {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(sx, sy, 3, 2);
      }
    }

    // Top status bar
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(`S:${snakeScore}`, 8, 9);
    if (snakeFood.isGolden) {
      oledCtx.fillText(`★${Math.ceil(snakeFood.goldenTimer)}s`, 48, 9);
    }
    oledCtx.fillText(`HI:${snakeBestScore}`, 92, 9);

    if (snakeState === 'DEAD') {
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(24, 22, 80, 22);
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.strokeRect(24, 22, 80, 22);
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillText('GAME OVER', 38, 32);
      oledCtx.fillText('B1: PLAY AGAIN', 28, 41);
    }
  }

  function renderInvadersOLED() {
    // UFO Mystery Ship
    if (invUfo.active) {
      const ux = Math.round((invUfo.x / V_WIDTH) * 118 + 5);
      if (ux >= -12 && ux <= 128) {
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(ux + 2, 10, 6, 1);
        oledCtx.fillRect(ux, 11, 10, 2);
        oledCtx.fillRect(ux + 3, 13, 4, 1);
      }
    }

    // Alien Armada (15 invaders)
    for (let i = 0; i < invAliens.length; i++) {
      const al = invAliens[i];
      if (!al.alive) continue;

      const ax = Math.round(((invFleetX + al.col * 110) / V_WIDTH) * 112 + 6);
      const ay = Math.round(((invFleetY + al.row * 50) / V_HEIGHT) * 44 + 8);

      oledCtx.fillStyle = '#d4ffd4';
      if (al.row === 0) {
        // Squid
        oledCtx.fillRect(ax + 2, ay, 4, 1);
        oledCtx.fillRect(ax + 1, ay + 1, 6, 2);
        oledCtx.fillRect(ax, ay + 2, 8, 1);
        if (invAlienAnimFrame === 0) {
          oledCtx.fillRect(ax + 1, ay + 3, 2, 2);
          oledCtx.fillRect(ax + 5, ay + 3, 2, 2);
        } else {
          oledCtx.fillRect(ax, ay + 3, 2, 2);
          oledCtx.fillRect(ax + 6, ay + 3, 2, 2);
        }
      } else if (al.row === 1) {
        // Crab
        oledCtx.fillRect(ax + 2, ay, 4, 1);
        oledCtx.fillRect(ax + 1, ay + 1, 6, 2);
        oledCtx.fillRect(ax, ay + 1, 8, 1);
        if (invAlienAnimFrame === 0) {
          oledCtx.fillRect(ax + 1, ay + 3, 1, 2);
          oledCtx.fillRect(ax + 6, ay + 3, 1, 2);
        } else {
          oledCtx.fillRect(ax + 2, ay + 3, 1, 2);
          oledCtx.fillRect(ax + 5, ay + 3, 1, 2);
        }
      } else {
        // Octopus
        oledCtx.fillRect(ax + 2, ay, 4, 1);
        oledCtx.fillRect(ax, ay + 1, 8, 2);
        if (invAlienAnimFrame === 0) {
          oledCtx.fillRect(ax + 1, ay + 3, 2, 1);
          oledCtx.fillRect(ax + 5, ay + 3, 2, 1);
        } else {
          oledCtx.fillRect(ax, ay + 3, 2, 1);
          oledCtx.fillRect(ax + 6, ay + 3, 2, 1);
        }
      }
    }

    // Destructible Bunkers
    for (let b = 0; b < invBunkers.length; b++) {
      const blocks = invBunkers[b];
      for (let k = 0; k < blocks.length; k++) {
        const blk = blocks[k];
        const bx = Math.round((blk.x / V_WIDTH) * 112 + 6);
        const by = Math.round((blk.y / V_HEIGHT) * 60 + 2);
        oledCtx.fillStyle = '#d4ffd4';
        oledCtx.fillRect(bx, by, 3, 2);
      }
    }

    // Alien Bombs
    oledCtx.fillStyle = '#d4ffd4';
    for (let i = 0; i < invAlienBombs.length; i++) {
      const bomb = invAlienBombs[i];
      const bx = Math.round((bomb.x / V_WIDTH) * 112 + 6);
      const by = Math.round((bomb.y / V_HEIGHT) * 60);
      oledCtx.fillRect(bx, by, 1, 3);
    }

    // Player Lasers
    for (let i = 0; i < invPlayerLasers.length; i++) {
      const laser = invPlayerLasers[i];
      const lx = Math.round((laser.x / V_WIDTH) * 112 + 6);
      const ly = Math.round((laser.y / V_HEIGHT) * 60);
      oledCtx.fillRect(lx, ly, 1, 3);
    }

    // Player Cannon
    const px = Math.round((invPlayerX / V_WIDTH) * 112 + 6);
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillRect(px - 4, 58, 9, 3);
    oledCtx.fillRect(px - 2, 56, 5, 2);
    oledCtx.fillRect(px, 54, 1, 2);

    // Header Status Bar
    oledCtx.font = '8px monospace';
    oledCtx.fillStyle = '#d4ffd4';
    oledCtx.fillText(`S:${invScore}`, 6, 8);
    oledCtx.fillText(`W:${invWave}`, 56, 8);
    let hearts = '';
    for (let h = 0; h < invLives; h++) hearts += '♥';
    oledCtx.fillText(hearts, 98, 8);

    if (invState === 'DEAD') {
      oledCtx.fillStyle = '#040804';
      oledCtx.fillRect(20, 22, 88, 22);
      oledCtx.strokeStyle = '#d4ffd4';
      oledCtx.strokeRect(20, 22, 88, 22);
      oledCtx.fillStyle = '#d4ffd4';
      oledCtx.fillText('MISSION FAILED', 24, 32);
      oledCtx.fillText('B1: RETRY', 40, 41);
    }
  }

  // ==========================================================================
  //  SECTION 9: INPUT CONTROLS (BUTTON 1 & BUTTON 2)
  // ==========================================================================
  function onButton1Action() {
    sound().ensureContext();

    if (isSystemMenuOpen) {
      selectGameFromMenu(GAME_LIST[systemMenuSelection]);
      return;
    }

    if (activeGame === 'face') {
      petFace();
    } else if (activeGame === 'geodash') {
      isJumpPressed = true;
      jumpBufferTimer = JUMP_BUFFER_MS;
      if (gdGameState === GD_STATE.MENU || gdGameState === GD_STATE.DEAD || gdGameState === GD_STATE.VICTORY) {
        startGDGame();
      }
    } else if (activeGame === 'flappy') {
      if (fbGameState === FB_STATE.MENU || fbGameState === FB_STATE.DEAD) {
        startFBGame();
      } else if (fbGameState === FB_STATE.PLAYING) {
        fbBird.vy = FB_FLAP_IMPULSE;
        sound().playFlap();
      }
    } else if (activeGame === 'dino') {
      if (dinoGameState === DINO_STATE.MENU || dinoGameState === DINO_STATE.DEAD) {
        startDinoGame();
      } else if (dinoGameState === DINO_STATE.PLAYING && dino.onGround) {
        dino.vy = DINO_JUMP_FORCE;
        dino.onGround = false;
        sound().playDinoJump();
      }
    } else if (activeGame === 'car') {
      if (carState === 'READY' || carState === 'DEAD') {
        startCarGame();
      } else if (carState === 'PLAYING') {
        steerCar(); // Single-button toggle lane
      }
    } else if (activeGame === 'snake') {
      if (snakeState === 'READY' || snakeState === 'DEAD') {
        startSnakeGame();
      } else if (snakeState === 'PLAYING') {
        turnSnakeClockwise(); // 1-button 90-degree clockwise turn
      }
    } else if (activeGame === 'invaders') {
      if (invState === 'READY' || invState === 'DEAD') {
        startInvadersGame();
      } else if (invState === 'PLAYING') {
        firePlayerLaser();
      }
    }
  }

  function onButton1Release() {
    isJumpPressed = false;
    if (activeGame === 'dino' && dino.vy < -250) {
      dino.vy *= 0.55;
    }
  }

  // Dual-button simultaneous press tracker
  const activeKeys = new Set();
  let simultaneousHandled = false;

  window.addEventListener('keydown', (e) => {
    activeKeys.add(e.code);

    // Simultaneous Button 1 & Button 2 press detection (emulating ESP32 physical hardware)
    const isB1 = activeKeys.has('Space') || activeKeys.has('ArrowUp') || activeKeys.has('KeyW');
    const isB2 = activeKeys.has('KeyG') || activeKeys.has('KeyB') || activeKeys.has('ArrowDown') || activeKeys.has('KeyS');

    if (isB1 && isB2) {
      e.preventDefault();
      if (!simultaneousHandled) {
        simultaneousHandled = true;
        toggleSystemMenu();
      }
      return;
    }

    // Direct Menu hotkey (KeyM or KeyB)
    if (e.code === 'KeyM' || e.code === 'KeyB') {
      e.preventDefault();
      toggleSystemMenu();
      return;
    }

    // Direct game selection shortcuts
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      selectGameFromMenu('face');
      return;
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      selectGameFromMenu('geodash');
      return;
    }
    if (e.code === 'Digit3' || e.code === 'Numpad3') {
      selectGameFromMenu('flappy');
      return;
    }
    if (e.code === 'Digit4' || e.code === 'Numpad4') {
      selectGameFromMenu('dino');
      return;
    }
    if (e.code === 'Digit5' || e.code === 'Numpad5') {
      selectGameFromMenu('car');
      return;
    }
    if (e.code === 'Digit6' || e.code === 'Numpad6') {
      selectGameFromMenu('snake');
      return;
    }
    if (e.code === 'Digit7' || e.code === 'Numpad7') {
      selectGameFromMenu('invaders');
      return;
    }
    if (e.code === 'KeyP') {
      petFace();
      return;
    }

    if (e.code === 'Escape') {
      if (isSystemMenuOpen) {
        toggleSystemMenu(false);
      }
      return;
    }

    // When System Menu is open: navigate with arrows/Tab, select with Enter/Space
    if (isSystemMenuOpen) {
      if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Tab') {
        e.preventDefault();
        systemMenuSelection = (systemMenuSelection + 1) % GAME_LIST.length;
        sound().playMenuClick();
        updateMenuUI();
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        systemMenuSelection = (systemMenuSelection - 1 + GAME_LIST.length) % GAME_LIST.length;
        sound().playMenuClick();
        updateMenuUI();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        selectGameFromMenu(GAME_LIST[systemMenuSelection]);
        return;
      }
      return;
    }

    // In-game controls for directional games
    if (activeGame === 'car') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        steerCar(-1);
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        steerCar(1);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        onButton1Action();
        return;
      }
    } else if (activeGame === 'snake') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setSnakeDir(0, -1);
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setSnakeDir(0, 1);
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setSnakeDir(-1, 0);
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        setSnakeDir(1, 0);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        onButton1Action();
        return;
      }
    } else if (activeGame === 'invaders') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        invPlayerDir = -1;
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        invPlayerDir = 1;
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        onButton1Action();
        return;
      }
    }

    // Normal In-Game Controls
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      onButton1Action();
    } else if (e.code === 'KeyG') {
      e.preventDefault();
      switchActiveGame();
    } else if (e.code === 'KeyO') {
      toggleMode();
    } else if (e.code === 'KeyR') {
      if (activeGame === 'face') petFace();
      else if (activeGame === 'geodash') startGDGame();
      else if (activeGame === 'flappy') startFBGame();
      else if (activeGame === 'dino') startDinoGame();
      else if (activeGame === 'car') startCarGame();
      else if (activeGame === 'snake') startSnakeGame();
      else if (activeGame === 'invaders') startInvadersGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    activeKeys.delete(e.code);
    const isB1 = activeKeys.has('Space') || activeKeys.has('ArrowUp') || activeKeys.has('KeyW');
    const isB2 = activeKeys.has('KeyG') || activeKeys.has('KeyB') || activeKeys.has('ArrowDown') || activeKeys.has('KeyS');
    if (!isB1 || !isB2) {
      simultaneousHandled = false;
    }

    if (activeGame === 'invaders') {
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && invPlayerDir === -1) {
        invPlayerDir = 0;
      } else if ((e.code === 'ArrowRight' || e.code === 'KeyD') && invPlayerDir === 1) {
        invPlayerDir = 0;
      }
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      onButton1Release();
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onButton1Action();
  });

  window.addEventListener('mouseup', () => {
    onButton1Release();
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onButton1Action();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    onButton1Release();
  });

  overlayActionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeGame === 'geodash') startGDGame();
    else if (activeGame === 'flappy') startFBGame();
    else if (activeGame === 'dino') startDinoGame();
    else if (activeGame === 'car') startCarGame();
    else if (activeGame === 'snake') startSnakeGame();
    else if (activeGame === 'invaders') startInvadersGame();
    else petFace();
  });

  // Virtual Touch Sensor Card Patting Interaction
  const virtualTouchCard = document.getElementById('virtualTouchCard');
  if (virtualTouchCard) {
    virtualTouchCard.addEventListener('click', () => {
      petFace();
      virtualTouchCard.classList.add('patting-active');
      setTimeout(() => virtualTouchCard.classList.remove('patting-active'), 250);
    });
    virtualTouchCard.addEventListener('touchstart', (e) => {
      e.preventDefault();
      petFace();
      virtualTouchCard.classList.add('patting-active');
      setTimeout(() => virtualTouchCard.classList.remove('patting-active'), 250);
    }, { passive: false });
  }

  function toggleMode() {
    displayMode = displayMode === 'neon' ? 'oled' : 'neon';
    document.body.classList.toggle('oled-mode-active', displayMode === 'oled');
    toggleModeBtn.classList.toggle('active', displayMode === 'oled');
    toggleModeBtn.innerHTML = displayMode === 'oled' 
      ? '<span>📺 OLED MODE (ON)</span>' 
      : '<span>✨ NEON ARCADE</span>';
  }

  toggleModeBtn.addEventListener('click', toggleMode);

  toggleSoundBtn.addEventListener('click', () => {
    sound().ensureContext();
    const muted = sound().toggleMute();
    toggleSoundBtn.innerHTML = muted ? '<span>🔇 MUTED</span>' : '<span>🔊 AUDIO ON</span>';
    toggleSoundBtn.classList.toggle('active', !muted);
  });

  togglePracticeBtn.addEventListener('click', () => {
    isPracticeMode = !isPracticeMode;
    togglePracticeBtn.classList.toggle('active', isPracticeMode);
    practiceBadge.classList.toggle('hidden', !isPracticeMode);
    if (!isPracticeMode) checkpoints = [];
  });

  // Customizer
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      gdPlayer.color = dot.dataset.color;
    });
  });

  document.querySelectorAll('.face-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gdPlayer.faceStyle = btn.dataset.face;
    });
  });

  requestAnimationFrame(gameLoop);

})();
