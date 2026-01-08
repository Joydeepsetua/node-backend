import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../utils/permissions.js';
import { errorResponse } from '../utils/response.js';


export function requirePermission(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        errorResponse(res, 'Authentication required', null, 401);
        return;
      }

      // Check if user has the required permission
      const hasAccess = await hasPermission(req.user, requiredPermission);

      if (!hasAccess) {
        errorResponse(
          res,
          `Access denied. Required permission: ${requiredPermission}`,
          { requiredPermission },
          403
        );
        return;
      }

      next();
    } catch (error) {
      errorResponse(res, 'Permission check failed', error, 500);
    }
  };
}

