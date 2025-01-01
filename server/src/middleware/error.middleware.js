const logger = require("../utils/logger");

// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

// Not Found middleware for undefined routes
const notFound = (req, res, next) => {
    const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    // Log error for debugging (consider using a proper logging library in production)
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation Error',
            details: Object.values(err.errors).map(error => error.message)
        });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
        return res.status(409).json({
            status: 'fail',
            message: 'Duplicate Entry Error',
            details: 'A resource with these unique fields already exists'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Invalid token',
            details: 'Please log in again'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Token expired',
            details: 'Please log in again'
        });
    }

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            status: 'fail',
            message: 'File too large',
            details: 'File size should be less than limit'
        });
    }

    // Custom API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            details: err.details,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Default error - don't leak error details in production
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: 'error',
        message: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? {
            details: err.message,
            stack: err.stack
        } : {
            details: 'Something went wrong'
        })
    });
};

module.exports = { errorHandler, notFound, ApiError };