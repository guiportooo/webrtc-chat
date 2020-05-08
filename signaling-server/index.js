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

let rooms = {};

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
};

const sendToRoom = (room, message) => {
  const users = rooms[room].users;
  Object.values(users).forEach((user) => {
    user.send(JSON.stringify(message));
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

    const {
      type,
      info: { room, userType },
      offer,
      answer,
      candidate,
    } = data;

    let users = {};

    // Handle message by type
    switch (type) {
      case "enter":
        // Create room if it does not exist
        if (!rooms[room]) {
          rooms[room] = {
            users,
          };
        }

        users = rooms[room].users;

        if (users[userType]) {
          sendTo(ws, {
            type: "enter",
            success: false,
            message: `Room ${room} is full!`,
          });
          break;
        }

        const id = uuid();
        ws.id = id;
        ws.room = room;
        ws.userType = userType;
        users[userType] = ws;

        sendTo(ws, {
          type: "enter",
          success: true,
          room,
        });

        sendToRoom(room, {
          type: "updateRoom",
          count: Object.keys(users).length,
        });
        break;
      case "offer":
        //Check if room to send offer exists
        if (!!rooms[room]) {
          sendToRoom(room, {
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
          sendToRoom(room, {
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
          sendToRoom(room, {
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
        users = rooms[room].users;
        delete users[ws.userType];

        sendToRoom(room, {
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
    user = Object.values(rooms)
      .map(({ users }) => users)
      .find((user) => user.id === ws.id);

    if (user) {
      let users = rooms[user.room].users;
      delete users[ws.userType];
    }
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
