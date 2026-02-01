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
var boundaries = []; // IAU Constellation Boundaries

// Configuration
var observerLat = 41.0082; // Istanbul Latitude
var observerLon = 28.9784; // Istanbul Longitude
var date = new Date(); // Current date/time
var showConstellationLines = false; // Default OFF per request
var showConstellationLabels = false;
var showConstellationBoundaries = false;
var showStarNames = false;
var showCelestialGrid = false;
var activeGridType = 'horizontal'; // horizontal, equatorial, ecliptic, galactic
var storyModeEnabled = true;
var hoveredConstellationId = null; // Track hovered constellation
var selectedConstellationId = null; // Track clicked/selected constellation
var highlightSelectedConstellation = true; // Toggle for visual highlight

// Color Customization
var customConstellationColor = '#ffffff'; // Default White
var customGridColor = '#ffffff';          // Default White (opacity applied in draw)
var starColorShift = 0;                   // -100 to 100 (Blue <-> Red shift)

// Poster / Overlay Configuration
var posterTitle = "STAR MAP";
var posterDesc = "b.t.b.";
var posterStory = "";
var currentLayout = "glass-overlay"; // glass-overlay, side-split, bottom-bar
var showOverlayDate = false;
var showOverlayCoords = false;

// Visualization Scale
var scaleFactor = 400;
var centerX, centerY;
