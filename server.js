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

let drawingData = [];
let timeLeft = 300; // 5 minutes in seconds
let users = {};

// Broadcast the timer updates
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

    // Emit existing drawing data and timer to new user
    socket.emit("loadDrawings", drawingData);
    socket.emit("timer", timeLeft);

    // Store user name and color
    socket.on("setName", (data) => {
        users[socket.id] = { name: data.name, color: data.color };
    });

    // Handle drawing and erasing
    socket.on("draw", (data) => {
        if (data.erasing) {
            // Remove only the user's own drawing
            drawingData = drawingData.filter(d => d.name !== users[socket.id].name);
        } else {
            // Add the user's drawing to the data
            drawingData.push(data);
        }
        io.emit("draw", { ...data, id: socket.id }); // Broadcast drawing or erasing to all
    });

    // Handle cursor position updates
    socket.on("updatePosition", (data) => {
        if (users[socket.id]) {
            users[socket.id].x = data.x;
            users[socket.id].y = data.y;
            io.emit("updatePosition", { ...users[socket.id], id: socket.id });
        }
    });

    // Handle canvas clearing
    socket.on("clearCanvas", () => {
        drawingData = [];
        io.emit("clearCanvas");  // Broadcast canvas clear to all users
    });

    // Handle disconnections
    socket.on("disconnect", () => {
        delete users[socket.id];
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
