
const socket = io("https://file-transfer-mfru.onrender.com/", { transports: ["websocket"] });

const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { 
            urls: "turn:relay1.expressturn.com:3478", 
            username: "expressturn", 
            credential: "somepassword"
        }
    ]
});

let dataChannel;
let receivedChunks = [];
let receivedSize = 0;
let totalFileSize = 0;
let pendingCandidates = [];

peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;

    dataChannel.onopen = () => {
        console.log("✅ Data channel is open on Receiver!");
        document.getElementById("status").innerText = "Receiving file...";
    };

    dataChannel.onmessage = (event) => {
        if (typeof event.data === "string" && event.data === "EOF") {
            const blob = new Blob(receivedChunks);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "received_file";
            link.click();
            console.log("✅ File received and saved!");
            document.getElementById("status").innerText = "File received!";
            return;
        }

        if (typeof event.data === "string") {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "file-info") {
                    totalFileSize = message.size;
                    console.log(`ℹ Receiving file of size: ${totalFileSize} bytes`);
                }
            } catch (e) {
                console.error("Error parsing message:", e);
            }
            return;
        }

        receivedChunks.push(event.data);
        receivedSize += event.data.byteLength;

        // 🔹 Show progress
        const progress = ((receivedSize / totalFileSize) * 100).toFixed(2);
        document.getElementById("progressBar").value = progress;
        console.log(`📥 Receiving progress: ${progress}%`);
    };
};

// 🔹 Handle offer from sender
socket.on("offer", async (data) => {
    if (peerConnection.signalingState !== "stable") {
        console.warn("⚠ Connection is unstable. Waiting...");
        setTimeout(() => socket.emit("offer", data), 500);  // 🔹 Wait and retry
        return;
    }

    console.log("✅ Offer received. Setting remote description...");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));

    // Apply any pending ICE candidates
    while (pendingCandidates.length > 0) {
        let candidate = pendingCandidates.shift();
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

// 🔹 Handle ICE candidates
socket.on("candidate", async (candidate) => {
    if (!peerConnection.remoteDescription) {
        console.warn("⚠ ICE candidate received before remote description was set. Storing.");
        pendingCandidates.push(candidate);
        return;
    }
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit("candidate", event.candidate);
    }
};
