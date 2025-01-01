const envConfig = require('./envConfig');
const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

const uri = envConfig.MONGO_CONNECT_URL;
const dbName = envConfig.MONGO_CLUSTER_NAME;

let db = null;

async function connectToMongoDB() {
    if (db) {
        return db;
    }

    try {
        const client = new MongoClient(uri, {
            tls: true,

        });

        await client.connect();
        db = client.db(dbName);

        return db;
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        throw err;
    }
}

module.exports = {
    connectToMongoDB,
    getDb: () => db,
};