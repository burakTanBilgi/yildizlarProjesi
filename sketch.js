let stars = [];
let constellations = [];

// Configuration
let observerLat = 41.0082; // Istanbul Latitude
let observerLon = 28.9784; // Istanbul Longitude
let date = new Date(); // Current date/time
let showConstellations = true;
let showConstellationLabels = false;
let showStarNames = false;
let hoveredConstellationId = null; // Track hovered constellation

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
    toggleConst.changed(() => {
      showConstellations = toggleConst.checked();
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
}

function draw() {
  background('#050505');
  
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

  // --- 1. Process Constellations (Project & Calculate Bounds) ---
  let visibleConsts = [];
  hoveredConstellationId = null;
  let minDist = 150; // Threshold for hover detection

  if (constellations) {
    for (let constell of constellations) {
      // Prepare storage for projected paths
      let screenPaths = [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let hasVisiblePoints = false;

      let coords = constell.geometry.coordinates;
      
      for (let lineSegments of coords) {
        let currentPath = [];
        
        for (let point of lineSegments) {
          let ra = point[0];
          let dec = point[1];
          
          // Project Point
          let ha = lst - ra;
          while (ha < -180) ha += 360;
          while (ha > 180) ha -= 360;

          let pos = equatorialToHorizontal(ha, dec, observerLat);
          
          if (pos.alt > 0) {
             let proj = projectStereographic(pos.az, pos.alt);
             currentPath.push(proj);
             
             // Update Bounds
             if (proj.x < minX) minX = proj.x;
             if (proj.x > maxX) maxX = proj.x;
             if (proj.y < minY) minY = proj.y;
             if (proj.y > maxY) maxY = proj.y;
             
             hasVisiblePoints = true;
          } else {
             // Break lines at horizon
             if (currentPath.length > 0) {
               screenPaths.push(currentPath);
               currentPath = [];
             }
          }
        }
        if (currentPath.length > 0) screenPaths.push(currentPath);
      }

      if (hasVisiblePoints) {
        let centerX = (minX + maxX) / 2;
        let centerY = (minY + maxY) / 2;
        
        // Calculate dist for hover
        let d = dist(mouseX, mouseY, centerX, centerY);
        let isActive = false;
        
        // Simple closest-check logic
        // We defer assignment until we check all, but for simplicity:
        // We'll collect candidates and pick closest later if needed.
        // For now, let's just store the data.
        
        visibleConsts.push({
          id: constell.id,
          paths: screenPaths,
          center: createVector(centerX, centerY),
          dist: d
        });
      }
    }
  }

  // Find the single closest constellation for hover
  let closest = null;
  let closestVal = minDist;
  for (let c of visibleConsts) {
    if (c.dist < closestVal) {
      closestVal = c.dist;
      closest = c;
    }
  }
  if (closest) hoveredConstellationId = closest.id;

  // --- 2. Draw Constellations ---
  strokeWeight(1);
  
  for (let c of visibleConsts) {
     let isHovered = (c.id === hoveredConstellationId);
     let isVisible = showConstellations || isHovered;
     
     if (!isVisible) continue;
     
     // Visuals
     if (isHovered) {
       stroke(100, 255, 218, 200); // Brighter Cyan
       strokeWeight(1.5);
     } else {
       stroke(255, 15); // Extremely faint
       strokeWeight(1);
     }
     noFill();
     
     // Draw Lines
     for (let path of c.paths) {
       beginShape();
       for (let p of path) {
         vertex(p.x, p.y);
       }
       endShape();
     }
     
     // Draw Label
     if (showConstellationLabels || isHovered) {
        let fullName = (typeof constellationNames !== 'undefined' && constellationNames[c.id]) 
                       ? constellationNames[c.id] 
                       : c.id;

        noStroke();
        if (isHovered) {
          fill(255);
          textSize(14); // Larger
        } else {
          fill(255, 150);
          textSize(10);
        }
        textAlign(CENTER, CENTER);
        text(fullName, c.center.x, c.center.y);
     }
  }

  // --- 3. Draw Stars ---
  noStroke();
  let closestDist = 15;
  let hoveredStar = null;
  let hoveredPos = null;
  
  for (let star of stars) {
    let ha = lst - star.ra;
    while (ha < -180) ha += 360;
    while (ha > 180) ha -= 360;
    
    let pos = equatorialToHorizontal(ha, star.dec, observerLat);
    
    if (pos.alt > 0) {
      let projected = projectStereographic(pos.az, pos.alt);
      
      // Render Star
      let size = map(star.mag, 6, -1.5, 0.5, 4, true);
      let starColor = bvToColor(star.bv);
      starColor.setAlpha(200);
      fill(starColor);
      circle(projected.x, projected.y, size);

      // --- Smart Filtering (Refined) ---
      // 1. Global Rule: Show if Toggle ON AND Mag < 2.0 (Very Bright)
      let showGlobal = showStarNames && star.mag < 2.0;
      
      // 2. Hover Rule: Show if Star is in Hovered Constellation AND Mag < 5.0 (Detail)
      // Check ID only if it exists
      let isHoveredConst = (hoveredConstellationId && star.constellationId === hoveredConstellationId);
      let showHover = isHoveredConst && star.mag < 5.0;
      
      if (showGlobal || showHover) {
        fill(255, 180);
        textAlign(CENTER, BOTTOM);
        textSize(9);
        let label = star.name || "";
        if (label) text(label, projected.x, projected.y - 5);
      }

      // Star Hover Check
      let d = dist(mouseX, mouseY, projected.x, projected.y);
      if (d < closestDist) {
        closestDist = d;
        hoveredStar = star;
        hoveredPos = projected;
      }
    }
  }
  
  // Draw Tooltip for Hovered Star
  if (hoveredStar) {
    fill(255);
    noStroke();
    textAlign(LEFT, BOTTOM);
    let label = hoveredStar.name || `HR ${hoveredStar.HR}`; // Fallback if name is empty
    if (!label || label === "undefined") label = `Mag: ${hoveredStar.mag}`;
    
    text(label, hoveredPos.x + 10, hoveredPos.y - 10);
    
    stroke(255, 100);
    noFill();
    circle(hoveredPos.x, hoveredPos.y, 15);
  }
  
  /* Debug Info - Disabled for Phase 2 Minimalist View
  fill(150);
  textAlign(LEFT, TOP);
  text(`Stars: ${visibleCount} / ${stars.length}`, 10, 10);
  text(`Date: ${date.toISOString()}`, 10, 30);
  text(`LST: ${lst.toFixed(2)}°`, 10, 50);
  */
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
