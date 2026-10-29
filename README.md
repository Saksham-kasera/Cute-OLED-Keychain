# 🎮 Cute OLED Keychain — ESP32 Multi-Game Retro Console

> An ultra-compact retro arcade console running on the **ESP32-C3 Super Mini** with an I2C OLED display (0.96" SSD1306 or 1.3" SH1106), paired with a feature-complete **Web Simulator** with authentic OLED scanline styling, neon HD visuals, and procedural chiptune audio.

---

## ✨ Features

- **3-in-1 Retro Games**:
  1. **⚡ Geometry Dash**: Cube jumping with jump buffering, mid-air 90° rotations, Rocket/Ship flight mode with particle thrusters, obstacles, pads, orbs, and chiptune BGM.
  2. **🐥 Flappy Bird**: Smooth flapping physics with pitch tilt, procedural green pipes, scrolling ground, and high score tracking.
  3. **🦖 Chrome Dino**: Animated running T-Rex, jumping cacti hurdles, flying pterodactyls, day/night cycles, and progressive acceleration.
- **Dual Display Support**: Works with standard **0.96" SSD1306** or **1.3" SH1106** monochrome 128x64 OLEDs.
- **Persistent High Scores**: Stores high scores, attempts, and last played game in non-volatile flash (`Preferences.h` on ESP32, `localStorage` on Web).
- **Web Simulator**: Run `index.html` in any browser to test and play with Web Audio API sound effects and dual OLED/Neon render modes.

---

## 🕹️ Hardware Wiring & Pinout

### ESP32-C3 Super Mini Pinout

| Peripheral | ESP32-C3 Pin | Mode | Description |
| :--- | :--- | :--- | :--- |
| **OLED SDA** | **GPIO 4** | I2C Data | 400kHz high-speed I2C data line |
| **OLED SCL** | **GPIO 5** | I2C Clock | 400kHz high-speed I2C clock line |
| **OLED VCC** | **3.3V / 5V** | Power | Connect to 3.3V or 5V rail |
| **OLED GND** | **GND** | Ground | Common ground |
| **Button 1 (Action)** | **GPIO 3** | `INPUT_PULLUP` | Jump / Flap / Restart *(also supports 1.6s long-press to switch games)* |
| **Button 2 (Select)** | **GPIO 2** | `INPUT_PULLUP` | Cycle games (GD ➔ Flappy ➔ Dino) |
| **Buzzer (Optional)** | **GPIO 1 / 10** | PWM / Tone | Piezo buzzer for audio cues (set to `-1` if absent) |

---

## 💻 Web Simulator Controls

| Key / Action | Function |
| :--- | :--- |
| **Space / Tap / Click** | Jump / Flap / Action |
| **G** | Cycle Active Game |
| **O** | Toggle between Authentic 128x64 OLED and Neon Arcade modes |
| **Z / X** | Place / Delete Practice Checkpoint (Geometry Dash) |
| **R** | Restart Current Game |

---

## 🚀 Getting Started

### 1. Web Simulator
Simply open `index.html` in any modern web browser to play immediately:
- Supports touch, mouse clicks, and keyboard controls.
- Fully procedural sound effects powered by the Web Audio API (no external audio assets needed).

### 2. Flashing the ESP32
1. Install the **Arduino IDE** (or VS Code + PlatformIO).
2. Install the **ESP32 Board Package** (`esp32 by Espressif Systems`).
3. Install the required libraries via the Arduino Library Manager:
   - `Adafruit GFX Library`
   - `Adafruit SSD1306` (or `Adafruit SH110X`)
4. Open `esp32_oled_demo/esp32_oled_demo.ino`.
5. Select your board (e.g., **ESP32C3 Dev Module**) and correct COM port.
6. Click **Upload**.

---

## 📁 Repository Structure

```
.
├── esp32_oled_demo/
│   └── esp32_oled_demo.ino   # Arduino IDE sketch
├── esp32_oled_demo.ino       # Root copy of Arduino sketch
├── index.html                # Web simulator shell & UI controls
├── style.css                 # Arcade & OLED bezel styling
├── game.js                   # 3-in-1 game engine & physics
├── audio.js                  # Procedural Web Audio synthesizer
├── brain.md                  # Comprehensive architectural decision log & milestones
└── README.md                 # Project documentation
```

---

## 📜 License

MIT License. Free to use, modify, and build your own keychain gaming consoles!
