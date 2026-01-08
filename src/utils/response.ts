import { Response } from 'express';

export type Pagination = {
  total: number;
  current_page: number;
  total_pages: number;
  limit: number;
};

export type PaginatedResult<T = unknown> = {
  data: T;
  pagination: Pagination;
};

type SuccessResponse<T = unknown> = {
  success: true;
  message: string;
  data?: T;
  pagination?: Pagination;
};

type ErrorResponse = {
  success: false;
  message: string;
  error?: unknown;
};

export function successResponse<T = unknown>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
) {
  const result: SuccessResponse<T> = { success: true, message };
  if (data !== undefined) result.data = data;
  return res.status(statusCode).json(result);
}

export function successPaginatedResponse<T = unknown>(
  res: Response,
  message: string,
  result: PaginatedResult<T>,
  statusCode = 200
) {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data: result.data,
    pagination: result.pagination,
  };
  return res.status(statusCode).json(response);
}

export function errorResponse(res: Response, message: string, error?: unknown, statusCode = 400) {
  console.log(`Error: ${message}`, error);
  const result: ErrorResponse = { success: false, message };
  if (error !== undefined) result.error = error;
  return res.status(statusCode).json(result);
}

