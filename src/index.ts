import * as dotenv from 'dotenv';
import app from './routes/index.js';
import { connectDB, disconnectDB } from './database/db.config.js';
import logger from './utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
let server: ReturnType<typeof app.listen> | null = null;

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} signal received: closing HTTP server and MongoDB connection`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await disconnectDB();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


// Start the server
startServer();

