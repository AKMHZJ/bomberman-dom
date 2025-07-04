const express = require("express");
const WebSocket = require("ws");
const { generateMap, MAP_SIZE } = require("./gameLogic");

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

wss.on("connection", (ws) => {
  // ws.id = `player-${playerCount}`;
  // console.log(`Player ${ws.id} connected, total: ${playerCount}`);

  ws.on("message", (message) => {
    console.log(
      `Server received from ${ws.id}:`,
      JSON.parse(message.toString())
    );
    const data = JSON.parse(message.toString());
    if (data.type === "join") {
      if (!ws.id) {
        ws.id = `player-${playerCount}`;
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
          }, 20000);
        }
        if (playerCount === 4) {
          clearTimeout(waitingTimer);
          startGameTimer();
        }
      }
    }
  });

  ws.on("close", () => {
    console.log(`Player ${ws.id} disconnected`);
    delete players[ws.id];
    playerCount--;
    broadcastPlayerCount();
  });
});

function getCornerX(index) {
  return index % 2 === 0 ? 0 : MAP_SIZE - 1;
}

function getCornerY(index) {
  return index < 2 ? 0 : MAP_SIZE - 1;
}

function broadcastPlayerCount() {
  console.log("Broadcasting player count:", playerCount);
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
