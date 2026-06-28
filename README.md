# Prabal Kanti Khan — Portfolio

Personal portfolio of **Prabal Kanti Khan**, Embedded Systems & IoT Engineer.
A single-page site themed as a light **PCB schematic / blueprint**, built with
**vanilla HTML, CSS and JavaScript — zero dependencies, no build step.**

## Highlights
- **Identity hero** with a component sidebar (STM32F446RE, ESP32, Arduino) and a
  live, interactive **wiring bench** — connect an 18650 → TP4056 → STM32 Nucleo → I²C OLED
  and the panel boots.
- **Projects, Experience, Education, Certifications** — each with expandable “Full details”.
- **GPIO Lab** — a bare-metal STM32 register playground (RCC / MODER / ODR / IDR, mirror button → LED).
- **Playground** — ten tiny electronics games (register bitfields, logic gates, Ohm's law,
  RC & LED sizing, series/parallel, power, resistor colour code, binary↔hex).
- **Contact page** with a mailto message form.
- Fully responsive, keyboard-accessible, and honours `prefers-reduced-motion`.

## Structure
```
portfolio/
├── index.html · contact.html · 404.html
├── css/style.css
├── js/  blueprint.js · games.js · gpio.js · sim.js
├── assets/  favicon set · og-preview.png · Prabal_Kanti_Khan_Resume.pdf
├── favicon.ico · site.webmanifest · sitemap.xml · robots.txt · CNAME
└── .github/workflows/deploy.yml
```

## Run locally
```bash
python3 -m http.server 8080   # → http://localhost:8080
```

## Deploy (GitHub Pages)
Push to `main`. The included workflow (`.github/workflows/deploy.yml`) publishes the
site on every push. Custom domain is set via the `CNAME` file.

---
Contact: prabalkanti.work@gmail.com ·
[LinkedIn](https://www.linkedin.com/in/prabal-kanti-khan-84b23a223/) ·
[GitHub](https://github.com/khanprabalkanti) ·
[YouTube @TechanicZ](https://www.youtube.com/@TechanicZ)
