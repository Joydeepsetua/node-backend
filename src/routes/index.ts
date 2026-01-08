import express, { Request, Response } from 'express';
import { corsOptions } from '../middlewares/cors.middleware';
import cors from 'cors';
import { notFoundHandler, errorHandler } from '../middlewares/errorHandler.middleware';
import { successResponse } from '../utils/response';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import { authenticate } from 'middlewares/auth.middleware';


// Create Express app
const app = express();

// cors middleware
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req: Request, res: Response) => {
  successResponse(res, 'Welcome to NodeJS Backend API', undefined, 200);
});


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);

// app.use('/api/admin', adminRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Export the app
export default app;

