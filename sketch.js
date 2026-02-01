// --- Main Sketch & Rendering Loop ---

function preload() {
  console.log("Preloading data...");
  // Load remote JSON directly
  // let starsUrl = 'https://brettonw.github.io/YaleBrightStarCatalog/bsc5.json';
  let starsUrl = 'data/bsc5.json';
  loadJSON(starsUrl, parseStars, loadError);

  // Load Constellation Lines
  // let constUrl = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
  let constUrl = 'data/constellations.lines.json';
  loadJSON(constUrl, parseConstellations, loadError);

  // Load Constellation Bounds
  let boundsUrl = 'data/constellations.bounds.json';
  loadJSON(boundsUrl, parseBounds, loadError);
}

function setup() {
  console.log("Sketch Setup Starting...");
  
  // Dependency Check
  let missing = [];
  if (typeof stars === 'undefined') missing.push('globals.js (stars)');
  if (typeof parseRA === 'undefined') missing.push('astro_math.js');
  if (typeof parseStars === 'undefined') missing.push('data_loader.js');
  if (typeof calculateLayoutMetrics === 'undefined') missing.push('poster_engine.js');
  
  if (missing.length > 0) {
    alert("CRITICAL ERROR: Missing Scripts:\n" + missing.join("\n"));
    noLoop();
    return;
  }

  createCanvas(windowWidth, windowHeight);
  background(20); // Immediate feedback
  
  try {
    textFont('Inter'); // Use the Google Font loaded in HTML
  } catch(e) {
    console.error("Font loading error:", e);
  }
  centerX = width / 2;
  centerY = height / 2;
  
  // --- HUD BINDINGS ---
  
  // 1. Date & Time
  let datePicker = select('#date-picker');
  let displayDate = select('#display-date');
  
  // Init Date Picker
  let now = new Date();
  
  // Helper to set date to input and update state
  function setDateToNow() {
    let n = new Date();
    let localIso = new Date(n.getTime() - (n.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    if (datePicker) datePicker.value(localIso);
    date = n;
    updateDisplayDate(n);
    redraw();
  }

  // Initial Set
  let localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  if (datePicker) {
    datePicker.value(localIso);
    updateDisplayDate(now);
    
    datePicker.changed(() => {
      let val = datePicker.value();
      if (val) {
        date = new Date(val);
        updateDisplayDate(date);
        redraw();
      }
    });
  }
  
  // Bind "Reset to Now" button
  let btnTimeNow = select('#btn-time-now');
  if (btnTimeNow) {
    btnTimeNow.mousePressed(setDateToNow);
  }

  function updateDisplayDate(d) {
    if(displayDate) {
       // Format: DD MMM HH:MM
       let str = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + " " + 
                 d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
       displayDate.html(str);
    }
  }

  // 2. Location
  let latInput = select('#lat-input');
  let lonInput = select('#lon-input');
  let displayLoc = select('#display-location');
  
  // Init Values
  if (latInput) latInput.value(observerLat);
  if (lonInput) lonInput.value(observerLon);

  function updateLocation(lat, lon) {
    observerLat = lat;
    observerLon = lon;
    if(latInput) latInput.value(lat);
    if(lonInput) lonInput.value(lon);
    if(displayLoc) displayLoc.html(`${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`);
    redraw();
  }
  
  if (latInput) latInput.input(() => updateLocation(float(latInput.value()), observerLon));
  if (lonInput) lonInput.input(() => updateLocation(observerLat, float(lonInput.value())));

  // GPS Button
  let btnLoc = select('#btn-location-gps');
  if (btnLoc) {
    btnLoc.mousePressed(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateLocation(pos.coords.latitude, pos.coords.longitude);
        });
      } else {
        alert("Geolocation not supported");
      }
    });
  }

  // 3. Visualization Toggles (Icon Buttons)
  function bindToggle(btnId, stateVar, onChange) {
    let btn = select(btnId);
    if (btn) {
      // Set initial state
      if (stateVar) btn.addClass('active');
      else btn.removeClass('active');
      
      btn.mousePressed(() => {
        let newState = !btn.hasClass('active');
        if (newState) btn.addClass('active');
        else btn.removeClass('active');
        onChange(newState);
        redraw();
      });
    }
  }

  bindToggle('#btn-toggle-lines', showConstellationLines, (val) => showConstellationLines = val);
  bindToggle('#btn-toggle-labels', showConstellationLabels, (val) => showConstellationLabels = val);
  bindToggle('#btn-toggle-stars', showStarNames, (val) => showStarNames = val);
  // Story Mode Toggle
  bindToggle('#btn-toggle-story', storyModeEnabled, (val) => storyModeEnabled = val);

  // Grid Options Bindings
  let gridEnableCheck = select('#toggle-grid-enable');
  if (gridEnableCheck) {
    gridEnableCheck.checked(showCelestialGrid);
    gridEnableCheck.changed(() => {
       showCelestialGrid = gridEnableCheck.checked();
       redraw();
    });
  }
  
  let boundsCheck = select('#toggle-boundaries');
  if (boundsCheck) {
    boundsCheck.checked(showConstellationBoundaries);
    boundsCheck.changed(() => {
      showConstellationBoundaries = boundsCheck.checked();
      redraw();
    });
  }

  // Highlight Selected Toggle
  let highlightCheck = select('#toggle-highlight-selected');
  if (highlightCheck) {
    highlightCheck.checked(highlightSelectedConstellation);
    highlightCheck.changed(() => {
      highlightSelectedConstellation = highlightCheck.checked();
      redraw();
    });
  }

  // Bind Grid Type Radio Buttons
  let gridRadios = document.getElementsByName('grid-type');
  for(let radio of gridRadios) {
    radio.addEventListener('change', () => {
      if(radio.checked) {
        activeGridType = radio.value;
        redraw();
      }
    });
  }
  
  // NOTE: We don't bind #btn-toggle-grid here anymore because it opens a modal via HTML onclick


  // 4. Poster Studio Controls
  let pTitle = select('#poster-title');
  if (pTitle) {
    pTitle.value(posterTitle); // Init
    pTitle.input(() => { 
      posterTitle = pTitle.value(); 
      redraw(); 
    });
  }

  let pDesc = select('#poster-desc');
  if (pDesc) pDesc.input(() => { posterDesc = pDesc.value(); redraw(); });
  
  let pStory = select('#poster-story');
  if (pStory) pStory.input(() => { posterStory = pStory.value(); redraw(); });

  let lSelect = select('#layout-select');
  if (lSelect) lSelect.changed(() => { currentLayout = lSelect.value(); redraw(); });

  let tDate = select('#toggle-overlay-date');
  if (tDate) tDate.changed(() => { showOverlayDate = tDate.checked(); redraw(); });

  let tCoords = select('#toggle-overlay-coords');
  if (tCoords) tCoords.changed(() => { showOverlayCoords = tCoords.checked(); redraw(); });

  // 5. Snapshot
  let saveBtn = select('#save-btn');
  if (saveBtn) {
    saveBtn.mousePressed(() => {
      saveCanvas('uygarligin_baslangici_' + date.toISOString().slice(0,10), 'png');
    });
  }
}

function draw() {
  try {
    // console.log("Draw loop running..."); // Uncomment for spammy debug
    calculateLayoutMetrics();

    background(PALETTE.background);
    
    // Draw Horizon Circle (simplistic view)
    noFill();
    stroke(30);
    circle(centerX, centerY, scaleFactor * 2);

    // --- 0. Draw Celestial Grid (If Enabled) ---
    if (showCelestialGrid) {
       drawCelestialGrid();
    }
    
    // --- 0.5. Draw IAU Boundaries (If Enabled) ---
    if (showConstellationBoundaries) {
      drawConstellationBoundaries();
    }
    
    if (stars === null) {
      fill(255, 100, 100);
      noStroke();
      textAlign(CENTER);
      text("Error loading data. Check console.", centerX, centerY);
      return;
    }

    if (stars.length === 0) {
      fill(255);
      noStroke();
      textAlign(CENTER);
      text("Loading Star Catalog...", centerX, centerY);
      return;
    }
    
    // Calculate Local Sidereal Time
    let lst = calculateLST(date, observerLon);

    // --- 1. Pre-calculate Stars & Detect Star Hover ---
    // We need to know which star is hovered BEFORE we draw constellations
    // so we can light up the correct constellation lines.
    
    let visibleStars = [];
    let closestDist = 15; // Strict Star Hover Threshold (15px)
    let hoveredStar = null;
    let hoveredStarPos = null;
    
    hoveredConstellationId = null; // Reset

    for (let star of stars) {
      let ha = lst - star.ra;
      while (ha < -180) ha += 360;
      while (ha > 180) ha -= 360;
      
      let pos = equatorialToHorizontal(ha, star.dec, observerLat);
      
      if (pos.alt > 0) {
        let projected = projectStereographic(pos.az, pos.alt);
        
        // Store for next pass to avoid re-projecting
        visibleStars.push({
          star: star,
          x: projected.x,
          y: projected.y
        });
        
        // Check Hover
        let d = dist(mouseX, mouseY, projected.x, projected.y);
        if (d < closestDist) {
          closestDist = d;
          hoveredStar = star;
          hoveredStarPos = projected;
        }
      }
    }

    // Set Hovered Constellation based on Hovered Star
    if (hoveredStar && hoveredStar.constellationId) {
      hoveredConstellationId = hoveredStar.constellationId;
    }

    // --- 2. Draw Constellations ---
    strokeWeight(1);
    
    if (constellations) {
      for (let constell of constellations) {
         let isHovered = (constell.id === hoveredConstellationId);
         let isSelected = (constell.id === selectedConstellationId) && highlightSelectedConstellation;
         
         let showLines = showConstellationLines || isHovered || isSelected;
         let showLabels = showConstellationLabels || isHovered || isSelected;
         
         // Optimization: Skip if neither lines nor labels are needed
         if (!showLines && !showLabels) continue;
         
         // Visuals for Lines
         let lineStroke;
         let weight = 1;

         if (isSelected) {
            lineStroke = color('#FFD700'); // Gold for selected
            weight = 2.5;
         } else if (isHovered) {
            lineStroke = color(PALETTE.lineHover);
            weight = 1.5;
         } else {
            lineStroke = color(PALETTE.lineFaint);
            weight = 1;
         }
         
         noFill();
         
         // Prepare bounds for Label
         let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
         let hasPoints = false;

         // Draw Lines
         let coords = constell.geometry.coordinates;
         for (let lineSegments of coords) {
           if (showLines) {
              stroke(lineStroke);
              strokeWeight(weight);
              beginShape();
           }

           for (let point of lineSegments) {
             let ra = point[0];
             let dec = point[1];
             
             let ha = lst - ra;
             while (ha < -180) ha += 360;
             while (ha > 180) ha -= 360;

             let pos = equatorialToHorizontal(ha, dec, observerLat);
             if (pos.alt > 0) {
                let proj = projectStereographic(pos.az, pos.alt);
                
                if (showLines) vertex(proj.x, proj.y);
                
                if (proj.x < minX) minX = proj.x;
                if (proj.x > maxX) maxX = proj.x;
                if (proj.y < minY) minY = proj.y;
                if (proj.y > maxY) maxY = proj.y;
                hasPoints = true;
             } else {
                if (showLines) {
                  endShape();
                  beginShape();
                }
             }
           }
           if (showLines) endShape();
         }
         
         // Draw Label (Screen-Space Bounding Box)
         if (showLabels && hasPoints) {
            let cx = (minX + maxX) / 2;
            let cy = (minY + maxY) / 2;

            let fullName = (typeof constellationNames !== 'undefined' && constellationNames[constell.id]) 
                           ? constellationNames[constell.id] 
                           : constell.id;

            noStroke();
            if (isHovered) {
              fill(color(PALETTE.textHover));
              textSize(14); // Larger
            } else {
              fill(color(PALETTE.textNormal));
              textSize(10);
            }
            textAlign(CENTER, CENTER);
            text(fullName, cx, cy);
         }
      }
    }

    // --- 3. Draw Stars ---
    noStroke();
    
    for (let item of visibleStars) {
      let star = item.star;
      let x = item.x;
      let y = item.y;
      
      // Render Star
      let size = map(star.mag, 6, -1.5, 0.5, 4, true);
      let starColor = bvToColor(star.bv);
      starColor.setAlpha(200);
      fill(starColor);
      circle(x, y, size);

      // --- Star Name Visibility ---
      // Rule 1: Always show hovered star name.
      // Rule 2: Show global bright stars (Mag < 2.0) if Toggle ON.
      // Rule 3: Do NOT show other stars just because constellation is hovered.
      
      let isHoveredStar = (star === hoveredStar);
      let showGlobal = showStarNames && star.mag < 2.0;
      
      // We only draw the text here if it's NOT the hovered star (hovered star gets special tooltip/label)
      // Or we can just draw it here. Let's draw here for consistency, but Hovered gets priority.
      
      if (showGlobal && !isHoveredStar) {
        fill(255, 180);
        textAlign(CENTER, BOTTOM);
        textSize(9);
        if (star.name) text(star.name, x, y - 5);
      }
    }
    
    // --- 4. Tooltip for Hovered Star ---
    if (hoveredStar && hoveredStarPos) {
      fill(255);
      noStroke();
      textAlign(LEFT, BOTTOM);
      let label = hoveredStar.name || `HR ${hoveredStar.HR}`; 
      if (!label || label === "undefined") label = `Mag: ${hoveredStar.mag}`;
      
      // Draw slightly offset
      text(label, hoveredStarPos.x + 10, hoveredStarPos.y - 10);
      
      // Highlight Circle
      stroke(255, 150);
      noFill();
      circle(hoveredStarPos.x, hoveredStarPos.y, 15);
    }
    
    // --- 5. Draw Poster Overlay ---
    // calculateLayoutMetrics(); // Already called at start of draw
    drawPosterOverlay();
    
    // Cursor Feedback
    if (hoveredConstellationId) {
      cursor(HAND);
    } else {
      cursor(ARROW);
    }

  } catch (err) {
    background(0);
    fill(255, 0, 0);
    textSize(20);
    textAlign(LEFT, TOP);
    text("Runtime Error: " + err.message, 20, 20);
    console.error("Draw Loop Error:", err);
  }
}

function mousePressed() {
  // Only handle clicks within canvas bounds
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  // Check Story Mode
  if (!storyModeEnabled) return;

  if (hoveredConstellationId) {
    // Update Selection
    selectedConstellationId = hoveredConstellationId;

    let c = constellations.find(x => x.id === hoveredConstellationId);
    if (c) {
      // 1. Title = Constellation Name (e.g. Andromeda)
      if (typeof constellationNames !== 'undefined' && constellationNames[c.id]) {
        posterTitle = constellationNames[c.id].toUpperCase();
      } else {
        posterTitle = c.id;
      }

      // 2. Subtitle = Mythology Title (e.g. THE CHAINED PRINCESS)
      if (c.meta && c.meta.title) {
        posterDesc = c.meta.title.toUpperCase();
      } else {
        posterDesc = ""; // Clear if no myth title
      }

      // 3. Story = Mythology Body
      if (c.meta && c.meta.mythology) {
        posterStory = c.meta.mythology;
      } else {
        posterStory = "";
      }

      // Update UI Inputs
      let pTitleInput = select('#poster-title');
      if (pTitleInput) pTitleInput.value(posterTitle);

      let pDescInput = select('#poster-desc');
      if (pDescInput) pDescInput.value(posterDesc);

      let pStoryInput = select('#poster-story');
      if (pStoryInput) pStoryInput.value(posterStory);
      
      // Force redraw to show new overlay
      redraw();
    }
  } else {
    // Optional: Deselect if clicking empty space?
    // selectedConstellationId = null; 
    // redraw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
  redraw();
}

// --- Helper: Celestial Grid ---
function drawCelestialGrid() {
  strokeWeight(1);
  noFill();

  if (activeGridType === 'horizontal') {
    drawHorizontalGrid();
  } else if (activeGridType === 'equatorial') {
    drawGenericGrid('equatorial');
  } else if (activeGridType === 'ecliptic') {
    drawGenericGrid('ecliptic');
  } else if (activeGridType === 'galactic') {
    drawGenericGrid('galactic');
  } else if (activeGridType === 'supergalactic') {
    drawGenericGrid('supergalactic');
  } else if (activeGridType === 'healpix') {
    drawHealpixGrid();
  }
  // UPS Removed
}

function drawConstellationBoundaries() {
  if (!boundaries) return;
  
  stroke(255, 100, 100, 80); // Red-ish distinct color for boundaries
  strokeWeight(1);
  noFill();
  
  // Boundaries are usually GeoJSON MultiLineStrings or Polygons
  for (let feature of boundaries) {
    let coords = feature.geometry.coordinates;
    let type = feature.geometry.type;
    
    if (type === 'MultiLineString' || type === 'Polygon') {
       // Polygon coords are nested one level deeper than LineString usually [[x,y],...]
       // But usually bounds are lines. Let's handle generic line segments.
       // GeoJSON Polygon: [ [ [x,y], [x,y]... ] ] (Outer ring)
       // MultiLineString: [ [ [x,y], [x,y]... ], ... ]
       
       let rings = (type === 'Polygon') ? coords : coords;
       
       for (let ring of rings) {
         beginShape();
         for (let i = 0; i < ring.length; i++) {
           let pt = ring[i];
           // GeoJSON is [RA, Dec] usually in degrees
           let ra = pt[0];
           let dec = pt[1];
           
           let ha = calculateLST(date, observerLon) - ra;
           while (ha < -180) ha += 360;
           while (ha > 180) ha -= 360;
           
           let pos = equatorialToHorizontal(ha, dec, observerLat);
           if (pos.alt > 0) {
             let proj = projectStereographic(pos.az, pos.alt);
             // Break lines if wrapping or far?
             // Simple stereographic projection doesn't wrap the same way equirectangular does, 
             // but we should check distance.
             if (dist(proj.x, proj.y, centerX, centerY) < scaleFactor * 2.5) {
                vertex(proj.x, proj.y);
             } else {
                endShape(); beginShape();
             }
           } else {
             endShape(); beginShape();
           }
         }
         endShape();
       }
    } else if (type === 'LineString') {
        beginShape();
        for (let pt of coords) {
           let ra = pt[0];
           let dec = pt[1];
           let ha = calculateLST(date, observerLon) - ra;
           while (ha < -180) ha += 360;
           while (ha > 180) ha -= 360;
           
           let pos = equatorialToHorizontal(ha, dec, observerLat);
           if (pos.alt > 0) {
             let proj = projectStereographic(pos.az, pos.alt);
             if (dist(proj.x, proj.y, centerX, centerY) < scaleFactor * 2.5) {
                vertex(proj.x, proj.y);
             } else {
                endShape(); beginShape();
             }
           } else {
             endShape(); beginShape();
           }
        }
        endShape();
    }
  }
}

function drawHealpixGrid() {
  // Draw simplified HEALPix Base Pixel boundaries (Nside=1)
  // 12 Pixels defined by specific vertex points.
  // Vertices in (RA, Dec) approx:
  // North Polar: (45, 41.8), (135, 41.8), (225, 41.8), (315, 41.8)
  // South Polar: (45, -41.8), ...
  // Equator: (0,0), (90,0), (180,0), (270,0)
  
  // We will just draw the "diamonds".
  // Nside=1 boundaries are great circles or parallels? 
  // Actually they are curves. For visual, we'll draw lines between the vertices.
  
  stroke(100, 255, 100, 60); // Green-ish
  
  // Approx vertices for Nside=1
  // z = 2/3 -> Dec = asin(2/3) ~= 41.81 deg
  // z = -2/3 -> Dec = -41.81 deg
  let decN = 41.8103;
  let decS = -41.8103;
  
  let points = [
    // North Ring
    {ra: 45, dec: decN}, {ra: 135, dec: decN}, {ra: 225, dec: decN}, {ra: 315, dec: decN},
    // Equator
    {ra: 0, dec: 0}, {ra: 90, dec: 0}, {ra: 180, dec: 0}, {ra: 270, dec: 0},
    // South Ring
    {ra: 45, dec: decS}, {ra: 135, dec: decS}, {ra: 225, dec: decS}, {ra: 315, dec: decS},
    // Poles
    {ra: 0, dec: 90}, {ra: 0, dec: -90} 
  ];
  
  // Connections (Manual Topology for Nside=1)
  // This is a rough visualization wireframe
  
  let connections = [
    // North Pole to North Ring
    [12, 0], [12, 1], [12, 2], [12, 3],
    // North Ring to Equator
    [0, 4], [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 4],
    // Equator to South Ring
    [4, 8], [4, 11], [5, 8], [5, 9], [6, 9], [6, 10], [7, 10], [7, 11],
    // South Ring to South Pole
    [13, 8], [13, 9], [13, 10], [13, 11]
  ];
  
  let lst = calculateLST(date, observerLon);
  
  for (let pair of connections) {
    let p1 = points[pair[0]];
    let p2 = points[pair[1]];
    drawCelestialLine(p1.ra, p1.dec, p2.ra, p2.dec, lst);
  }
}

function drawCelestialLine(ra1, dec1, ra2, dec2, lst) {
  // Interpolate to draw curved lines (Great Circles roughly)
  let steps = 10;
  beginShape();
  for(let i=0; i<=steps; i++) {
    let t = i/steps;
    let r = ra1 + (ra2 - ra1)*t; // Simple linear interpolation for now (not true great circle but ok for grid)
    let d = dec1 + (dec2 - dec1)*t;
    
    // Handle RA wrap if needed (not handled here for simplicity in small steps)
    
    let ha = lst - r;
    while (ha < -180) ha += 360;
    while (ha > 180) ha -= 360;
    
    let pos = equatorialToHorizontal(ha, d, observerLat);
    if (pos.alt > 0) {
       let proj = projectStereographic(pos.az, pos.alt);
       if (dist(proj.x, proj.y, centerX, centerY) < scaleFactor * 2.2) {
         vertex(proj.x, proj.y);
       } else {
         endShape(); beginShape();
       }
    } else {
       endShape(); beginShape();
    }
  }
  endShape();
}

function drawHorizontalGrid() {
  stroke(255, 30); // Very faint white

  // 1. Altitude Rings (every 30 degrees)
  for (let alt = 30; alt < 90; alt += 30) {
     let r = scaleFactor * tan((PI/2 - radians(alt)) / 2);
     circle(centerX, centerY, r * 2);
     
     // Label
     drawGridLabel(alt + "°", centerX, centerY - r + 2);
  }
  
  // 2. Azimuth Lines (every 45 degrees)
  for (let az = 0; az < 360; az += 45) {
    let azRad = radians(az);
    let r = scaleFactor * tan((PI/2 - 0) / 2); // Radius at horizon
    
    let x2 = centerX + r * sin(azRad);
    let y2 = centerY - r * cos(azRad);
    
    line(centerX, centerY, x2, y2);
    
    // Label
    let label = "";
    if (az === 0) label = "N";
    else if (az === 90) label = "E";
    else if (az === 180) label = "S";
    else if (az === 270) label = "W";
    else label = az + "°";
    
    drawGridLabel(label, x2 * 1.05 - (centerX * 0.05), y2 * 1.05 - (centerY * 0.05), true);
  }
}

function drawGenericGrid(type) {
  // LST is needed for Equatorial/Celestial conversion to Horizontal
  let lst = calculateLST(date, observerLon);
  
  // Colors
  if (type === 'equatorial') stroke(100, 200, 255, 40); // Cyan-ish
  else if (type === 'ecliptic') stroke(255, 200, 100, 40); // Orange-ish
  else if (type === 'galactic') stroke(255, 100, 200, 40); // Magenta-ish
  else if (type === 'supergalactic') stroke(180, 100, 255, 40); // Violet-ish
  
  // 1. Latitude Lines (Parallels)
  // Draw circles at -60, -30, 0, 30, 60
  for (let lat = -60; lat <= 60; lat += 30) {
    beginShape();
    let hasPoints = false;
    for (let lon = 0; lon <= 360; lon += 5) {
      let pt = getProjectedPoint(type, lon, lat, lst);
      if (pt) {
        vertex(pt.x, pt.y);
        hasPoints = true;
      } else {
        if (hasPoints) { endShape(); beginShape(); }
        hasPoints = false;
      }
    }
    endShape();
  }

  // 2. Longitude Lines (Meridians)
  // Draw lines every 2h (30 deg)
  for (let lon = 0; lon < 360; lon += 30) {
    beginShape();
    let hasPoints = false;
    for (let lat = -80; lat <= 80; lat += 5) {
      let pt = getProjectedPoint(type, lon, lat, lst);
      if (pt) {
        vertex(pt.x, pt.y);
        hasPoints = true;
      } else {
        if (hasPoints) { endShape(); beginShape(); }
        hasPoints = false;
      }
    }
    endShape();
  }
}

function getProjectedPoint(type, lon, lat, lst) {
  let ra, dec;
  
  if (type === 'equatorial') {
    // lon is RA (degrees), lat is Dec (degrees)
    ra = lon;
    dec = lat;
  } else if (type === 'ecliptic') {
    let eq = eclipticToEquatorial(lon, lat);
    ra = eq.ra;
    dec = eq.dec;
  } else if (type === 'galactic') {
    let eq = galacticToEquatorial(lon, lat);
    ra = eq.ra;
    dec = eq.dec;
  } else if (type === 'supergalactic') {
    let eq = supergalacticToEquatorial(lon, lat);
    ra = eq.ra;
    dec = eq.dec;
  }
  
  // Convert RA/Dec to Horizontal (Az/Alt)
  let ha = lst - ra;
  while (ha < -180) ha += 360;
  while (ha > 180) ha -= 360;
  
  let hor = equatorialToHorizontal(ha, dec, observerLat);
  
  // Project only if above horizon
  if (hor.alt > 0) {
    let proj = projectStereographic(hor.az, hor.alt);
    // Check bounds (don't draw way outside circle)
    if (dist(proj.x, proj.y, centerX, centerY) > scaleFactor * 2.2) return null;
    return proj;
  }
  return null;
}

function drawGridLabel(str, x, y, isAzimuth = false) {
    fill(255, 80);
    noStroke();
    textSize(10);
    textAlign(CENTER, CENTER);
    text(str, x, y);
    noFill();
    // Reset stroke for next lines
    stroke(255, 30);
    if (activeGridType === 'equatorial') stroke(100, 200, 255, 40);
    else if (activeGridType === 'ecliptic') stroke(255, 200, 100, 40);
    else if (activeGridType === 'galactic') stroke(255, 100, 200, 40);
    else if (activeGridType === 'supergalactic') stroke(180, 100, 255, 40);
}
