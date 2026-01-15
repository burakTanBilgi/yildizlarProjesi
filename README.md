# Uygarlığın Başlangıcı - Interactive Star Map

A beautiful, interactive star map visualization built with p5.js. This application renders accurate star positions and constellation lines based on real astronomical data (Yale Bright Star Catalog).

## Features

- **Real-time Sky Rendering**: Calculates accurate star positions (Altitude/Azimuth) based on your Location and Time.
- **Interactive Visualization**:
  - Pan/Zoom (Future).
  - Hover over stars to see names/magnitudes.
  - Toggle Constellation Lines and Names.
  - Toggle Star Names.
- **Customizable Observer**:
  - Set Latitude/Longitude manually or use "Use My Location".
  - Pick any Date/Time to see past or future skies.
- **Field Notes**: Save your observation notes (persisted locally).
- **Export**: Download high-resolution PNG captures of your view.

## How to Run

Since this project fetches data from external JSON files, you need a local web server to bypass browser CORS restrictions.

### Option 1: PowerShell Script (Windows)
A simple script is included to serve the project.
1. Right-click `serve.ps1` and "Run with PowerShell".
2. Open `http://localhost:8000` in your browser.

### Option 2: Docker
If you have Docker installed:
```bash
docker compose up -d
```
Then visit `http://localhost:8080`.

### Option 3: VS Code Live Server
If you use VS Code, install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server".

## Tech Stack

- **Core**: HTML5, CSS3 (Glassmorphism UI).
- **Visualization**: p5.js.
- **Data**: 
  - Yale Bright Star Catalog (JSON).
  - D3 Celestial (Constellation Lines).

## Note on Architecture
This project uses vanilla HTML/JS to ensure immediate runnability on any environment without requiring complex build chains (like Node.js/Next.js) installation. The UI is componentized using modern CSS Grid/Flexbox and follows a clean, maintainable structure.
