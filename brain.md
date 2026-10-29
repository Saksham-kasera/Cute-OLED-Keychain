# 🧠 ESP32 Multi-Game Console — Project Brain & Action Log

> **Comprehensive record of architectural decisions, chronological milestones, bug investigations, and hardware/software specifications.**

---

## 📌 1. Project Overview & Scope

An all-in-one retro arcade gaming console running on **ESP32-C3 Super Mini** with an I2C OLED display (1.3" SH1106 / 0.96" SSD1306), fully mirrored by an interactive **Web Application** featuring both Full HD Neon Arcade mode and an authentic 128x64 OLED simulator mode.

### 🎮 The 3-in-1 Game Lineup
1. **⚡ Geometry Dash**:
   - Cube mode with jump buffering & mid-air 90° rotations.
   - Rocket/Ship flight mode with smooth thruster physics and flame particles.
   - Spikes (single/double/triple/ceiling), solid platforms, jump pads, and jump orbs.
   - 0% to 100% progress tracking, attempt counter, and 8-bit EDM chiptune soundtrack.
2. **🐥 Flappy Bird**:
   - Animated flapping bird with pitch tilt based on vertical velocity.
   - Procedural scrolling green pipes with top/bottom collars and fair random gaps.
   - Scrolling ground stripes, point coin chimes, and high score tracking.
3. **🦖 Chrome Dino (T-Rex Runner)**:
   - T-Rex runner with animated alternating legs and tucked jump pose.
   - Small, double, and tall saguaro cacti + flying pterodactyls with flapping wings.
   - Progressive speed acceleration and authentic 100-point milestone chime.
   - Variable jump height (tap for short hop, hold for high leap).
   - High score persistence (`HI 00000`).

---

## 🕹️ 2. Hardware Wiring & Controls

### Physical Pinout (ESP32-C3 Super Mini)
| Peripheral | ESP32-C3 Pin | Mode | Description |
| :--- | :--- | :--- | :--- |
| **OLED SDA** | **GPIO 4** | I2C Fast | 400kHz high-speed I2C bus data line |
| **OLED SCL** | **GPIO 5** | I2C Fast | 400kHz high-speed I2C bus clock line |
| **OLED VCC** | **3.3V / 5V** | Power | Connect to 3V3 rail (or 5V if OLED has 3.3V LDO) |
| **OLED GND** | **GND** | Power | Common ground |
| **Button 1 (Action)** | **GPIO 3** | `INPUT_PULLUP` | **Jump / Flap / Restart** (or GPIO 9 for onboard BOOT) |
| **Button 2 (Select)** | **GPIO 2** | `INPUT_PULLUP` | **Game Switcher** (cycles GD ➔ Flappy ➔ Dino) |
| **Buzzer (Optional)** | **GPIO 1 / 10** | PWM / Tone | Non-blocking piezo buzzer (set to `-1` if absent) |

### Control Schemes
- **Hardware Button 1**: Action (Jump / Flap / Restart). Also supports a **1.6s long-press fallback** to cycle games if only 1 button is physically wired.
- **Hardware Button 2**: Cycles active game with on-screen transition banner and two-tone chime.
- **Web Keyboard**: `Space` (Jump/Flap), `G` (Switch Game), `O` (Toggle OLED/Neon mode), `Z/X` (Practice Checkpoints), `R` (Restart).
- **Web Pointer**: Click/Touch on canvas acts as Button 1 Action.

---

## 💾 3. Persistent State & Storage Architecture

Both the physical ESP32 and the Web app persist records across reboots/refreshes:

- **ESP32 Flash Memory**: Handled via `Preferences.h` under namespace `game_hub`:
  - `active_game` (uint8_t): Remembers currently selected game across reboots.
  - `gd_att` (uint32_t): Total Geometry Dash attempts.
  - `gd_best` (uint8_t): Geometry Dash best percentage (0–100%).
  - `fb_best` (uint32_t): Flappy Bird high score.
  - `dino_best` (uint32_t): Chrome Dino high score.
- **Web App**: Handled via `window.localStorage` (`gd_attempts`, `gd_best`, `fb_best`, `dino_best`).

---

## 🗂️ 4. Codebase Architecture & File Roles

```
c:\Users\kaser\Downloads\experiment\
├── esp32_oled_demo/
│   └── esp32_oled_demo.ino     # Primary Arduino IDE sketch (folder name matches file name)
├── esp32_oled_demo.ino         # Root synchronized copy
├── index.html                  # Web App shell, HUD, control deck, customizer
├── style.css                   # Cyberpunk Neon styling + physical OLED scanline bezel
├── game.js                     # 3-in-1 game engine with dual Neon and OLED render pipelines
├── audio.js                    # Web Audio API procedural synthesizer (no external assets)
└── brain.md                    # Project tracking and architecture ledger (this file)
```

---

## ⏱️ 5. Chronological Milestones & Actions Taken

### Phase 1: Geometry Dash Engine & OLED Foundation
- **Actions**:
  - Implemented 400kHz I2C display driver supporting both **SH1106** (1.3") and **SSD1306** (0.96") OLEDs.
  - Built custom fixed-timestep physics engine (40 FPS / 25ms per frame) to prevent jitter.
  - Modeled Cube jumping physics with jump buffering (remembers input 100ms before landing).
  - Modeled Rocket/Ship flight mode with gentle thruster buoyancy and exhaust particles.
  - Designed full obstacle course: single/double/triple spikes, ceiling spikes, jump pads (auto-spring), jump orbs (air tap), gravity/ship portals, and victory finish.
  - Non-blocking sound engine with 8-bit EDM soundtrack.

### Phase 2: Flappy Bird & Dual-Button Game Switcher
- **Actions**:
  - Added second game engine: Flappy Bird with animated wing flaps, vertical pitch tilt, and scrolling checkerboard ground.
  - Procedural pipe generator with safe gaps (`FB_PIPE_GAP = 28px` on OLED).
  - Implemented Button 2 (`GPIO 2`) game switching with smooth transition banners and audio feedback.
  - Added 1.6-second long-press fallback on Button 1 for single-button hardware builds.

### Phase 3: Arduino Preprocessor Prototype Bug Resolution
- **Problem**:
  - Arduino IDE compilation failed with:
    ```
    esp32_oled_demo.ino:412:27: error: 'GDObstacle' does not name a type
    esp32_oled_demo.ino:874:23: error: 'FBPipe' does not name a type
    ```
- **Root Cause**:
  - `arduino-builder` scans sketches and auto-generates function prototypes immediately before the first function definition (`playTone()`). When structs (`GDObstacle`, `FBPipe`) were declared below that point, the auto-generated prototypes referenced types that had not yet been declared.
- **Resolution**:
  - Hoisted all `enum` and `struct` definitions (`ActiveGame`, `GDObstacleType`, `GDObstacle`, `GDParticle`, `GDMusicNote`, `FBPipe`, `DinoObstacle`) to the very top of the sketch before any functions.
  - Added explicit forward function prototypes to eliminate auto-generation misordering.
  - Ensured both `esp32_oled_demo/esp32_oled_demo.ino` and `esp32_oled_demo.ino` are strictly synchronized.

### Phase 4: Chrome Dino (T-Rex Runner) 3-in-1 Expansion
- **Actions**:
  - Integrated Chrome Dino as Game 3 (`activeGame = GAME_CHROME_DINO`).
  - Rendered animated T-Rex with alternating running legs, eye pupil, and tucked jump pose.
  - Added desert horizon line with parallax ground pebbles.
  - Added small, double, and large saguaro cacti, plus flying pterodactyls with flapping wings.
  - Added progressive speed ramp-up and 100-point milestone chime.

### Phase 5: Chrome Dino Physics, Sizing & Spacing Rectification
- **Problem Reported**:
  - *"dino game have some errors because it cant able to clear its first obstacle as its size and space doesnt match"*
- **Root Cause Analysis**:
  1. **Underpowered Jump Impulse**: Jump force was `-4.4f` with gravity `0.58f`, producing an apex of only 16.7px. A 15px tall cactus left only 1.7px clearance. At 40 FPS, Dino's bottom cleared the cactus for only 2 frames, but horizontal overlap lasted 7 frames—causing a guaranteed collision.
  2. **First Obstacle Randomization**: The first obstacle could randomly spawn as a tall cactus (`h=15`) or double cactus (`w=12`) right at the start.
  3. **Recycling Loop Variable Bug**:
     ```cpp
     // BUGGY CODE:
     if (dinoObstacles[i].x > maxX) maxX = dinoObstacles[j].x;
     ```
     `i` was tested instead of `j`. Since `dinoObstacles[i].x < -5`, `maxX` was never updated from 0, causing recycled obstacles to stack on top of each other at `x ≈ 143`.
  4. **Hitbox Mismatch**: Bounding boxes lacked inner padding, catching transparent sprite edges.
  5. **Web Simulator Auto-Jump**: `startDinoGame()` had `dino.vy = DINO_JUMP_FORCE; dino.onGround = false;`, causing Dino to jump immediately upon starting before any obstacle arrived.
  6. **OLED Simulator Floor Misalignment**: Dino in OLED simulator mode was rendered sunk 8px into the floor.
- **Actions & Fixes Applied**:
  - **Boosted Jump Impulse**: `DINO_JUMP_FORCE = -5.4f; DINO_GRAVITY = 0.48f;`
    - Apex height increased from 16.7px to **30.4px** (clearance over cacti: **18.4px to 21.4px**).
    - Horizontal jump distance: **49.5px** (easily clears double cactus width of 9px).
  - **Variable Jump Height**: Early button release cuts upward momentum (`dinoVy *= 0.65f`), allowing quick taps for short hops and sustained holds for full leaps.
  - **Balanced Obstacle Sizing**:
    - Small Cactus: `5×9 px` (clean introductory obstacle).
    - Double Cactus: `9×9 px` (two trunks with 4px gap).
    - Tall Cactus: `6×12 px`.
    - Pterodactyl (Bird): `12×7 px` (flying at y=36 or y=41).
  - **Guaranteed First Obstacle Spacing**:
    - First obstacle is **always a single small cactus** starting at `x = 154` (1.6s warning time).
    - Subsequent obstacles spaced **90–110px apart**.
  - **Recycling Bug Fixed**:
    ```cpp
    for (uint8_t j = 0; j < DINO_MAX_OBS; j++) {
      if (dinoObstacles[j].x > maxX) maxX = dinoObstacles[j].x;
    }
    dinoObstacles[i].x = maxX + random(75, 115);
    ```
  - **Progressive Difficulty Curve**:
    - Score < 60: Small cacti only.
    - Score 60–150: Small & double cacti.
    - Score 150+: Large cacti & flying pterodactyls.
  - **Inner Forgiving Hitboxes**: Added 2px margins on Dino and 1px on obstacles to eliminate cheap deaths.
  - **Web Engine Parity**: Updated `game.js` so Dino starts running on ground (`dino.vy = 0; dino.onGround = true;`), sits squarely on `OLED_FLOOR_Y = 54`, and shares matching variable jump physics.

### Phase 6: Cute Companion Robot Face & Simultaneous Dual-Button Arcade Hub Menu
- **User Request**:
  - *"add this type of cute animations at the first and when we press both button simultaneously then a menu opens where all the game and home face option are available"*
  - User provided 2 hardware photos:
    - Photo 1: Large glowing rounded rectangle eyes with specular highlights and curved mouth.
    - Photo 2: Happy squinting crescent arcs `^ ‿ ^` with cheerful open smile.
- **Cute Companion Pet Face Engine**:
  - Set as the **default boot screen** on both ESP32 hardware (`setup()`) and Web simulator.
  - **Moods & Behaviors**:
    - `FACE_MOOD_NORMAL`: Authentic reproduction of Photo 1 with 24×26px rounded eyes (`r = 7`), glossy reflection cutouts, and smiling mouth. Gentle 1.5px breathing bob motion.
    - `FACE_MOOD_HAPPY_SQUINT`: Authentic reproduction of Photo 2 with 4px thick crescent arcs `^ ^` and open smile. Triggered by petting (tapping Button 1). Accompanied by happy ascending chirp synthesizer sound.
    - `FACE_MOOD_BLINK`: Eyelid closing animation every 2.5–4.5s.
    - `FACE_MOOD_LOOK_LEFT` / `LOOK_RIGHT`: Eyes shift 6px to glance around curiously every 4–7s.
    - `FACE_MOOD_SLEEPY`: Idle sleep timer triggers after 16s of inactivity. Eyelids droop into horizontal bars, mouth relaxes, and animated `z Z` particles drift upward. Wakes up immediately upon any button press.
- **Simultaneous Dual-Button Press Detection**:
  - Mechanical push buttons are rarely pressed within the same microsecond. Added `checkBothButtonsSimultaneous()` with a **120ms debounce window**:
    - If Button 1 and Button 2 are held together, single-button actions (jumping/cycling) are suppressed and the **Arcade Hub Menu** opens/toggles with an electronic chime.
- **Arcade System Hub Menu**:
  - 128×64 double-bordered OLED menu displaying 4 selectable options:
    1. `1. HOME (PET FACE)`
    2. `2. GEOMETRY DASH`
    3. `3. FLAPPY BIRD`
    4. `4. CHROME DINO`
  - Inverted highlight cursor for selected item.
  - **Navigation**:
    - Button 2 advances selection (0 ➔ 1 ➔ 2 ➔ 3 ➔ 0) with crisp click tone.
    - Button 1 confirms and launches the selected game/face with confirmation chime.
- **Full Web App Parity**:
  - Dedicated glassmorphism Hub Menu modal overlay (`#systemMenuOverlay`) with animated card, glowing gradient borders, and emoji badges.
  - Dual-key simultaneous press detection (`Space + G`, `W + S`, `Up + Down`).
  - Hotkey shortcuts: `M` or `B` (toggles menu), `1/2/3/4` (instant game select), `Esc` (close menu).
- **Compilation Fix (Variable Scope Resolution)**:
  - In `handleSystemMenuInput()` (Section 0), `gdGameState`, `fbGameState`, and `dinoGameState` were referenced prior to their definitions in Sections 1, 2, and 3.
  - Added explicit forward declarations (`extern GDState gdGameState; extern FBState fbGameState; extern DinoState dinoGameState;`) at the top of the sketch. Verified clean compilation via `arduino-cli` (Exit code 0, 28% flash, 4% RAM).

### Phase 7: Dynamic Random Gaze, Auto Wake-Up & Expressive Cute Faces (Arduino Firmware)
- **User Instructions**:
  - Eyes should not be stuck looking in the top-left corner; move eyes and pupils randomly around the screen.
  - When going to sleep, he should automatically wake up by himself after a few seconds.
  - Add cute expressions (blushing with cheek marks, winking with cheeky smile, happy squint, etc.).
  - On the Home page, remove all guide text so only the pure, clean pet face is visible.
  - Restrict changes to Arduino C++ code only (stop working on web/browser files).
- **Actions & Enhancements**:
  - **Dynamic Random Eye & Pupil Tracking**:
    - Replaced the static specular reflection offset with smoothly eased coordinates `faceLookX` (`-7` to `+7`) and `faceLookY` (`-4` to `+4`).
    - Every 1.5–3.5s in idle, a random gaze target is selected (center, left, right, up, down, diagonals).
    - Eye position and pupil cutouts move in unison (`pupilOffsetX = map(faceLookX, -8, 8, 4, 10)`), creating lifelike glance animations.
  - **Auto Wake-Up From Sleep**:
    - After 14s idle, pet falls asleep (`FACE_MOOD_SLEEPY`) with droopy eyelids and floating `z Z`.
    - Automatically wakes up after 4.5–7.0s of sleep on its own, playing a morning wake-up chime (`784Hz ➔ 1046Hz`).
  - **New Expressive Moods**:
    - `FACE_MOOD_BLUSHING`: Glowing rounded eyes with shy pupil gaze, 3 diagonal blush lines on both cheeks, and bashful smile.
    - `FACE_MOOD_WINK`: Left eye winks in a happy crescent arc `^`, right eye wide open with pupil, blush on winking cheek, and playful smirk.
    - `FACE_MOOD_HAPPY_SQUINT`: The classic Photo 2 crescent squint `^ ‿ ^` with cheerful smile.
    - Idle spontaneous expressions trigger every 7–14s; petting (Button 1) cycles through the cute expressions with cheerful chiptune chirps.
  - **Clean Home Screen (No Guide Text)**:
    - Removed bottom prompt text completely. The OLED screen is dedicated 100% to the centered pet face.
  - **Zero Web Changes**:
    - Web files left strictly unmodified per user request. Both `esp32_oled_demo/esp32_oled_demo.ino` and `esp32_oled_demo.ino` kept 100% synchronized and verified with `arduino-cli` (Exit code 0).

### Phase 8: Car Racing (Highway Overtake) Engine & Professional C++ Architecture
- **User Requests**:
  1. *"make the arduino code more professional , efficient , easy to understand without changing the actual purpose"*
  2. *"now add a car racing game also"*
- **Architecture Modernization & Clean Encapsulation**:
  - Re-engineered the monolithic procedural sketch into clean, modular C++ classes:
    - `SoundManager`: 100% non-blocking ring buffer / queue audio engine supporting EDM chiptune soundtracks, game chimes, and noise/tone SFX without a single `delay()` during gameplay.
    - `InputManager`: Unified 35ms debouncing, edge-click detection, 120ms dual-button simultaneous chord window, and 1600ms long-press fallback.
    - `StorageManager`: Wear-safe NVS flash persistence (`game_hub` namespace via `Preferences.h`) with value-change guards preventing flash memory wear.
    - Modular game classes: `CompanionFace`, `GeometryDashGame`, `FlappyBirdGame`, `ChromeDinoGame`, and `CarRacingGame`.
    - `ArcadeConsole`: Central coordinator managing 40 FPS deterministic frame limiting, active game dispatch, modal hub menu, and animated transition banners.
- **Car Racing (Highway Overtake) Game Engine**:
  - **Horizontal 3-Lane Perspective**:
    - Lanes at `Y = 16`, `30`, `44` maximize the 128×64 widescreen display, giving 128px of forward visibility and eliminating cheap collisions inherent to vertical 64px layouts.
    - Animated checkered rumble curbs, scrolling dashed lane dividers (`Y = 25, 39`), and roadside scenery (telephone poles & grass).
  - **Player Race Car**:
    - 15×7 Formula-1 / supercar pixel art with front nose cone, driver helmet, cockpit cutout, rear aerodynamic wing spoiler, and 4 exposed rubber tires.
    - Smooth vertical lane interpolation with tire smoke particles on swerves.
    - Exhaust flame animation (flickers in standard cruise, intense double-plume in nitro mode).
  - **Controls**:
    - Single-button control: Button 1 tap steers and swerves lanes (Top ➔ Mid ➔ Bot ➔ Mid).
    - Button 2 cycles to the next game in rotation; simultaneous dual-press opens the Arcade Hub Menu.
  - **Traffic & Hazards**:
    - **Sports Cars** (13×6): Cruise along lanes; passing them grants +30 overtake points.
    - **Big Rig Semi-Trucks** (22×7): Long multi-axle trailer hazards requiring well-timed swerves.
    - Safe lane recycling algorithm ensures an open lane is always available ahead.
  - **Power-Ups & Collectibles**:
    - ⚡ **Nitro Canister**: 3.5 seconds of 1.5× super speed and invincibility! Smashes through traffic with explosion particles and +150 bonus crash points.
    - ★ **Gold Coins**: +100 bonus score with pleasant two-tone coin chime.
  - **HUD & Persistence**:
    - Real-time speedometer (`SPD`), distance traveled (`DST: ...M`), and flashing `⚡NITRO` indicator.
    - High score saved automatically in ESP32 NVS Flash (`car_best`).

### Phase 9: Capacitive Touch Sensor Integration, Patting Emotion Engine & 360° Iris Animations
- **User Request**:
  - *"now i am adding a touch sensor also like when pat the sensor pet will react according to the patting , also move his iris in all direction with too cute animations"*
- **Hardware Touch Sensor Integration**:
  - Added `TOUCH_SENSOR_PIN = 6` (supports TTP223 capacitive touch module or DIY touch pad on GPIO 6, configurable to GPIO 7/1/10).
  - Configurable `TOUCH_ACTIVE_HIGH = true` (default for TTP223) or `false` for active LOW.
  - Upgraded `InputManager` with 20ms capacitive debouncing, continuous touch hold duration tracking (`getTouchDuration()`), and edge-click detection (`isTouchClicked()`).
  - Unified input action: Touching the sensor can also trigger jumps, flaps, and swerves in Geometry Dash, Flappy Bird, Chrome Dino, and Car Racing!
- **Reactive Patting Emotion & Love Overload Engine**:
  - **Pat Intensity & Streak Detection**:
    - **1 Pat (Gentle Tap)**: Pet is pleasantly surprised! Irises glance straight up toward the petting hand (`lookY = -4.2f`) with wide glossy pupils and a soft chirp (`PET_CHIRP`).
    - **2 Pats (Delighted Squint)**: Ecstatic squint eyes `^ ‿ ^` with happy chime and joyful head bob.
    - **3 Pats (Blushing Sparkles)**: Cheeks glow with 3 diagonal blush slashes on each side, pupils morph into gleaming 4-pointed sparkle stars `✦ ✦` (`PET_BLUSH`), and a heart floats up!
    - **4+ Pats or Continuous Stroking (>600ms)**: **LOVE OVERLOAD / HEAVENLY MODE**:
      - Floating Love Hearts Layer (`MAX_FACE_HEARTS = 6`): Pixel art hearts ($7 \times 6$ and $5 \times 4$) drift upwards from head/cheeks, swaying organically with sine-wave physics!
      - Adorable heart cutouts inside the irises (`IrisStyle::HEART_PUPIL`)!
      - Continuous gentle purring vibrato audio (`PET_PURR` & `PET_HEART` ascending arpeggios)!
      - Wide blissful open-mouth smile `‿`!
  - **Afterglow State**:
    - When patting stops after love overload, pet doesn't abruptly reset; it enters an **AFTERGLOW** state for 2.4 seconds with content half-closed eyes, subtle blush, and gentle breathing.
  - **Auto Wake-Up**: Touching or patting the pet while sleeping instantly wakes it up with a morning chime (`PET_WAKE`).
- **360° Living Iris Animation Engine**:
  - The $24 \times 26$ px white eye sockets house a $10 \times 12$ px rounded black iris with full 2D mobility:
    - **8 Cardinal & Diagonal Directions**: Smoothly glides across Left, Right, Up, Down, Up-Left, Up-Right, Down-Left, Down-Right with natural ease-out physics.
    - **360° Circular "Wondering Orbit" Roll**: Every 8–15s in idle, the irises roll smoothly in a 360-degree circle around the eye socket as if looking around at the room in wonder!
    - **Anime Glistening Specular Highlight**: $3 \times 3$ pure white primary glossy shine cutout + secondary bottom-right sparkle dot that moves dynamically with the iris.
    - **Reactive Hand-Tracking**: Whenever the touch sensor is touched, the irises track upwards toward the user's hand.

### Phase 10: 7-in-1 Arcade Console & Living Pet Companion Web Port & Firmware Parity
- **User Instructions**:
  - *"upload remaining two games on web"*
  - User confirmed option 2 and 3: full upload and parity for **Car Racing (Highway Overtake)**, **Retro Snake**, and **Space Invaders**, along with full web parity for the **Living Companion Pet Face** (Patting Emotion Engine, 360° Living Irises, Love Overload), synchronized across Web (`index.html`, `game.js`, `audio.js`, `style.css`) and ESP32 Firmware (`esp32_oled_demo/esp32_oled_demo.ino`, `esp32_oled_demo.ino`).
- **Web Console Enhancements**:
  - **Living Companion Pet Face**:
    - Full 360° circular iris orbit gaze, hand-tracking glances, auto wake-up timer, and animated eyelid blinks.
    - Patting Emotion Engine: Virtual touch sensor card (`#virtualTouchCard`) and hotkey `P`. Streak tracking (1: Look Up, 2: Happy Squint, 3: Blushing Sparkles, 4+: Love Overload with floating pixel hearts, heart iris pupils, blissful smile, and afterglow state).
  - **Car Racing (Highway Overtake)**:
    - 3-lane speedway, smooth lane interpolation, sports cars, 12-wheeler semi-trucks, Nitro turbo canisters, gold coins, tire smoke, and wreckage explosions.
    - Dual rendering: Neon Arcade with motion blur and authentic 128x64 OLED mode.
  - **Retro Snake**:
    - 28x16 grid arena, apple and flashing golden apple power-ups with countdown timer, progressive speed increase, score tracking, and collision detection.
    - Both 1-button 90° clockwise turning (microcontroller compatible) and 4-way arrow/WASD directional controls.
  - **Space Invaders**:
    - 15-alien armada (3 rows: Squid, Crab, Octopus) with authentic 2-frame walking sprites and escalating march tempo.
    - Mystery flying saucer UFO with bonus points, 3 destructible multi-hit bunkers, alien bomb drops, player laser cannon, and wave progression.
    - Smooth auto-patrol for single-button / touch gameplay with arrow/WASD override.
  - **Web Audio API Chiptune Synthesizers**:
    - Procedural synthesis for all 7 modes: engine swerve, nitro turbo, coin chimes, wreck bursts, snake munch, snake turn, snake crash, laser pulse, alien hit, invader march, saucer UFO, player explosion, pet chirp, pet blush, and purr/heart arpeggios.
  - **System Hub Menu**:
    - 7-game glassmorphism modal with hotkeys `1..7`, arrow navigation, Enter/Space selection, and direct mode buttons.
- **ESP32 Firmware Parity**:
  - `ActiveGame`: Extended to 7 modes (`HOME_FACE`, `GEOMETRY_DASH`, `FLAPPY_BIRD`, `CHROME_DINO`, `CAR_RACING`, `RETRO_SNAKE`, `SPACE_INVADERS`, `COUNT = 7`).
  - Added `SnakeGame` class: 28x16 playfield, 64-segment RAM buffer, golden apple timer, 1-button clockwise steering, and high score flash persistence.
  - Added `SpaceInvadersGame` class: 15 aliens, 3 bunkers, mystery UFO, alien bombs, player cannon with auto-patrol and single-button firing.
  - Updated `StorageManager`: Wear-safe NVS keys `snake_best` and `inv_best`.
  - Updated `SoundFx`: Added sound sequences for all snake and space invader actions.
  - Updated `ArcadeConsole`: 7-label scrolling 5-item menu window, dynamic game switching banners, and dispatcher.
  - Strict byte-for-byte synchronization between `esp32_oled_demo/esp32_oled_demo.ino` and root `esp32_oled_demo.ino`.

---

## ⚙️ 6. How Actions Are Taken (Engineering Rules & Guidelines)

1. **Dual Sketch Synchronization**:
   - `esp32_oled_demo/esp32_oled_demo.ino` (required by Arduino IDE directory naming conventions) and `esp32_oled_demo.ino` (root copy) must always be kept 100% identical.
2. **Arduino Preprocessor Safety**:
   - All `struct`, `enum`, and `typedef` declarations along with explicit function prototypes must precede all function implementations to avoid `arduino-builder` prototype insertion errors.
3. **Discrete Pixel Art & Physics Parity**:
   - Every physical entity must have exact pixel alignment: floor baseline at `y = 54` on OLED, Dino standing at `y = 40` to `54`.
   - Jump curves must be mathematically validated (`v^2 / (2g)`) against obstacle heights before committing physics changes.
4. **Hardware-to-Simulator Parity**:
   - Any physics, sound, or timing update made to the C++ firmware must be mirrored in the JavaScript web simulator (`game.js` / `audio.js`).

