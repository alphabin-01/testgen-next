const dotenv = require('dotenv');
dotenv.config();
const path = require("path");

const envConfig = {
    // Server Configuration
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    BASE_PATH: path.join(__dirname, '..', '..'),
    AZURE_STORAGE_CONN_STRING: process.env.AZURE_STORAGE_CONN_STRING,
    MONGO_CLUSTER_NAME: process.env.MONGO_CLUSTER_NAME,
    MONGO_CONNECT_URL: process.env.MONGO_CONNECT_STRING,
};

// Validate required environment variables
const requiredEnvVars = [
    'MONGO_CONNECT_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !envConfig[envVar]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = envConfig;
