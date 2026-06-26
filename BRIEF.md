# Project Brief — Prabal Kanti Khan · Interactive "Embedded Lab" Portfolio

A single-page personal portfolio for an **Embedded Systems & IoT developer**
(B.Tech ECE 2026; STM32/ESP32, LoRa, I2C/SPI/UART, bare-metal firmware, hardware
troubleshooting & assembly; YouTube **@TechanicZ**). The entire site is themed as a
working electronics lab where **each section is "activated" by a real hardware mechanic**.

## Tech stack
- Pure **static site** — vanilla HTML, CSS, JavaScript. **No frameworks, no build step, no dependencies.**
- Deployable on GitHub Pages / Netlify / Vercel (publish the folder as-is).
- Fonts: **Orbitron** (display), **JetBrains Mono** (mono), **Inter** (body).
- Modular JS with a tiny registry (`window.Lab`): each section's animation registers
  itself, and a core orchestrator fires it via `IntersectionObserver` on scroll.

## Design system
- Dark **"engineering blueprint × live silicon"** theme. Near-black navy base with layered
  radial gradients + a vignette.
- Background is an animated `<canvas>` **PCB**: right-angle copper traces, pads, vias, IC
  footprints, with a few slow "current" glows (deliberately subtle — **no bouncing dots**).
- Accent palette: cyan `#22d3ee`, deep-cyan `#0891b2`, green `#34d399`, amber `#fbbf24`, red `#fb7185`.
- A left **"system rail" HUD** shows the current section as register addresses (`0x00`–`0x07`).
- Fully **responsive** (1280 / 1024 / 880 / 600 / 420 breakpoints) and honors `prefers-reduced-motion`.

## Signature interactions (every section = a hardware metaphor)
1. **Intro = breadboard assembly gate.** On landing, the visitor drags an **ESP32** and a
   **1.3" I²C OLED** onto a breadboard, wires **VCC / GND / SDA / SCL** via guided tap-to-connect
   steps, then firmware is generated + uploaded (~2s progress bar), the OLED prints
   **"Hello, / Welcome!"**, and the display **zooms fullscreen** to reveal the site.
   Skippable; auto-skipped on deep-links and reduced-motion.
2. **Hero** — animated STM32 chip with gold pins + radiating clock tree; typed role text; tech ticker.
3. **About // UART** — bio streams into a serial monitor as if received @115200 baud, with bits
   traveling on a TX→RX line.
4. **Skills // 74HC595** — bits clock into a shift register (SER/SRCLK/RCLK); each latched output
   Q0–Q3 lights a skill bank.
5. **Projects // DMA** — project "modules" decode onto a bus with a scan-line reveal
   (LoRa Agriculture Automation featured + 4 more builds).
6. **Experience // Program Counter** — career timeline stepped by an instruction pointer.
7. **Telemetry // I²C SSD1306** — tap **SDA** then **SCL** to bring a simulated OLED online
   showing live telemetry (uptime, role, waveform).
8. **GPIO Lab // bare-metal registers** — fully interactive, **multi-port (GPIOA–D)**:
   wire your own **LED** and **push-button** to **any** pin, enable `RCC->AHB1ENR`, set
   `MODER` (input/output), drive `ODR`, read `IDR`, and toggle a **"mirror button → LED"**
   firmware loop so a button press lights the LED. Guided hints highlight exactly which
   register/bit to set next; pressing the button sets IDR=1 and (with mirror on) drives ODR=1.
9. **Connect // close the loop** — drag a wire from a battery to a bulb; the closed circuit
   powers on the contact details (email, phone, LinkedIn, GitHub, YouTube).

## File layout
```
portfolio/
├── index.html
├── css/style.css
├── js/
│   ├── core.js        # orchestrator: intro gate, nav, rail, scroll reveals, tilt
│   ├── pcb.js         # animated circuit-board background
│   ├── hero-mcu.js    # STM32 chip + clock tree (hero)
│   ├── uart.js        # About serial monitor stream
│   ├── shiftreg.js    # Skills 74HC595 shift register
│   ├── oled.js        # I2C SSD1306 telemetry panel
│   ├── gpio.js        # interactive multi-port GPIO register lab
│   ├── wire.js        # connect-a-wire contact gateway
│   └── assembly.js    # breadboard build intro
└── README.md
```

## Real content (factual — do not fabricate)
- **Name:** Prabal Kanti Khan · Howrah, West Bengal · open to relocation.
- **Education:** B.Tech ECE, Heritage Institute of Technology, Kolkata (2026, DGPA 7.98);
  Diploma E&I, Siliguri Govt. Polytechnic (GPA 7.7); Udemy cert — Microcontroller Embedded C (FastBitLab).
- **Experience:** STEM Innovation Engineer @ STEMROBO (Feb 2022–Jul 2023, trained 500+, 20+ labs);
  IoT & Django Intern @ Euphoria GenX (Jun–Jul 2025).
- **Projects:** LoRa Agriculture Automation (final year), DIY Bluetooth Speaker, Smart Home
  Automation, Raspberry Pi Touch Computer, 15.4Ah Pack & Solar Inverter.
- **Skills:** C, C++, Embedded C, Python, JS, SQL; STM32 F446RE, ESP32, Arduino, Raspberry Pi;
  I2C/SPI/UART/GPIO, LoRa (RYLR998), MQTT, BLE, Wi-Fi; multimeter, oscilloscope, Git, Linux, Django.
- **Contact:** prabalkanti.work@gmail.com · +91 93307 73172 ·
  linkedin.com/in/prabal-kanti-khan-84b23a223 · github.com/khanprabalkanti · youtube.com/@TechanicZ.

## Status & suggested next steps (for the planning AI)
- Core build complete; rendering verified via headless screenshots; GPIO ODR/IDR logic unit-tested.
- Open items to plan: full cross-device QA of every interaction (touch + desktop), independent
  design/UX audit, accessibility pass (keyboard paths, ARIA, focus order, contrast), performance
  tuning on low-end devices, SEO/Open-Graph + favicon polish, and deployment.
