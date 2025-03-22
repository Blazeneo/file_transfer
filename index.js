const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/home.html');

})
app.get('/res',(req,res)=>{
    res.sendFile(__dirname+'/reciver.html');

})
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("offer", (data) => {
        socket.broadcast.emit("offer", data);
    });

    socket.on("answer", (data) => {
        socket.broadcast.emit("answer", data);
    });

    socket.on("candidate", (data) => {
        socket.broadcast.emit("candidate", data);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
