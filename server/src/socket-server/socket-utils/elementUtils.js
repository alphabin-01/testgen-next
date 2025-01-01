const { getWebSocket } = require("../../utils/socket");
const { globals } = require("./globals");
const WebSocket = require("ws");

// Handle errors and send error messages through WebSocket
const handleError = (message, error) => {
  const socket = getWebSocket(); // Get the WebSocket instance
  console.log(`Error: ${message} ---> `, error.message, '\n---> Stack:', error.stack);

  // Send the error message through WebSocket as a JSON object
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event: 'error', message, details: error.message }));
  } else {
    console.error('WebSocket not connected or closed');
  }
};

const parseMessage = (message) => {
  try {
    const messageString = Buffer.isBuffer(message) ? message.toString('utf8') : message;
    const data = JSON.parse(messageString);
    return data;
  } catch (err) {
    return null;
  }
};

// Retry getting page content with a specified number of retries and delay
const getPageContent = async (retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await globals.page.content(); // Get page content
    } catch (err) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay)); // Retry after delay
      } else {
        throw err; // Throw error if retries are exhausted
      }
    }
  }
};

module.exports = { handleError, getPageContent,parseMessage };
