import { Request, Response } from 'express';
import { Role } from '../models/index.js';
import { successPaginatedResponse, successResponse, errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator.js';
import mongoose from 'mongoose';


export async function getAllRoles(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search as string, $options: 'i' } },
        { code: { $regex: req.query.search as string, $options: 'i' } },
      ];
    }

    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    // Get total count for pagination
    const total = await Role.countDocuments(filter);

    // Get roles with pagination
    const roles = await Role.find(filter)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .exec();

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    // Format response using successPaginatedResponse
    successPaginatedResponse(
      res,
      'Roles retrieved successfully',
      {
        data: roles,
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
    logger.error('Get all roles error:', error);
    errorResponse(res, 'Failed to retrieve roles', error, 500);
  }
}

export async function getRoleById(req: Request, res: Response): Promise<void> {
  try {
    const roleId = req.params.id;

    // Validate role ID
    if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
      errorResponse(res, 'Invalid role ID', null, 400);
      return;
    }

    // Find role by ID
    const role = await Role.findById(roleId).exec();

    if (!role) {
      errorResponse(res, 'Role not found', null, 404);
      return;
    }

    successResponse(res, 'Role retrieved successfully', role, 200);
  } catch (error) {
    logger.error('Get role by ID error:', error);
    errorResponse(res, 'Failed to retrieve role', error, 500);
  }
}

export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    const { error, value } = createRoleSchema.validate(req.body);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    const { name, code, description, permissions, active } = value;

    const existingRole = await Role.findOne({
      $or: [
        { name: name.trim() },
        { code: code.toUpperCase().trim() },
      ],
    });

    if (existingRole) {
      const field = existingRole.name === name.trim() ? 'name' : 'code';
      errorResponse(res, `Role with this ${field} already exists`, null, 409);
      return;
    }

    const newRole = new Role({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      permissions: permissions.map((p: string) => p.toUpperCase().trim()),
      active: active !== undefined ? active : true,
    });

    await newRole.save();

    successResponse(res, 'Role created successfully', newRole, 201);
  } catch (error: any) {
    logger.error('Create role error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      errorResponse(res, `Role with this ${field} already exists`, null, 409);
      return;
    }

    errorResponse(res, 'Failed to create role', error, 500);
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    const roleId = req.params.id;

    // Validate role ID
    if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
      errorResponse(res, 'Invalid role ID', null, 400);
      return;
    }

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      errorResponse(res, 'Role not found', null, 404);
      return;
    }

    // Validate request body
    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      errorResponse(res, 'Validation failed', formattedErrors, 400);
      return;
    }

    const { name, code, description, permissions, active } = value;

    // Check if name or code is being updated and if it's already taken
    if (name && name.trim() !== role.name) {
      const existingRole = await Role.findOne({ name: name.trim() });
      if (existingRole) {
        errorResponse(res, 'Role with this name already exists', null, 409);
        return;
      }
    }

    if (code && code.toUpperCase().trim() !== role.code) {
      const existingRole = await Role.findOne({ code: code.toUpperCase().trim() });
      if (existingRole) {
        errorResponse(res, 'Role with this code already exists', null, 409);
        return;
      }
    }

    // Update fields if provided
    if (name !== undefined) role.name = name.trim();
    if (code !== undefined) role.code = code.toUpperCase().trim();
    if (description !== undefined) role.description = description?.trim() || null;
    if (permissions !== undefined) {
      role.permissions = permissions.map((p: string) => p.toUpperCase().trim());
    }
    if (active !== undefined) role.active = active;

    // Save role
    await role.save();

    successResponse(res, 'Role updated successfully', role, 200);
  } catch (error: any) {
    logger.error('Update role error:', error);

    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      errorResponse(res, `Role with this ${field} already exists`, null, 409);
      return;
    }

    errorResponse(res, 'Failed to update role', error, 500);
  }
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  try {
    const roleId = req.params.id;

    if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
      errorResponse(res, 'Invalid role ID', null, 400);
      return;
    }

    const role = await Role.findById(roleId);
    if (!role) {
      errorResponse(res, 'Role not found', null, 404);
      return;
    }

    if (!role.active) {
      errorResponse(res, 'Role is already deleted', null, 400);
      return;
    }

    role.active = false;
    await role.save();

    successResponse(res, 'Role deleted successfully', null, 200);
  } catch (error) {
    logger.error('Delete role error:', error);
    errorResponse(res, 'Failed to delete role', error, 500);
  }
}

