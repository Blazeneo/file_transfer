const socket = io("https://file-transfer-mfru.onrender.com/", { transports: ["websocket"] });

// Get session ID from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get("session");

if (sessionId) {
    socket.emit("join-session", sessionId);
} else {
    alert("Invalid session link!");
}

// WebRTC logic follows...
