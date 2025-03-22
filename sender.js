const socket = io("https://file-transfer-mfru.onrender.com/", { transports: ["websocket"] });

const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { 
            urls: "turn:relay1.expressturn.com:3478", 
            username: "expressturn", 
            credential: "somepassword"
        },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ]
});

let dataChannel;
let pendingCandidates = [];

function createDataChannel() {
    dataChannel = peerConnection.createDataChannel("fileTransfer");

    dataChannel.onopen = () => {
        console.log("✅ Data channel is open!");
        document.getElementById("status").innerText = "Connected! Ready to send file.";
    };

    dataChannel.onclose = () => {
        console.log("⚠ Data channel closed.");
        document.getElementById("status").innerText = "Connection lost.";
    };
}

async function startConnection() {
    createDataChannel();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
}

// 🔹 Handle answer from receiver with delay
socket.on("answer", async (data) => {
    console.log("✅ Answer received. Waiting before setting remote description...");

    setTimeout(async () => {
        if (peerConnection.signalingState !== "have-local-offer") {
            console.warn("⚠ Connection still unstable, ignoring answer.");
            return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));

        // Apply any pending ICE candidates
        while (pendingCandidates.length > 0) {
            let candidate = pendingCandidates.shift();
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }, 500); // Small delay before setting the answer
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

async function sendFile() {
    if (!dataChannel || dataChannel.readyState !== "open") {
        alert("⚠ Data channel is not ready yet! Please wait.");
        return;
    }

    const file = document.getElementById("fileInput").files[0];
    if (!file) {
        alert("Select a file first!");
        return;
    }

    document.getElementById("status").innerText = "Sending...";
    console.log(`📤 Sending file: ${file.name} (${file.size} bytes)`);

    dataChannel.send(JSON.stringify({ type: "file-info", size: file.size }));

    const chunkSize = 256 * 1024; // 256 KB
    let offset = 0;

    function sendChunk() {
        if (offset >= file.size) {
            dataChannel.send("EOF");
            console.log("✅ File transfer complete!");
            document.getElementById("status").innerText = "File Sent!";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (dataChannel.readyState === "open") {
                if (dataChannel.bufferedAmount > 0) {
                    console.log("⏳ Buffer is full, waiting...");
                    setTimeout(sendChunk, 100);
                    return;
                }

                dataChannel.send(reader.result);
                offset += chunkSize;

                const progress = ((offset / file.size) * 100).toFixed(2);
                console.log(`📊 Sending progress: ${progress}%`);
                document.getElementById("status").innerText = `Sending: ${progress}%`;

                sendChunk();
            } else {
                console.log("⚠ Data channel closed unexpectedly.");
            }
        };

        reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
    }

    sendChunk();
}

startConnection();
