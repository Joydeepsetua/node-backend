import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Sequelize validation errors
  if (err instanceof Error) {
    return errorResponse(
      res,
      'Validation Error',
      err.message,
      500
    );
  }
};


export const notFoundHandler = (req: Request, res: Response) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, undefined, 404);
};