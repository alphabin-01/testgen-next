const WebSocket = require('ws');
const { handleConnection } = require('../socket-server/controllers/testController');
const { setWebSocket } = require('../utils/socket');
const logger = require('../utils/logger');

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        logger.info('Client connected to WebSocket server');
        setWebSocket(ws);

        handleConnection(ws);

        ws.on('message', (message) => {
            let parsedMessage;

            try {
                parsedMessage = JSON.parse(message);
                if (!parsedMessage || !parsedMessage.event) {
                    throw new Error('Invalid message format');
                }
            } catch (err) {
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
                return;
            }

            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedMessage));
                }
            });
        });

        ws.on('close', (code, reason) => {
            logger.info(`Client disconnected ${reason}`);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
        });
    });

    return wss;
}

module.exports = setupWebSocketServer;
