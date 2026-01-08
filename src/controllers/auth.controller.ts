import { Request, Response } from 'express';
import { User, Role } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { loginSchema } from '../validators/auth.validator.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import logger from '../utils/logger.js';


export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    const { email, password } = value;

    // Find user by email and include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('roles', 'code permissions')
      .exec();

    // Check if user exists
    if (!user) {
      errorResponse(res, 'Invalid email or password', null, 401);
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      errorResponse(res, 'Invalid email or password', null, 401);
      return;
    }

    // Check if user is active
    if (!user.active) {
      errorResponse(res, 'Your account has been deactivated. Please contact administrator.', null, 403);
      return;
    }

    // Get role codes from populated roles
    const roleCodes: string[] = [];
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Generate JWT payload
    const jwtPayload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email,
      role: roleCodes,
    };

    // Generate tokens
    const tokens = generateToken(jwtPayload);

    // Prepare user data (without password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      mobileNumber: user.mobileNumber,
      roles: roleCodes,
      active: user.active,
    };

    // Return success response with tokens and user data
    successResponse(
      res,
      'Login successful',
      {
        user: userData,
        tokens,
      },
      200
    );
  } catch (error) {
    logger.error('Login error:', error);
    errorResponse(res, 'An error occurred during login', error, 500);
  }
}

