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

    const { type, name, offer, answer, candidate } = data;
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
      case "offer":
        //Check if user to send offer exists
        const offerRecipient = users[name];
        if (!!offerRecipient) {
          sendTo(offerRecipient, {
            type: "offer",
            offer,
            name: ws.name,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `User ${name} does not exist!`,
          });
        }
        break;
      case "answer":
        //Check if user to send answer exists
        const answerRecipient = users[name];
        if (!!answerRecipient) {
          sendTo(answerRecipient, {
            type: "answer",
            answer,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `User ${name} does not exist!`,
          });
        }
        break;
      case "candidate":
        //Check if user to send candidate exists
        const candidateRecipient = users[name];
        if (!!candidateRecipient) {
          sendTo(candidateRecipient, {
            type: "candidate",
            candidate,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `User ${name} does not exist!`,
          });
        }
        break;
      case "logout":
        sendToAll(users, "logout", ws);
        break;
      default:
        sendTo(ws, {
          type: "error",
          message: `Command not found: ${type}`,
        });
    }
  });
  ws.on("close", () => {
    delete users[ws.name];
    sendToAll(users, "logout", ws);
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
