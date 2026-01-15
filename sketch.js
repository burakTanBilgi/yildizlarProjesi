// --- Main Sketch & Rendering Loop ---

function preload() {
  console.log("Preloading data...");
  // Load remote JSON directly
  let starsUrl = 'https://brettonw.github.io/YaleBrightStarCatalog/bsc5.json';
  loadJSON(starsUrl, parseStars, loadError);

  // Load Constellation Lines
  let constUrl = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
  loadJSON(constUrl, parseConstellations, loadError);
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
  
  // Initialize Date Picker
  let datePicker = select('#date-picker');
  let now = new Date();
  let localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  
  if (datePicker) {
    datePicker.value(localIso);
    datePicker.changed(() => {
      let val = datePicker.value();
      if (val) {
        date = new Date(val);
        redraw();
      }
    });
  }

  // Handle Location Inputs
  let latInput = select('#lat-input');
  let lonInput = select('#lon-input');

  if (latInput) {
    latInput.input(() => {
      observerLat = float(latInput.value());
      redraw();
    });
  }

  if (lonInput) {
    lonInput.input(() => {
      observerLon = float(lonInput.value());
      redraw();
    });
  }

  // Handle Toggles
  let toggleConst = select('#toggle-constellations');
  if (toggleConst) {
    toggleConst.checked(showConstellationLines); // Sync UI
    toggleConst.changed(() => {
      showConstellationLines = toggleConst.checked();
      redraw();
    });
  }

  let toggleNames = select('#toggle-names');
  if (toggleNames) {
    toggleNames.changed(() => {
      showStarNames = toggleNames.checked();
      redraw();
    });
  }
  
  let toggleConstLabels = select('#toggle-const-labels');
  if (toggleConstLabels) {
    toggleConstLabels.changed(() => {
      showConstellationLabels = toggleConstLabels.checked();
      redraw();
    });
  }
  
  // Handle Geolocation
  let btnLoc = select('#btn-location');
  if (btnLoc) {
    btnLoc.mousePressed(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          observerLat = pos.coords.latitude;
          observerLon = pos.coords.longitude;
          if (latInput) latInput.value(observerLat);
          if (lonInput) lonInput.value(observerLon);
          redraw();
        });
      } else {
        alert("Geolocation not supported");
      }
    });
  }

  // Handle Save Button
  let saveBtn = select('#save-btn');
  if (saveBtn) {
    saveBtn.mousePressed(() => {
      saveCanvas('uygarligin_baslangici_' + date.toISOString().slice(0,10), 'png');
    });
  }

  // --- Poster Controls ---
  let pTitle = select('#poster-title');
  if (pTitle) pTitle.input(() => { posterTitle = pTitle.value(); redraw(); });

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
         let showLines = showConstellationLines || isHovered;
         let showLabels = showConstellationLabels || isHovered;
         
         // Optimization: Skip if neither lines nor labels are needed
         if (!showLines && !showLabels) continue;
         
         // Visuals for Lines
         let lineStroke = isHovered ? color(PALETTE.lineHover) : color(PALETTE.lineFaint);
         
         noFill();
         
         // Prepare bounds for Label
         let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
         let hasPoints = false;

         // Draw Lines
         let coords = constell.geometry.coordinates;
         for (let lineSegments of coords) {
           if (showLines) {
              stroke(lineStroke);
              strokeWeight(isHovered ? 1.5 : 1);
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

  if (hoveredConstellationId) {
    let c = constellations.find(x => x.id === hoveredConstellationId);
    if (c) {
      // Prioritize Mythology Title, then Common Name, then ID
      if (c.meta && c.meta.title) {
        posterTitle = c.meta.title.toUpperCase();
      } else if (typeof constellationNames !== 'undefined' && constellationNames[c.id]) {
        posterTitle = constellationNames[c.id].toUpperCase();
      } else {
        posterTitle = c.id;
      }

      // Set Story
      if (c.meta && c.meta.mythology) {
        posterStory = c.meta.mythology;
      } else {
        posterStory = "";
      }

      // Update UI Inputs
      let pTitleInput = select('#poster-title');
      if (pTitleInput) pTitleInput.value(posterTitle);

      let pStoryInput = select('#poster-story');
      if (pStoryInput) pStoryInput.value(posterStory);
      
      // Force redraw to show new overlay
      redraw();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
  redraw();
}
