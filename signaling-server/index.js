const express = require("express");
const WebSocket = require("ws");
const { uuid } = require("uuidv4");
const http = require("http");

const app = express();

const port = process.env.PORT || 9000;

// Initialize a http server
const server = http.createServer(app);

// Initialize the Websocket server instance
const wss = new WebSocket.Server({ server });

let users = {};
let rooms = {};

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
};

const sendToRoom = (clients, room, message) => {
  Object.values(clients).forEach((client) => {
    if (client.room === room) {
      client.send(JSON.stringify(message));
    }
  });
};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    // Acception only JSON messages
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }

    const { type, room, offer, answer, candidate } = data;
    // Handle message by type
    switch (type) {
      case "enter":
        const usersInTheRoom = Object.values(users).filter(
          (u) => u.room === room
        ).length;

        if (usersInTheRoom >= 2) {
          sendTo(ws, {
            type: "error",
            message: `Room ${room} is full!`,
          });
          break;
        }

        // Create room if it does not exist
        if (usersInTheRoom === 0) {
          rooms[room] = room;
        }

        const id = uuid();
        ws.id = id;
        ws.room = room;
        users[id] = ws;

        sendTo(ws, {
          type: "enter",
          success: true,
          room,
        });

        sendToRoom(users, room, {
          type: "updateRoom",
          count: Object.keys(users).length,
        });
        break;
      case "offer":
        //Check if room to send offer exists
        if (!!rooms[room]) {
          sendToRoom(users, room, {
            type: "offer",
            offer,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Room ${room} does not exist!`,
          });
        }
        break;
      case "answer":
        //Check if room to send answer exists
        if (!!rooms[room]) {
          sendToRoom(users, room, {
            type: "answer",
            answer,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Room ${room} does not exist!`,
          });
        }
        break;
      case "candidate":
        //Check if room to send candidate exists
        if (!!rooms[room]) {
          sendToRoom(users, room, {
            type: "candidate",
            candidate,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Room ${room} does not exist!`,
          });
        }
        break;
      case "leave":
        delete users[ws.id];

        sendToRoom(users, room, {
          type: "updateRoom",
          count: Object.keys(users).length,
        });
        break;
      default:
        sendTo(ws, {
          type: "error",
          message: `Command not found: ${type}`,
        });
    }
  });
  ws.on("close", () => {
    delete users[ws.id];
  });
  // Send immediate feedback to the incoming connection
  ws.send(
    JSON.stringify({
      type: "connect",
      message: "Well hello there, I am a WebSocket server",
    })
  );
});

// Start our server
server.listen(port, () => {
  console.log(`Signnaling Server running on port: ${port}`);
});
