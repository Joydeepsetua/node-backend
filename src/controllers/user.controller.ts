import { Request, Response } from 'express';
import { User, Role } from '../models/index.js';
import { successPaginatedResponse, successResponse, errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { createUserSchema, updateUserSchema, updateMyProfileSchema } from '../validators/user.validator.js';
import mongoose from 'mongoose';
import { uploadToS3 } from '../utils/s3-service.js';
import compressImage from '../utils/image-compression.js';


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


export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(res, 'Invalid user ID', null, 400);
      return;
    }

    // Find user by ID
    const user = await User.findById(userId)
      .select('-password') // Exclude password
      .populate('roles', 'name code permissions') // Populate roles
      .exec();

    if (!user) {
      errorResponse(res, 'User not found', null, 404);
      return;
    }

    // Format roles for response
    const roleCodes: string[] = [];
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Prepare user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      mobileNumber: user.mobileNumber,
      roles: roleCodes,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    successResponse(res, 'User retrieved successfully', userData, 200);
  } catch (error) {
    logger.error('Get user by ID error:', error);
    errorResponse(res, 'Failed to retrieve user', error, 500);
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    let parsedBody = { ...req.body };
    
    if (req.body.roles) {
      if (typeof req.body.roles === 'string') {
        try {
          parsedBody.roles = JSON.parse(req.body.roles);
        } catch {
          parsedBody.roles = req.body.roles.split(',').map((r: string) => r.trim()).filter((r: string) => r);
        }
      }
    }

    // Validate request body
    const { error, value } = createUserSchema.validate(parsedBody);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    let profilePictureUrl: string | null = null;
    
    if (req.file) {
      // Compress image before upload
      const compressedBuffer = await compressImage(req.file.buffer);
      
      // Update file extension to .jpg since we're converting to JPEG
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, '.jpg');
      
      const uploadResult = await uploadToS3(
        compressedBuffer,
        fileName,
        'image/jpeg'
      );
      
      if (!uploadResult.success || !uploadResult.url) {
        errorResponse(
          res,
          uploadResult.error || 'Failed to upload profile picture',
          null,
          400
        );
        return;
      }
      
      profilePictureUrl = uploadResult.url || null;
    }

    // Prepare body for validation (include uploaded file URL if exists)
    const bodyForValidation = {
      ...value,
      profilePicture: profilePictureUrl,
    };

    const { name, email, password, profilePicture, mobileNumber, roles, active } = bodyForValidation;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      errorResponse(res, 'User with this email already exists', null, 409);
      return;
    }

    // Handle roles - if no roles provided, assign default USER role
    let roleIds: mongoose.Types.ObjectId[] = [];
    
    if (roles && roles.length > 0) {
      // Find roles by code
      const foundRoles = await Role.find({ 
        code: { $in: roles.map((r: string) => r.toUpperCase()) },
        active: true 
      });
      
      if (foundRoles.length !== roles.length) {
        errorResponse(res, 'One or more invalid role codes provided', null, 400);
        return;
      }
      
      roleIds = foundRoles.map(role => role._id);
    } else {
      // Assign default USER role
      const userRole = await Role.findOne({ code: 'USER', active: true });
      if (userRole) {
        roleIds = [userRole._id];
      }
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save hook
      profilePicture: profilePicture || null,
      mobileNumber: mobileNumber || null,
      roles: roleIds,
      active: active !== undefined ? active : true,
    });

    await newUser.save();

    // Populate roles for response
    await newUser.populate('roles', 'name code');

    // Get role codes for response
    const roleCodes: string[] = [];
    if (newUser.roles && Array.isArray(newUser.roles)) {
      for (const role of newUser.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Prepare user data (without password)
    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      profilePicture: newUser.profilePicture,
      mobileNumber: newUser.mobileNumber,
      roles: roleCodes,
      active: newUser.active,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    successResponse(res, 'User created successfully', userData, 201);
  } catch (error: any) {
    logger.error('Create user error:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      errorResponse(res, 'User with this email already exists', null, 409);
      return;
    }
    
    errorResponse(res, 'Failed to create user', error, 500);
  }
}


export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(res, 'Invalid user ID', null, 400);
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      errorResponse(res, 'User not found', null, 404);
      return;
    }


    let parsedBody = { ...req.body };
    
    if (req.body.roles) {
      if (typeof req.body.roles === 'string') {
        try {
          parsedBody.roles = JSON.parse(req.body.roles);
        } catch {
          parsedBody.roles = req.body.roles.split(',').map((r: string) => r.trim()).filter((r: string) => r);
        }
      }
    }


    let profilePictureUrl: string | undefined = undefined;
    
    if (req.file) {
      // Compress image before upload
      const compressedBuffer = await compressImage(req.file.buffer);
      
      // Update file extension to .jpg since we're converting to JPEG
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, '.jpg');
      
      const uploadResult = await uploadToS3(
        compressedBuffer,
        fileName,
        'image/jpeg'
      );
      
      if (!uploadResult.success || !uploadResult.url) {
        errorResponse(
          res,
          uploadResult.error || 'Failed to upload profile picture',
          null,
          400
        );
        return;
      }
      
      profilePictureUrl = uploadResult.url;
    }

    const bodyForValidation = {
      ...parsedBody,
      ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
    };

    const { error, value } = updateUserSchema.validate(bodyForValidation);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    const { name, email, password, profilePicture, mobileNumber, roles, active } = value;

    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        errorResponse(res, 'User with this email already exists', null, 409);
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    if (name !== undefined) user.name = name.trim();
    if (password !== undefined) user.password = password; // Will be hashed by pre-save hook
    if (profilePicture !== undefined) user.profilePicture = profilePicture || null;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber || null;
    if (active !== undefined) user.active = active;

    if (roles !== undefined) {
      if (roles && roles.length > 0) {
        // Find roles by code
        const foundRoles = await Role.find({ 
          code: { $in: roles.map((r: string) => r.toUpperCase()) },
          active: true 
        });
        
        if (foundRoles.length !== roles.length) {
          errorResponse(res, 'One or more invalid role codes provided', null, 400);
          return;
        }
        
        user.roles = foundRoles.map(role => role._id);
      } else {
        // Empty array - assign default USER role
        const userRole = await Role.findOne({ code: 'USER', active: true });
        if (userRole) {
          user.roles = [userRole._id];
        } else {
          user.roles = [];
        }
      }
    }

    // Save updated user
    await user.save();

    // Populate roles for response
    await user.populate('roles', 'name code');

    // Get role codes for response
    const roleCodes: string[] = [];
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Prepare user data (without password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      mobileNumber: user.mobileNumber,
      roles: roleCodes,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    successResponse(res, 'User updated successfully', userData, 200);
  } catch (error: any) {
    logger.error('Update user error:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      errorResponse(res, 'User with this email already exists', null, 409);
      return;
    }
    
    errorResponse(res, 'Failed to update user', error, 500);
  }
}


export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(res, 'Invalid user ID', null, 400);
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      errorResponse(res, 'User not found', null, 404);
      return;
    }

    // Check if user is already inactive
    if (!user.active) {
      errorResponse(res, 'User is already deleted', null, 400);
      return;
    }

    // Soft delete: set active to false
    user.active = false;
    await user.save();

    successResponse(res, 'User deleted successfully', null, 200);
  } catch (error) {
    logger.error('Delete user error:', error);
    errorResponse(res, 'Failed to delete user', error, 500);
  }
}


export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      errorResponse(res, 'User ID not found in token', null, 401);
      return;
    }

    // Find user by ID
    const user = await User.findById(userId)
      .select('-password') // Exclude password
      .populate('roles', 'name code permissions') // Populate roles
      .exec();

    if (!user) {
      errorResponse(res, 'User not found', null, 404);
      return;
    }

    // Format roles for response
    const roleCodes: string[] = [];
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Prepare user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      mobileNumber: user.mobileNumber,
      roles: roleCodes,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    successResponse(res, 'Profile retrieved successfully', userData, 200);
  } catch (error) {
    logger.error('Get my profile error:', error);
    errorResponse(res, 'Failed to retrieve profile', error, 500);
  }
}


export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      errorResponse(res, 'User ID not found in token', null, 401);
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      errorResponse(res, 'User not found', null, 404);
      return;
    }

    // Remove roles and active from body if present (users cannot update these themselves)
    const { roles, active, ...bodyWithoutRestricted } = req.body;

    let parsedBody = { ...bodyWithoutRestricted };

    // Process file upload if provided
    let profilePictureUrl: string | undefined = undefined;
    
    if (req.file) {
      // Compress image before upload
      const compressedBuffer = await compressImage(req.file.buffer);
      
      // Update file extension to .jpg since we're converting to JPEG
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, '.jpg');
      
      const uploadResult = await uploadToS3(
        compressedBuffer,
        fileName,
        'image/jpeg'
      );
      
      if (!uploadResult.success || !uploadResult.url) {
        errorResponse(
          res,
          uploadResult.error || 'Failed to upload profile picture',
          null,
          400
        );
        return;
      }
      
      profilePictureUrl = uploadResult.url;
    }

    const bodyForValidation = {
      ...parsedBody,
      ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
    };

    const { error, value } = updateMyProfileSchema.validate(bodyForValidation);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    const { name, email, password, profilePicture, mobileNumber } = value;

    // Check if email is being updated and if it's already taken
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        errorResponse(res, 'User with this email already exists', null, 409);
        return;
      }
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    if (password !== undefined) user.password = password; // Will be hashed by pre-save hook
    if (profilePicture !== undefined) user.profilePicture = profilePicture || null;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber || null;
    if (email !== undefined) user.email = email.toLowerCase().trim();

    // Save user
    await user.save();

    // Fetch updated user with populated roles
    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('roles', 'name code')
      .exec();

    if (!updatedUser) {
      errorResponse(res, 'Failed to retrieve updated user', null, 500);
      return;
    }

    // Format roles for response
    const roleCodes: string[] = [];
    if (updatedUser.roles && Array.isArray(updatedUser.roles)) {
      for (const role of updatedUser.roles) {
        if (role && typeof role === 'object' && 'code' in role) {
          roleCodes.push((role as any).code);
        }
      }
    }

    // Prepare user data
    const userData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
      mobileNumber: updatedUser.mobileNumber,
      roles: roleCodes,
      active: updatedUser.active,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    successResponse(res, 'Profile updated successfully', userData, 200);
  } catch (error: any) {
    logger.error('Update my profile error:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      errorResponse(res, 'User with this email already exists', null, 409);
      return;
    }
    
    errorResponse(res, 'Failed to update profile', error, 500);
  }
}

