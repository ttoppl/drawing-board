const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Enable CORS for specific origin (your frontend URL)
app.use(cors({
    origin: "https://ttoppl.com",  // Frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
}));

app.use(express.static("public"));

// Timer and drawing data
let timeLeft = 300;  // 5 minutes in seconds
let drawingData = [];

function broadcastTime() {
    io.emit("timer", timeLeft); // Broadcast the timer to all clients
}

// Timer interval, reducing time every second
setInterval(() => {
    timeLeft--;
    broadcastTime(); // Broadcast the updated time

    if (timeLeft <= 0) {
        timeLeft = 300;  // Reset to 5 minutes
    }
}, 1000);

// WebSocket connection
io.on("connection", (socket) => {
    console.log("A user connected");

    // Send existing drawing data and timer value to the new user
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
