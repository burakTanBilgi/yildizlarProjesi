let stars = [];
let constellations = [];

// Configuration
let observerLat = 41.0082; // Istanbul Latitude
let observerLon = 28.9784; // Istanbul Longitude
let date = new Date(); // Current date/time

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
  }
}

function loadError() {
  stars = null; // Flag error
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
  // loop(); // Default is loop, removing noLoop() to enable interaction

  
  // Set a specific date for testing if needed
  // date = new Date('2026-01-01T00:00:00');
  
  // Initialize Date Picker
  let datePicker = select('#date-picker');
  
  // Format date for datetime-local input (YYYY-MM-DDThh:mm)
  let now = new Date();
  // Adjust to local timezone string manually to fit input format
  // simplistic approach:
  let localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  datePicker.value(localIso);
  
  // Handle Date Change
  datePicker.changed(() => {
    let val = datePicker.value();
    if (val) {
      date = new Date(val);
    }
  });

  // Handle Save Button
  let saveBtn = select('#save-btn');
  saveBtn.mousePressed(() => {
    saveCanvas('uygarligin_baslangici_' + date.toISOString().slice(0,10), 'png');
  });
}

function draw() {
  background('#050505');
  
  // Draw Horizon Circle (simplistic view)
  noFill();
  stroke(30);
  circle(centerX, centerY, scaleFactor * 2);
  
  if (stars.length === 0) {
    fill(255);
    noStroke();
    textAlign(CENTER);
    text("Loading Star Catalog...", centerX, centerY);
    return;
  }
  
  // Calculate Local Sidereal Time
  let lst = calculateLST(date, observerLon);
  
  // Draw Constellation Lines
  stroke(255, 30); // Faint white
  noFill();
  strokeWeight(1);

  if (constellations) {
    for (let constell of constellations) {
      // Each feature has a geometry with type MultiLineString
      let coords = constell.geometry.coordinates;
      
      for (let lineSegments of coords) {
        beginShape();
        let penDown = false;
        
        for (let point of lineSegments) {
          let ra = point[0];
          let dec = point[1];
          
          // Project Point
          let ha = lst - ra;
          // Normalize HA
          while (ha < -180) ha += 360;
          while (ha > 180) ha -= 360;

          let pos = equatorialToHorizontal(ha, dec, observerLat);
          
          if (pos.alt > 0) {
            let projected = projectStereographic(pos.az, pos.alt);
            
            // Check for horizon crossing or large jumps (wrapping)
            // If the jump is too large, break the shape
            if (penDown) {
               // We can't easily check previous vertex distance in beginShape without tracking
               // But usually simple projection is fine.
               // Let's just add vertex.
               vertex(projected.x, projected.y);
            } else {
               vertex(projected.x, projected.y);
               penDown = true;
            }
          } else {
            // Below horizon, end current shape and start new one if it comes back up (unlikely for a single connected line segment usually)
            endShape();
            beginShape();
            penDown = false;
          }
        }
        endShape();
      }
    }
  }

  noStroke();
  let visibleCount = 0;
  
  let closestDist = 15; // Hover threshold in pixels
  let hoveredStar = null;
  let hoveredPos = null;
  
  for (let star of stars) {
    // 1. Calculate Hour Angle (HA)
    // HA = LST - RA
    let ha = lst - star.ra; // in degrees
    
    // Normalize HA to -180 to 180
    while (ha < -180) ha += 360;
    while (ha > 180) ha -= 360;
    
    // 2. Convert Equatorial (HA, Dec) to Horizontal (Alt, Az)
    let pos = equatorialToHorizontal(ha, star.dec, observerLat);
    
    // 3. Project to Canvas (Stereographic from Zenith)
    // Only draw if above horizon (Alt > 0)
    if (pos.alt > 0) {
      let projected = projectStereographic(pos.az, pos.alt);
      
      // Calculate size based on magnitude
      // Mag range roughly -1.5 to 6.5
      let size = map(star.mag, 6, -1.5, 0.5, 4, true);
      
      // Color adjustment based on B-V
      let starColor = bvToColor(star.bv);
      starColor.setAlpha(200);
      fill(starColor);
      
      circle(projected.x, projected.y, size);
      visibleCount++;

      // Interaction Check
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
  
  // Debug Info
  fill(150);
  textAlign(LEFT, TOP);
  text(`Stars: ${visibleCount} / ${stars.length}`, 10, 10);
  text(`Date: ${date.toISOString()}`, 10, 30);
  text(`LST: ${lst.toFixed(2)}°`, 10, 50);
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
      stars.push({
        ra: ra,
        dec: dec,
        mag: mag,
        bv: bv,
        name: item.Name || item.HR // Use Name or Harvard Revised number
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
