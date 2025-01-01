const WebSocket = require('ws');
const { handleConnection } = require('./controllers/testController');

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    // Handle new connections
    wss.on('connection', handleConnection);

    // Add wss reference to each socket
    wss.on('connection', (ws) => {
        ws.getWss = () => wss;
    });

    // Handle server errors
    wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
    });

    return wss;
}

module.exports = setupWebSocketServer;