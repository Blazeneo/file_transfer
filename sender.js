const socket = io("https://file-transfer-mfru.onrender.com/", { transports: ["websocket"] });

// Generate unique session ID
const sessionId = Math.random().toString(36).substr(2, 9);
document.getElementById("shareLink").innerText = window.location.origin + "/?session=" + sessionId;

// Join session
socket.emit("join-session", sessionId);

// Continue with WebRTC logic...
