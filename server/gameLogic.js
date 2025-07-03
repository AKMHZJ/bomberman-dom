const MAP_SIZE = 15;

function generateMap() {
  const map = Array(MAP_SIZE)
    .fill()
    .map(() => Array(MAP_SIZE))
    .fill("empty");

  // indestructible walls
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (x % 2 === 1 && y % 2 === 1) {
        map[y][x] = "wall";
      }
    }
  }

  // destructible blocks
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x] !== "wall" && Math.random() < 0.4) {
        if (!isNearCorner(x, y)) {
          map[y][x] = "block";
        }
      }
    }
  }

  // clear starting point
  const corners = [
    [0, 0],
    [0, MAP_SIZE - 1],
    [MAP_SIZE - 1, 0],
    [MAP_SIZE - 1, MAP_SIZE - 1],
  ];
  corners.forEach(([x, y]) =>{
    map[y][x] = 'empty';
    if (x + 1 < MAP_SIZE) map[y][x + 1] = 'empty';
    if (x - 1 >= 0) map[y][x - 1] = 'empty';
    if (y + 1 < MAP_SIZE) map[y + 1][x] = 'empty';
    if (y - 1 >= 0) map[y - 1][x] = 'empty';
  });
  return map
}

function isNearCorner(x, y) {
  return (x <= 1 && y <= 1) ||
         (x <= 1 && y >= MAP_SIZE - 2) ||
         (x >= MAP_SIZE - 2 && y <= 1) ||
         (x >= MAP_SIZE - 2 && y >= MAP_SIZE - 2);
}

module.exports = { generateMap, MAP_SIZE };