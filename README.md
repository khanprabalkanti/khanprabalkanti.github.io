# Prabal Kanti Khan — Portfolio ⚡

An embedded-systems-themed personal portfolio. Built as a single, dependency-free
static site (HTML + CSS + vanilla JS) so it runs anywhere and deploys for free.

## ✨ Highlights

- **Boot sequence** — a terminal-style power-on self-test that "boots" the site (press `Esc` or *Skip* to skip).
- **Live PCB background** — a `<canvas>` of circuit traces with glowing solder pads and current pulses flowing along the routes.
- **Connect-a-wire contact gateway** — drag a wire from the battery's **+** terminal to the bulb. When the circuit closes, the bulb lights up and the contact details power on. (Touch-friendly; double-click or press `Enter` on the terminal as a fallback.)
- **Hero oscilloscope** — a live animated waveform.
- **Component-style interactions** — skill chips energize on hover, project cards tilt in 3D, animated stat counters, scroll-reveal sections.
- **Responsive** + honors `prefers-reduced-motion`.

## 📁 Structure

```
portfolio/
├── index.html          # all sections / markup
├── css/
│   └── style.css        # theme, layout, animations, responsive
├── js/
│   ├── circuit.js       # PCB background canvas + oscilloscope
│   ├── wire.js          # interactive connect-a-wire contact gateway
│   └── main.js          # boot, typing, reveals, nav, counters, tilt
└── README.md
```

## ▶️ Run locally

It's a static site — just open `index.html` in a browser. For best results
(canvas sizing, fonts) serve it over a local HTTP server:

```bash
cd portfolio
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static server works (`npx serve`, VS Code Live Server, etc.).

## 🚀 Deploy (free options)

**GitHub Pages**
1. Push this folder to a repo (e.g. `khanprabalkanti.github.io` or any repo).
2. Settings → Pages → Source: `main` branch, root (or `/portfolio`).
3. Live at `https://khanprabalkanti.github.io/`.

**Netlify / Vercel** — drag-and-drop the `portfolio` folder, or connect the repo.
No build command needed; publish directory is the folder itself.

## ✏️ Customize

- **Colors** — edit the CSS variables at the top of `css/style.css` (`:root`).
- **Typed roles** — `roles[]` array in `js/main.js`.
- **Boot log lines** — `lines[]` array in `js/main.js`.
- **Content** — all text lives in `index.html`.

---

Contact: prabalkanti.work@gmail.com · [LinkedIn](https://www.linkedin.com/in/prabal-kanti-khan-84b23a223/) · [GitHub](https://github.com/khanprabalkanti) · [YouTube @TechanicZ](https://www.youtube.com/@TechanicZ)
