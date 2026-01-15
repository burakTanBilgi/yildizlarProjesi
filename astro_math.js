// --- Astronomy Math & Projections ---

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
