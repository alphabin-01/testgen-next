const WebSocket = require('ws');

let ws = null; // Global variable to store the WebSocket instance

// Setter function to store WebSocket instance
function setWebSocket(webSocket) {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        ws = webSocket;
    }
}

// Getter function to retrieve WebSocket instance
function getWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return ws;
    }
}

module.exports = {
    setWebSocket,
    getWebSocket
};
