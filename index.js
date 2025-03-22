const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serve static files (HTML, JS, etc.)

// Store active sessions
const sessions = {};

io.on("connection", (socket) => {
    let sessionId;

    socket.on("join-session", (id) => {
        sessionId = id;
        if (!sessions[sessionId]) sessions[sessionId] = [];
        sessions[sessionId].push(socket);

        if (sessions[sessionId].length === 2) {
            // Notify both users they are ready
            sessions[sessionId].forEach(s => s.emit("ready"));
        }
    });

    socket.on("offer", (offer) => {
        if (sessions[sessionId]?.length === 2) {
            sessions[sessionId][1].emit("offer", offer);
        }
    });

    socket.on("answer", (answer) => {
        if (sessions[sessionId]?.length === 2) {
            sessions[sessionId][0].emit("answer", answer);
        }
    });

    socket.on("candidate", (candidate) => {
        sessions[sessionId]?.forEach(s => s.emit("candidate", candidate));
    });

    socket.on("disconnect", () => {
        if (sessions[sessionId]) {
            sessions[sessionId] = sessions[sessionId].filter(s => s !== socket);
            if (sessions[sessionId].length === 0) delete sessions[sessionId];
        }
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
