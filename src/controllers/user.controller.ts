import { Request, Response } from 'express';
import { User } from '../models/index.js';
import { successPaginatedResponse, errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';


export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    // Get query parameters for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;


    const filter: any = {};

    // Optional: Search by name or email
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search as string, $options: 'i' } },
        { email: { $regex: req.query.search as string, $options: 'i' } },
      ];
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password') // Exclude password
      .populate('roles', 'name code') // Populate roles with name and code
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .exec();

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    // Format response using successPaginatedResponse
    successPaginatedResponse(
      res,
      'Users retrieved successfully',
      {
        data: users,
        pagination: {
          total,
          current_page: page,
          total_pages: totalPages,
          limit,
        },
      },
      200
    );
  } catch (error) {
    logger.error('Get all users error:', error);
    errorResponse(res, 'Failed to retrieve users', error, 500);
  }
}

