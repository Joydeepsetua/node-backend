import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtError } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';


//Extend Express Request to include user payload 
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

//Authentication middleware - verifies JWT token
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      errorResponse(res, 'Authorization header is required', null, 401);
      return;
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      errorResponse(res, 'Invalid authorization header format. Use: Bearer <token>', null, 401);
      return;
    }

    const token = parts[1];
    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof JwtError) {
      const statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 401;
      errorResponse(res, error.message, { code: error.code }, statusCode);
      return;
    }
    errorResponse(res, 'Authentication failed', error, 401);
  }
}

