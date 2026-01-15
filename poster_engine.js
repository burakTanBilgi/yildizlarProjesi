// --- Poster & Layout Engine ---

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
     text(str, x, y);
   }
   
   // Reset Font
   textFont('Inter');
}
