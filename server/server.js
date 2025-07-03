const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = app.listen(3000, () => console.log('Server running on http://localhost:3000'));
const wss = new WebSocket.Server({server});

app.use(express.static('client'));

let clientId = 0;
wss.on('connection', (ws) => {
    ws.id = clientId++;
    console.log(`Player ${ws.id} connected`);
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Received:', data);
        // TODO Handle messages
    });
    ws.on('close', () => {
        console.log(`Player ${ws.id} disconnected`);
    })
})

function startGame() {
  console.log('Game starting, sending start message');
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'start', map, players }));
    }
  });
}