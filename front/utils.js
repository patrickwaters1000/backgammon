export function range (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
}

export function deepCopy(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}
