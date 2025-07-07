const express = require("express");
const WebSocket = require("ws");
const { generateMap, MAP_SIZE, isValidMove } = require("./gameLogic");

const app = express();
const server = app.listen(3000, () =>
  console.log("Server running on port 3000")
);
const wss = new WebSocket.Server({ server });

app.use(express.static("client"));

const players = {};
let playerCount = 0;
let waitingTimer = null;
const map = generateMap();
let ID = 0;
const bombs = [];

wss.on("connection", (ws) => {
  // ws.id = `player-${playerCount}`;
  // console.log(`Player ${ws.id} connected, total: ${playerCount}`);

  ws.on("message", (message) => {
    console.log(`Server received from`, JSON.parse(message.toString()));
    const data = JSON.parse(message.toString());
    console.log(`Server received hello from ${ws.id}:`, data);
    if (data.type === "join") {
      if (!ws.id) {
        ws.id = `player-${ID}`;
        ID++;
        playerCount++;
        broadcastPlayerCount();
      }

      if (playerCount <= 4) {
        players[ws.id] = {
          id: ws.id,
          nickname: data.nickname,
          lives: 3,
          x: getCornerX(playerCount - 1),
          y: getCornerY(playerCount - 1),
          bombs: 1,
          flame: 1,
          speed: 1,
        };
        if (playerCount === 2 && !waitingTimer) {
          waitingTimer = setTimeout(() => {
            if (playerCount >= 2) {
              startGameTimer();
            }
          }, 2000);
        }
        if (playerCount === 4) {
          clearTimeout(waitingTimer);
          startGameTimer();
        }
      }
    } else if (data.type === "move") {
      const player = players[ws.id];
      if (player) {
        let newX = player.x,
          newY = player.y;
        if (data.direction === "up") newY--;
        if (data.direction === "down") newY++;
        if (data.direction === "left") newX--;
        if (data.direction === "right") newX++;
        if (isValidMove(newX, newY, map)) {
          player.x = newX;
          player.y = newY;
          console.log(`Player ${ws.id} moved to ${newX}, ${newY}`);
          broadcastState();
        } else {
          console.log(`Invalid move for ${ws.id} to ${newX}, ${newY}`);
        }
      }
    } else if (data.type === "bomb" && players[ws.id]) {
      const player = players[ws.id];
      if (bombs.filter((b) => b.owner === ws.id).length < player.bombs) {
        bombs.push({
          x: player.x,
          y: player.y,
          owner: ws.id,
          time: Date.now(),
        });
        broadcastState();
      }
    }
  });

  setInterval(() => {
  const now = Date.now();
  bombs.forEach((bomb, index) => {
    if (now - bomb.time > 3000) { // 3-second fuse
      explode(bomb, index);
    }
  });
}, 1000 / 60);

  ws.on("close", () => {
    console.log(`Player ${ws.id} disconnected`);
    delete players[ws.id];
    playerCount--;
    broadcastPlayerCount();
  });
});

function broadcastState() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "state", players, map }));
    }
  });
}

function explode(bomb, index){
  const player = players[bomb.owner]
  const range = player ? player.flame : 1;
  const explosion = [{x: bomb.x, y: bomb.y}];
  for (let i = 0; i <= range; i++){
    if (isValidMove(bomb.x + i, bomb.y, map)) explosion.push({ x: bomb.x + i, y: bomb.y });
    if (isValidMove(bomb.x - i, bomb.y, map)) explosion.push({ x: bomb.x - i, y: bomb.y });
    if (isValidMove(bomb.x, bomb.y + i, map)) explosion.push({ x: bomb.x, y: bomb.y + i });
    if (isValidMove(bomb.x, bomb.y - i, map)) explosion.push({ x: bomb.x, y: bomb.y - i });
  }
  explosion.forEach(({x, y}) => {
    if (map[y][x] === 'block'){
      map[y][x] = 'empty';
      if (Math.random() < 0.3) map[y][x] = getRandomPowerUp(); 
    }
    for (let id in players) {
      if (players[id].x === x && players[id].y === y) {
        players[id].lives--;
        if (players[id].lives <= 0) delete players[id];
      }
    }
  })
  bombs.splice(index, 1);
  broadcastState();
}


function getRandomPowerUp(){
  const powerUps = ['bomb', 'flame', 'speed'];
  return powerUps[Math.floor(Math.random() * powerUps.length)];
}


function getCornerX(index) {
  return index % 2 === 0 ? 0 : MAP_SIZE - 1;
}

function getCornerY(index) {
  return index < 2 ? 0 : MAP_SIZE - 1;
}

function broadcastPlayerCount() {
  console.log("Broadcasting player count:", playerCount);
  // console.log("Broadcasting player id:", ws.id);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "playerCount", count: playerCount }));
    }
  });
}

function startGameTimer() {
  let timeLeft = 10;
  const timer = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "timer", time: timeLeft }));
      }
    });
    timeLeft--;
    if (timeLeft < 0) {
      clearInterval(timer);
      startGame();
    }
  }, 1000);
}

function startGame() {
  console.log("Game starting, sending start message");
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "start", map, players }));
    }
  });
}
