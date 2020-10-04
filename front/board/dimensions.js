  //boardHeight = document.getElementById("backgammon-canvas").width;
  //boardWidth = document.getElementById("backgammon-canvas").height;
export const boardHeight = 0.95 * window.innerHeight;
export const boardWidth = 0.75 * window.innerWidth;
export const barWidth = 0.08 * boardWidth;
export const homeWidth = 0.08 * boardWidth;
export const pipHeight = 0.4 * boardHeight;
export const pipHalfWidth = (boardWidth - barWidth - homeWidth) / 24;
export const tokenRadius = 0.6 * pipHalfWidth;
export const tokenThickness = 0.4 * tokenRadius;
export const dieWidth = 1.0 * pipHalfWidth;
export const dieSpotRadius = 0.08 * dieWidth;
export const dieSpotAreaOffset = 0.25 * dieWidth;
export const dieSpotAreaSpacing = dieWidth / 2 - dieSpotAreaOffset;

// Locations of all die spots relative to die corner if "i" is rolled

function getRelativeDieSpotCenter(i) {
  // Location of ith possible spot relative to die corner
  const r = Math.floor(i/3);
  const c = i%3;
  return [r,c].map( i => dieSpotAreaOffset + i * dieSpotAreaSpacing );
}

export const dieSpotCenters = [
  [], [4], [2,6], [2,4,6], [0,2,6,8], [0,2,4,6,8], [0,2,3,5,6,8]
].map( spotNumbers => spotNumbers.map(getRelativeDieSpotCenter) );

export const tokenColors = { white: "#ff0000", black: "#000000", selected: "#0000ff" };
export const pipColors = { 0: "#ffffff", 1: "#d2a679" };
export const barColor = "#88ff88";
export const homeColor = "#88ff88"; 
export const boardColor = "#39ac39";
