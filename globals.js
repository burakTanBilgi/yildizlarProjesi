// --- Configuration & Global State ---
console.log("Globals.js loading...");

const PALETTE = {
  background: '#050505',
  starBase: [255, 255, 255],
  lineFaint: [255, 255, 255, 15],
  lineHover: [100, 255, 218, 200],
  textNormal: [255, 255, 255, 150],
  textHover: [255, 255, 255, 255]
};

var stars = [];
var constellations = [];

// Configuration
var observerLat = 41.0082; // Istanbul Latitude
var observerLon = 28.9784; // Istanbul Longitude
var date = new Date(); // Current date/time
var showConstellationLines = false; // Default OFF per request
var showConstellationLabels = false;
var showStarNames = false;
var hoveredConstellationId = null; // Track hovered constellation

// Poster / Overlay Configuration
var posterTitle = "STAR MAP";
var posterDesc = "Observed from Istanbul";
var posterStory = "";
var currentLayout = "glass-overlay"; // glass-overlay, side-split, bottom-bar
var showOverlayDate = false;
var showOverlayCoords = false;

// Visualization Scale
var scaleFactor = 400;
var centerX, centerY;
