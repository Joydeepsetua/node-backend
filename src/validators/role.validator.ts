import Joi from 'joi';

export const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 50 characters',
      'string.empty': 'Role name is required',
      'any.required': 'Role name is required',
    }),
  code: Joi.string()
    .required()
    .trim()
    .uppercase()
    .pattern(/^[A-Z_]+$/)
    .messages({
      'string.empty': 'Role code is required',
      'any.required': 'Role code is required',
      'string.pattern.base': 'Role code must contain only uppercase letters and underscores',
    }),
  description: Joi.string()
    .max(200)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
  permissions: Joi.array()
    .items(Joi.string().trim().uppercase())
    .required()
    .min(1)
    .messages({
      'array.base': 'Permissions must be an array',
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions are required',
    }),
  active: Joi.boolean()
    .optional()
    .default(true),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .trim()
    .messages({
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 50 characters',
    }),
  code: Joi.string()
    .optional()
    .trim()
    .uppercase()
    .pattern(/^[A-Z_]+$/)
    .messages({
      'string.pattern.base': 'Role code must contain only uppercase letters and underscores',
    }),
  description: Joi.string()
    .max(200)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
  permissions: Joi.array()
    .items(Joi.string().trim().uppercase())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array',
    }),
  active: Joi.boolean()
    .optional(),
});

