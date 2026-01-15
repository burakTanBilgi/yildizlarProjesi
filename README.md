# 🌌 Uygarlığın Başlangıcı (The Beginning of Civilization)

> **A Generative Star Map & Poster Studio**
> *Where scientific accuracy meets print-ready aesthetics.*

This project is a high-performance web application built with **p5.js** that renders the night sky with astrochemical accuracy. Unlike standard star maps, this tool is designed as a **Creative Studio** to generate, customize, and export high-resolution posters of the sky from any location and time in history.

## ✨ Key Features

### 🔭 Scientific Core
* **Stereographic Projection:** Maps the celestial sphere to a 2D plane preserving local shapes.
* **Yale Bright Star Catalog:** Renders real astronomical data including Right Ascension, Declination, and Magnitude.
* **Spectral Coloring:** Stars are colored based on their **B-V Color Index** (from hot O-type blue giants to cool M-type red supergiants).

### 🎨 Poster Studio (New!)
Turn your observation into art with the built-in Layout Engine:
* **Layout Modes:**
    * `Side Split`: Editorial style with a dedicated sidebar for storytelling (30/70 split).
    * `Bottom Bar`: Classic "NatGeo" style map with metadata footer.
    * `Glass Overlay`: Modern, minimalist full-screen view with frosted glass details.
* **Custom Metadata:** Edit the Title, Subtitle, and Observation Notes directly in the UI.
* **Smart Export:** Downloads high-res PNGs with your chosen layout and typography burned in.

### 🎛 Interactive Controls
* **Click to Select:** Click on any constellation to instantly load its **Mythology** and Title into the Poster Studio.
* **Time Travel:** Go back to 10,000 BC or forward to 3000 AD.
* **Precision Filters:**
    * Toggle **Constellation Lines** (Ghost / Neon modes).
    * Toggle **Constellation Names** (Smart Bounding Box placement).
    * Toggle **Bright Star Names** (Magnitude thresholding).

## 🚀 How to Run

Since this project fetches local JSON data, it requires a local server to handle CORS.

**Option 1: VS Code (Recommended)**
1.  Install the "Live Server" extension.
2.  Right-click `index.html` -> "Open with Live Server".

**Option 2: Python**
```bash
# Run inside the project folder
python -m http.server 8000
```
Then visit `http://localhost:8000`.

**Option 3: Node/NPM**
```bash
npx serve .
```

## 🛠 Tech Stack
* **Engine:** p5.js (Creative Coding Framework)
* **Data:** JSON (Yale BSC5 & D3 Celestial)
* **Language:** Vanilla JavaScript (ES6+) / HTML5 / CSS3
* **No Build Tools:** Designed to be lightweight and hackable.

## 🔮 Roadmap
* **Phase 1: Geometry & Rendering** (Completed) ✅
* **Phase 2: Interaction & Filtering** (Completed) ✅
* **Phase 3: Poster Studio & Layouts** (Completed) ✅
* **Phase 99: Mythology & Storytelling Integration** (In Progress) ⏳

## License
MIT Author: [Your Name / Alias]
