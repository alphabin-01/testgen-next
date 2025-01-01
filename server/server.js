const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');

const envConfig = require('./src/config/envConfig');
const { connectToMongoDB } = require('./src/config/mongoDatabase');
const setupRoutes = require('./src/routes/handler');
const setupWebSocketServer = require('./src/config/socketServer');
const { errorHandler, notFound } = require('./src/middleware/error.middleware');
const logger = require('./src/utils/logger');

const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('../projects', express.static('projects'));

// Initialize WebSocket server
setupWebSocketServer(server);

// Connect to MongoDB
(async () => {
    try {
        await connectToMongoDB();
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1); // Exit if the database connection fails
    }
})();

// Set up application routes
setupRoutes(app);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start the server
const PORT = envConfig.PORT || 3000; // Default to port 3000 if not set
server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${envConfig.NODE_ENV || 'development'}`);
});