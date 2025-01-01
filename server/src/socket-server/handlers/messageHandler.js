const WebSocket = require('ws');

function handleMessage(ws) {
    return async (message) => {
        let parsedMessage;

        try {
            parsedMessage = JSON.parse(message);
            if (!parsedMessage || !parsedMessage.event) {
                throw new Error('Invalid message format');
            }

            // Handle different event types
            switch (parsedMessage.event) {
                case 'test:start':
                    await require('../services/socketService').handleTestStart(parsedMessage.data);
                    break;
                case 'test:stop':
                    await require('../services/socketService').handleTestStop(parsedMessage.data);
                    break;
                case 'test:record':
                    await require('../services/recorderService').handleRecording(parsedMessage.data);
                    break;
                default:
                    // Broadcast message to all other clients
                    ws.getWss().clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(parsedMessage));
                        }
                    });
            }
        } catch (err) {
            ws.send(JSON.stringify({ 
                event: 'error',
                error: 'Invalid message format' 
            }));
        }
    };
}

module.exports = {
    handleMessage
};