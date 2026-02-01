// --- Data Parsing & Loading ---

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

function parseConstellations(data) {
  if (data.features) {
    constellations = data.features;
    for (let c of constellations) {
      if (c.geometry && c.geometry.coordinates) {
        // Ensure ID is clean
        if (!c.id) c.id = "Unknown";
        
        // Initialize Metadata
        c.meta = {
          description: "",
          origin: "",
          mythology: "" 
        };

        // Merge Mythology Data if available
        if (typeof constellationMythology !== 'undefined' && constellationMythology[c.id]) {
           let myth = constellationMythology[c.id];
           c.meta.title = myth.title;
           c.meta.mythology = myth.story;
        }
      }
    }
  }
}

function parseBounds(data) {
  if (data.features) {
    boundaries = data.features; // GeoJSON MultiLineString or Polygon features
  }
}

function loadError(err) {
  console.error("Data Load Error:", err);
  stars = null; // Flag error
}
