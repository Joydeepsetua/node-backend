import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Module-level state
let isConnected = false;
let listenersInitialized = false;


function setupEventListeners(): void {
    if (listenersInitialized) {
        return;
    }

    mongoose.connection.on('connected', () => {
        logger.info('MongoDB connection established');
        isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        isConnected = true;
    });

    listenersInitialized = true;
}

export async function connectDB(): Promise<void> {
    try {
        if (isConnected && mongoose.connection.readyState === 1) {
            logger.info('MongoDB already connected');
            return;
        }

        setupEventListeners();

        const connectionString = process.env.MONGO_DB_URL;
        if (!connectionString) {
            throw new Error('MongoDB connection string is not configured. Please set MONGO_DB_URL in your environment variables.');
        }
        const options = { dbName: process.env.MONGO_DB_NAME || 'nodejs-backend' };

        logger.info('Connecting to MongoDB...');
        await mongoose.connect(connectionString, options);
        isConnected = true;
        logger.info(`✅ MongoDB connected successfully to database: ${mongoose.connection.db?.databaseName || 'nodejs-backend'}`);

    } catch (error) {
        isConnected = false;
        logger.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

export async function disconnectDB(): Promise<void> {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            isConnected = false;
            logger.info('MongoDB disconnected successfully');
        }
    } catch (error) {
        logger.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}

export function isDBConnected(): boolean {
    return isConnected && mongoose.connection.readyState === 1;
}

export function getConnectionState(): number {
    return mongoose.connection.readyState;
}

export async function handleConnectionError(error: Error): Promise<void> {
    logger.error('MongoDB connection error occurred:', error);
    isConnected = false;

    // Attempt to reconnect after a delay
    const reconnectDelay = 5000;

    setTimeout(async () => {
        try {
            logger.info('Attempting to reconnect to MongoDB...');
            await connectDB();
        } catch (reconnectError) {
            logger.error('Failed to reconnect to MongoDB:', reconnectError);
        }
    }, reconnectDelay);
}

