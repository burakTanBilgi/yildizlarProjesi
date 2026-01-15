# Uygarlığın Başlangıcı - Interactive Star Map

A scientific yet aesthetic interactive star map visualization built with p5.js. This application renders accurate star positions via Stereographic Projection using real astronomical data.

## Key Features

- **Precision Rendering**: Converts Right Ascension/Declination to screen coordinates based on Observer Location & Time.
- **Smart Interaction**:
  - **Star-First Discovery**: Hover over specific stars to reveal their parent Constellations.
  - **Dynamic Labeling**: Labels utilize Bounding Box logic to stay centered on the visible geometry.
- **Customizable View**:
  - Toggle "Constellation Lines" for a full sky chart or keep it off for a minimal "Night Sky" view.
  - Filter star names by magnitude.
- **Data Driven**: Powered by the Yale Bright Star Catalog.

## Controls

- **Left Panel**:
  - **Date/Time**: Travel to the past or future.
  - **Location**: Input Lat/Lon or use GPS.
- **Right Panel (Visuals)**:
  - **Show Constellation Lines**: Toggles the wireframe of the sky.
  - **Show Labels**: Toggles constellation names.
  - **Star Names**: Toggles names for bright stars (Mag < 2.0).

## Tech Stack

- **Engine**: p5.js (Canvas API)
- **Data**: JSON (Remote fetch from GitHub)
- **Deployment**: Vanilla JS/HTML (No build step required)
