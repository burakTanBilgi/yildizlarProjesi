const PALETTE = {
  background: '#050505',
  starBase: [255, 255, 255],
  lineFaint: [255, 255, 255, 15],
  lineHover: [100, 255, 218, 200],
  textNormal: [255, 255, 255, 150],
  textHover: [255, 255, 255, 255]
};

let stars = [];
let constellations = [];

// Configuration
let observerLat = 41.0082; // Istanbul Latitude
let observerLon = 28.9784; // Istanbul Longitude
let date = new Date(); // Current date/time
let showConstellationLines = false; // Default OFF per request
let showConstellationLabels = false;
let showStarNames = false;
let hoveredConstellationId = null; // Track hovered constellation

// Poster / Overlay Configuration
let posterTitle = "STAR MAP";
let posterDesc = "Observed from Istanbul";
let posterStory = "";
let currentLayout = "glass-overlay"; // glass-overlay, side-split, bottom-bar
let showOverlayDate = false;
let showOverlayCoords = false;

// Visualization Scale
let scaleFactor = 400;
let centerX, centerY;

function preload() {
  // Load remote JSON directly
  let starsUrl = 'https://brettonw.github.io/YaleBrightStarCatalog/bsc5.json';
  loadJSON(starsUrl, parseStars, loadError);

  // Load Constellation Lines
  let constUrl = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
  loadJSON(constUrl, parseConstellations, loadError);
}

function parseConstellations(data) {
  if (data.features) {
    constellations = data.features;
    for (let c of constellations) {
      if (c.geometry && c.geometry.coordinates) {
        // Ensure ID is clean
        if (!c.id) c.id = "Unknown";
        
        // Phase 99: Metadata Placeholders (Future expansion)
        c.meta = {
          description: "",
          origin: "",
          mythology: "" 
        };
      }
    }
  }
}

function loadError(err) {
  console.error("Data Load Error:", err);
  stars = null; // Flag error
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Inter'); // Use the Google Font loaded in HTML
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
  calculateLayoutMetrics();
  drawPosterOverlay();
}

function calculateLayoutMetrics() {
  if (currentLayout === 'side-split') {
    // 30% Left (Text), 70% Right (Map)
    let mapWidth = width * 0.7;
    let mapX = width * 0.3;
    centerX = mapX + mapWidth / 2;
    centerY = height / 2;
    // Fit within the map area with some padding
    scaleFactor = min(mapWidth, height) * 0.38; 
  } else if (currentLayout === 'bottom-bar') {
    // 75% Top (Map), 25% Bottom (Text)
    let mapHeight = height * 0.75;
    centerX = width / 2;
    centerY = mapHeight / 2;
    scaleFactor = min(width, mapHeight) * 0.38;
  } else {
    // glass-overlay (Default)
    centerX = width / 2;
    centerY = height / 2;
    // Standard full screen view
    scaleFactor = min(width, height) * 0.42;
  }
}

function drawPosterOverlay() {
   // Renders title, description, and metadata based on layout
   
   if (currentLayout === 'side-split') {
     drawSideSplitLayout();
   } else if (currentLayout === 'bottom-bar') {
     drawBottomBarLayout();
   } else {
     drawGlassOverlayLayout();
   }
}

function drawGlassOverlayLayout() {
   // Modern "Frosted Glass" box in bottom-left
   let boxWidth = 350;
   let boxHeight = 160;
   let padding = 25;
   let startX = 40;
   let startY = height - 40;
   
   // Adjust height based on content
   if (posterStory.length > 0) boxHeight += 60;

   // Draw Glass Box
   fill(20, 20, 30, 200); // Dark semi-transparent
   stroke(255, 30);
   strokeWeight(1);
   rect(startX - padding, startY - boxHeight, boxWidth, boxHeight, 12);
   
   // Text Anchors
   let textX = startX;
   let currentY = startY - boxHeight + padding + 10;
   
   // Title
   fill(255);
   noStroke();
   textAlign(LEFT, TOP);
   
   if (posterTitle) {
     textFont('Playfair Display');
     textStyle(BOLD);
     textSize(32);
     text(posterTitle.toUpperCase(), textX, currentY);
     currentY += 40;
   }
   
   // Description
   textFont('Inter');
   textStyle(NORMAL);
   textSize(14);
   fill(255, 220);
   if (posterDesc) {
     text(posterDesc, textX, currentY);
     currentY += 25;
   }
   
   // Story / Dedication
   if (posterStory) {
     fill(255, 180);
     textStyle(ITALIC);
     textSize(12);
     text(posterStory, textX, currentY, boxWidth - padding*2); // Word wrap
     currentY += 50;
   }
   
   // Metadata (Date/Coords)
   drawMetadataString(textX, startY - padding);
}

function drawSideSplitLayout() {
  // Left Panel (30%)
  let panelW = width * 0.3;
  
  // Draw Panel Background (Masking the stars)
  fill(5, 5, 5); // Deep Black
  noStroke();
  rect(0, 0, panelW, height);
  
  // Separator Line
  stroke(255, 20);
  line(panelW, 0, panelW, height);
  
  // Text Content
  let margin = 40;
  let textW = panelW - (margin * 2);
  let y = 80;
  
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  
  // Title (Gold/White)
  fill(255, 240, 200); 
  textFont('Playfair Display');
  textStyle(BOLD);
  textSize(48);
  textLeading(55);
  text(posterTitle.toUpperCase(), margin, y, textW); // Wrap
  
  // Estimate height of title for spacing
  let lines = ceil(textWidth(posterTitle.toUpperCase()) / textW);
  // If lines are not accurate due to wrapping logic, we might need a better heuristic, 
  // but standard p5 wrapping usually works with textWidth checks on words.
  // For safety, let's just add a dynamic spacing or fixed if simple.
  // Actually, we can assume ~1.2 lines per 10 chars if title is long? 
  // Let's rely on a simpler spacing for now.
  let blockHeight = (textWidth(posterTitle.toUpperCase()) > textW) ? 110 : 60;
  y += blockHeight; 
  
  // Description
  fill(255, 200);
  textFont('Inter');
  textStyle(NORMAL);
  textSize(16);
  text(posterDesc, margin, y, textW);
  y += 40;
  
  // Story (Longer text)
  if (posterStory) {
    fill(255, 160);
    textFont('Georgia'); // Serif for story
    textSize(14);
    textLeading(24);
    text(posterStory, margin, y, textW, height - y - 100);
  }
  
  // Metadata at Bottom
  drawMetadataString(margin, height - 50);
}

function drawBottomBarLayout() {
  // Bottom Panel (25%)
  let barH = height * 0.25;
  let barY = height - barH;
  
  // Background
  fill(10, 10, 12);
  noStroke();
  rect(0, barY, width, barH);
  
  // Gold Separator
  stroke(212, 175, 55);
  strokeWeight(2);
  line(0, barY, width, barY);
  
  noStroke();
  textAlign(CENTER, CENTER);
  let centerX = width / 2;
  let centerY = barY + barH / 2;
  
  // Title
  fill(255);
  textFont('Playfair Display');
  textStyle(BOLD);
  textSize(36);
  text(posterTitle.toUpperCase(), centerX, centerY - 20);
  
  // Description
  fill(255, 180);
  textFont('Inter');
  textStyle(NORMAL);
  textSize(14);
  text(posterDesc, centerX, centerY + 20);
  
  // Story (Small, if any)
  if (posterStory) {
     fill(255, 140);
     textSize(12);
     text(posterStory, centerX, centerY + 45);
  }
  
  // Metadata (Split corners)
  if (showOverlayDate || showOverlayCoords) {
    fill(255, 100);
    textFont('Courier New');
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    let meta = getMetadataString();
    text(meta, width - 30, height - 20);
  }
}

function getMetadataString() {
  let meta = [];
  if (showOverlayDate) {
     let dStr = date.toISOString().replace('T', ' ').slice(0, 16);
     meta.push(dStr);
  }
  if (showOverlayCoords) {
     let latStr = `${Math.abs(observerLat).toFixed(2)}°${observerLat >= 0 ? 'N' : 'S'}`;
     let lonStr = `${Math.abs(observerLon).toFixed(2)}°${observerLon >= 0 ? 'E' : 'W'}`;
     meta.push(`${latStr}, ${lonStr}`);
  }
  return meta.join("  |  ");
}

function drawMetadataString(x, y) {
   let str = getMetadataString();
   if (str.length > 0) {
     textFont('Courier New');
     textSize(12);
     fill(255, 150);
     // If layout is side-split, align left. 
     // If glass overlay, align left.
     // y is usually baseline.
     text(str, x, y);
   }
   
   // Reset Font
   textFont('Inter');
}

// --- Data Parsing ---

function parseStars(data) {
  // data is an array of objects from the remote JSON
  for (let item of data) {
    // Parse RA: "00h 05m 09.9s" -> Degrees
    let ra = parseRA(item.RA);
    
    // Parse Dec: "+45° 13′ 45″" -> Degrees
    let dec = parseDec(item.Dec);
    
    // Parse Mag
    let mag = parseFloat(item.Vmag);
    if (isNaN(mag)) mag = 6.0;
    
    // Parse B-V Color Index
    let bv = parseFloat(item['B-V']);
    if (isNaN(bv)) bv = 0.5; // Default to white-ish

    // Only add visible stars
    if (mag <= 6.5) {
      // Determine Constellation ID from Name (Simple heuristic)
      let name = item.Name || item.HR || "";
      let constellationId = null;
      
      if (typeof constellationNames !== 'undefined') {
        for (let key in constellationNames) {
           // Regex: Match 3-letter code as a distinct word (e.g. "Alp And", "86 Peg")
           let regex = new RegExp("\\b" + key + "\\b", "i");
           if (regex.test(name)) {
             constellationId = key;
             break;
           }
        }
      }

      stars.push({
        ra: ra,
        dec: dec,
        mag: mag,
        bv: bv,
        name: name,
        constellationId: constellationId
      });
    }
  }
  redraw();
}

function bvToColor(bv) {
  // Approximate mapping from B-V index to RGB
  // -0.4 (Blue) to 2.0 (Red)
  let r, g, b;
  
  if (bv < 0.0) { // Hot Blue
    r = 155 + (bv * 100); 
    g = 175 + (bv * 100);
    b = 255;
  } else if (bv < 0.5) { // White-Blue
    r = 155 + (bv * 200);
    g = 175 + (bv * 160);
    b = 255;
  } else if (bv < 1.0) { // White-Yellow
    r = 255;
    g = 255 - ((bv - 0.5) * 100);
    b = 240 - ((bv - 0.5) * 150);
  } else if (bv < 1.5) { // Orange
    r = 255;
    g = 205 - ((bv - 1.0) * 100);
    b = 165 - ((bv - 1.0) * 150);
  } else { // Red
    r = 255;
    g = 155 - ((bv - 1.5) * 150);
    b = 90 - ((bv - 1.5) * 80);
  }
  
  // Constrain
  return color(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
}

function parseRA(raStr) {
  // Format: "00h 05m 09.9s"
  if (!raStr) return 0;
  let parts = raStr.match(/(\d+)h\s+(\d+)m\s+([0-9.]+)s/);
  if (!parts) return 0;
  
  let h = parseFloat(parts[1]);
  let m = parseFloat(parts[2]);
  let s = parseFloat(parts[3]);
  
  // Convert to decimal hours then degrees (1h = 15deg)
  return (h + m/60 + s/3600) * 15;
}

function parseDec(decStr) {
  // Format: "+45° 13′ 45″" or "-05..."
  if (!decStr) return 0;
  let parts = decStr.match(/([+-])(\d+)°\s+(\d+)′\s+([0-9.]+)″/);
  if (!parts) return 0;
  
  let sign = parts[1] === '-' ? -1 : 1;
  let d = parseFloat(parts[2]);
  let m = parseFloat(parts[3]);
  let s = parseFloat(parts[4]);
  
  return sign * (d + m/60 + s/3600);
}

// --- Astronomy Math ---

function calculateLST(date, lon) {
  // 1. Julian Date
  let jd = getJulianDate(date);
  
  // 2. Greenwich Mean Sidereal Time (GMST)
  // J2000 epoch
  let d = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d;
  
  // Normalize to 0-360
  gmst = gmst % 360;
  if (gmst < 0) gmst += 360;
  
  // 3. Local Sidereal Time (LST)
  let lst = gmst + lon;
  
  // Normalize
  lst = lst % 360;
  if (lst < 0) lst += 360;
  
  return lst;
}

function getJulianDate(date) {
  return (date.getTime() / 86400000) + 2440587.5;
}

function equatorialToHorizontal(ha, dec, lat) {
  let haRad = radians(ha);
  let decRad = radians(dec);
  let latRad = radians(lat);
  
  // Altitude (El)
  // sin(Alt) = sin(Dec)*sin(Lat) + cos(Dec)*cos(Lat)*cos(HA)
  let sinAlt = sin(decRad) * sin(latRad) + cos(decRad) * cos(latRad) * cos(haRad);
  let altRad = asin(sinAlt);
  
  // Azimuth (Az)
  // cos(Az) = (sin(Dec) - sin(Alt)*sin(Lat)) / (cos(Alt)*cos(Lat))
  let cosAz = (sin(decRad) - sinAlt * sin(latRad)) / (cos(altRad) * cos(latRad));
  // constrain for acos
  cosAz = constrain(cosAz, -1, 1);
  let azRad = acos(cosAz);
  
  // Resolve Azimuth ambiguity (sin(HA) > 0 means West, < 0 means East)
  // Standard Azimuth: North = 0, East = 90
  // If sin(HA) > 0, the object is past meridian (West), Az should be roughly 180-360
  // Formula usually gives 0-180.
  if (sin(haRad) > 0) {
    azRad = TWO_PI - azRad;
  }
  
  return {
    alt: degrees(altRad),
    az: degrees(azRad)
  };
}

// --- Projection ---

function projectStereographic(az, alt) {
  // Center is Zenith (Alt=90)
  // r = k * tan((90 - Alt) / 2)
  // Theta = Azimuth
  // We align North (Az=0) to Top (Y-)
  
  let altRad = radians(alt);
  let azRad = radians(az);
  
  // Distance from center
  // 90 - alt is the zenith distance
  let r = scaleFactor * tan((PI/2 - altRad) / 2);
  
  // Cartesian
  // In p5:
  // 0 deg (North) -> (0, -r)
  // 90 deg (East) -> (r, 0)
  // 180 deg (South) -> (0, r)
  // 270 deg (West) -> (-r, 0)
  
  // Standard Math: 0 is East (Right).
  // We want 0 to be Up.
  // x = r * sin(az)
  // y = -r * cos(az)
  
  let x = centerX + r * sin(azRad);
  let y = centerY - r * cos(azRad);
  
  return createVector(x, y);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
  redraw();
}
