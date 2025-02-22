const url = `https://drawing-board-vtwi.onrender.com`; // Replace with your Render URL
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
                    eraserSize: user.eraserSize // Include eraser size in the broadcast
                });
            } else {
                // Add the user's drawing to the data with their ID and brush size
                drawingData.push({ 
                    ...data, 
                    id: socket.id, 
                    brushSize: user.brushSize // Include brush size in the drawing data
                });
                io.emit("draw", { 
                    ...data, 
                    id: socket.id, 
                    brushSize: user.brushSize // Broadcast brush size to all clients
                });
            }
        }
    });

    // Handle cursor position updates (no brush/eraser size here)
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
            io.emit("updateBrushSize", { id: socket.id, brushSize: size }); // Broadcast to all clients
        }
    });

    // Handle eraser size updates
    socket.on("updateEraserSize", (size) => {
        if (users[socket.id]) {
            users[socket.id].eraserSize = size;
            io.emit("updateEraserSize", { id: socket.id, eraserSize: size }); // Broadcast to all clients
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

// Clear the canvas every 5 minutes
setInterval(() => {
    io.emit("clearCanvas");
    drawingData = [];
}, 300000);  // Clear every 5 minutes

// Start the server
server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log("Server running on port " + (process.env.PORT || 3000));
});
