const cors = require("cors");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "https://ttoppl.com",  // Allow the frontend domain
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    }
});

app.use(cors({
    origin: "https://ttoppl.com",  // This allows the entire domain
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

// Your server logic
app.use(express.static("public"));
let drawingData = [];
let timeLeft = 300; // 5 minutes in seconds

function broadcastTime() {
    io.emit("timer", timeLeft); // Broadcast the timer to all clients
}

setInterval(() => {
    timeLeft--;
    broadcastTime();  // Broadcast the updated time

    if (timeLeft <= 0) {
        timeLeft = 300;  // Reset to 5 minutes
    }
}, 1000);

// Socket.io connection
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.emit("loadDrawings", drawingData);
    socket.emit("timer", timeLeft);

    socket.on("draw", (data) => {
        drawingData.push(data);
        socket.broadcast.emit("draw", data); // Broadcast drawing to other users
    });

    socket.on("clearCanvas", () => {
        drawingData = [];
        io.emit("clearCanvas");  // Broadcast canvas clear to all users
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Clear the canvas every 5 minutes
setInterval(() => {
    io.emit("clearCanvas");
    drawingData = [];
}, 300000);  // Clear every 5 minutes

// Start the server
server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log("Server running on port " + (process.env.PORT || 3000));
});
