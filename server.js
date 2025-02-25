const axios = require('axios');
const url = `https://drawing-board-vtwi.onrender.com`;
const interval = 30000; // Interval in milliseconds (30 seconds)

function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval);

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
let timeLeft = 600; // 10 minutes in seconds
let users = {}; // Store user information, including brush and eraser sizes

// Broadcast the timer updates
function broadcastTime() {
    io.emit("timer", timeLeft); // Broadcast the timer to all clients
}

// Combined interval for timer and canvas clearing
setInterval(() => {
    timeLeft--;
    broadcastTime();  // Broadcast the updated time

    if (timeLeft <= 0) {
        timeLeft = 600;  // Reset to 5 minutes
        io.emit("clearCanvas");
        drawingData = [];
    }
}, 1000);

// Socket.io connection
io.on("connection", (socket) => {
    console.log("A user connected");

    // Emit existing drawing data and timer to new user
    socket.emit("loadDrawings", drawingData);
    socket.emit("timer", timeLeft);

    // Store user name, color, brush size, and eraser size
    socket.on("setName", (data) => {
        users[socket.id] = { 
            name: data.name, 
            color: data.color, 
            brushSize: 5, // Default brush size
            eraserSize: 30 // Default eraser size
        };
        console.log(`${data.name} connected with color ${data.color}`);
    });

    // Handle drawing and erasing
    socket.on("draw", (data) => {
        if (users[socket.id]) {
            const user = users[socket.id];
            if (data.erasing) {
                // Erase a larger area based on the user's eraser size
                drawingData = drawingData.filter(d => d.id !== socket.id);
                io.emit("draw", { 
                    ...data, 
                    id: socket.id, 
                    eraserSize: data.eraserSize // Use the eraser size from the client
                });
            } else {
                // Add the user's drawing to the data with their ID and brush size
                drawingData.push({ 
                    ...data, 
                    id: socket.id, 
                    brushSize: data.brushSize // Use the brush size from the client
                });
                io.emit("draw", { 
                    ...data, 
                    id: socket.id, 
                    brushSize: data.brushSize // Broadcast brush size to all clients
                });
            }
        }
    });

    // Handle cursor position updates
    socket.on("updatePosition", (data) => {
        if (users[socket.id]) {
            users[socket.id].x = data.x;
            users[socket.id].y = data.y;
            io.emit("updatePosition", { 
                id: socket.id, 
                name: users[socket.id].name, 
                color: users[socket.id].color, 
                x: data.x, 
                y: data.y 
            });
        }
    });

    // Handle brush size updates
    socket.on("updateBrushSize", (size) => {
        if (users[socket.id]) {
            users[socket.id].brushSize = size;
            // No need to broadcast the brush size update to all clients
        }
    });

    // Handle eraser size updates
    socket.on("updateEraserSize", (size) => {
        if (users[socket.id]) {
            users[socket.id].eraserSize = size;
            // No need to broadcast the eraser size update to all clients
        }
    });

    // Handle canvas clearing
    socket.on("clearCanvas", () => {
        drawingData = [];
        io.emit("clearCanvas");  // Broadcast canvas clear to all users
    });

    // Handle disconnections
    socket.on("disconnect", () => {
        io.emit("userDisconnected", socket.id);
        delete users[socket.id];
        console.log("A user disconnected");
    });
});

// Start the server
server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log("Server running on port " + (process.env.PORT || 3000));
});
