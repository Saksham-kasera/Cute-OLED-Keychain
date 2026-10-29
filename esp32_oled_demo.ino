/*
 * =========================================================================================
 *   ⚡ ESP32 RETRO CONSOLE: 6-IN-1 ARCADE HUB + LIVING COMPANION PET FACE (128x64) ⚡
 * =========================================================================================
 * 
 *  Architecture & Refactoring Overview:
 *  -----------------------------------------------------------------------------------------
 *  - Modular Object-Oriented Architecture: Clean encapsulation of games, subsystems & states.
 *  - 100% Non-Blocking Sound Engine: Multi-tone sound effects & EDM BGM without frame freezes.
 *  - Robust Input Engine: Unified debouncing, edge-triggering, dual-press & long-press detection.
 *  - Wear-Resistant Storage: Smart NVS Flash persistence with change-detection checks.
 *  - Zero Magic Numbers & High-Performance Math: Squared distance checks, PROGMEM strings (F()).
 * 
 *  🎮 INCLUDED GAMES & MODES:
 *  1. 🤖 ROBOT COMPANION (HOME): Expressive pet face, 360° irises, patting emotion engine.
 *  2. ⚡ GEOMETRY DASH: Cube & rocket ship modes, physics, particles, 35-obstacle level, EDM BGM.
 *  3. 🐥 FLAPPY BIRD: Flapping wing animation, pipe colliders, checker ground, score chimes.
 *  4. 🦖 CHROME DINO: T-Rex runner, leg animations, variable jump, cacti & pterodactyls.
 *  5. 🏎️ CAR RACING (HIGHWAY OVERTAKE): 3-lane speedway, sports cars, trucks, Nitro turbo boost, coins!
 *  6. 🐍 RETRO SNAKE: Grid traversal, apple & golden apple, 1-button 90° clockwise steering.
 *  7. 👾 SPACE INVADERS: 15-alien armada, mystery UFO saucer, destructible bunkers, laser cannon & bombs.
 *  8. 🕹️ ARCADE SYSTEM HUB: Quick-access 7-game switcher modal with smooth scrolling window.
 * 
 *  📟 HARDWARE WIRING (ESP32-C3 Super Mini):
 *  - OLED I2C SDA       -->  GPIO 4 (or GPIO 8)
 *  - OLED I2C SCL       -->  GPIO 5 (or GPIO 9)
 *  - BUTTON 1 (Action)  -->  GPIO 3 to GND (Internal PULLUP)
 *  - BUTTON 2 (Select)  -->  GPIO 2 to GND (Internal PULLUP)
 *  - TOUCH SENSOR (Pat) -->  GPIO 6 (TTP223 capacitive touch module / pad)
 *  - BUZZER (Optional)  -->  GPIO 1 or 10 to GND (Set BUZZER_PIN to -1 if none)
 * =========================================================================================
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Preferences.h>

// =========================================================================================
//  SECTION 1: HARDWARE & DISPLAY CONFIGURATION
// =========================================================================================

// Uncomment ONE of these depending on your OLED driver chip:
#define USE_SH1106_DISPLAY      // 1.3" OLEDs typically use SH1106
//#define USE_SSD1306_DISPLAY   // 0.96" OLEDs typically use SSD1306

constexpr uint8_t SCREEN_WIDTH   = 128;
constexpr uint8_t SCREEN_HEIGHT  = 64;
constexpr int8_t  OLED_RESET     = -1;
constexpr uint8_t SCREEN_ADDRESS = 0x3C;

// I2C Pins for ESP32-C3 Super Mini
constexpr int8_t I2C_SDA_PIN     = 4;
constexpr int8_t I2C_SCL_PIN     = 5;

// Dual Push Buttons (Active LOW with internal pullups)
constexpr int8_t BUTTON_ACTION_PIN = 3;  // Button 1: Jump / Flap / Steer / Retry / Pet / Select
constexpr int8_t BUTTON_SELECT_PIN = 2;  // Button 2: Next Game / Navigate Menu

// Capacitive / Digital Touch Sensor (e.g. TTP223 module or direct touch pad)
// Connect touch sensor SIG/OUT to GPIO 6 (or GPIO 7/1/10). Set to -1 to disable.
constexpr int8_t TOUCH_SENSOR_PIN  = 6;  
constexpr bool   TOUCH_ACTIVE_HIGH = true; // TTP223 default is active HIGH (set false if active LOW)

// Piezo Buzzer Pin (Set to -1 to disable audio, or assign digital pin e.g. 1 or 10)
constexpr int8_t BUZZER_PIN        = -1;

// Target Frame Rate
constexpr uint8_t TARGET_FPS       = 40;
constexpr uint32_t FRAME_TIME_MS   = (1000 / TARGET_FPS);

#if defined(USE_SH1106_DISPLAY)
  #include <Adafruit_SH110X.h>
  Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
  constexpr uint16_t OLED_COLOR_WHITE = SH110X_WHITE;
  constexpr uint16_t OLED_COLOR_BLACK = SH110X_BLACK;
#else
  #include <Adafruit_SSD1306.h>
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
  constexpr uint16_t OLED_COLOR_WHITE = SSD1306_WHITE;
  constexpr uint16_t OLED_COLOR_BLACK = SSD1306_BLACK;
#endif

// =========================================================================================
//  SECTION 2: GLOBAL ENUMS & SYSTEM TYPES
// =========================================================================================

enum class ActiveGame : uint8_t {
  HOME_FACE      = 0,
  GEOMETRY_DASH  = 1,
  FLAPPY_BIRD    = 2,
  CHROME_DINO    = 3,
  CAR_RACING     = 4,
  RETRO_SNAKE    = 5,
  SPACE_INVADERS = 6,
  COUNT          = 7
};

// =========================================================================================
//  SECTION 3: NON-BLOCKING SOUND ENGINE
// =========================================================================================

enum class SoundFx : uint8_t {
  NONE = 0,
  SWITCH_GAME,
  MENU_OPEN,
  MENU_CONFIRM,
  MENU_MOVE,
  PET_CHIRP,
  PET_BLUSH,
  PET_WINK,
  PET_WAKE,
  PET_PURR,
  PET_HEART,
  GD_JUMP,
  GD_PAD,
  GD_ORB,
  GD_PORTAL,
  GD_DEATH,
  GD_VICTORY,
  FB_FLAP,
  FB_SCORE,
  FB_DEATH,
  DINO_JUMP,
  DINO_MILESTONE,
  DINO_DEATH,
  CAR_SWERVE,
  CAR_NITRO,
  CAR_COIN,
  CAR_CRASH,
  CAR_PASS,
  SNAKE_EAT,
  SNAKE_TURN,
  SNAKE_DEATH,
  INV_SHOOT,
  INV_HIT,
  INV_STEP,
  INV_UFO,
  INV_DEATH
};

struct ToneStep {
  uint16_t freq;       // Hz
  uint16_t durationMs; // Play duration
  uint16_t pauseMs;    // Pause before next note
};

struct BgmNote {
  uint16_t freq;
  uint16_t duration;
};

// Geometry Dash EDM Soundtrack Sequence
const BgmNote GD_BGM_TRACK[] = {
  { 220, 100 }, { 0, 20 }, { 220, 100 }, { 330, 100 },
  { 293, 100 }, { 0, 20 }, { 261, 100 }, { 220, 100 },
  { 196, 100 }, { 0, 20 }, { 196, 100 }, { 293, 100 },
  { 261, 100 }, { 0, 20 }, { 246, 100 }, { 196, 100 },
  { 174, 100 }, { 0, 20 }, { 174, 100 }, { 261, 100 },
  { 246, 100 }, { 0, 20 }, { 220, 100 }, { 174, 100 },
  { 196, 100 }, { 220, 100 }, { 246, 100 }, { 293, 100 },
  { 330, 150 }, { 440, 200 }, { 0, 50 }
};
constexpr uint8_t GD_BGM_LENGTH = sizeof(GD_BGM_TRACK) / sizeof(GD_BGM_TRACK[0]);

class SoundManager {
private:
  int8_t   buzzerPin;
  SoundFx  currentFx;
  uint8_t  fxStep;
  uint32_t noteStartTime;
  bool     isInPausePhase;

  // Background Music State
  bool     bgmActive;
  uint8_t  bgmStep;
  uint32_t nextBgmTime;

  bool fetchFxNote(SoundFx fx, uint8_t step, ToneStep &out) const {
    switch (fx) {
      case SoundFx::SWITCH_GAME:
        if (step == 0) { out = { 523, 60, 5 }; return true; }
        if (step == 1) { out = { 784, 90, 0 }; return true; }
        break;
      case SoundFx::MENU_OPEN:
        if (step == 0) { out = { 880, 40, 5 }; return true; }
        if (step == 1) { out = { 1174, 60, 0 }; return true; }
        break;
      case SoundFx::MENU_CONFIRM:
        if (step == 0) { out = { 659, 45, 5 }; return true; }
        if (step == 1) { out = { 880, 45, 5 }; return true; }
        if (step == 2) { out = { 1318, 80, 0 }; return true; }
        break;
      case SoundFx::MENU_MOVE:
        if (step == 0) { out = { 1200, 20, 0 }; return true; }
        break;
      case SoundFx::PET_CHIRP:
        if (step == 0) { out = { 1318, 35, 5 }; return true; }
        if (step == 1) { out = { 1760, 55, 0 }; return true; }
        break;
      case SoundFx::PET_BLUSH:
        if (step == 0) { out = { 880, 50, 5 }; return true; }
        if (step == 1) { out = { 1175, 80, 5 }; return true; }
        if (step == 2) { out = { 1397, 100, 0 }; return true; }
        break;
      case SoundFx::PET_WINK:
        if (step == 0) { out = { 1318, 40, 5 }; return true; }
        if (step == 1) { out = { 1760, 70, 0 }; return true; }
        break;
      case SoundFx::PET_WAKE:
        if (step == 0) { out = { 784, 50, 5 }; return true; }
        if (step == 1) { out = { 1046, 80, 0 }; return true; }
        break;
      case SoundFx::PET_PURR:
        if (step == 0) { out = { 523, 35, 5 }; return true; }
        if (step == 1) { out = { 659, 35, 5 }; return true; }
        if (step == 2) { out = { 587, 35, 5 }; return true; }
        if (step == 3) { out = { 784, 45, 0 }; return true; }
        break;
      case SoundFx::PET_HEART:
        if (step == 0) { out = { 1046, 40, 5 }; return true; }
        if (step == 1) { out = { 1318, 40, 5 }; return true; }
        if (step == 2) { out = { 1568, 40, 5 }; return true; }
        if (step == 3) { out = { 2093, 80, 0 }; return true; }
        break;
      case SoundFx::GD_JUMP:
        if (step == 0) { out = { 587, 45, 0 }; return true; }
        break;
      case SoundFx::GD_PAD:
        if (step == 0) { out = { 880, 70, 0 }; return true; }
        break;
      case SoundFx::GD_ORB:
      case SoundFx::GD_PORTAL:
        if (step == 0) { out = { 1046, 60, 0 }; return true; }
        break;
      case SoundFx::GD_DEATH:
        if (step == 0) { out = { 110, 220, 0 }; return true; }
        break;
      case SoundFx::GD_VICTORY:
        if (step == 0) { out = { 523, 100, 10 }; return true; }
        if (step == 1) { out = { 659, 100, 10 }; return true; }
        if (step == 2) { out = { 784, 150, 10 }; return true; }
        if (step == 3) { out = { 1046, 350, 0 }; return true; }
        break;
      case SoundFx::FB_FLAP:
        if (step == 0) { out = { 720, 25, 0 }; return true; }
        break;
      case SoundFx::FB_SCORE:
        if (step == 0) { out = { 988, 35, 5 }; return true; }
        if (step == 1) { out = { 1318, 55, 0 }; return true; }
        break;
      case SoundFx::FB_DEATH:
        if (step == 0) { out = { 180, 100, 10 }; return true; }
        if (step == 1) { out = { 120, 200, 0 }; return true; }
        break;
      case SoundFx::DINO_JUMP:
        if (step == 0) { out = { 600, 30, 0 }; return true; }
        break;
      case SoundFx::DINO_MILESTONE:
        if (step == 0) { out = { 880, 50, 5 }; return true; }
        if (step == 1) { out = { 1174, 80, 0 }; return true; }
        break;
      case SoundFx::DINO_DEATH:
        if (step == 0) { out = { 160, 180, 0 }; return true; }
        break;
      case SoundFx::CAR_SWERVE:
        if (step == 0) { out = { 620, 20, 0 }; return true; }
        break;
      case SoundFx::CAR_NITRO:
        if (step == 0) { out = { 587, 35, 5 }; return true; }
        if (step == 1) { out = { 880, 45, 5 }; return true; }
        if (step == 2) { out = { 1175, 80, 0 }; return true; }
        break;
      case SoundFx::CAR_COIN:
        if (step == 0) { out = { 1318, 30, 5 }; return true; }
        if (step == 1) { out = { 1760, 50, 0 }; return true; }
        break;
      case SoundFx::CAR_CRASH:
        if (step == 0) { out = { 140, 100, 10 }; return true; }
        if (step == 1) { out = { 90, 200, 0 }; return true; }
        break;
      case SoundFx::CAR_PASS:
        if (step == 0) { out = { 1046, 20, 0 }; return true; }
        break;
      case SoundFx::SNAKE_EAT:
        if (step == 0) { out = { 988, 30, 5 }; return true; }
        if (step == 1) { out = { 1319, 45, 0 }; return true; }
        break;
      case SoundFx::SNAKE_TURN:
        if (step == 0) { out = { 523, 20, 0 }; return true; }
        break;
      case SoundFx::SNAKE_DEATH:
        if (step == 0) { out = { 180, 80, 10 }; return true; }
        if (step == 1) { out = { 110, 160, 0 }; return true; }
        break;
      case SoundFx::INV_SHOOT:
        if (step == 0) { out = { 1175, 25, 0 }; return true; }
        break;
      case SoundFx::INV_HIT:
        if (step == 0) { out = { 330, 30, 5 }; return true; }
        if (step == 1) { out = { 220, 45, 0 }; return true; }
        break;
      case SoundFx::INV_STEP:
        if (step == 0) { out = { 165, 30, 0 }; return true; }
        break;
      case SoundFx::INV_UFO:
        if (step == 0) { out = { 784, 40, 5 }; return true; }
        if (step == 1) { out = { 880, 40, 0 }; return true; }
        break;
      case SoundFx::INV_DEATH:
        if (step == 0) { out = { 147, 100, 10 }; return true; }
        if (step == 1) { out = { 98, 200, 0 }; return true; }
        break;
      default:
        break;
    }
    return false;
  }

  void startActiveNote() {
    ToneStep note;
    if (fetchFxNote(currentFx, fxStep, note)) {
      if (buzzerPin >= 0) {
        if (note.freq > 0) {
          tone(buzzerPin, note.freq);
        } else {
          noTone(buzzerPin);
        }
      }
      noteStartTime = millis();
      isInPausePhase = false;
    } else {
      currentFx = SoundFx::NONE;
      stopTone();
    }
  }

public:
  void begin(int8_t pin) {
    buzzerPin = pin;
    currentFx = SoundFx::NONE;
    fxStep = 0;
    noteStartTime = 0;
    isInPausePhase = false;
    bgmActive = false;
    bgmStep = 0;
    nextBgmTime = 0;

    if (buzzerPin >= 0) {
      pinMode(buzzerPin, OUTPUT);
      stopTone();
    }
  }

  void playTone(uint16_t freq, uint16_t durationMs) {
    if (buzzerPin >= 0 && freq > 0) {
      tone(buzzerPin, freq, durationMs);
    }
  }

  void stopTone() {
    if (buzzerPin >= 0) {
      noTone(buzzerPin);
    }
  }

  void playFx(SoundFx fx) {
    if (buzzerPin < 0) return;
    currentFx = fx;
    fxStep = 0;
    startActiveNote();
  }

  void startBgm() {
    bgmActive = true;
    bgmStep = 0;
    nextBgmTime = millis();
  }

  void stopBgm() {
    bgmActive = false;
    if (currentFx == SoundFx::NONE) {
      stopTone();
    }
  }

  void update() {
    if (buzzerPin < 0) return;
    uint32_t now = millis();

    // 1. Prioritize Sound Effects
    if (currentFx != SoundFx::NONE) {
      ToneStep note;
      if (fetchFxNote(currentFx, fxStep, note)) {
        if (!isInPausePhase) {
          if (now - noteStartTime >= note.durationMs) {
            stopTone();
            if (note.pauseMs > 0) {
              isInPausePhase = true;
              noteStartTime = now;
            } else {
              fxStep++;
              startActiveNote();
            }
          }
        } else {
          if (now - noteStartTime >= note.pauseMs) {
            fxStep++;
            startActiveNote();
          }
        }
      } else {
        currentFx = SoundFx::NONE;
        stopTone();
      }
    }
    // 2. Play Background Music when no SFX is active
    else if (bgmActive) {
      if (now >= nextBgmTime) {
        const BgmNote &n = GD_BGM_TRACK[bgmStep];
        if (n.freq > 0) {
          playTone(n.freq, n.duration);
        } else {
          stopTone();
        }
        nextBgmTime = now + n.duration + 10;
        bgmStep = (bgmStep + 1) % GD_BGM_LENGTH;
      }
    }
  }
};

// =========================================================================================
//  SECTION 4: ROBUST DEBOUNCED INPUT ENGINE
// =========================================================================================

class InputManager {
private:
  int8_t pinBtn1;
  int8_t pinBtn2;
  int8_t pinTouch;

  bool btn1State = false;
  bool btn2State = false;
  bool touchState = false;

  bool btn1LastRaw = false;
  bool btn2LastRaw = false;
  bool touchLastRaw = false;

  bool btn1Clicked = false;
  bool btn2Clicked = false;
  bool touchClicked = false;

  uint32_t btn1LastDebounceTime = 0;
  uint32_t btn2LastDebounceTime = 0;
  uint32_t touchLastDebounceTime = 0;

  uint32_t dualPressStartTime = 0;
  bool dualPressHandled = false;
  bool dualPressTriggered = false;

  uint32_t btn1PressStartTime = 0;
  bool btn1LongPressHandled = false;
  bool btn1LongPressTriggered = false;

  uint32_t touchStartTime = 0;
  uint32_t touchDuration = 0;

public:
  void begin(int8_t p1, int8_t p2, int8_t pTouch = -1) {
    pinBtn1 = p1;
    pinBtn2 = p2;
    pinTouch = pTouch;

    pinMode(pinBtn1, INPUT_PULLUP);
    pinMode(pinBtn2, INPUT_PULLUP);
    if (pinTouch >= 0) {
      pinMode(pinTouch, TOUCH_ACTIVE_HIGH ? INPUT : INPUT_PULLUP);
    }
  }

  void update() {
    uint32_t now = millis();

    // Active LOW with internal pullups for mechanical buttons
    bool raw1 = (digitalRead(pinBtn1) == LOW);
    bool raw2 = (digitalRead(pinBtn2) == LOW);

    // Touch sensor reading
    bool rawTouch = false;
    if (pinTouch >= 0) {
      rawTouch = TOUCH_ACTIVE_HIGH ? (digitalRead(pinTouch) == HIGH) : (digitalRead(pinTouch) == LOW);
    }

    // Debounce Button 1
    if (raw1 != btn1LastRaw) {
      btn1LastDebounceTime = now;
    }
    if ((now - btn1LastDebounceTime) > 35) {
      btn1State = raw1;
    }
    btn1LastRaw = raw1;

    // Debounce Button 2
    if (raw2 != btn2LastRaw) {
      btn2LastDebounceTime = now;
    }
    if ((now - btn2LastDebounceTime) > 35) {
      btn2State = raw2;
    }
    btn2LastRaw = raw2;

    // Debounce Touch Sensor (20ms for ultra-responsive capacitive detection)
    if (rawTouch != touchLastRaw) {
      touchLastDebounceTime = now;
    }
    if ((now - touchLastDebounceTime) > 20) {
      touchState = rawTouch;
    }
    touchLastRaw = rawTouch;

    // Continuous Touch Duration Tracking
    if (touchState) {
      if (touchStartTime == 0) touchStartTime = now;
      touchDuration = now - touchStartTime;
    } else {
      touchStartTime = 0;
      touchDuration = 0;
    }

    // Simultaneous Dual Button Press Detection (Arcade Menu)
    dualPressTriggered = false;
    if (btn1State && btn2State) {
      if (dualPressStartTime == 0) {
        dualPressStartTime = now;
        dualPressHandled = false;
      } else if (!dualPressHandled && (now - dualPressStartTime >= 120)) {
        dualPressHandled = true;
        dualPressTriggered = true;
      }
    } else {
      dualPressStartTime = 0;
      dualPressHandled = false;
    }

    // Button 1 Long Press Fallback (>1600ms)
    btn1LongPressTriggered = false;
    if (btn1State && !btn2State) {
      if (btn1PressStartTime == 0) {
        btn1PressStartTime = now;
        btn1LongPressHandled = false;
      } else if (!btn1LongPressHandled && (now - btn1PressStartTime >= 1600)) {
        btn1LongPressHandled = true;
        btn1LongPressTriggered = true;
      }
    } else {
      btn1PressStartTime = 0;
      btn1LongPressHandled = false;
    }

    // Single Click Edge-Triggering
    static bool prev1 = false;
    static bool prev2 = false;
    static bool prevTouch = false;

    btn1Clicked = (btn1State && !prev1 && !btn2State && !dualPressHandled);
    btn2Clicked = (btn2State && !prev2 && !btn1State && !dualPressHandled);
    touchClicked = (touchState && !prevTouch);

    prev1 = btn1State;
    prev2 = btn2State;
    prevTouch = touchState;
  }

  // Unified Action Getters: Both Button 1 and Touch Sensor work across all games!
  bool isBtn1Down() const         { return btn1State || touchState; }
  bool isBtn2Down() const         { return btn2State; }
  bool isBtn1Clicked() const      { return btn1Clicked || touchClicked; }
  bool isBtn2Clicked() const      { return btn2Clicked; }
  bool isDualPressed() const      { return dualPressTriggered; }
  bool isBtn1LongPressed() const  { return btn1LongPressTriggered; }

  // Dedicated Touch API for Companion Pet
  bool isTouched() const          { return touchState; }
  bool isTouchClicked() const     { return touchClicked; }
  uint32_t getTouchDuration() const { return touchDuration; }
  bool isRawBtn1Clicked() const   { return btn1Clicked; }
};

// =========================================================================================
//  SECTION 5: PERSISTENT STORAGE MANAGER (NVS Flash Wear-Safe)
// =========================================================================================

class StorageManager {
private:
  Preferences prefs;
  bool isInitialized = false;

public:
  void begin() {
    isInitialized = prefs.begin("game_hub", false);
  }

  ActiveGame loadActiveGame(ActiveGame fallback = ActiveGame::HOME_FACE) {
    if (!isInitialized) return fallback;
    uint8_t val = prefs.getUChar("active_game", static_cast<uint8_t>(fallback));
    if (val >= static_cast<uint8_t>(ActiveGame::COUNT)) return fallback;
    return static_cast<ActiveGame>(val);
  }

  void saveActiveGame(ActiveGame game) {
    if (!isInitialized) return;
    uint8_t val = static_cast<uint8_t>(game);
    if (prefs.getUChar("active_game", 255) != val) {
      prefs.putUChar("active_game", val);
    }
  }

  uint16_t loadGdAttempts() {
    return isInitialized ? prefs.getUInt("gd_att", 1) : 1;
  }

  void saveGdAttempts(uint16_t attempts) {
    if (isInitialized) prefs.putUInt("gd_att", attempts);
  }

  uint8_t loadGdBest() {
    return isInitialized ? prefs.getUChar("gd_best", 0) : 0;
  }

  void saveGdBest(uint8_t best) {
    if (isInitialized && prefs.getUChar("gd_best", 0) < best) {
      prefs.putUChar("gd_best", best);
    }
  }

  uint16_t loadFbBest() {
    return isInitialized ? prefs.getUInt("fb_best", 0) : 0;
  }

  void saveFbBest(uint16_t best) {
    if (isInitialized && prefs.getUInt("fb_best", 0) < best) {
      prefs.putUInt("fb_best", best);
    }
  }

  uint32_t loadDinoBest() {
    return isInitialized ? prefs.getUInt("dino_best", 0) : 0;
  }

  void saveDinoBest(uint32_t best) {
    if (isInitialized && prefs.getUInt("dino_best", 0) < best) {
      prefs.putUInt("dino_best", best);
    }
  }

  uint32_t loadCarBest() {
    return isInitialized ? prefs.getUInt("car_best", 0) : 0;
  }

  void saveCarBest(uint32_t best) {
    if (isInitialized && prefs.getUInt("car_best", 0) < best) {
      prefs.putUInt("car_best", best);
    }
  }

  uint32_t loadSnakeBest() {
    return isInitialized ? prefs.getUInt("snake_best", 0) : 0;
  }

  void saveSnakeBest(uint32_t best) {
    if (isInitialized && prefs.getUInt("snake_best", 0) < best) {
      prefs.putUInt("snake_best", best);
    }
  }

  uint32_t loadInvBest() {
    return isInitialized ? prefs.getUInt("inv_best", 0) : 0;
  }

  void saveInvBest(uint32_t best) {
    if (isInitialized && prefs.getUInt("inv_best", 0) < best) {
      prefs.putUInt("inv_best", best);
    }
  }
};

// =========================================================================================
//  SECTION 6: GAME 0 - ROBOT COMPANION (HOME SCREEN)
// =========================================================================================

enum class FaceMood : uint8_t {
  NORMAL = 0,
  BLINK,
  HAPPY_SQUINT,
  BLUSHING,
  WINK,
  SLEEPY,
  LOVE_HEARTS,
  AFTERGLOW
};

enum class IrisStyle : uint8_t {
  NORMAL_GLISTEN = 0,
  SPARKLE_STAR,
  HEART_PUPIL
};

constexpr uint8_t MAX_FACE_HEARTS = 6;
struct FaceHeart {
  float   x;
  float   y;
  float   vx;
  float   vy;
  uint8_t life;
};

class CompanionFace {
private:
  FaceMood  mood;
  IrisStyle irisStyle;
  uint32_t  moodStartTime;
  uint32_t  lastInteractTime;
  uint32_t  nextBlinkTime;
  uint32_t  nextLookShiftTime;
  uint32_t  nextCuteMoodTime;
  uint32_t  sleepDuration;

  // Iris Gaze Coordinates (all directions)
  float     lookX;
  float     lookY;
  float     targetLookX;
  float     targetLookY;

  // 360-Degree Curious Iris Rolling Animation
  bool      isRollingIris;
  float     rollAngle;
  uint32_t  nextRollTime;

  // Touch Sensor & Patting Reaction State
  uint8_t   patStreak;
  uint32_t  lastPatTime;
  uint32_t  nextHeartSpawnTime;
  uint32_t  nextPurrSoundTime;

  // Floating Heart Particles Layer
  FaceHeart hearts[MAX_FACE_HEARTS];

  void spawnHeart(float x, float y) {
    for (uint8_t i = 0; i < MAX_FACE_HEARTS; i++) {
      if (hearts[i].life == 0) {
        hearts[i].x = x + random(-4, 5);
        hearts[i].y = y + random(-2, 3);
        hearts[i].vx = (random(-8, 9) * 0.1f);
        hearts[i].vy = -(random(8, 16) * 0.1f);
        hearts[i].life = random(24, 42);
        return;
      }
    }
  }

  void updateAndDrawHearts() {
    for (uint8_t i = 0; i < MAX_FACE_HEARTS; i++) {
      if (hearts[i].life > 0) {
        hearts[i].x += hearts[i].vx + (sin((millis() + i * 250) * 0.012f) * 0.35f);
        hearts[i].y += hearts[i].vy;
        hearts[i].life--;

        int hx = static_cast<int>(hearts[i].x);
        int hy = static_cast<int>(hearts[i].y);
        if (hx >= 1 && hx < SCREEN_WIDTH - 8 && hy >= 1 && hy < SCREEN_HEIGHT - 6) {
          if (hearts[i].life > 14) {
            // 7x6 pixel heart
            display.drawFastHLine(hx + 1, hy, 2, OLED_COLOR_WHITE);
            display.drawFastHLine(hx + 4, hy, 2, OLED_COLOR_WHITE);
            display.drawFastHLine(hx, hy + 1, 7, OLED_COLOR_WHITE);
            display.drawFastHLine(hx, hy + 2, 7, OLED_COLOR_WHITE);
            display.drawFastHLine(hx + 1, hy + 3, 5, OLED_COLOR_WHITE);
            display.drawFastHLine(hx + 2, hy + 4, 3, OLED_COLOR_WHITE);
            display.drawPixel(hx + 3, hy + 5, OLED_COLOR_WHITE);
          } else {
            // 5x4 pixel mini heart
            display.drawPixel(hx + 1, hy, OLED_COLOR_WHITE);
            display.drawPixel(hx + 3, hy, OLED_COLOR_WHITE);
            display.drawFastHLine(hx, hy + 1, 5, OLED_COLOR_WHITE);
            display.drawFastHLine(hx + 1, hy + 2, 3, OLED_COLOR_WHITE);
            display.drawPixel(hx + 2, hy + 3, OLED_COLOR_WHITE);
          }
        }
      }
    }
  }

  void drawIris(int cx, int cy, IrisStyle style) {
    // 10x12 black iris base with rounded corners
    display.fillRoundRect(cx, cy, 10, 12, 4, OLED_COLOR_BLACK);

    if (style == IrisStyle::HEART_PUPIL) {
      // Adorable mini heart cutout inside iris
      display.drawPixel(cx + 3, cy + 3, OLED_COLOR_WHITE);
      display.drawPixel(cx + 6, cy + 3, OLED_COLOR_WHITE);
      display.drawFastHLine(cx + 2, cy + 4, 6, OLED_COLOR_WHITE);
      display.drawFastHLine(cx + 3, cy + 5, 4, OLED_COLOR_WHITE);
      display.drawPixel(cx + 4, cy + 6, OLED_COLOR_WHITE);
      display.drawPixel(cx + 5, cy + 6, OLED_COLOR_WHITE);
    } else if (style == IrisStyle::SPARKLE_STAR) {
      // 4-pointed sparkle star shine
      display.drawFastHLine(cx + 1, cy + 5, 8, OLED_COLOR_WHITE);
      display.drawFastVLine(cx + 4, cy + 2, 8, OLED_COLOR_WHITE);
      display.drawPixel(cx + 4, cy + 5, OLED_COLOR_WHITE);
      display.drawPixel(cx + 7, cy + 2, OLED_COLOR_WHITE); // Secondary sparkle glint
    } else {
      // Classic Glistening Anime Iris:
      // Primary 3x3 specular reflection glint
      display.fillRect(cx + 2, cy + 2, 3, 3, OLED_COLOR_WHITE);
      // Secondary bottom-right subtle sparkle
      display.drawPixel(cx + 6, cy + 8, OLED_COLOR_WHITE);
    }
  }

  void drawCheekBlush(int lex, int rex, int baseY) {
    // Blushing cheek slashes on both sides
    display.drawLine(lex - 12, baseY + 26, lex - 8, baseY + 20, OLED_COLOR_WHITE);
    display.drawLine(lex - 7,  baseY + 26, lex - 3, baseY + 20, OLED_COLOR_WHITE);
    display.drawLine(lex - 2,  baseY + 26, lex + 2, baseY + 20, OLED_COLOR_WHITE);

    display.drawLine(rex + 22, baseY + 26, rex + 26, baseY + 20, OLED_COLOR_WHITE);
    display.drawLine(rex + 27, baseY + 26, rex + 31, baseY + 20, OLED_COLOR_WHITE);
    display.drawLine(rex + 32, baseY + 26, rex + 36, baseY + 20, OLED_COLOR_WHITE);
  }

public:
  void reset() {
    mood = FaceMood::NORMAL;
    irisStyle = IrisStyle::NORMAL_GLISTEN;
    moodStartTime = millis();
    lastInteractTime = millis();
    nextBlinkTime = millis() + 2500;
    nextLookShiftTime = millis() + 1500;
    nextCuteMoodTime = millis() + 7000;
    sleepDuration = 5000;
    lookX = 0.0f;
    lookY = 0.0f;
    targetLookX = 0.0f;
    targetLookY = 0.0f;

    isRollingIris = false;
    rollAngle = 0.0f;
    nextRollTime = millis() + 8000;

    patStreak = 0;
    lastPatTime = 0;
    nextHeartSpawnTime = 0;
    nextPurrSoundTime = 0;

    for (uint8_t i = 0; i < MAX_FACE_HEARTS; i++) {
      hearts[i].life = 0;
    }
  }

  void update(const InputManager &input, SoundManager &sound) {
    uint32_t now = millis();

    bool touchedNow = input.isTouched();
    bool tappedNow  = input.isTouchClicked() || input.isRawBtn1Clicked();

    // 1. Wake up from sleep on touch or button
    if (mood == FaceMood::SLEEPY) {
      if (touchedNow || tappedNow || input.isBtn2Clicked()) {
        reset();
        sound.playFx(SoundFx::PET_WAKE);
        return;
      }
      if (now - moodStartTime > sleepDuration) {
        reset();
        sound.playFx(SoundFx::PET_WAKE);
        return;
      }
      return;
    }

    // 2. Inactivity Sleep Timeout after 16 seconds
    if (mood != FaceMood::SLEEPY && (now - lastInteractTime > 16000)) {
      mood = FaceMood::SLEEPY;
      moodStartTime = now;
      sleepDuration = random(5000, 7500);
      return;
    }

    // 3. REACTIVE PATTING & TOUCH SENSOR ENGINE
    if (tappedNow) {
      lastInteractTime = now;
      isRollingIris = false; // Look right at hand when tapped

      if (now - lastPatTime < 1400) {
        patStreak++;
      } else {
        patStreak = 1;
      }
      lastPatTime = now;

      // Dynamic Gaze Reaction: Look high up toward the petting hand!
      targetLookX = 0.0f;
      targetLookY = -4.2f;

      if (patStreak == 1) {
        // Single gentle pat: Happy surprised glance with sweet chirp
        mood = FaceMood::NORMAL;
        irisStyle = IrisStyle::NORMAL_GLISTEN;
        sound.playFx(SoundFx::PET_CHIRP);
        moodStartTime = now;
      } else if (patStreak == 2) {
        // Second pat: Delightful squint & happy chime
        mood = FaceMood::HAPPY_SQUINT;
        sound.playFx(SoundFx::PET_CHIRP);
        moodStartTime = now;
      } else if (patStreak == 3) {
        // Third pat: Deep blushing with sparkling star irises!
        mood = FaceMood::BLUSHING;
        irisStyle = IrisStyle::SPARKLE_STAR;
        sound.playFx(SoundFx::PET_BLUSH);
        moodStartTime = now;
        spawnHeart(64, 20);
      } else {
        // 4+ pats: LOVE OVERLOAD! Floating hearts & heart-eyes!
        mood = FaceMood::LOVE_HEARTS;
        irisStyle = IrisStyle::HEART_PUPIL;
        sound.playFx(SoundFx::PET_HEART);
        moodStartTime = now;
        spawnHeart(32, 22);
        spawnHeart(88, 22);
        spawnHeart(64, 18);
      }
    }

    // Continuous Stroking / Holding the Touch Sensor
    if (touchedNow) {
      lastInteractTime = now;
      targetLookY = -4.0f; // Eye stays looking up lovingly at the hand

      uint32_t holdDuration = input.getTouchDuration();
      if (holdDuration > 600) {
        if (mood != FaceMood::LOVE_HEARTS) {
          mood = FaceMood::LOVE_HEARTS;
          irisStyle = IrisStyle::HEART_PUPIL;
          moodStartTime = now;
          sound.playFx(SoundFx::PET_HEART);
        }
        // Spawn floating love hearts continuously while held
        if (now > nextHeartSpawnTime) {
          spawnHeart(random(24, 96), random(14, 25));
          nextHeartSpawnTime = now + random(200, 350);
        }
        // Soothing purring trill every 700ms
        if (now > nextPurrSoundTime) {
          sound.playFx(SoundFx::PET_PURR);
          nextPurrSoundTime = now + 700;
        }
      }
    }

    // 4. SMOOTH PROCEDURAL IRIS INTERPOLATION (All Directions)
    if (isRollingIris) {
      // 360-Degree Curious Iris Orbit
      rollAngle += 0.12f;
      targetLookX = cos(rollAngle) * 5.2f;
      targetLookY = sin(rollAngle) * 3.4f;
      lookX = targetLookX;
      lookY = targetLookY;

      if (rollAngle >= 6.283f) {
        isRollingIris = false;
        nextRollTime = now + random(8000, 15000);
        targetLookX = 0.0f;
        targetLookY = 0.0f;
      }
    } else {
      // Organic Easing Interpolation
      lookX += (targetLookX - lookX) * 0.24f;
      lookY += (targetLookY - lookY) * 0.24f;
    }

    // 5. IDLE RANDOM GAZE IN ALL DIRECTIONS
    if (mood == FaceMood::NORMAL && !touchedNow && !isRollingIris) {
      if (now > nextRollTime) {
        // Trigger smooth 360-degree curious roll
        isRollingIris = true;
        rollAngle = 0.0f;
      } else if (now > nextLookShiftTime) {
        uint8_t r = random(0, 11);
        switch (r) {
          case 0: targetLookX = 0.0f;  targetLookY = 0.0f;  break; // Center
          case 1: targetLookX = -5.0f; targetLookY = 0.0f;  break; // Far Left
          case 2: targetLookX = 5.0f;  targetLookY = 0.0f;  break; // Far Right
          case 3: targetLookX = 0.0f;  targetLookY = -3.8f; break; // Far Up
          case 4: targetLookX = 0.0f;  targetLookY = 3.8f;  break; // Far Down
          case 5: targetLookX = -4.5f; targetLookY = -3.0f; break; // Up-Left
          case 6: targetLookX = 4.5f;  targetLookY = -3.0f; break; // Up-Right
          case 7: targetLookX = -4.5f; targetLookY = 3.0f;  break; // Down-Left (Shy)
          case 8: targetLookX = 4.5f;  targetLookY = 3.0f;  break; // Down-Right (Shy)
          case 9:
            // Sparkle gaze (curious glance with star iris)
            targetLookX = 3.0f; targetLookY = -2.5f;
            irisStyle = IrisStyle::SPARKLE_STAR;
            break;
          default:
            targetLookX = static_cast<float>(random(-5, 6));
            targetLookY = static_cast<float>(random(-3, 4));
            irisStyle = IrisStyle::NORMAL_GLISTEN;
            break;
        }
        nextLookShiftTime = now + random(1400, 3200);
      }
    }

    // 6. MOOD LIFECYCLE & TIMING
    switch (mood) {
      case FaceMood::BLINK:
        if (now - moodStartTime > 140) {
          mood = FaceMood::NORMAL;
          nextBlinkTime = now + random(2500, 4800);
        }
        break;

      case FaceMood::HAPPY_SQUINT:
        if (now - moodStartTime > 1500) {
          mood = FaceMood::NORMAL;
          nextBlinkTime = now + 1800;
        }
        break;

      case FaceMood::BLUSHING:
        if (now - moodStartTime > 1800) {
          mood = FaceMood::NORMAL;
          irisStyle = IrisStyle::NORMAL_GLISTEN;
          nextBlinkTime = now + 1500;
        }
        break;

      case FaceMood::WINK:
        if (now - moodStartTime > 1300) {
          mood = FaceMood::NORMAL;
          nextBlinkTime = now + 1800;
        }
        break;

      case FaceMood::LOVE_HEARTS:
        if (!touchedNow && (now - lastPatTime > 1800)) {
          mood = FaceMood::AFTERGLOW;
          moodStartTime = now;
          patStreak = 0;
        }
        break;

      case FaceMood::AFTERGLOW:
        if (now - moodStartTime > 2400) {
          mood = FaceMood::NORMAL;
          irisStyle = IrisStyle::NORMAL_GLISTEN;
          nextBlinkTime = now + 1200;
        }
        break;

      case FaceMood::NORMAL:
      default:
        if (now > nextBlinkTime) {
          mood = FaceMood::BLINK;
          moodStartTime = now;
        } else if (now > nextCuteMoodTime) {
          uint8_t cr = random(0, 3);
          if (cr == 0) {
            mood = FaceMood::BLUSHING;
            irisStyle = IrisStyle::NORMAL_GLISTEN;
            sound.playTone(988, 30);
          } else if (cr == 1) {
            mood = FaceMood::WINK;
            sound.playTone(1318, 40);
          } else {
            mood = FaceMood::HAPPY_SQUINT;
            sound.playTone(1175, 40);
          }
          moodStartTime = now;
          nextCuteMoodTime = now + random(7000, 14000);
        }
        break;
    }
  }

  void render() {
    int bob = static_cast<int>(sin(millis() * 0.0035f) * 1.5f);
    int baseY = 17 + bob;
    int lex = 26;
    int rex = 78;

    // 1. Render Floating Love Hearts (Particle Layer)
    updateAndDrawHearts();

    // 2. Render Main Face & Eyes According to Mood
    if (mood == FaceMood::HAPPY_SQUINT) {
      // Cheerful crescent squint ^ ‿ ^
      for (int t = 0; t < 4; t++) {
        display.drawLine(lex,      baseY + 14 + t, lex + 11, baseY + 4 + t, OLED_COLOR_WHITE);
        display.drawLine(lex + 11, baseY + 4 + t,  lex + 23, baseY + 14 + t, OLED_COLOR_WHITE);
        display.drawLine(rex,      baseY + 14 + t, rex + 11, baseY + 4 + t, OLED_COLOR_WHITE);
        display.drawLine(rex + 11, baseY + 4 + t,  rex + 23, baseY + 14 + t, OLED_COLOR_WHITE);
      }
      // Happy open smile
      display.fillCircle(64, baseY + 26, 6, OLED_COLOR_WHITE);
      display.fillRect(56, baseY + 20, 16, 6, OLED_COLOR_BLACK);

      // Cute cheek blush marks
      drawCheekBlush(lex, rex, baseY);

    } else if (mood == FaceMood::LOVE_HEARTS) {
      // White eye sockets with Heart Irises or Star Sparkle Irises!
      display.fillRoundRect(lex, baseY, 24, 26, 7, OLED_COLOR_WHITE);
      display.fillRoundRect(rex, baseY, 24, 26, 7, OLED_COLOR_WHITE);

      int leftIrisX  = constrain(lex + 12 - 5 + static_cast<int>(lookX), lex + 3, lex + 11);
      int leftIrisY  = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);
      int rightIrisX = constrain(rex + 12 - 5 + static_cast<int>(lookX), rex + 3, rex + 11);
      int rightIrisY = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);

      drawIris(leftIrisX, leftIrisY, IrisStyle::HEART_PUPIL);
      drawIris(rightIrisX, rightIrisY, IrisStyle::HEART_PUPIL);

      // Deep blushing cheeks
      drawCheekBlush(lex, rex, baseY);

      // Ecstatic wide smile
      display.fillCircle(64, baseY + 27, 5, OLED_COLOR_WHITE);
      display.fillRect(57, baseY + 22, 14, 5, OLED_COLOR_BLACK);

    } else if (mood == FaceMood::AFTERGLOW) {
      // Sweet dreamy half-closed eyes with slight blush
      display.fillRoundRect(lex, baseY + 4, 24, 18, 5, OLED_COLOR_WHITE);
      display.fillRoundRect(rex, baseY + 4, 24, 18, 5, OLED_COLOR_WHITE);

      display.fillCircle(lex + 12, baseY + 13, 3, OLED_COLOR_BLACK);
      display.fillCircle(rex + 12, baseY + 13, 3, OLED_COLOR_BLACK);
      display.drawPixel(lex + 11, baseY + 12, OLED_COLOR_WHITE);
      display.drawPixel(rex + 11, baseY + 12, OLED_COLOR_WHITE);

      drawCheekBlush(lex, rex, baseY);

      display.fillRoundRect(58, baseY + 26, 12, 5, 2, OLED_COLOR_WHITE);
      display.fillRect(58, baseY + 26, 12, 2, OLED_COLOR_BLACK);

    } else if (mood == FaceMood::BLUSHING) {
      display.fillRoundRect(lex, baseY, 24, 26, 7, OLED_COLOR_WHITE);
      display.fillRoundRect(rex, baseY, 24, 26, 7, OLED_COLOR_WHITE);

      int leftIrisX  = constrain(lex + 12 - 5 + static_cast<int>(lookX), lex + 3, lex + 11);
      int leftIrisY  = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);
      int rightIrisX = constrain(rex + 12 - 5 + static_cast<int>(lookX), rex + 3, rex + 11);
      int rightIrisY = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);

      drawIris(leftIrisX, leftIrisY, irisStyle);
      drawCheekBlush(lex, rex, baseY);

      display.fillRoundRect(58, baseY + 25, 12, 5, 2, OLED_COLOR_WHITE);
      display.fillRect(58, baseY + 25, 12, 2, OLED_COLOR_BLACK);

    } else if (mood == FaceMood::WINK) {
      // Left eye winks ^
      for (int t = 0; t < 3; t++) {
        display.drawLine(lex,      baseY + 14 + t, lex + 11, baseY + 5 + t, OLED_COLOR_WHITE);
        display.drawLine(lex + 11, baseY + 5 + t,  lex + 23, baseY + 14 + t, OLED_COLOR_WHITE);
      }
      display.fillRoundRect(rex, baseY, 24, 26, 7, OLED_COLOR_WHITE);

      int rightIrisX = constrain(rex + 12 - 5 + static_cast<int>(lookX), rex + 3, rex + 11);
      int rightIrisY = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);
      drawIris(rightIrisX, rightIrisY, IrisStyle::SPARKLE_STAR);

      // Left cheek blush
      display.drawLine(lex - 8, baseY + 25, lex - 4, baseY + 20, OLED_COLOR_WHITE);
      display.drawLine(lex - 3, baseY + 25, lex + 1, baseY + 20, OLED_COLOR_WHITE);

      // Playful smirk
      display.fillRoundRect(57, baseY + 25, 14, 6, 3, OLED_COLOR_WHITE);
      display.fillRect(57, baseY + 25, 14, 3, OLED_COLOR_BLACK);

    } else if (mood == FaceMood::BLINK) {
      uint32_t elapsed = millis() - moodStartTime;
      int blinkH = (elapsed < 70) ? map(elapsed, 0, 70, 26, 3) : map(elapsed, 70, 140, 3, 26);
      int blinkY = baseY + (26 - blinkH) / 2;

      display.fillRoundRect(lex, blinkY, 24, blinkH, min(blinkH / 2, 4), OLED_COLOR_WHITE);
      display.fillRoundRect(rex, blinkY, 24, blinkH, min(blinkH / 2, 4), OLED_COLOR_WHITE);

      display.fillRoundRect(56, baseY + 26, 16, 6, 3, OLED_COLOR_WHITE);
      display.fillRect(56, baseY + 26, 16, 3, OLED_COLOR_BLACK);

    } else if (mood == FaceMood::SLEEPY) {
      display.fillRoundRect(lex + 2, baseY + 12, 20, 4, 2, OLED_COLOR_WHITE);
      display.fillRoundRect(rex + 2, baseY + 12, 20, 4, 2, OLED_COLOR_WHITE);
      display.drawLine(60, baseY + 27, 68, baseY + 27, OLED_COLOR_WHITE);

      int zShift = (millis() / 180) % 26;
      display.setTextSize(1);
      display.setTextColor(OLED_COLOR_WHITE);
      display.setCursor(104 - (zShift / 3), 26 - zShift);
      display.print(F("z"));
      display.setCursor(114 - (zShift / 2), 16 - zShift);
      display.print(F("Z"));

    } else {
      // NORMAL MODE - Animated Iris Gliding in All 360-Degree Directions!
      display.fillRoundRect(lex, baseY, 24, 26, 7, OLED_COLOR_WHITE);
      display.fillRoundRect(rex, baseY, 24, 26, 7, OLED_COLOR_WHITE);

      int leftIrisX  = constrain(lex + 12 - 5 + static_cast<int>(lookX), lex + 3, lex + 11);
      int leftIrisY  = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);
      int rightIrisX = constrain(rex + 12 - 5 + static_cast<int>(lookX), rex + 3, rex + 11);
      int rightIrisY = constrain(baseY + 13 - 6 + static_cast<int>(lookY), baseY + 3, baseY + 11);

      drawIris(leftIrisX, leftIrisY, irisStyle);
      drawIris(rightIrisX, rightIrisY, irisStyle);

      // Sweet curved smile
      display.fillRoundRect(56, baseY + 26, 16, 6, 3, OLED_COLOR_WHITE);
      display.fillRect(56, baseY + 26, 16, 3, OLED_COLOR_BLACK);
    }
  }
};

// =========================================================================================
//  SECTION 7: GAME 1 - GEOMETRY DASH ENGINE
// =========================================================================================

enum class GDObstacleType : uint8_t {
  NONE = 0,
  SPIKE,
  DOUBLE_SPIKE,
  TRIPLE_SPIKE,
  CEIL_SPIKE,
  BLOCK_1,
  BLOCK_2,
  BLOCK_3,
  JUMP_PAD,
  JUMP_ORB,
  PORTAL_SHIP,
  PORTAL_CUBE,
  FINISH
};

struct GDObstacle {
  uint16_t       x;
  int8_t         y;
  uint8_t        w;
  uint8_t        h;
  GDObstacleType type;
};

enum class GDState : uint8_t {
  TITLE = 0,
  PLAYING,
  DEAD,
  VICTORY
};

enum class GDPlayerMode : uint8_t {
  CUBE = 0,
  SHIP
};

struct GDParticle {
  float   x, y, vx, vy;
  uint8_t life;
};

constexpr uint8_t  GD_FLOOR_Y         = 52;
constexpr uint8_t  GD_CEILING_Y       = 4;
constexpr uint8_t  GD_PLAYER_SCREEN_X = 24;
constexpr uint8_t  GD_CUBE_SIZE       = 10;
constexpr uint8_t  GD_NUM_PARTICLES   = 18;

constexpr float    GD_SHIP_GRAVITY    = 0.28f;
constexpr float    GD_SHIP_THRUST     = -0.42f;
constexpr float    GD_SHIP_MAX_VY     = 2.8f;
constexpr float    GD_CUBE_GRAVITY    = 0.58f;
constexpr float    GD_CUBE_JUMP_VY    = -4.3f;
constexpr float    GD_GAME_SPEED      = 2.4f;

const GDObstacle GD_LEVEL_TRACK[] = {
  { 80,  GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 130, GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 175, GD_FLOOR_Y - 10, 10, 10, GDObstacleType::BLOCK_1 },
  { 220, GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 260, GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 310, GD_FLOOR_Y - 9,  16, 9, GDObstacleType::DOUBLE_SPIKE },
  { 360, GD_FLOOR_Y - 10, 10, 10, GDObstacleType::BLOCK_1 },
  { 370, GD_FLOOR_Y - 20, 10, 10, GDObstacleType::BLOCK_1 },
  { 410, GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 460, GD_FLOOR_Y - 4,  12, 4, GDObstacleType::JUMP_PAD },
  { 480, GD_FLOOR_Y - 9,  24, 9, GDObstacleType::TRIPLE_SPIKE },
  { 530, GD_FLOOR_Y - 10, 30, 10, GDObstacleType::BLOCK_3 },
  { 540, GD_FLOOR_Y - 19, 8, 9, GDObstacleType::SPIKE },
  { 590, GD_FLOOR_Y - 9,  16, 9, GDObstacleType::DOUBLE_SPIKE },
  { 630, GD_FLOOR_Y - 22, 10, 10, GDObstacleType::JUMP_ORB },
  { 645, GD_FLOOR_Y - 9,  24, 9, GDObstacleType::TRIPLE_SPIKE },
  { 710, GD_FLOOR_Y - 32, 10, 32, GDObstacleType::PORTAL_SHIP },
  { 770, GD_FLOOR_Y - 12, 8, 12, GDObstacleType::SPIKE },
  { 820, GD_CEILING_Y,    8, 14, GDObstacleType::CEIL_SPIKE },
  { 870, GD_FLOOR_Y - 16, 8, 16, GDObstacleType::SPIKE },
  { 920, GD_CEILING_Y,    8, 16, GDObstacleType::CEIL_SPIKE },
  { 960, GD_FLOOR_Y - 14, 8, 14, GDObstacleType::SPIKE },
  { 1010, GD_CEILING_Y,   8, 18, GDObstacleType::CEIL_SPIKE },
  { 1050, GD_FLOOR_Y - 20, 10, 10, GDObstacleType::BLOCK_1 },
  { 1100, GD_CEILING_Y,   8, 14, GDObstacleType::CEIL_SPIKE },
  { 1160, GD_FLOOR_Y - 32, 10, 32, GDObstacleType::PORTAL_CUBE },
  { 1220, GD_FLOOR_Y - 10, 10, 10, GDObstacleType::BLOCK_1 },
  { 1245, GD_FLOOR_Y - 10, 10, 10, GDObstacleType::BLOCK_1 },
  { 1280, GD_FLOOR_Y - 4,  12, 4, GDObstacleType::JUMP_PAD },
  { 1300, GD_FLOOR_Y - 9,  24, 9, GDObstacleType::TRIPLE_SPIKE },
  { 1350, GD_FLOOR_Y - 10, 30, 10, GDObstacleType::BLOCK_3 },
  { 1410, GD_FLOOR_Y - 9,  24, 9, GDObstacleType::TRIPLE_SPIKE },
  { 1470, GD_FLOOR_Y - 10, 10, 10, GDObstacleType::BLOCK_1 },
  { 1510, GD_FLOOR_Y - 9,  8, 9, GDObstacleType::SPIKE },
  { 1580, GD_FLOOR_Y - 36, 12, 36, GDObstacleType::FINISH }
};
constexpr uint16_t GD_LEVEL_TRACK_COUNT = sizeof(GD_LEVEL_TRACK) / sizeof(GD_LEVEL_TRACK[0]);
constexpr uint16_t GD_LEVEL_FINISH_X    = 1580;

class GeometryDashGame {
private:
  GDState      gameState       = GDState::TITLE;
  GDPlayerMode playerMode      = GDPlayerMode::CUBE;

  float        playerY         = GD_FLOOR_Y - GD_CUBE_SIZE;
  float        playerVy        = 0.0f;
  float        playerAngle     = 0.0f;
  bool         isOnGround      = true;
  bool         jumpBufferActive = false;
  uint32_t     jumpBufferTime  = 0;
  bool         isThrusting     = false;

  float        cameraX         = 0.0f;
  uint8_t      bestPercent     = 0;
  uint16_t     attemptCount    = 1;
  uint8_t      currentPercent  = 0;

  GDParticle   particles[GD_NUM_PARTICLES];
  int8_t       shakeOffsetX    = 0;
  int8_t       shakeOffsetY    = 0;
  uint32_t     stateStartTime  = 0;

  void spawnExplosion(float x, float y) {
    for (uint8_t i = 0; i < GD_NUM_PARTICLES; i++) {
      float angle = random(0, 360) * 0.0174533f;
      float speed = random(12, 38) * 0.1f;
      particles[i].x = x;
      particles[i].y = y;
      particles[i].vx = cos(angle) * speed;
      particles[i].vy = sin(angle) * speed;
      particles[i].life = random(12, 24);
    }
  }

  void updateAndDrawParticles() {
    for (uint8_t i = 0; i < GD_NUM_PARTICLES; i++) {
      if (particles[i].life > 0) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].vy += 0.15f;
        particles[i].life--;

        int px = static_cast<int>(particles[i].x);
        int py = static_cast<int>(particles[i].y);
        if (px >= 0 && px < SCREEN_WIDTH && py >= 0 && py < SCREEN_HEIGHT) {
          if (particles[i].life > 8) {
            display.fillRect(px, py, 2, 2, OLED_COLOR_WHITE);
          } else {
            display.drawPixel(px, py, OLED_COLOR_WHITE);
          }
        }
      }
    }
  }

  void drawShip(int x, int y, bool thrusting) {
    display.drawTriangle(x + 12, y + 4, x + 4, y, x + 4, y + 8, OLED_COLOR_WHITE);
    display.drawRect(x, y + 2, 5, 5, OLED_COLOR_WHITE);
    display.drawPixel(x + 6, y + 4, OLED_COLOR_WHITE);

    if (thrusting && (millis() / 50) % 2 == 0) {
      display.drawLine(x - 1, y + 4, x - 4, y + 4, OLED_COLOR_WHITE);
      display.drawLine(x - 1, y + 3, x - 3, y + 3, OLED_COLOR_WHITE);
      display.drawLine(x - 1, y + 5, x - 3, y + 5, OLED_COLOR_WHITE);
    }
  }

  void drawObstacle(const GDObstacle &obs, int screenX) {
    switch (obs.type) {
      case GDObstacleType::SPIKE:
        display.fillTriangle(screenX + obs.w / 2, obs.y, screenX, obs.y + obs.h, screenX + obs.w, obs.y + obs.h, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::DOUBLE_SPIKE:
        display.fillTriangle(screenX + 4, obs.y, screenX, obs.y + obs.h, screenX + 8, obs.y + obs.h, OLED_COLOR_WHITE);
        display.fillTriangle(screenX + 12, obs.y, screenX + 8, obs.y + obs.h, screenX + 16, obs.y + obs.h, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::TRIPLE_SPIKE:
        display.fillTriangle(screenX + 4, obs.y, screenX, obs.y + obs.h, screenX + 8, obs.y + obs.h, OLED_COLOR_WHITE);
        display.fillTriangle(screenX + 12, obs.y, screenX + 8, obs.y + obs.h, screenX + 16, obs.y + obs.h, OLED_COLOR_WHITE);
        display.fillTriangle(screenX + 20, obs.y, screenX + 16, obs.y + obs.h, screenX + 24, obs.y + obs.h, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::CEIL_SPIKE:
        display.fillTriangle(screenX + obs.w / 2, obs.y + obs.h, screenX, obs.y, screenX + obs.w, obs.y, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::BLOCK_1:
      case GDObstacleType::BLOCK_2:
      case GDObstacleType::BLOCK_3:
        display.drawRect(screenX, obs.y, obs.w, obs.h, OLED_COLOR_WHITE);
        display.drawRect(screenX + 2, obs.y + 2, obs.w - 4, obs.h - 4, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::JUMP_PAD:
        display.fillRect(screenX, obs.y + 2, obs.w, 2, OLED_COLOR_WHITE);
        display.drawPixel(screenX + 3, obs.y + 1, OLED_COLOR_WHITE);
        display.drawPixel(screenX + 5, obs.y,     OLED_COLOR_WHITE);
        display.drawPixel(screenX + 7, obs.y + 1, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::JUMP_ORB:
        display.drawCircle(screenX + obs.w / 2, obs.y + obs.h / 2, 4, OLED_COLOR_WHITE);
        display.drawCircle(screenX + obs.w / 2, obs.y + obs.h / 2, 2, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::PORTAL_SHIP:
      case GDObstacleType::PORTAL_CUBE:
        display.drawRoundRect(screenX, obs.y, obs.w, obs.h, 4, OLED_COLOR_WHITE);
        display.drawLine(screenX + 2, obs.y + 4, screenX + obs.w - 3, obs.y + obs.h - 5, OLED_COLOR_WHITE);
        break;
      case GDObstacleType::FINISH:
        display.drawRect(screenX, obs.y, obs.w, obs.h, OLED_COLOR_WHITE);
        for (int fy = obs.y; fy < obs.y + obs.h; fy += 6) {
          display.fillRect(screenX + 1, fy, obs.w - 2, 3, OLED_COLOR_WHITE);
        }
        break;
      default: break;
    }
  }

  bool checkCollision(float px, float py, const GDObstacle &obs) {
    constexpr float pw = GD_CUBE_SIZE;
    constexpr float ph = GD_CUBE_SIZE;

    if (px + pw - 2 < obs.x || px + 2 > obs.x + obs.w) return false;
    if (py + ph - 1 < obs.y || py + 1 > obs.y + obs.h) return false;

    if (obs.type == GDObstacleType::SPIKE || obs.type == GDObstacleType::DOUBLE_SPIKE || obs.type == GDObstacleType::TRIPLE_SPIKE) {
      float relX = (px + pw * 0.5f) - obs.x;
      if (relX >= 0 && relX <= obs.w) {
        return (py + ph >= obs.y + 2);
      }
      return true;
    }
    if (obs.type == GDObstacleType::CEIL_SPIKE) {
      return (py <= obs.y + obs.h - 2);
    }
    if (obs.type == GDObstacleType::BLOCK_1 || obs.type == GDObstacleType::BLOCK_2 || obs.type == GDObstacleType::BLOCK_3) {
      if (playerVy >= 0 && (py + ph - playerVy) <= obs.y + 3) {
        playerY = obs.y - ph;
        playerVy = 0;
        isOnGround = true;
        return false;
      }
      return true;
    }
    return false;
  }

  void triggerDeath(SoundManager &sound, StorageManager &storage) {
    sound.stopBgm();
    sound.playFx(SoundFx::GD_DEATH);
    gameState = GDState::DEAD;
    stateStartTime = millis();
    shakeOffsetX = 3;
    shakeOffsetY = -2;
    spawnExplosion(GD_PLAYER_SCREEN_X + GD_CUBE_SIZE / 2, playerY + GD_CUBE_SIZE / 2);

    attemptCount++;
    if (currentPercent > bestPercent) {
      bestPercent = currentPercent;
    }
    storage.saveGdAttempts(attemptCount);
    storage.saveGdBest(bestPercent);
  }

  void triggerVictory(SoundManager &sound, StorageManager &storage) {
    sound.stopBgm();
    sound.playFx(SoundFx::GD_VICTORY);
    gameState = GDState::VICTORY;
    stateStartTime = millis();
    bestPercent = 100;
    storage.saveGdBest(100);
    spawnExplosion(GD_PLAYER_SCREEN_X, playerY);
  }

public:
  void drawRotatedCube(int cx, int cy, float angleDeg) {
    int snapped = ((static_cast<int>(angleDeg + 45) / 90) * 90) % 360;
    if (fabs(angleDeg - snapped) < 4.0f || isOnGround) {
      int x0 = cx - GD_CUBE_SIZE / 2;
      int y0 = cy - GD_CUBE_SIZE / 2;
      display.drawRect(x0, y0, GD_CUBE_SIZE, GD_CUBE_SIZE, OLED_COLOR_WHITE);
      display.drawRect(x0 + 2, y0 + 2, GD_CUBE_SIZE - 4, GD_CUBE_SIZE - 4, OLED_COLOR_WHITE);
      display.fillRect(x0 + 4, y0 + 4, 2, 2, OLED_COLOR_WHITE);
      return;
    }

    float rad = angleDeg * 0.0174532925f;
    float c = cos(rad);
    float s = sin(rad);
    float half = GD_CUBE_SIZE * 0.5f;

    int x1 = cx + static_cast<int>(-half * c - -half * s);
    int y1 = cy + static_cast<int>(-half * s + -half * c);
    int x2 = cx + static_cast<int>( half * c - -half * s);
    int y2 = cy + static_cast<int>( half * s + -half * c);
    int x3 = cx + static_cast<int>( half * c -  half * s);
    int y3 = cy + static_cast<int>( half * s +  half * c);
    int x4 = cx + static_cast<int>(-half * c -  half * s);
    int y4 = cy + static_cast<int>(-half * s +  half * c);

    display.drawLine(x1, y1, x2, y2, OLED_COLOR_WHITE);
    display.drawLine(x2, y2, x3, y3, OLED_COLOR_WHITE);
    display.drawLine(x3, y3, x4, y4, OLED_COLOR_WHITE);
    display.drawLine(x4, y4, x1, y1, OLED_COLOR_WHITE);
    display.drawPixel(cx, cy, OLED_COLOR_WHITE);
  }

  void init(StorageManager &storage) {
    attemptCount = storage.loadGdAttempts();
    bestPercent  = storage.loadGdBest();
    gameState    = GDState::TITLE;
  }

  void setTitleState() {
    gameState = GDState::TITLE;
  }

  void resetGame(SoundManager &sound) {
    cameraX          = 0;
    playerY          = GD_FLOOR_Y - GD_CUBE_SIZE;
    playerVy         = 0;
    playerAngle      = 0;
    isOnGround       = true;
    playerMode       = GDPlayerMode::CUBE;
    currentPercent   = 0;
    isThrusting      = false;
    gameState        = GDState::PLAYING;
    sound.startBgm();
  }

  void update(const InputManager &input, SoundManager &sound, StorageManager &storage) {
    switch (gameState) {
      case GDState::TITLE:
        if (input.isBtn1Clicked()) {
          sound.playTone(587, 45);
          resetGame(sound);
        }
        break;

      case GDState::DEAD:
        if (millis() - stateStartTime > 500) {
          if (input.isBtn1Down() || (millis() - stateStartTime > 2400)) {
            resetGame(sound);
          }
        }
        break;

      case GDState::VICTORY:
        if (millis() - stateStartTime > 1500 && input.isBtn1Clicked()) {
          gameState = GDState::TITLE;
        }
        break;

      case GDState::PLAYING: {
        cameraX += GD_GAME_SPEED;
        currentPercent = min(100, static_cast<int>((cameraX * 100.0f) / GD_LEVEL_FINISH_X));

        bool btnDown = input.isBtn1Down();
        bool btnClicked = input.isBtn1Clicked();

        if (btnClicked) {
          jumpBufferActive = true;
          jumpBufferTime = millis();
        } else if (jumpBufferActive && (millis() - jumpBufferTime > 120)) {
          jumpBufferActive = false;
        }

        if (playerMode == GDPlayerMode::CUBE) {
          isThrusting = false;
          if ((jumpBufferActive || btnDown) && isOnGround) {
            playerVy = GD_CUBE_JUMP_VY;
            isOnGround = false;
            jumpBufferActive = false;
            sound.playFx(SoundFx::GD_JUMP);
          }
          playerVy += GD_CUBE_GRAVITY;
          playerY += playerVy;

          if (!isOnGround) {
            playerAngle += 15.0f;
          } else {
            playerAngle = ((static_cast<int>(playerAngle + 45) / 90) * 90) % 360;
          }

          if (playerY >= GD_FLOOR_Y - GD_CUBE_SIZE) {
            playerY = GD_FLOOR_Y - GD_CUBE_SIZE;
            playerVy = 0;
            isOnGround = true;
            playerAngle = 0;
          } else {
            isOnGround = false;
          }
        } else {
          // Ship Mode
          isThrusting = btnDown;
          if (btnDown) {
            playerVy += GD_SHIP_THRUST;
          } else {
            playerVy += GD_SHIP_GRAVITY;
          }

          if (playerVy > GD_SHIP_MAX_VY) playerVy = GD_SHIP_MAX_VY;
          if (playerVy < -GD_SHIP_MAX_VY) playerVy = -GD_SHIP_MAX_VY;
          playerY += playerVy;

          if (playerY <= GD_CEILING_Y) {
            playerY = GD_CEILING_Y;
            playerVy = 0.5f;
          }
          if (playerY >= GD_FLOOR_Y - 8) {
            triggerDeath(sound, storage);
            return;
          }
        }

        float worldPlayerX = cameraX + GD_PLAYER_SCREEN_X;

        // Obstacle Iteration & Collision Check
        for (uint16_t i = 0; i < GD_LEVEL_TRACK_COUNT; i++) {
          const GDObstacle &obs = GD_LEVEL_TRACK[i];
          if (obs.x + obs.w < cameraX - 10) continue;
          if (obs.x > cameraX + SCREEN_WIDTH + 20) break;

          if (obs.type == GDObstacleType::JUMP_PAD) {
            if (worldPlayerX + GD_CUBE_SIZE > obs.x && worldPlayerX < obs.x + obs.w) {
              if (playerY + GD_CUBE_SIZE >= obs.y && playerY + GD_CUBE_SIZE <= obs.y + 8) {
                playerVy = GD_CUBE_JUMP_VY * 1.35f;
                isOnGround = false;
                sound.playFx(SoundFx::GD_PAD);
              }
            }
          } else if (obs.type == GDObstacleType::JUMP_ORB) {
            if (btnClicked) {
              float dx = (worldPlayerX + GD_CUBE_SIZE / 2) - (obs.x + obs.w / 2);
              float dy = (playerY + GD_CUBE_SIZE / 2) - (obs.y + obs.h / 2);
              // High-efficiency squared distance check
              if ((dx * dx + dy * dy) < (16.0f * 16.0f)) {
                playerVy = GD_CUBE_JUMP_VY * 1.15f;
                isOnGround = false;
                jumpBufferActive = false;
                sound.playFx(SoundFx::GD_ORB);
              }
            }
          } else if (obs.type == GDObstacleType::PORTAL_SHIP) {
            if (worldPlayerX + GD_CUBE_SIZE >= obs.x && playerMode != GDPlayerMode::SHIP) {
              playerMode = GDPlayerMode::SHIP;
              sound.playFx(SoundFx::GD_PORTAL);
            }
          } else if (obs.type == GDObstacleType::PORTAL_CUBE) {
            if (worldPlayerX + GD_CUBE_SIZE >= obs.x && playerMode != GDPlayerMode::CUBE) {
              playerMode = GDPlayerMode::CUBE;
              playerAngle = 0;
              sound.playFx(SoundFx::GD_PORTAL);
            }
          } else if (obs.type == GDObstacleType::FINISH) {
            if (worldPlayerX >= obs.x) {
              triggerVictory(sound, storage);
              return;
            }
          } else {
            if (checkCollision(worldPlayerX, playerY, obs)) {
              triggerDeath(sound, storage);
              return;
            }
          }
        }
        break;
      }
    }
  }

  void renderWorld() {
    int ox = shakeOffsetX;
    int oy = shakeOffsetY;
    if (ox != 0) shakeOffsetX = -shakeOffsetX / 2;
    if (oy != 0) shakeOffsetY = -shakeOffsetY / 2;

    display.drawLine(0, GD_FLOOR_Y + oy, SCREEN_WIDTH - 1, GD_FLOOR_Y + oy, OLED_COLOR_WHITE);

    int groundScroll = static_cast<int>(cameraX) % 8;
    for (int gx = -groundScroll; gx < SCREEN_WIDTH; gx += 8) {
      display.drawPixel(gx, GD_FLOOR_Y + 4 + oy, OLED_COLOR_WHITE);
      display.drawPixel(gx + 4, GD_FLOOR_Y + 8 + oy, OLED_COLOR_WHITE);
    }

    for (uint16_t i = 0; i < GD_LEVEL_TRACK_COUNT; i++) {
      const GDObstacle &obs = GD_LEVEL_TRACK[i];
      int screenX = static_cast<int>(obs.x - cameraX) + ox;
      if (screenX + obs.w < 0) continue;
      if (screenX > SCREEN_WIDTH) break;

      GDObstacle shifted = obs;
      shifted.y += oy;
      drawObstacle(shifted, screenX);
    }

    if (gameState == GDState::PLAYING) {
      if (playerMode == GDPlayerMode::CUBE) {
        drawRotatedCube(GD_PLAYER_SCREEN_X + GD_CUBE_SIZE / 2 + ox, static_cast<int>(playerY) + GD_CUBE_SIZE / 2 + oy, playerAngle);
      } else {
        drawShip(GD_PLAYER_SCREEN_X + ox, static_cast<int>(playerY) + oy, isThrusting);
      }
    }

    updateAndDrawParticles();

    // Top HUD Progress Bar
    display.drawRect(0, 0, SCREEN_WIDTH, 4, OLED_COLOR_WHITE);
    int fillW = (currentPercent * (SCREEN_WIDTH - 2)) / 100;
    if (fillW > 0) {
      display.fillRect(1, 1, fillW, 2, OLED_COLOR_WHITE);
    }
    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(SCREEN_WIDTH - 26, 6);
    display.print(currentPercent);
    display.print(F("%"));
  }

  void render() {
    display.clearDisplay();

    switch (gameState) {
      case GDState::TITLE: {
        display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
        display.setTextSize(1);
        display.setTextColor(OLED_COLOR_WHITE);
        display.setCursor(14, 6);
        display.print(F("= GEOMETRY DASH ="));

        int cubeY = 22 + static_cast<int>(sin(millis() * 0.006f) * 4);
        drawRotatedCube(64, cubeY, millis() * 0.2f);

        if ((millis() / 400) % 2 == 0) {
          display.setCursor(18, 38);
          display.print(F("BTN1: JUMP / PLAY"));
        }
        display.setCursor(10, 48);
        display.print(F("BTN2: SWITCH GAME"));

        display.setCursor(6, 56);
        display.print(F("ATT:"));
        display.print(attemptCount);
        display.setCursor(68, 56);
        display.print(F("BEST:"));
        display.print(bestPercent);
        display.print(F("%"));
        break;
      }

      case GDState::PLAYING:
        renderWorld();
        break;

      case GDState::DEAD:
        renderWorld();
        display.fillRect(16, 16, 96, 32, OLED_COLOR_BLACK);
        display.drawRect(16, 16, 96, 32, OLED_COLOR_WHITE);

        display.setTextSize(1);
        display.setCursor(34, 20);
        display.print(F("CRASHED!"));

        display.setCursor(24, 30);
        display.print(currentPercent);
        display.print(F("%  ATT:"));
        display.print(attemptCount);

        display.setCursor(20, 39);
        display.print(F("BTN1: RETRY"));
        break;

      case GDState::VICTORY:
        renderWorld();
        display.fillRect(12, 14, 104, 36, OLED_COLOR_BLACK);
        display.drawRect(12, 14, 104, 36, OLED_COLOR_WHITE);

        display.setTextSize(1);
        display.setCursor(18, 19);
        display.print(F("LEVEL COMPLETE!"));
        display.setCursor(26, 29);
        display.print(F("100% - GG!!"));
        display.setCursor(18, 39);
        display.print(F("ATTEMPTS: "));
        display.print(attemptCount);
        break;
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 8: GAME 2 - FLAPPY BIRD ENGINE
// =========================================================================================

enum class FBState : uint8_t {
  READY = 0,
  PLAYING,
  DEAD
};

struct FBPipe {
  float  x;
  int8_t gapY;
  bool   scored;
};

constexpr uint8_t FB_FLOOR_Y      = 56;
constexpr uint8_t FB_CEIL_Y       = 1;
constexpr uint8_t FB_BIRD_X       = 24;
constexpr uint8_t FB_BIRD_W       = 9;
constexpr uint8_t FB_BIRD_H       = 7;

constexpr uint8_t FB_PIPE_WIDTH   = 12;
constexpr uint8_t FB_PIPE_GAP     = 22;
constexpr uint8_t FB_PIPE_COUNT   = 3;
constexpr float   FB_PIPE_SPEED   = 1.35f;
constexpr float   FB_GRAVITY      = 0.36f;
constexpr float   FB_FLAP_IMPULSE = -2.6f;

class FlappyBirdGame {
private:
  FBState  gameState    = FBState::READY;
  float    birdY        = 26.0f;
  float    birdVy       = 0.0f;
  FBPipe   pipes[FB_PIPE_COUNT];
  uint16_t score        = 0;
  uint16_t bestScore    = 0;
  uint32_t stateStartTime = 0;
  float    groundScroll = 0.0f;

  void drawPipe(const FBPipe &pipe) {
    int px = static_cast<int>(pipe.x);
    int topH = pipe.gapY - (FB_PIPE_GAP / 2);
    int botY = pipe.gapY + (FB_PIPE_GAP / 2);
    int botH = FB_FLOOR_Y - botY;

    if (topH > 0) {
      display.drawRect(px, 0, FB_PIPE_WIDTH, topH, OLED_COLOR_WHITE);
      display.drawLine(px + 2, 0, px + 2, topH - 1, OLED_COLOR_WHITE);
      display.drawRect(px - 1, topH - 4, FB_PIPE_WIDTH + 2, 4, OLED_COLOR_WHITE);
      display.fillRect(px, topH - 3, FB_PIPE_WIDTH, 2, OLED_COLOR_WHITE);
    }

    if (botH > 0) {
      display.drawRect(px, botY, FB_PIPE_WIDTH, botH, OLED_COLOR_WHITE);
      display.drawLine(px + 2, botY + 1, px + 2, botY + botH - 1, OLED_COLOR_WHITE);
      display.drawRect(px - 1, botY, FB_PIPE_WIDTH + 2, 4, OLED_COLOR_WHITE);
      display.fillRect(px, botY + 1, FB_PIPE_WIDTH, 2, OLED_COLOR_WHITE);
    }
  }

  bool checkPipeCollision(const FBPipe &pipe, float bx, float by) {
    if (bx + FB_BIRD_W - 1 < pipe.x || bx + 1 > pipe.x + FB_PIPE_WIDTH) {
      return false;
    }
    int topH = pipe.gapY - (FB_PIPE_GAP / 2);
    int botY = pipe.gapY + (FB_PIPE_GAP / 2);

    if (by + 1 < topH) return true;
    if (by + FB_BIRD_H - 1 > botY) return true;
    return false;
  }

  void triggerDeath(SoundManager &sound, StorageManager &storage) {
    sound.playFx(SoundFx::FB_DEATH);
    gameState = FBState::DEAD;
    stateStartTime = millis();

    if (score > bestScore) {
      bestScore = score;
      storage.saveFbBest(bestScore);
    }
  }

public:
  void drawBird(int x, int y, float vy) {
    bool wingUp = (vy < 0);
    display.drawRoundRect(x, y, FB_BIRD_W, FB_BIRD_H, 2, OLED_COLOR_WHITE);
    display.drawPixel(x + 5, y + 2, OLED_COLOR_WHITE);
    display.drawLine(x + 8, y + 3, x + 9, y + 4, OLED_COLOR_WHITE);
    display.drawLine(x + 8, y + 5, x + 9, y + 4, OLED_COLOR_WHITE);

    if (wingUp) {
      display.drawLine(x + 2, y + 2, x + 4, y + 1, OLED_COLOR_WHITE);
      display.drawLine(x + 2, y + 3, x + 4, y + 2, OLED_COLOR_WHITE);
    } else {
      display.drawLine(x + 2, y + 4, x + 5, y + 4, OLED_COLOR_WHITE);
      display.drawLine(x + 2, y + 5, x + 4, y + 6, OLED_COLOR_WHITE);
    }
  }

  void init(StorageManager &storage) {
    bestScore = storage.loadFbBest();
    gameState = FBState::READY;
  }

  void setReadyState() {
    gameState = FBState::READY;
  }

  void resetGame() {
    birdY        = 24.0f;
    birdVy       = 0.0f;
    score        = 0;
    groundScroll = 0;

    for (uint8_t i = 0; i < FB_PIPE_COUNT; i++) {
      pipes[i].x = 128 + 30 + (i * 54);
      pipes[i].gapY = random(18, 38);
      pipes[i].scored = false;
    }
    gameState = FBState::PLAYING;
  }

  void update(const InputManager &input, SoundManager &sound, StorageManager &storage) {
    switch (gameState) {
      case FBState::READY:
        if (input.isBtn1Clicked()) {
          sound.playTone(700, 30);
          resetGame();
        }
        break;

      case FBState::DEAD:
        if (millis() - stateStartTime > 500 && input.isBtn1Down()) {
          resetGame();
        }
        break;

      case FBState::PLAYING: {
        groundScroll += FB_PIPE_SPEED;

        if (input.isBtn1Clicked()) {
          birdVy = FB_FLAP_IMPULSE;
          sound.playFx(SoundFx::FB_FLAP);
        }

        birdVy += FB_GRAVITY;
        birdY += birdVy;

        if (birdY <= FB_CEIL_Y) {
          birdY = FB_CEIL_Y;
          birdVy = 0.5f;
        }
        if (birdY + FB_BIRD_H >= FB_FLOOR_Y) {
          birdY = FB_FLOOR_Y - FB_BIRD_H;
          triggerDeath(sound, storage);
          return;
        }

        for (uint8_t i = 0; i < FB_PIPE_COUNT; i++) {
          pipes[i].x -= FB_PIPE_SPEED;

          if (!pipes[i].scored && (pipes[i].x + FB_PIPE_WIDTH < FB_BIRD_X)) {
            pipes[i].scored = true;
            score++;
            sound.playFx(SoundFx::FB_SCORE);
          }

          if (pipes[i].x + FB_PIPE_WIDTH < -5) {
            float maxX = 0;
            for (uint8_t j = 0; j < FB_PIPE_COUNT; j++) {
              if (pipes[j].x > maxX) maxX = pipes[j].x;
            }
            pipes[i].x = maxX + 54;
            pipes[i].gapY = random(18, 38);
            pipes[i].scored = false;
          }

          if (checkPipeCollision(pipes[i], FB_BIRD_X, birdY)) {
            triggerDeath(sound, storage);
            return;
          }
        }
        break;
      }
    }
  }

  void renderWorld() {
    for (uint8_t i = 0; i < FB_PIPE_COUNT; i++) {
      if (pipes[i].x > -FB_PIPE_WIDTH && pipes[i].x < SCREEN_WIDTH) {
        drawPipe(pipes[i]);
      }
    }

    display.drawLine(0, FB_FLOOR_Y, SCREEN_WIDTH - 1, FB_FLOOR_Y, OLED_COLOR_WHITE);
    int gOffset = static_cast<int>(groundScroll) % 8;
    for (int gx = -gOffset; gx < SCREEN_WIDTH; gx += 8) {
      display.drawLine(gx, FB_FLOOR_Y + 1, gx + 4, FB_FLOOR_Y + 7, OLED_COLOR_WHITE);
    }

    drawBird(FB_BIRD_X, static_cast<int>(birdY), birdVy);

    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(SCREEN_WIDTH / 2 - 4, 3);
    display.print(score);
  }

  void render() {
    display.clearDisplay();

    switch (gameState) {
      case FBState::READY: {
        display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
        display.setTextSize(1);
        display.setTextColor(OLED_COLOR_WHITE);
        display.setCursor(24, 6);
        display.print(F("~ FLAPPY BIRD ~"));

        float wave = sin(millis() * 0.007f);
        int hoverY = 24 + static_cast<int>(wave * 3);
        drawBird(58, hoverY, wave);

        if ((millis() / 400) % 2 == 0) {
          display.setCursor(18, 38);
          display.print(F("BTN1: FLAP WING"));
        }
        display.setCursor(10, 48);
        display.print(F("BTN2: SWITCH GAME"));

        display.setCursor(22, 56);
        display.print(F("BEST SCORE: "));
        display.print(bestScore);
        break;
      }

      case FBState::PLAYING:
        renderWorld();
        break;

      case FBState::DEAD:
        renderWorld();
        display.fillRect(16, 12, 96, 38, OLED_COLOR_BLACK);
        display.drawRect(16, 12, 96, 38, OLED_COLOR_WHITE);

        display.setTextSize(1);
        display.setCursor(32, 16);
        display.print(F("GAME OVER"));

        display.setCursor(24, 26);
        display.print(F("SCORE: "));
        display.print(score);

        display.setCursor(24, 34);
        display.print(F("BEST:  "));
        display.print(bestScore);

        display.setCursor(20, 42);
        display.print(F("BTN1: RETRY"));
        break;
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 9: GAME 3 - CHROME DINO (T-REX RUNNER) ENGINE
// =========================================================================================

enum class DinoState : uint8_t {
  READY = 0,
  PLAYING,
  DEAD
};

enum class DinoObsType : uint8_t {
  SMALL_CACTUS = 0,
  DOUBLE_CACTUS,
  LARGE_CACTUS,
  BIRD
};

struct DinoObstacle {
  float       x;
  int8_t      y;
  uint8_t     w;
  uint8_t     h;
  DinoObsType type;
  bool        wingUp;
};

constexpr uint8_t DINO_FLOOR_Y    = 54;
constexpr uint8_t DINO_X          = 16;
constexpr uint8_t DINO_W          = 12;
constexpr uint8_t DINO_H          = 14;
constexpr uint8_t DINO_MAX_OBS    = 3;
constexpr float   DINO_BASE_SPEED = 2.2f;
constexpr float   DINO_GRAVITY    = 0.48f;
constexpr float   DINO_JUMP_FORCE = -5.4f;

class ChromeDinoGame {
private:
  DinoState    gameState    = DinoState::READY;
  float        dinoY        = DINO_FLOOR_Y - DINO_H;
  float        dinoVy       = 0.0f;
  bool         onGround     = true;
  float        speed        = DINO_BASE_SPEED;

  DinoObstacle obstacles[DINO_MAX_OBS];
  uint32_t     score        = 0;
  uint32_t     bestScore    = 0;
  float        scoreAcc     = 0.0f;
  float        groundScroll = 0.0f;
  uint32_t     stateStartTime = 0;

  void drawObstacle(const DinoObstacle &obs) {
    int ox = static_cast<int>(obs.x);
    int oy = obs.y;

    if (obs.type == DinoObsType::SMALL_CACTUS) {
      display.fillRect(ox + 2, oy, 2, obs.h, OLED_COLOR_WHITE);
      display.fillRect(ox, oy + 3, 2, 3, OLED_COLOR_WHITE);
      display.fillRect(ox + 3, oy + 2, 2, 4, OLED_COLOR_WHITE);
    } else if (obs.type == DinoObsType::DOUBLE_CACTUS) {
      display.fillRect(ox + 1, oy, 2, obs.h, OLED_COLOR_WHITE);
      display.fillRect(ox, oy + 3, 2, 3, OLED_COLOR_WHITE);
      display.fillRect(ox + 6, oy + 1, 2, obs.h - 1, OLED_COLOR_WHITE);
      display.fillRect(ox + 7, oy + 4, 2, 3, OLED_COLOR_WHITE);
    } else if (obs.type == DinoObsType::LARGE_CACTUS) {
      display.fillRect(ox + 2, oy, 2, obs.h, OLED_COLOR_WHITE);
      display.fillRect(ox, oy + 4, 2, 4, OLED_COLOR_WHITE);
      display.fillRect(ox + 4, oy + 3, 2, 5, OLED_COLOR_WHITE);
    } else if (obs.type == DinoObsType::BIRD) {
      display.fillRect(ox + 3, oy + 2, 6, 3, OLED_COLOR_WHITE);
      display.drawLine(ox, oy + 3, ox + 2, oy + 3, OLED_COLOR_WHITE);
      display.drawPixel(ox + 9, oy + 3, OLED_COLOR_WHITE);
      if ((millis() / 150) % 2 == 0) {
        display.drawLine(ox + 4, oy + 2, ox + 6, oy, OLED_COLOR_WHITE);
        display.drawLine(ox + 5, oy + 2, ox + 7, oy, OLED_COLOR_WHITE);
      } else {
        display.drawLine(ox + 4, oy + 4, ox + 6, oy + 6, OLED_COLOR_WHITE);
        display.drawLine(ox + 5, oy + 4, ox + 7, oy + 6, OLED_COLOR_WHITE);
      }
    }
  }

  bool checkCollision(float dx, float dy, const DinoObstacle &obs) {
    float dinoLeft   = dx + 2.0f;
    float dinoRight  = dx + DINO_W - 3.0f;
    float dinoTop    = dy + 2.0f;
    float dinoBottom = dy + DINO_H - 1.0f;

    float obsLeft   = obs.x + 1.0f;
    float obsRight  = obs.x + obs.w - 1.0f;
    float obsTop    = static_cast<float>(obs.y) + 1.0f;
    float obsBottom = static_cast<float>(obs.y + obs.h);

    if (dinoRight < obsLeft || dinoLeft > obsRight) return false;
    if (dinoBottom < obsTop || dinoTop > obsBottom) return false;
    return true;
  }

  void triggerDeath(SoundManager &sound, StorageManager &storage) {
    sound.playFx(SoundFx::DINO_DEATH);
    gameState = DinoState::DEAD;
    stateStartTime = millis();

    if (score > bestScore) {
      bestScore = score;
      storage.saveDinoBest(bestScore);
    }
  }

public:
  void drawPlayer(int x, int y, bool isDead) {
    // Head & Snout (12x14 Dino)
    display.fillRect(x + 6, y, 6, 5, OLED_COLOR_WHITE);
    display.fillRect(x + 8, y + 2, 4, 3, OLED_COLOR_WHITE);

    // Eye
    if (!isDead) {
      display.drawPixel(x + 7, y + 1, OLED_COLOR_BLACK);
    } else {
      display.drawLine(x + 7, y + 1, x + 8, y + 2, OLED_COLOR_BLACK);
    }

    // Body, Tail & Arms
    display.fillRect(x + 5, y + 4, 4, 6, OLED_COLOR_WHITE);
    display.fillRect(x + 2, y + 6, 8, 4, OLED_COLOR_WHITE);
    display.fillRect(x + 9, y + 7, 3, 2, OLED_COLOR_WHITE);
    display.fillRect(x, y + 6, 3, 2, OLED_COLOR_WHITE);

    // Running Legs Animation
    if (!onGround) {
      display.drawLine(x + 3, y + 10, x + 5, y + 13, OLED_COLOR_WHITE);
      display.drawLine(x + 7, y + 10, x + 9, y + 12, OLED_COLOR_WHITE);
    } else {
      bool step = ((millis() / 90) % 2 == 0);
      if (step) {
        display.drawLine(x + 4, y + 10, x + 4, y + 13, OLED_COLOR_WHITE);
        display.drawLine(x + 8, y + 10, x + 6, y + 13, OLED_COLOR_WHITE);
      } else {
        display.drawLine(x + 4, y + 10, x + 6, y + 13, OLED_COLOR_WHITE);
        display.drawLine(x + 8, y + 10, x + 8, y + 13, OLED_COLOR_WHITE);
      }
    }
  }

  void init(StorageManager &storage) {
    bestScore = storage.loadDinoBest();
    gameState = DinoState::READY;
  }

  void setReadyState() {
    gameState = DinoState::READY;
  }

  void resetGame() {
    dinoY        = DINO_FLOOR_Y - DINO_H;
    dinoVy       = 0.0f;
    onGround     = true;
    speed        = DINO_BASE_SPEED;
    score        = 0;
    scoreAcc     = 0.0f;
    groundScroll = 0.0f;

    for (uint8_t i = 0; i < DINO_MAX_OBS; i++) {
      obstacles[i].x = (i == 0) ? (SCREEN_WIDTH + 26) : (obstacles[i - 1].x + 90);
      obstacles[i].type = DinoObsType::SMALL_CACTUS;
      obstacles[i].w = 5;
      obstacles[i].h = 9;
      obstacles[i].y = DINO_FLOOR_Y - 9;
      obstacles[i].wingUp = false;
    }
    gameState = DinoState::PLAYING;
  }

  void update(const InputManager &input, SoundManager &sound, StorageManager &storage) {
    switch (gameState) {
      case DinoState::READY:
        if (input.isBtn1Clicked()) {
          sound.playTone(600, 30);
          resetGame();
        }
        break;

      case DinoState::DEAD:
        if (millis() - stateStartTime > 500 && input.isBtn1Down()) {
          resetGame();
        }
        break;

      case DinoState::PLAYING: {
        groundScroll += speed;

        if (input.isBtn1Clicked() && onGround) {
          dinoVy = DINO_JUMP_FORCE;
          onGround = false;
          sound.playFx(SoundFx::DINO_JUMP);
        }

        // Variable Jump Height: early button release tap reduces vertical climb
        if (dinoVy < -2.0f && !input.isBtn1Down()) {
          dinoVy *= 0.65f;
        }

        dinoVy += DINO_GRAVITY;
        dinoY += dinoVy;

        if (dinoY >= DINO_FLOOR_Y - DINO_H) {
          dinoY = DINO_FLOOR_Y - DINO_H;
          dinoVy = 0.0f;
          onGround = true;
        }

        scoreAcc += (speed * 0.07f);
        uint32_t prevScore = score;
        score = static_cast<uint32_t>(scoreAcc);

        // 100-Point Milestone Sound
        if (score > 0 && (score / 100) > (prevScore / 100)) {
          sound.playFx(SoundFx::DINO_MILESTONE);
          speed = min(4.2f, speed + 0.12f);
        }

        for (uint8_t i = 0; i < DINO_MAX_OBS; i++) {
          obstacles[i].x -= speed;

          if (obstacles[i].x + obstacles[i].w < -6) {
            float maxX = SCREEN_WIDTH;
            for (uint8_t j = 0; j < DINO_MAX_OBS; j++) {
              if (obstacles[j].x > maxX) maxX = obstacles[j].x;
            }
            obstacles[i].x = maxX + random(75, 115);

            // Progressive difficulty ramp-up
            if (score < 60) {
              obstacles[i].type = DinoObsType::SMALL_CACTUS;
              obstacles[i].w = 5; obstacles[i].h = 9;
              obstacles[i].y = DINO_FLOOR_Y - 9;
            } else if (score < 150) {
              uint8_t r = random(0, 10);
              if (r < 6) {
                obstacles[i].type = DinoObsType::SMALL_CACTUS;
                obstacles[i].w = 5; obstacles[i].h = 9;
                obstacles[i].y = DINO_FLOOR_Y - 9;
              } else {
                obstacles[i].type = DinoObsType::DOUBLE_CACTUS;
                obstacles[i].w = 9; obstacles[i].h = 9;
                obstacles[i].y = DINO_FLOOR_Y - 9;
              }
            } else {
              uint8_t r = random(0, 12);
              if (r < 5) {
                obstacles[i].type = DinoObsType::SMALL_CACTUS;
                obstacles[i].w = 5; obstacles[i].h = 9;
                obstacles[i].y = DINO_FLOOR_Y - 9;
              } else if (r < 8) {
                obstacles[i].type = DinoObsType::DOUBLE_CACTUS;
                obstacles[i].w = 9; obstacles[i].h = 9;
                obstacles[i].y = DINO_FLOOR_Y - 9;
              } else if (r < 10) {
                obstacles[i].type = DinoObsType::LARGE_CACTUS;
                obstacles[i].w = 6; obstacles[i].h = 12;
                obstacles[i].y = DINO_FLOOR_Y - 12;
              } else {
                obstacles[i].type = DinoObsType::BIRD;
                obstacles[i].w = 12; obstacles[i].h = 7;
                obstacles[i].y = (random(0, 2) == 0) ? (DINO_FLOOR_Y - 13) : (DINO_FLOOR_Y - 18);
              }
            }
          }

          if (checkCollision(DINO_X, dinoY, obstacles[i])) {
            triggerDeath(sound, storage);
            return;
          }
        }
        break;
      }
    }
  }

  void renderWorld() {
    display.drawLine(0, DINO_FLOOR_Y, SCREEN_WIDTH - 1, DINO_FLOOR_Y, OLED_COLOR_WHITE);
    int gShift = static_cast<int>(groundScroll) % 12;
    for (int gx = -gShift; gx < SCREEN_WIDTH; gx += 12) {
      display.drawPixel(gx + 2, DINO_FLOOR_Y + 3, OLED_COLOR_WHITE);
      display.drawPixel(gx + 7, DINO_FLOOR_Y + 6, OLED_COLOR_WHITE);
    }

    for (uint8_t i = 0; i < DINO_MAX_OBS; i++) {
      if (obstacles[i].x > -20 && obstacles[i].x < SCREEN_WIDTH + 10) {
        drawObstacle(obstacles[i]);
      }
    }

    drawPlayer(DINO_X, static_cast<int>(dinoY), (gameState == DinoState::DEAD));

    // High Score and Current Score Display
    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(38, 2);
    display.print(F("HI "));
    if (bestScore < 100) display.print(F("00"));
    else if (bestScore < 1000) display.print(F("0"));
    display.print(bestScore);

    display.setCursor(88, 2);
    if (score < 100) display.print(F("00"));
    else if (score < 1000) display.print(F("0"));
    display.print(score);
  }

  void render() {
    display.clearDisplay();

    switch (gameState) {
      case DinoState::READY:
        display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
        display.setTextSize(1);
        display.setTextColor(OLED_COLOR_WHITE);
        display.setCursor(18, 6);
        display.print(F("~ CHROME DINO ~"));

        drawPlayer(58, 22, false);

        if ((millis() / 400) % 2 == 0) {
          display.setCursor(20, 38);
          display.print(F("BTN1: JUMP / RUN"));
        }
        display.setCursor(10, 48);
        display.print(F("BTN2: SWITCH GAME"));

        display.setCursor(22, 56);
        display.print(F("HI SCORE: "));
        display.print(bestScore);
        break;

      case DinoState::PLAYING:
        renderWorld();
        break;

      case DinoState::DEAD:
        renderWorld();
        display.fillRect(16, 12, 96, 38, OLED_COLOR_BLACK);
        display.drawRect(16, 12, 96, 38, OLED_COLOR_WHITE);

        display.setTextSize(1);
        display.setCursor(32, 16);
        display.print(F("GAME OVER"));

        display.setCursor(24, 26);
        display.print(F("SCORE: "));
        display.print(score);

        display.setCursor(24, 34);
        display.print(F("BEST:  "));
        display.print(bestScore);

        display.setCursor(20, 42);
        display.print(F("BTN1: RETRY"));
        break;
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 10: GAME 4 - CAR RACING (HIGHWAY OVERTAKE) ENGINE
// =========================================================================================

enum class CarState : uint8_t {
  READY = 0,
  PLAYING,
  DEAD
};

enum class VehicleType : uint8_t {
  CAR = 0,
  TRUCK,
  NITRO,
  COIN
};

struct TrafficVehicle {
  float       x;
  int8_t      lane;   // 0: Top (Y=16), 1: Mid (Y=30), 2: Bot (Y=44)
  uint8_t     w;
  uint8_t     h;
  float       speed;
  VehicleType type;
  bool        passed;
};

struct CarParticle {
  float   x, y, vx, vy;
  uint8_t life;
};

constexpr uint8_t  CAR_LANE_Y[3]      = { 16, 30, 44 };
constexpr uint8_t  CAR_PLAYER_X       = 16;
constexpr uint8_t  CAR_PLAYER_W       = 15;
constexpr uint8_t  CAR_PLAYER_H       = 7;
constexpr uint8_t  CAR_MAX_TRAFFIC    = 3;
constexpr uint8_t  CAR_NUM_PARTICLES  = 16;
constexpr float    CAR_BASE_SPEED     = 2.2f;
constexpr float    CAR_MAX_SPEED      = 4.6f;

class CarRacingGame {
private:
  CarState       gameState         = CarState::READY;
  int8_t         playerLane        = 1;  // 0: Top, 1: Mid, 2: Bot
  int8_t         laneDir           = -1; // -1 = steer up, +1 = steer down
  float          playerY           = 30.0f;
  float          roadSpeed         = CAR_BASE_SPEED;
  float          roadScroll        = 0.0f;

  TrafficVehicle traffic[CAR_MAX_TRAFFIC];
  uint32_t       score             = 0;
  uint32_t       bestScore         = 0;
  uint32_t       distanceMeters    = 0;
  float          scoreAcc          = 0.0f;

  uint16_t       nitroFrames       = 0;  // >0 when Nitro boost is active
  CarParticle    particles[CAR_NUM_PARTICLES];
  int8_t         shakeOffsetX      = 0;
  int8_t         shakeOffsetY      = 0;
  uint32_t       stateStartTime    = 0;

  void spawnExplosion(float x, float y) {
    for (uint8_t i = 0; i < CAR_NUM_PARTICLES; i++) {
      float angle = random(0, 360) * 0.0174533f;
      float spd = random(12, 36) * 0.1f;
      particles[i].x = x;
      particles[i].y = y;
      particles[i].vx = cos(angle) * spd;
      particles[i].vy = sin(angle) * spd;
      particles[i].life = random(12, 22);
    }
  }

  void spawnSmoke(float x, float y) {
    for (uint8_t i = 0; i < 4; i++) {
      particles[i].x = x;
      particles[i].y = y + random(-2, 3);
      particles[i].vx = -random(10, 25) * 0.1f;
      particles[i].vy = random(-5, 6) * 0.1f;
      particles[i].life = random(6, 12);
    }
  }

  void updateAndDrawParticles() {
    for (uint8_t i = 0; i < CAR_NUM_PARTICLES; i++) {
      if (particles[i].life > 0) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;

        int px = static_cast<int>(particles[i].x);
        int py = static_cast<int>(particles[i].y);
        if (px >= 0 && px < SCREEN_WIDTH && py >= 0 && py < SCREEN_HEIGHT) {
          if (particles[i].life > 8) {
            display.fillRect(px, py, 2, 2, OLED_COLOR_WHITE);
          } else {
            display.drawPixel(px, py, OLED_COLOR_WHITE);
          }
        }
      }
    }
  }

  void drawTrafficCar(int x, int y) {
    // 13x6 Sleek Sports Car
    display.fillRect(x + 2, y + 1, 9, 4, OLED_COLOR_WHITE);
    display.fillRect(x, y + 2, 2, 2, OLED_COLOR_WHITE);       // Nose
    display.drawPixel(x + 11, y, OLED_COLOR_WHITE);           // Spoiler
    display.drawPixel(x + 11, y + 5, OLED_COLOR_WHITE);
    display.fillRect(x + 4, y + 2, 3, 2, OLED_COLOR_BLACK);   // Windshield
    // Wheels
    display.fillRect(x + 2, y, 2, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 2, y + 5, 2, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 8, y, 2, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 8, y + 5, 2, 1, OLED_COLOR_WHITE);
  }

  void drawTruck(int x, int y) {
    // 22x7 Big Rig Semi-Truck
    display.fillRect(x, y + 1, 5, 5, OLED_COLOR_WHITE);       // Cab
    display.drawPixel(x + 2, y + 2, OLED_COLOR_BLACK);
    display.drawPixel(x + 2, y + 4, OLED_COLOR_BLACK);
    display.drawFastHLine(x + 5, y + 3, 2, OLED_COLOR_WHITE); // Hitch
    display.drawRect(x + 7, y, 15, 7, OLED_COLOR_WHITE);      // Trailer
    display.drawFastVLine(x + 12, y + 1, 5, OLED_COLOR_WHITE);
    display.drawFastVLine(x + 17, y + 1, 5, OLED_COLOR_WHITE);
    // Wheels
    display.fillRect(x + 1, y, 2, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 1, y + 6, 2, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 18, y, 3, 1, OLED_COLOR_WHITE);
    display.fillRect(x + 18, y + 6, 3, 1, OLED_COLOR_WHITE);
  }

  void drawNitroItem(int x, int y) {
    // 7x7 Pulsing Lightning Bolt / Canister
    display.drawRoundRect(x, y, 7, 7, 2, OLED_COLOR_WHITE);
    display.drawLine(x + 4, y + 1, x + 2, y + 3, OLED_COLOR_WHITE);
    display.drawLine(x + 2, y + 3, x + 5, y + 3, OLED_COLOR_WHITE);
    display.drawLine(x + 5, y + 3, x + 3, y + 5, OLED_COLOR_WHITE);
  }

  void drawCoinItem(int x, int y) {
    // 6x6 Gold Coin
    display.fillCircle(x + 3, y + 3, 2, OLED_COLOR_WHITE);
    display.drawPixel(x + 3, y + 3, OLED_COLOR_BLACK);
    display.drawPixel(x + 3, y, OLED_COLOR_WHITE);
    display.drawPixel(x + 3, y + 5, OLED_COLOR_WHITE);
    display.drawPixel(x, y + 3, OLED_COLOR_WHITE);
    display.drawPixel(x + 5, y + 3, OLED_COLOR_WHITE);
  }

  void triggerWreck(SoundManager &sound, StorageManager &storage) {
    sound.playFx(SoundFx::CAR_CRASH);
    gameState = CarState::DEAD;
    stateStartTime = millis();
    shakeOffsetX = 4;
    shakeOffsetY = -3;
    spawnExplosion(CAR_PLAYER_X + CAR_PLAYER_W / 2, playerY + CAR_PLAYER_H / 2);

    if (score > bestScore) {
      bestScore = score;
      storage.saveCarBest(bestScore);
    }
  }

public:
  void drawPlayerCar(int x, int y, bool nitro) {
    // Main chassis (15x7)
    display.fillRect(x + 2, y + 1, 11, 5, OLED_COLOR_WHITE);
    // Nose cone
    display.fillRect(x + 13, y + 2, 2, 3, OLED_COLOR_WHITE);
    display.drawPixel(x + 15, y + 3, OLED_COLOR_WHITE);
    // Cockpit windshield cutout (contrast black)
    display.fillRect(x + 6, y + 2, 4, 3, OLED_COLOR_BLACK);
    // Driver helmet
    display.drawPixel(x + 7, y + 3, OLED_COLOR_WHITE);
    // Rear spoiler
    display.fillRect(x, y, 2, 7, OLED_COLOR_WHITE);
    // Wheels (front & rear, top & bottom)
    display.fillRect(x + 3, y - 1, 3, 2, OLED_COLOR_WHITE);
    display.fillRect(x + 3, y + 6, 3, 2, OLED_COLOR_WHITE);
    display.fillRect(x + 10, y - 1, 3, 2, OLED_COLOR_WHITE);
    display.fillRect(x + 10, y + 6, 3, 2, OLED_COLOR_WHITE);
    // Wheel hub cutouts
    display.drawPixel(x + 4, y, OLED_COLOR_BLACK);
    display.drawPixel(x + 4, y + 6, OLED_COLOR_BLACK);
    display.drawPixel(x + 11, y, OLED_COLOR_BLACK);
    display.drawPixel(x + 11, y + 6, OLED_COLOR_BLACK);

    // Exhaust Flames
    if (nitro) {
      int fLen = random(5, 10);
      display.drawLine(x - 1, y + 2, x - fLen, y + 2, OLED_COLOR_WHITE);
      display.drawLine(x - 1, y + 4, x - fLen, y + 4, OLED_COLOR_WHITE);
      display.drawPixel(x - fLen - 1, y + 3, OLED_COLOR_WHITE);
    } else if ((millis() / 40) % 2 == 0) {
      display.drawPixel(x - 1, y + 2, OLED_COLOR_WHITE);
      display.drawPixel(x - 2, y + 4, OLED_COLOR_WHITE);
    }
  }

  void init(StorageManager &storage) {
    bestScore = storage.loadCarBest();
    gameState = CarState::READY;
  }

  void setReadyState() {
    gameState = CarState::READY;
  }

  void resetGame() {
    playerLane     = 1;
    laneDir        = -1;
    playerY        = CAR_LANE_Y[1];
    roadSpeed      = CAR_BASE_SPEED;
    roadScroll     = 0.0f;
    score          = 0;
    distanceMeters = 0;
    scoreAcc       = 0.0f;
    nitroFrames    = 0;
    shakeOffsetX   = 0;
    shakeOffsetY   = 0;

    for (uint8_t i = 0; i < CAR_MAX_TRAFFIC; i++) {
      traffic[i].x = SCREEN_WIDTH + 30 + (i * 70);
      traffic[i].lane = (i == 0) ? 0 : ((i == 1) ? 2 : 1);
      traffic[i].type = (i == 1) ? VehicleType::TRUCK : VehicleType::CAR;
      traffic[i].w = (traffic[i].type == VehicleType::TRUCK) ? 22 : 13;
      traffic[i].h = (traffic[i].type == VehicleType::TRUCK) ? 7 : 6;
      traffic[i].speed = roadSpeed * 0.4f;
      traffic[i].passed = false;
    }
    gameState = CarState::PLAYING;
  }

  void update(const InputManager &input, SoundManager &sound, StorageManager &storage) {
    switch (gameState) {
      case CarState::READY:
        if (input.isBtn1Clicked()) {
          sound.playTone(600, 40);
          resetGame();
        }
        break;

      case CarState::DEAD:
        if (millis() - stateStartTime > 500 && input.isBtn1Down()) {
          resetGame();
        }
        break;

      case CarState::PLAYING: {
        // Nitro Timer
        bool isNitro = (nitroFrames > 0);
        if (isNitro) nitroFrames--;

        float effectiveSpeed = isNitro ? (roadSpeed * 1.5f) : roadSpeed;
        roadScroll += effectiveSpeed;

        // Distance & Score Accumulation
        scoreAcc += (effectiveSpeed * 0.25f);
        score = static_cast<uint32_t>(scoreAcc);
        distanceMeters = score * 2;

        // Progressive Difficulty: speed ramps up with distance
        if (roadSpeed < CAR_MAX_SPEED) {
          roadSpeed += 0.0006f;
        }

        // Steer Lane Change on Button 1 Click
        if (input.isBtn1Clicked()) {
          if (laneDir == -1) {
            playerLane--;
            if (playerLane <= 0) {
              playerLane = 0;
              laneDir = 1;
            }
          } else {
            playerLane++;
            if (playerLane >= 2) {
              playerLane = 2;
              laneDir = -1;
            }
          }
          sound.playFx(SoundFx::CAR_SWERVE);
          spawnSmoke(CAR_PLAYER_X, playerY + 3);
        }

        // Smooth Vertical Lane Interpolation
        float targetY = CAR_LANE_Y[playerLane];
        playerY += (targetY - playerY) * 0.35f;

        // Traffic Management & Collision Checks
        for (uint8_t i = 0; i < CAR_MAX_TRAFFIC; i++) {
          float relSpeed = (effectiveSpeed - traffic[i].speed);
          traffic[i].x -= relSpeed;

          // Check if player passed this vehicle
          if (!traffic[i].passed && (traffic[i].x + traffic[i].w < CAR_PLAYER_X)) {
            traffic[i].passed = true;
            if (traffic[i].type == VehicleType::CAR || traffic[i].type == VehicleType::TRUCK) {
              scoreAcc += 30.0f;
              sound.playFx(SoundFx::CAR_PASS);
            }
          }

          // Recycle traffic vehicle when off-screen left
          if (traffic[i].x + traffic[i].w < -10) {
            float maxX = SCREEN_WIDTH;
            for (uint8_t j = 0; j < CAR_MAX_TRAFFIC; j++) {
              if (traffic[j].x > maxX) maxX = traffic[j].x;
            }
            traffic[i].x = maxX + random(60, 95);

            // Fair lane distribution: pick a lane different from the vehicle right ahead
            uint8_t prevLane = traffic[(i == 0) ? (CAR_MAX_TRAFFIC - 1) : (i - 1)].lane;
            uint8_t r = random(1, 3);
            traffic[i].lane = (prevLane + r) % 3;

            // Randomize vehicle or pickup type
            uint8_t typeRoll = random(0, 10);
            if (typeRoll < 5) {
              traffic[i].type = VehicleType::CAR;
              traffic[i].w = 13; traffic[i].h = 6;
              traffic[i].speed = roadSpeed * 0.42f;
            } else if (typeRoll < 8) {
              traffic[i].type = VehicleType::TRUCK;
              traffic[i].w = 22; traffic[i].h = 7;
              traffic[i].speed = roadSpeed * 0.35f;
            } else if (typeRoll == 8) {
              traffic[i].type = VehicleType::NITRO;
              traffic[i].w = 7; traffic[i].h = 7;
              traffic[i].speed = 0.0f;
            } else {
              traffic[i].type = VehicleType::COIN;
              traffic[i].w = 6; traffic[i].h = 6;
              traffic[i].speed = 0.0f;
            }
            traffic[i].passed = false;
          }

          // AABB Collision Detection
          float obsY = CAR_LANE_Y[traffic[i].lane];
          if (CAR_PLAYER_X + CAR_PLAYER_W - 2 >= traffic[i].x &&
              CAR_PLAYER_X + 2 <= traffic[i].x + traffic[i].w &&
              playerY + CAR_PLAYER_H - 1 >= obsY &&
              playerY + 1 <= obsY + traffic[i].h) {

            if (traffic[i].type == VehicleType::COIN) {
              scoreAcc += 100.0f;
              sound.playFx(SoundFx::CAR_COIN);
              traffic[i].x = -30;
            } else if (traffic[i].type == VehicleType::NITRO) {
              nitroFrames = 140; // ~3.5 seconds of super speed & invincibility!
              sound.playFx(SoundFx::CAR_NITRO);
              traffic[i].x = -30;
            } else {
              if (isNitro) {
                // Smashed through in Nitro mode!
                spawnExplosion(traffic[i].x + traffic[i].w / 2, obsY + traffic[i].h / 2);
                scoreAcc += 150.0f;
                sound.playFx(SoundFx::CAR_CRASH);
                traffic[i].x = -30;
              } else {
                triggerWreck(sound, storage);
                return;
              }
            }
          }
        }
        break;
      }
    }
  }

  void renderWorld() {
    int ox = shakeOffsetX;
    int oy = shakeOffsetY;
    if (ox != 0) shakeOffsetX = -shakeOffsetX / 2;
    if (oy != 0) shakeOffsetY = -shakeOffsetY / 2;

    // 1. Curbs with Checkered Rumble Strips
    display.drawLine(0, 11 + oy, SCREEN_WIDTH - 1, 11 + oy, OLED_COLOR_WHITE);
    display.drawLine(0, 54 + oy, SCREEN_WIDTH - 1, 54 + oy, OLED_COLOR_WHITE);

    int curbShift = (static_cast<int>(roadScroll)) % 8;
    for (int cx = -curbShift; cx < SCREEN_WIDTH; cx += 8) {
      display.fillRect(cx + ox, 10 + oy, 4, 2, OLED_COLOR_WHITE);
      display.fillRect(cx + ox, 54 + oy, 4, 2, OLED_COLOR_WHITE);
    }

    // 2. Scrolling Dashed White Lane Dividers (Y=25 and Y=39)
    int dashShift = (static_cast<int>(roadScroll * 2)) % 16;
    for (int dx = -dashShift; dx < SCREEN_WIDTH; dx += 16) {
      display.drawFastHLine(dx + ox, 25 + oy, 8, OLED_COLOR_WHITE);
      display.drawFastHLine(dx + ox, 39 + oy, 8, OLED_COLOR_WHITE);
    }

    // 3. Roadside Telephone Poles & Grass Dashes
    int sceneryShift = (static_cast<int>(roadScroll * 0.8f)) % 32;
    for (int sx = -sceneryShift; sx < SCREEN_WIDTH; sx += 32) {
      display.drawFastVLine(sx + 10 + ox, 5 + oy, 6, OLED_COLOR_WHITE); // Pole
      display.drawFastHLine(sx + 8 + ox, 6 + oy, 5, OLED_COLOR_WHITE);  // Crossbar
      display.drawPixel(sx + 20 + ox, 58 + oy, OLED_COLOR_WHITE);       // Grass
    }

    // 4. Traffic Vehicles & Collectibles
    for (uint8_t i = 0; i < CAR_MAX_TRAFFIC; i++) {
      int tx = static_cast<int>(traffic[i].x) + ox;
      int ty = CAR_LANE_Y[traffic[i].lane] + oy;

      if (tx > -25 && tx < SCREEN_WIDTH + 10) {
        switch (traffic[i].type) {
          case VehicleType::CAR:   drawTrafficCar(tx, ty); break;
          case VehicleType::TRUCK: drawTruck(tx, ty);      break;
          case VehicleType::NITRO: drawNitroItem(tx, ty);  break;
          case VehicleType::COIN:  drawCoinItem(tx, ty);   break;
        }
      }
    }

    // 5. Player Race Car
    bool isNitro = (nitroFrames > 0);
    drawPlayerCar(CAR_PLAYER_X + ox, static_cast<int>(playerY) + oy, isNitro);

    // 6. Particles
    updateAndDrawParticles();

    // 7. Dashboard HUD (Top Y=0..9)
    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(2, 2);
    display.print(F("SPD:"));
    display.print(static_cast<int>((isNitro ? roadSpeed * 1.5f : roadSpeed) * 45));

    display.setCursor(56, 2);
    display.print(F("DST:"));
    display.print(distanceMeters);
    display.print(F("M"));

    if (isNitro && ((millis() / 100) % 2 == 0)) {
      display.setCursor(102, 2);
      display.print(F("⚡NITRO"));
    }
  }

  void render() {
    display.clearDisplay();

    switch (gameState) {
      case CarState::READY:
        display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
        display.setTextSize(1);
        display.setTextColor(OLED_COLOR_WHITE);
        display.setCursor(14, 6);
        display.print(F("~ HIGHWAY RACER ~"));

        drawPlayerCar(54, 24, ((millis() / 200) % 2 == 0));

        if ((millis() / 400) % 2 == 0) {
          display.setCursor(8, 38);
          display.print(F("BTN1: STEER / DODGE"));
        }
        display.setCursor(10, 48);
        display.print(F("BTN2: SWITCH GAME"));

        display.setCursor(18, 56);
        display.print(F("RECORD: "));
        display.print(bestScore * 2);
        display.print(F("M"));
        break;

      case CarState::PLAYING:
        renderWorld();
        break;

      case CarState::DEAD:
        renderWorld();
        display.fillRect(16, 12, 96, 38, OLED_COLOR_BLACK);
        display.drawRect(16, 12, 96, 38, OLED_COLOR_WHITE);

        display.setTextSize(1);
        display.setCursor(40, 16);
        display.print(F("WRECKED!"));

        display.setCursor(24, 26);
        display.print(F("DIST: "));
        display.print(distanceMeters);
        display.print(F("M"));

        display.setCursor(24, 34);
        display.print(F("BEST: "));
        display.print(bestScore * 2);
        display.print(F("M"));

        display.setCursor(20, 42);
        display.print(F("BTN1: RETRY"));
        break;
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 11: GAME 5 - RETRO SNAKE
// =========================================================================================

enum class SnakeState : uint8_t {
  READY,
  PLAYING,
  DEAD
};

struct SnakePoint {
  int8_t x, y;
};

constexpr uint8_t SNAKE_COLS = 28;
constexpr uint8_t SNAKE_ROWS = 16;
constexpr uint8_t SNAKE_MAX_SEGMENTS = 64;

class SnakeGame {
private:
  SnakeState gameState = SnakeState::READY;
  SnakePoint body[SNAKE_MAX_SEGMENTS];
  uint8_t    length = 4;
  int8_t     dirX = 1;
  int8_t     dirY = 0;
  int8_t     nextDirX = 1;
  int8_t     nextDirY = 0;

  SnakePoint food;
  bool       foodIsGolden = false;
  uint16_t   goldenFrames = 0;

  uint16_t   score = 0;
  uint16_t   bestScore = 0;
  uint8_t    moveInterval = 5; // move every 5 frames (~125ms at 40fps)
  uint8_t    moveCounter = 0;

  void spawnFood() {
    bool valid = false;
    uint8_t attempts = 0;
    while (!valid && attempts < 50) {
      attempts++;
      food.x = random(0, SNAKE_COLS);
      food.y = random(0, SNAKE_ROWS);
      valid = true;
      for (uint8_t i = 0; i < length; i++) {
        if (body[i].x == food.x && body[i].y == food.y) {
          valid = false;
          break;
        }
      }
    }
    foodIsGolden = (random(0, 100) < 22);
    goldenFrames = foodIsGolden ? 200 : 0;
  }

  void turnClockwise() {
    if (dirX == 1 && dirY == 0)       { nextDirX = 0;  nextDirY = 1;  }
    else if (dirX == 0 && dirY == 1)  { nextDirX = -1; nextDirY = 0;  }
    else if (dirX == -1 && dirY == 0) { nextDirX = 0;  nextDirY = -1; }
    else if (dirX == 0 && dirY == -1) { nextDirX = 1;  nextDirY = 0;  }
  }

public:
  void init(StorageManager& storage) {
    bestScore = storage.loadSnakeBest();
    setReadyState();
  }

  void setReadyState() {
    gameState = SnakeState::READY;
    length = 4;
    body[0] = { 8, 8 };
    body[1] = { 7, 8 };
    body[2] = { 6, 8 };
    body[3] = { 5, 8 };
    dirX = 1; dirY = 0;
    nextDirX = 1; nextDirY = 0;
    score = 0;
    moveInterval = 5;
    moveCounter = 0;
    spawnFood();
  }

  void startGame() {
    gameState = SnakeState::PLAYING;
    length = 4;
    body[0] = { 8, 8 };
    body[1] = { 7, 8 };
    body[2] = { 6, 8 };
    body[3] = { 5, 8 };
    dirX = 1; dirY = 0;
    nextDirX = 1; nextDirY = 0;
    score = 0;
    moveInterval = 5;
    moveCounter = 0;
    spawnFood();
  }

  void update(InputManager& input, SoundManager& sound, StorageManager& storage) {
    if (gameState == SnakeState::READY) {
      if (input.isBtn1Clicked()) {
        startGame();
        sound.playFx(SoundFx::SNAKE_TURN);
      }
      return;
    }

    if (gameState == SnakeState::DEAD) {
      if (input.isBtn1Clicked()) {
        startGame();
        sound.playFx(SoundFx::SNAKE_TURN);
      }
      return;
    }

    // Single-button 90-degree clockwise steering
    if (input.isBtn1Clicked()) {
      turnClockwise();
      sound.playFx(SoundFx::SNAKE_TURN);
    }

    if (foodIsGolden && goldenFrames > 0) {
      goldenFrames--;
      if (goldenFrames == 0) {
        spawnFood();
      }
    }

    moveCounter++;
    if (moveCounter >= moveInterval) {
      moveCounter = 0;
      dirX = nextDirX;
      dirY = nextDirY;

      SnakePoint newHead = { static_cast<int8_t>(body[0].x + dirX), static_cast<int8_t>(body[0].y + dirY) };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= SNAKE_COLS || newHead.y < 0 || newHead.y >= SNAKE_ROWS) {
        gameState = SnakeState::DEAD;
        sound.playFx(SoundFx::SNAKE_DEATH);
        if (score > bestScore) {
          bestScore = score;
          storage.saveSnakeBest(bestScore);
        }
        return;
      }

      // Self collision
      for (uint8_t i = 0; i < length; i++) {
        if (body[i].x == newHead.x && body[i].y == newHead.y) {
          gameState = SnakeState::DEAD;
          sound.playFx(SoundFx::SNAKE_DEATH);
          if (score > bestScore) {
            bestScore = score;
            storage.saveSnakeBest(bestScore);
          }
          return;
        }
      }

      // Shift body
      for (uint8_t i = length; i > 0; i--) {
        if (i < SNAKE_MAX_SEGMENTS) {
          body[i] = body[i - 1];
        }
      }
      body[0] = newHead;

      // Food consumption
      if (newHead.x == food.x && newHead.y == food.y) {
        sound.playFx(SoundFx::SNAKE_EAT);
        score += (foodIsGolden ? 50 : 10);
        if (length < SNAKE_MAX_SEGMENTS - 1) {
          length++;
        }
        if (length > 10 && moveInterval > 3) {
          moveInterval = 4;
        } else if (length > 25 && moveInterval > 2) {
          moveInterval = 3;
        }
        spawnFood();
      }
    }
  }

  void render() {
    display.clearDisplay();

    // Header bar
    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(6, 2);
    display.print(F("S:"));
    display.print(score);

    if (foodIsGolden) {
      display.setCursor(50, 2);
      display.print(F("*GOLD*"));
    }

    display.setCursor(88, 2);
    display.print(F("HI:"));
    display.print(bestScore);

    // Arena Border
    display.drawRect(7, 11, 114, 50, OLED_COLOR_WHITE);

    // Draw Food
    int fx = 8 + food.x * 4;
    int fy = 12 + food.y * 3;
    if (foodIsGolden) {
      if ((millis() / 120) % 2 == 0) {
        display.fillRect(fx, fy, 4, 3, OLED_COLOR_WHITE);
      } else {
        display.drawRect(fx, fy, 4, 3, OLED_COLOR_WHITE);
      }
    } else {
      display.fillRect(fx + 1, fy + 1, 2, 2, OLED_COLOR_WHITE);
      display.drawPixel(fx + 1, fy, OLED_COLOR_WHITE);
    }

    // Draw Snake
    for (uint8_t i = 0; i < length; i++) {
      int sx = 8 + body[i].x * 4;
      int sy = 12 + body[i].y * 3;
      if (i == 0) {
        // Head
        display.fillRect(sx, sy, 4, 3, OLED_COLOR_WHITE);
        // Eye cutout
        if (dirX == 1) display.drawPixel(sx + 2, sy + 1, OLED_COLOR_BLACK);
        else if (dirX == -1) display.drawPixel(sx + 1, sy + 1, OLED_COLOR_BLACK);
        else if (dirY == 1) display.drawPixel(sx + 1, sy + 1, OLED_COLOR_BLACK);
        else display.drawPixel(sx + 1, sy, OLED_COLOR_BLACK);
      } else {
        display.fillRect(sx, sy, 3, 2, OLED_COLOR_WHITE);
      }
    }

    if (gameState == SnakeState::READY) {
      display.fillRect(20, 20, 88, 24, OLED_COLOR_BLACK);
      display.drawRect(20, 20, 88, 24, OLED_COLOR_WHITE);
      display.setCursor(28, 24);
      display.print(F("RETRO SNAKE"));
      display.setCursor(24, 33);
      display.print(F("BTN1: START/TURN"));
    } else if (gameState == SnakeState::DEAD) {
      display.fillRect(22, 20, 84, 26, OLED_COLOR_BLACK);
      display.drawRect(22, 20, 84, 26, OLED_COLOR_WHITE);
      display.setCursor(36, 24);
      display.print(F("GAME OVER"));
      display.setCursor(28, 34);
      display.print(F("BTN1: REPLAY"));
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 12: GAME 6 - SPACE INVADERS
// =========================================================================================

enum class InvadersState : uint8_t {
  READY,
  PLAYING,
  DEAD
};

struct InvaderAlien {
  int8_t col, row;
  bool   alive;
  uint8_t points;
};

struct InvaderMissile {
  float x, y;
  bool  active;
};

struct InvaderBunker {
  uint8_t x, y;
  uint8_t hp;
};

constexpr uint8_t INV_COLS = 5;
constexpr uint8_t INV_ROWS = 3;
constexpr uint8_t INV_TOTAL = INV_COLS * INV_ROWS;

class SpaceInvadersGame {
private:
  InvadersState  gameState = InvadersState::READY;
  InvaderAlien   aliens[INV_TOTAL];
  float          fleetX = 14.0f;
  float          fleetY = 12.0f;
  int8_t         fleetDir = 1;
  uint8_t        fleetStepInterval = 14;
  uint8_t        fleetStepCounter = 0;
  bool           animFrame = false;

  float          playerX = 64.0f;
  int8_t         playerAutoDir = 1;

  InvaderMissile playerMissiles[2];
  InvaderMissile alienBombs[3];

  InvaderBunker  bunkers[6];

  float          ufoX = -20.0f;
  bool           ufoActive = false;
  uint16_t       ufoTimer = 250;

  uint16_t       score = 0;
  uint16_t       bestScore = 0;
  uint8_t        wave = 1;
  uint8_t        lives = 3;

  void initFleet() {
    for (uint8_t r = 0; r < INV_ROWS; r++) {
      for (uint8_t c = 0; c < INV_COLS; c++) {
        uint8_t idx = r * INV_COLS + c;
        aliens[idx].col = c;
        aliens[idx].row = r;
        aliens[idx].alive = true;
        aliens[idx].points = (r == 0) ? 30 : ((r == 1) ? 20 : 10);
      }
    }
    fleetX = 12.0f;
    fleetY = 12.0f + (wave - 1) * 2;
    fleetDir = 1;
    fleetStepInterval = (wave > 3) ? 10 : 14;
    fleetStepCounter = 0;
  }

  void initBunkers() {
    const uint8_t bX[3] = { 26, 60, 94 };
    for (uint8_t i = 0; i < 3; i++) {
      bunkers[i * 2].x = bX[i];
      bunkers[i * 2].y = 48;
      bunkers[i * 2].hp = 3;

      bunkers[i * 2 + 1].x = bX[i] + 6;
      bunkers[i * 2 + 1].y = 48;
      bunkers[i * 2 + 1].hp = 3;
    }
  }

  void fireLaser() {
    for (uint8_t i = 0; i < 2; i++) {
      if (!playerMissiles[i].active) {
        playerMissiles[i].active = true;
        playerMissiles[i].x = playerX;
        playerMissiles[i].y = 54.0f;
        break;
      }
    }
  }

public:
  void init(StorageManager& storage) {
    bestScore = storage.loadInvBest();
    setReadyState();
  }

  void setReadyState() {
    gameState = InvadersState::READY;
    score = 0;
    wave = 1;
    lives = 3;
    playerX = 64.0f;
    playerAutoDir = 1;
    for (uint8_t i = 0; i < 2; i++) playerMissiles[i].active = false;
    for (uint8_t i = 0; i < 3; i++) alienBombs[i].active = false;
    ufoActive = false;
    ufoTimer = 250;
    initFleet();
    initBunkers();
  }

  void startGame() {
    gameState = InvadersState::PLAYING;
    score = 0;
    wave = 1;
    lives = 3;
    playerX = 64.0f;
    playerAutoDir = 1;
    for (uint8_t i = 0; i < 2; i++) playerMissiles[i].active = false;
    for (uint8_t i = 0; i < 3; i++) alienBombs[i].active = false;
    ufoActive = false;
    ufoTimer = 250;
    initFleet();
    initBunkers();
  }

  void update(InputManager& input, SoundManager& sound, StorageManager& storage) {
    if (gameState == InvadersState::READY) {
      if (input.isBtn1Clicked()) {
        startGame();
        sound.playFx(SoundFx::INV_SHOOT);
      }
      return;
    }

    if (gameState == InvadersState::DEAD) {
      if (input.isBtn1Clicked()) {
        startGame();
        sound.playFx(SoundFx::INV_SHOOT);
      }
      return;
    }

    // 1-Button Cannon Auto-patrol with Shoot Trigger
    if (input.isBtn1Clicked()) {
      fireLaser();
      sound.playFx(SoundFx::INV_SHOOT);
    }

    // Cannon smooth patrol
    playerX += playerAutoDir * 1.5f;
    if (playerX >= 114.0f) { playerX = 114.0f; playerAutoDir = -1; }
    else if (playerX <= 14.0f) { playerX = 14.0f; playerAutoDir = 1; }

    // UFO Movement
    if (!ufoActive) {
      if (ufoTimer > 0) ufoTimer--;
      else {
        ufoActive = true;
        ufoX = -12.0f;
        ufoTimer = 350 + random(0, 150);
        sound.playFx(SoundFx::INV_UFO);
      }
    } else {
      ufoX += 1.4f;
      if (ufoX > 135.0f) ufoActive = false;
    }

    // Player Missiles
    for (uint8_t i = 0; i < 2; i++) {
      if (playerMissiles[i].active) {
        playerMissiles[i].y -= 3.5f;
        if (playerMissiles[i].y < 8.0f) {
          playerMissiles[i].active = false;
          continue;
        }

        // UFO Hit check
        if (ufoActive && abs(playerMissiles[i].x - (ufoX + 5)) < 6 && abs(playerMissiles[i].y - 11) < 4) {
          score += 150;
          ufoActive = false;
          playerMissiles[i].active = false;
          sound.playFx(SoundFx::INV_HIT);
          continue;
        }

        // Alien Hit check
        for (uint8_t a = 0; a < INV_TOTAL; a++) {
          if (aliens[a].alive) {
            float ax = fleetX + aliens[a].col * 16.0f;
            float ay = fleetY + aliens[a].row * 8.0f;
            if (abs(playerMissiles[i].x - (ax + 3)) < 5 && abs(playerMissiles[i].y - (ay + 2)) < 4) {
              aliens[a].alive = false;
              playerMissiles[i].active = false;
              score += aliens[a].points;
              sound.playFx(SoundFx::INV_HIT);

              // Check Wave Clear
              bool anyAlive = false;
              for (uint8_t k = 0; k < INV_TOTAL; k++) {
                if (aliens[k].alive) { anyAlive = true; break; }
              }
              if (!anyAlive) {
                wave++;
                score += 300;
                initFleet();
                initBunkers();
              }
              break;
            }
          }
        }
      }
    }

    // Alien Fleet Movement
    fleetStepCounter++;
    if (fleetStepCounter >= fleetStepInterval) {
      fleetStepCounter = 0;
      animFrame = !animFrame;

      int8_t minCol = 10, maxCol = -1;
      int8_t maxRow = -1;
      for (uint8_t a = 0; a < INV_TOTAL; a++) {
        if (aliens[a].alive) {
          if (aliens[a].col < minCol) minCol = aliens[a].col;
          if (aliens[a].col > maxCol) maxCol = aliens[a].col;
          if (aliens[a].row > maxRow) maxRow = aliens[a].row;
        }
      }

      if (maxCol >= 0) {
        float left = fleetX + minCol * 16.0f;
        float right = fleetX + maxCol * 16.0f + 7.0f;

        if ((fleetDir == 1 && right >= 120.0f) || (fleetDir == -1 && left <= 8.0f)) {
          fleetDir = -fleetDir;
          fleetY += 3.0f;
          if (fleetY + maxRow * 8.0f >= 48.0f) {
            gameState = InvadersState::DEAD;
            sound.playFx(SoundFx::INV_DEATH);
            if (score > bestScore) {
              bestScore = score;
              storage.saveInvBest(bestScore);
            }
            return;
          }
        } else {
          fleetX += fleetDir * 3.0f;
        }
      }
      sound.playFx(SoundFx::INV_STEP);
    }

    // Alien Bomb drop
    if (random(0, 100) < (4 + wave * 2)) {
      for (uint8_t b = 0; b < 3; b++) {
        if (!alienBombs[b].active) {
          uint8_t aliveIndices[INV_TOTAL];
          uint8_t numAlive = 0;
          for (uint8_t k = 0; k < INV_TOTAL; k++) {
            if (aliens[k].alive) aliveIndices[numAlive++] = k;
          }
          if (numAlive > 0) {
            uint8_t pick = aliveIndices[random(0, numAlive)];
            alienBombs[b].active = true;
            alienBombs[b].x = fleetX + aliens[pick].col * 16.0f + 3;
            alienBombs[b].y = fleetY + aliens[pick].row * 8.0f + 4;
          }
          break;
        }
      }
    }

    // Update Alien Bombs
    for (uint8_t b = 0; b < 3; b++) {
      if (alienBombs[b].active) {
        alienBombs[b].y += 1.8f;
        if (alienBombs[b].y >= 62.0f) {
          alienBombs[b].active = false;
          continue;
        }

        // Bunker collision
        for (uint8_t k = 0; k < 6; k++) {
          if (bunkers[k].hp > 0 && abs(alienBombs[b].x - (bunkers[k].x + 2)) < 4 && abs(alienBombs[b].y - (bunkers[k].y + 2)) < 3) {
            bunkers[k].hp--;
            alienBombs[b].active = false;
            break;
          }
        }

        // Player collision
        if (alienBombs[b].active && abs(alienBombs[b].x - playerX) < 5 && alienBombs[b].y >= 54.0f) {
          alienBombs[b].active = false;
          sound.playFx(SoundFx::INV_DEATH);
          if (lives > 1) {
            lives--;
          } else {
            lives = 0;
            gameState = InvadersState::DEAD;
            if (score > bestScore) {
              bestScore = score;
              storage.saveInvBest(bestScore);
            }
          }
        }
      }
    }
  }

  void render() {
    display.clearDisplay();

    // Top Header
    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(4, 1);
    display.print(F("S:"));
    display.print(score);

    display.setCursor(54, 1);
    display.print(F("W:"));
    display.print(wave);

    display.setCursor(96, 1);
    for (uint8_t i = 0; i < lives; i++) display.print(F("*"));

    // UFO
    if (ufoActive && ufoX >= -10 && ufoX <= 128) {
      int ux = static_cast<int>(ufoX);
      display.fillRect(ux + 2, 8, 6, 1, OLED_COLOR_WHITE);
      display.fillRect(ux, 9, 10, 2, OLED_COLOR_WHITE);
      display.fillRect(ux + 3, 11, 4, 1, OLED_COLOR_WHITE);
    }

    // Aliens
    for (uint8_t a = 0; a < INV_TOTAL; a++) {
      if (aliens[a].alive) {
        int ax = static_cast<int>(fleetX + aliens[a].col * 16.0f);
        int ay = static_cast<int>(fleetY + aliens[a].row * 8.0f);

        if (aliens[a].row == 0) {
          // Squid (6x5)
          display.fillRect(ax + 2, ay, 4, 1, OLED_COLOR_WHITE);
          display.fillRect(ax + 1, ay + 1, 6, 2, OLED_COLOR_WHITE);
          display.drawPixel(ax + 2, ay + 1, OLED_COLOR_BLACK);
          display.drawPixel(ax + 5, ay + 1, OLED_COLOR_BLACK);
          if (animFrame) {
            display.drawPixel(ax, ay + 3, OLED_COLOR_WHITE);
            display.drawPixel(ax + 7, ay + 3, OLED_COLOR_WHITE);
          } else {
            display.drawPixel(ax + 2, ay + 3, OLED_COLOR_WHITE);
            display.drawPixel(ax + 5, ay + 3, OLED_COLOR_WHITE);
          }
        } else if (aliens[a].row == 1) {
          // Crab (7x5)
          display.fillRect(ax + 1, ay, 6, 1, OLED_COLOR_WHITE);
          display.fillRect(ax, ay + 1, 8, 2, OLED_COLOR_WHITE);
          display.drawPixel(ax + 2, ay + 1, OLED_COLOR_BLACK);
          display.drawPixel(ax + 5, ay + 1, OLED_COLOR_BLACK);
          if (animFrame) {
            display.fillRect(ax + 1, ay + 3, 2, 1, OLED_COLOR_WHITE);
            display.fillRect(ax + 5, ay + 3, 2, 1, OLED_COLOR_WHITE);
          } else {
            display.drawPixel(ax, ay + 3, OLED_COLOR_WHITE);
            display.drawPixel(ax + 7, ay + 3, OLED_COLOR_WHITE);
          }
        } else {
          // Octopus (8x5)
          display.fillRect(ax + 2, ay, 4, 1, OLED_COLOR_WHITE);
          display.fillRect(ax + 1, ay + 1, 6, 2, OLED_COLOR_WHITE);
          display.drawPixel(ax + 2, ay + 1, OLED_COLOR_BLACK);
          display.drawPixel(ax + 5, ay + 1, OLED_COLOR_BLACK);
          if (animFrame) {
            display.drawPixel(ax + 1, ay + 3, OLED_COLOR_WHITE);
            display.drawPixel(ax + 6, ay + 3, OLED_COLOR_WHITE);
          } else {
            display.drawPixel(ax + 3, ay + 3, OLED_COLOR_WHITE);
            display.drawPixel(ax + 4, ay + 3, OLED_COLOR_WHITE);
          }
        }
      }
    }

    // Bunkers
    for (uint8_t k = 0; k < 6; k++) {
      if (bunkers[k].hp > 0) {
        display.fillRect(bunkers[k].x, bunkers[k].y, 4, 3, OLED_COLOR_WHITE);
        if (bunkers[k].hp == 1) {
          display.drawPixel(bunkers[k].x + 1, bunkers[k].y + 1, OLED_COLOR_BLACK);
        }
      }
    }

    // Player Missiles
    for (uint8_t i = 0; i < 2; i++) {
      if (playerMissiles[i].active) {
        display.drawFastVLine(static_cast<int>(playerMissiles[i].x), static_cast<int>(playerMissiles[i].y), 3, OLED_COLOR_WHITE);
      }
    }

    // Alien Bombs
    for (uint8_t b = 0; b < 3; b++) {
      if (alienBombs[b].active) {
        display.drawFastVLine(static_cast<int>(alienBombs[b].x), static_cast<int>(alienBombs[b].y), 2, OLED_COLOR_WHITE);
      }
    }

    // Player Cannon (9x5)
    int px = static_cast<int>(playerX);
    display.fillRect(px - 4, 58, 9, 3, OLED_COLOR_WHITE);
    display.fillRect(px - 2, 56, 5, 2, OLED_COLOR_WHITE);
    display.drawPixel(px, 55, OLED_COLOR_WHITE);

    if (gameState == InvadersState::READY) {
      display.fillRect(16, 20, 96, 24, OLED_COLOR_BLACK);
      display.drawRect(16, 20, 96, 24, OLED_COLOR_WHITE);
      display.setCursor(20, 24);
      display.print(F("SPACE INVADERS"));
      display.setCursor(22, 33);
      display.print(F("BTN1: FIRE/START"));
    } else if (gameState == InvadersState::DEAD) {
      display.fillRect(16, 20, 96, 26, OLED_COLOR_BLACK);
      display.drawRect(16, 20, 96, 26, OLED_COLOR_WHITE);
      display.setCursor(24, 24);
      display.print(F("ARMADA OVERRUN"));
      display.setCursor(28, 34);
      display.print(F("BTN1: REPLAY"));
    }

    display.display();
  }
};

// =========================================================================================
//  SECTION 13: ARCADE SYSTEM HUB & TRANSITION MANAGER
// =========================================================================================

class ArcadeConsole {
private:
  ActiveGame       activeGame        = ActiveGame::HOME_FACE;
  bool             isSystemMenuOpen  = false;
  uint8_t          menuSelection     = 0;

  bool             isSwitchingBanner = false;
  uint32_t         switchBannerTime  = 0;

  SoundManager     sound;
  InputManager     input;
  StorageManager   storage;

  CompanionFace     face;
  GeometryDashGame  gdGame;
  FlappyBirdGame    fbGame;
  ChromeDinoGame    dinoGame;
  CarRacingGame     carGame;
  SnakeGame         snakeGame;
  SpaceInvadersGame invGame;

  void cycleNextGame() {
    sound.playFx(SoundFx::SWITCH_GAME);

    uint8_t next = (static_cast<uint8_t>(activeGame) + 1) % static_cast<uint8_t>(ActiveGame::COUNT);
    activeGame = static_cast<ActiveGame>(next);
    storage.saveActiveGame(activeGame);

    isSwitchingBanner = true;
    switchBannerTime = millis();

    resetActiveGameState();
  }

  void resetActiveGameState() {
    switch (activeGame) {
      case ActiveGame::HOME_FACE:
        face.reset();
        break;
      case ActiveGame::GEOMETRY_DASH:
        gdGame.setTitleState();
        break;
      case ActiveGame::FLAPPY_BIRD:
        fbGame.setReadyState();
        break;
      case ActiveGame::CHROME_DINO:
        dinoGame.setReadyState();
        break;
      case ActiveGame::CAR_RACING:
        carGame.setReadyState();
        break;
      case ActiveGame::RETRO_SNAKE:
        snakeGame.setReadyState();
        break;
      case ActiveGame::SPACE_INVADERS:
        invGame.setReadyState();
        break;
      default: break;
    }
  }

  void renderSystemMenu() {
    display.clearDisplay();
    display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
    display.drawFastHLine(0, 11, SCREEN_WIDTH, OLED_COLOR_WHITE);
    display.drawFastHLine(0, 53, SCREEN_WIDTH, OLED_COLOR_WHITE);

    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(14, 2);
    display.print(F("=== ARCADE HUB ==="));

    const char* const menuLabels[7] = {
      "1. HOME (PET FACE)",
      "2. GEOMETRY DASH",
      "3. FLAPPY BIRD",
      "4. CHROME DINO",
      "5. CAR RACING",
      "6. RETRO SNAKE",
      "7. SPACE INVADERS"
    };

    uint8_t startIdx = 0;
    if (menuSelection >= 4) {
      startIdx = menuSelection - 4;
      if (startIdx > 2) startIdx = 2;
    }

    for (uint8_t i = 0; i < 5; i++) {
      uint8_t idx = startIdx + i;
      int itemY = 13 + (i * 8);
      if (idx == menuSelection) {
        display.fillRect(2, itemY - 1, SCREEN_WIDTH - 4, 8, OLED_COLOR_WHITE);
        display.setTextColor(OLED_COLOR_BLACK);
        display.setCursor(4, itemY);
        display.print(F("> "));
        display.print(menuLabels[idx]);
      } else {
        display.setTextColor(OLED_COLOR_WHITE);
        display.setCursor(4, itemY);
        display.print(F("  "));
        display.print(menuLabels[idx]);
      }
    }

    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(8, 55);
    display.print(F("B2:NEXT   B1:ENTER"));
    display.display();
  }

  void handleSystemMenuInput() {
    if (input.isBtn2Clicked()) {
      menuSelection = (menuSelection + 1) % 7;
      sound.playFx(SoundFx::MENU_MOVE);
    }

    if (input.isBtn1Clicked()) {
      sound.playFx(SoundFx::MENU_CONFIRM);
      activeGame = static_cast<ActiveGame>(menuSelection);
      storage.saveActiveGame(activeGame);
      isSystemMenuOpen = false;
      resetActiveGameState();
    }
  }

  void renderSwitchBanner() {
    display.clearDisplay();
    display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_COLOR_WHITE);
    display.drawRect(2, 2, SCREEN_WIDTH - 4, SCREEN_HEIGHT - 4, OLED_COLOR_WHITE);

    display.setTextSize(1);
    display.setTextColor(OLED_COLOR_WHITE);
    display.setCursor(18, 10);
    display.print(F("SWITCHING GAME..."));

    switch (activeGame) {
      case ActiveGame::HOME_FACE:
        display.setCursor(12, 24);
        display.print(F("> HOME (PET FACE) <"));
        display.fillRoundRect(48, 38, 14, 16, 4, OLED_COLOR_WHITE);
        display.fillRoundRect(66, 38, 14, 16, 4, OLED_COLOR_WHITE);
        display.fillRoundRect(58, 56, 12, 4, 2, OLED_COLOR_WHITE);
        break;

      case ActiveGame::GEOMETRY_DASH:
        display.setCursor(12, 24);
        display.print(F("> GEOMETRY DASH <"));
        gdGame.drawRotatedCube(64, 44, millis() * 0.3f);
        break;

      case ActiveGame::FLAPPY_BIRD:
        display.setCursor(16, 24);
        display.print(F("> FLAPPY BIRD <"));
        fbGame.drawBird(58, 42, sin(millis() * 0.01f));
        break;

      case ActiveGame::CHROME_DINO:
        display.setCursor(16, 24);
        display.print(F("> CHROME DINO <"));
        dinoGame.drawPlayer(58, 38, false);
        break;

      case ActiveGame::CAR_RACING:
        display.setCursor(18, 24);
        display.print(F("> CAR RACING <"));
        carGame.drawPlayerCar(52, 40, (millis() / 200) % 2 == 0);
        break;

      case ActiveGame::RETRO_SNAKE:
        display.setCursor(18, 24);
        display.print(F("> RETRO SNAKE <"));
        display.fillRect(50, 42, 4, 3, OLED_COLOR_WHITE);
        display.fillRect(56, 42, 3, 2, OLED_COLOR_WHITE);
        display.fillRect(62, 42, 3, 2, OLED_COLOR_WHITE);
        display.fillRect(72, 42, 2, 2, OLED_COLOR_WHITE);
        break;

      case ActiveGame::SPACE_INVADERS:
        display.setCursor(14, 24);
        display.print(F("> SPACE INVADERS <"));
        display.fillRect(60, 38, 8, 3, OLED_COLOR_WHITE);
        display.drawPixel(62, 39, OLED_COLOR_BLACK);
        display.drawPixel(65, 39, OLED_COLOR_BLACK);
        display.fillRect(60, 52, 8, 3, OLED_COLOR_WHITE);
        break;

      default: break;
    }

    display.display();

    if (millis() - switchBannerTime > 650) {
      isSwitchingBanner = false;
    }
  }

public:
  void begin() {
    storage.begin();
    sound.begin(BUZZER_PIN);
    input.begin(BUTTON_ACTION_PIN, BUTTON_SELECT_PIN, TOUCH_SENSOR_PIN);

    // Load persisted state & high scores
    activeGame = storage.loadActiveGame(ActiveGame::HOME_FACE);
    face.reset();
    gdGame.init(storage);
    fbGame.init(storage);
    dinoGame.init(storage);
    carGame.init(storage);
    snakeGame.init(storage);
    invGame.init(storage);
  }

  void tick() {
    input.update();
    sound.update();

    // 1. Dual Button Press Toggle System Hub Menu
    if (input.isDualPressed()) {
      isSystemMenuOpen = !isSystemMenuOpen;
      if (isSystemMenuOpen) {
        sound.playFx(SoundFx::MENU_OPEN);
        menuSelection = static_cast<uint8_t>(activeGame);
      } else {
        sound.playTone(600, 30);
      }
    }

    // 2. Render Modal Menu if open
    if (isSystemMenuOpen) {
      handleSystemMenuInput();
      renderSystemMenu();
      return;
    }

    // 3. Navigation Shortcuts
    if (activeGame == ActiveGame::HOME_FACE) {
      if (input.isBtn2Clicked() || input.isBtn1LongPressed()) {
        isSystemMenuOpen = true;
        sound.playFx(SoundFx::MENU_OPEN);
        menuSelection = 0;
        return;
      }
    } else {
      if (input.isBtn2Clicked()) {
        cycleNextGame();
      } else if (input.isBtn1LongPressed()) {
        isSystemMenuOpen = true;
        sound.playFx(SoundFx::MENU_OPEN);
        menuSelection = static_cast<uint8_t>(activeGame);
        return;
      }
    }

    // 4. Render Game Transition Banner
    if (isSwitchingBanner) {
      renderSwitchBanner();
      return;
    }

    // 5. Active Game Dispatcher
    switch (activeGame) {
      case ActiveGame::HOME_FACE:
        face.update(input, sound);
        display.clearDisplay();
        face.render();
        display.display();
        break;

      case ActiveGame::GEOMETRY_DASH:
        gdGame.update(input, sound, storage);
        gdGame.render();
        break;

      case ActiveGame::FLAPPY_BIRD:
        fbGame.update(input, sound, storage);
        fbGame.render();
        break;

      case ActiveGame::CHROME_DINO:
        dinoGame.update(input, sound, storage);
        dinoGame.render();
        break;

      case ActiveGame::CAR_RACING:
        carGame.update(input, sound, storage);
        carGame.render();
        break;

      case ActiveGame::RETRO_SNAKE:
        snakeGame.update(input, sound, storage);
        snakeGame.render();
        break;

      case ActiveGame::SPACE_INVADERS:
        invGame.update(input, sound, storage);
        invGame.render();
        break;

      default:
        break;
    }
  }
};

ArcadeConsole console;

// =========================================================================================
//  SECTION 12: ARDUINO SETUP & MAIN LOOP
// =========================================================================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println(F("\n========================================================"));
  Serial.println(F(" ⚡ ESP32 RETRO CONSOLE: 4-IN-1 ARCADE HUB + PET FACE ⚡ "));
  Serial.println(F("========================================================"));

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000); // 400kHz Fast Mode I2C

#if defined(USE_SH1106_DISPLAY)
  if (!display.begin(SCREEN_ADDRESS, true)) {
    Serial.println(F("ERROR: SH1106 OLED display not found! Check I2C wiring."));
    for (;;);
  }
#else
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("ERROR: SSD1306 OLED display not found! Check I2C wiring."));
    for (;;);
  }
#endif

  display.clearDisplay();
  display.display();

  console.begin();
  Serial.println(F("System Ready! Press BOTH Buttons simultaneously for System Menu"));
}

void loop() {
  static uint32_t lastFrameTime = 0;
  uint32_t now = millis();

  // Deterministic Frame Limiter (40 FPS)
  if (now - lastFrameTime < FRAME_TIME_MS) {
    return;
  }
  lastFrameTime = now;

  console.tick();
}
