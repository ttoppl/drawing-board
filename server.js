const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Enable CORS for all origins
app.use(cors({
    origin: "https://ttoppl.com",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
}));

app.use(express.static("public"));

// Store drawing data
let drawingData = [];
let timeLeft = 300; // 5 minutes in seconds

// Broadcast the remaining time to all clients
function broadcastTime() {
    io.emit("timer", timeLeft);
}

// Start the timer on the server
setInterval(() => {
    timeLeft--;
    broadcastTime();

    if (timeLeft <= 0) {
        timeLeft = 300; // Reset to 5 minutes
    }
}, 1000);

io.on("connection", (socket) => {
    console.log("A user connected");

    // Send existing drawing data to the new user
    socket.emit("loadDrawings", drawingData);
    socket.emit("timer", timeLeft); // Send the initial timer value when the user connects

    // When a user draws, store the data and broadcast it
    socket.on("draw", (data) => {
        drawingData.push(data);
        socket.broadcast.emit("draw", data);
    });

    // When the canvas is cleared, clear the stored data too
    socket.on("clearCanvas", () => {
        drawingData = [];
        io.emit("clearCanvas"); // Broadcast to clear all canvases
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Clear the board every 5 minutes
setInterval(() => {
    io.emit("clearCanvas");
    drawingData = [];
}, 300000); // 300,000 ms = 5 minutes

server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
});

