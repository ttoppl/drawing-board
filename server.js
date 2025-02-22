// Function to update brush size
function updateBrushSize() {
    brushSize = document.getElementById("brushSize").value;
    socket.emit("updateBrushSize", brushSize); // Send brush size update to server
}

// Function to update eraser size
function updateEraserSize() {
    eraserSize = document.getElementById("eraserSize").value;
    socket.emit("updateEraserSize", eraserSize); // Send eraser size update to server
}

// Listen for brush size updates from the server
socket.on("updateBrushSize", (data) => {
    if (data.id === socket.id) return; // Ignore local updates
    const cursorDiv = cursors[data.id];
    if (cursorDiv) {
        cursorDiv.querySelector("img").style.width = `${data.brushSize}px`;
        cursorDiv.querySelector("img").style.height = `${data.brushSize}px`;
    }
});

// Listen for eraser size updates from the server
socket.on("updateEraserSize", (data) => {
    if (data.id === socket.id) return; // Ignore local updates
    const cursorDiv = cursors[data.id];
    if (cursorDiv) {
        cursorDiv.querySelector("img").style.width = `${data.eraserSize}px`;
        cursorDiv.querySelector("img").style.height = `${data.eraserSize}px`;
    }
});

// Handle drawing and erasing with brush and eraser sizes
socket.on("draw", (data) => {
    if (data.erasing) {
        // Erase a larger area based on the eraser size
        ctx.clearRect(data.x - data.eraserSize / 2, data.y - data.eraserSize / 2, data.eraserSize, data.eraserSize);
    } else {
        // Draw with the brush size
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.brushSize;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(data.x1, data.y1);
        ctx.lineTo(data.x2, data.y2);
        ctx.stroke();
    }
});
