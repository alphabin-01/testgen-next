function handleError(ws) {
    return (error) => {
        console.error('WebSocket error:', error);
        
        try {
            ws.send(JSON.stringify({
                event: 'error',
                error: {
                    message: error.message || 'An unknown error occurred',
                    code: error.code || 500
                }
            }));
        } catch (sendError) {
            console.error('Error sending error message to client:', sendError);
        }
    };
}

module.exports = {
    handleError
};