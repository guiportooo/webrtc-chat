const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();

const port = process.env.PORT || 9000;

// Initialize a http server
const server = http.createServer(app);

// Initialize the Websocket server instance
const wss = new WebSocket.Server({server});

wss.on("connection", ws => {
  ws.on("message", msg => {
    console.log(`Received message: ${msg} from client`);
  });
  // Send immediate feedback to the incoming connection
  ws.send(JSON.stringify({
    type: "connect",
    message: "Well hello there, I am a WebSocket server"
  }));
});

// Start our server
server.listen(port, () => {
  console.log(`Signnaling Server running on port: ${port}`);
});