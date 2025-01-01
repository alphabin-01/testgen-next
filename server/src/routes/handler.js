const express = require('express');
const configRoutes = require('./configRoutes');
const fileRoutes = require('./fileRoutes');
const projectRoutes = require('./projectRoutes');
const testRoutes = require('./testRoutes');
const locatorRoutes = require('./locatorRoutes');
const logger = require('../utils/logger');

function setupRoutes(app) {
    // API Routes
    const apiRouter = express.Router();
    
    // Logging middleware for performance optimization - moved to top
    // apiRouter.use((req, res, next) => {
    //     const start = Date.now();
    //     res.on('finish', () => {
    //         const duration = Date.now() - start;
    //         logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    //     });
    //     next();
    // });

    // Mount all routes under /api
    apiRouter.use('/', configRoutes);
    apiRouter.use('/', fileRoutes);
    apiRouter.use('/', projectRoutes);
    apiRouter.use('/', testRoutes);
    apiRouter.use('/locators', locatorRoutes);

    // Health check route
    apiRouter.get('/health', (req, res) => {
        res.status(200).json({ 
            status: 'ok',
            message: 'Server is running',
            timestamp: new Date().toISOString()
        });
    });

    // Error handling for invalid routes
    apiRouter.use((req, res) => {
        res.status(404).json({
            status: 'error',
            message: 'Route not found'
        });
    });

    // Mount the API router under /api prefix
    app.use('/api', apiRouter);

}

module.exports = setupRoutes;
