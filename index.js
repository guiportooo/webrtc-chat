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

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
};

const sendToAll = (clients, type, { id, name: userName }) => {
  Object.values(clients).forEach((client) => {
    if (client.name !== userName) {
      client.send(
        JSON.stringify({
          type,
          user: { id, userName },
        })
      );
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

    const { type, name } = data;
    // Handle message by type
    switch (type) {
      // When a user tries to login
      case "login":
        // Check if username is available
        if (users[name]) {
          sendTo(ws, {
            type: "login",
            success: false,
            message: "Username is unavailable",
          });
        } else {
          const id = uuid();
          const loggedIn = Object.values(
            users
          ).map(({ id, name: userName }) => ({ id, userName }));
          users[name] = ws;
          ws.name = name;
          ws.id = id;
          sendTo(ws, {
            type: "login",
            success: true,
            users: loggedIn,
          });
          sendToAll(users, "updateUsers", ws);
        }
        break;
      default:
        sendTo(ws, {
          type: "error",
          message: `Command not found: ${type}`,
        });
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
