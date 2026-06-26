# Prabal Kanti Khan — Interactive "Embedded Lab" Portfolio ⚡

A single-page personal portfolio themed as a working electronics lab, where **every
section is "activated" by a real hardware mechanic**. Pure static site — **vanilla
HTML/CSS/JS, zero dependencies, no build step.**

## ✨ Highlights
- **Preloader → breadboard intro:** a firmware-flash preloader hands off to an interactive
  build gate — drag an **ESP32** and a **1.3" I²C OLED** onto a breadboard, wire VCC/GND/SDA/SCL,
  "upload" firmware, and the OLED prints *Hello, Welcome!* then zooms in to reveal the site.
- **Hero:** animated STM32 chip + clock tree, typed role, tech ticker.
- **About // UART:** bio streams into a serial monitor @115200 baud.
- **Skills // 74HC595:** bits clock through a shift register, lighting each skill bank.
- **Projects // DMA:** project modules decode onto a bus with a scan-line reveal.
- **Experience // Program Counter:** timeline stepped by an instruction pointer.
- **Telemetry // I²C SSD1306:** connect SDA + SCL to bring an OLED dashboard online.
- **GPIO Lab:** multi-port (A–D) bare-metal register playground — wire your own LED + button
  to any pin, enable RCC, set MODER, drive ODR, read IDR, mirror button → LED.
- **Connect:** drag a wire from a battery to a bulb to power on the contact details.
- **Extras:** Web-Audio sound toggle (off by default), magnetic cursor (desktop), and a
  Konami-code **Debug Mode** (`↑↑↓↓←→←→BA`).

## ♿ Accessibility & performance
- Full keyboard support for every interaction (Tab/Enter/Space), ARIA live regions on all
  dynamic areas, visible cyan focus rings, and a clean `<noscript>` fallback.
- Honors `prefers-reduced-motion` (all animations off, content shown statically).
- Lazy-initialized PCB canvas; JS+CSS payload ~115 KB.

## 📁 Structure
```
portfolio/
├── index.html · 404.html
├── css/style.css
├── js/  preloader, pcb, hero-mcu, uart, shiftreg, oled, gpio, wire, assembly,
│        sound, cursor, easter-egg, core
├── assets/  favicon.svg · favicon-32/icon-192/icon-512 · apple-touch-icon ·
│            og-preview.png · Prabal_Kanti_Khan_Resume.pdf
├── favicon.ico · site.webmanifest · sitemap.xml · robots.txt · CNAME
└── .github/workflows/deploy.yml
```

## ▶️ Run locally
```bash
cd portfolio
python3 -m http.server 8080   # → http://localhost:8080
```

## 🚀 Deploy (GitHub Pages)
1. Push to a GitHub repo's `main` branch.
2. Settings → Pages → Source: **GitHub Actions**. The included workflow
   (`.github/workflows/deploy.yml`) publishes the site automatically on every push.
3. Custom domain is set via the `CNAME` file (`prabalkanti.dev`) — point your DNS at GitHub Pages.

## ✏️ Notes
- Replace `assets/Prabal_Kanti_Khan_Resume.pdf` with your latest CV anytime (same filename).
- Update the canonical/OG URLs in `index.html` if you use a different domain.

---
Contact: prabalkanti.work@gmail.com · [LinkedIn](https://www.linkedin.com/in/prabal-kanti-khan-84b23a223/) · [GitHub](https://github.com/khanprabalkanti) · [YouTube @TechanicZ](https://www.youtube.com/@TechanicZ)
