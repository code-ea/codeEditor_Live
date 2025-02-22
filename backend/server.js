import { WebSocketServer } from "ws";
import http from "http";
//const wss = new WebSocketServer({ port: 5000 });
import express from "express";
const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const rooms = new Map();

wss.on("connection", (ws) => {
  console.log("User Connected");

  let currentRoom = null;
  let currentUser = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "join":
        if (currentRoom) {
          rooms.get(currentRoom).delete(currentUser);
          broadcast(currentRoom, {
            type: "userJoined",
            users: Array.from(rooms.get(currentRoom)),
          });
        }

        currentRoom = data.roomId;
        currentUser = data.userName;

        if (!rooms.has(data.roomId)) {
          rooms.set(data.roomId, new Set());
        }

        rooms.get(data.roomId).add(data.userName);
        broadcast(data.roomId, {
          type: "userJoined",
          users: Array.from(rooms.get(data.roomId)),
        });
        break;

      case "codeChange":
        broadcast(data.roomId, {
          type: "codeUpdate",
          code: data.code,
        }, ws);
        break;

      case "typing":
        broadcast(data.roomId, {
          type: "userTyping",
          user: data.userName,
        }, ws);
        break;

      case "languageChange":
        broadcast(data.roomId, {
          type: "languageUpdate",
          language: data.language,
        });
        break;

      case "outputChange":
        broadcast(data.roomId, {
            type: "outputUpdate",
            output: data.output,
        });
        break;

      case "inputChange":
        broadcast(data.roomId, {
            type: "inputUpdate",
            input: data.input,
        });
        break;

      case "leaveRoom":
        if (currentRoom && currentUser) {
          rooms.get(currentRoom).delete(currentUser);
          broadcast(currentRoom, {
            type: "userJoined",
            users: Array.from(rooms.get(currentRoom)),
          });
        }
        break;
    }
  });

  ws.on("close", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      broadcast(currentRoom, {
        type: "userJoined",
        users: Array.from(rooms.get(currentRoom)),
      });
    }
    console.log("User Disconnected");
  });
});

const broadcast = (roomId, message, excludeWs = null) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client !== excludeWs) {
      client.send(JSON.stringify(message));
    }
  });
};

server.listen(5000, () => {
    console.log("Server is running on http://localhost:5000");
  });