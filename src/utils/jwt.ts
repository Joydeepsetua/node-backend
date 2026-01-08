import jwt, { SignOptions, JwtPayload as JsonWebTokenPayload, VerifyOptions } from 'jsonwebtoken';
import moment from 'moment';
import ms, { StringValue } from 'ms';
import { JwtPayload, TokenResponse } from '../interfaces/jwt-payload.interface.js';


export class JwtError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JwtError';
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new JwtError('JWT_SECRET is not configured', 'MISSING_SECRET');
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new JwtError('JWT_REFRESH_SECRET is not configured', 'MISSING_REFRESH_SECRET');
  }
  return secret;
}

function getTokenExpiration(type: 'access' | 'refresh'): string {
  const expiresIn = type === 'access' 
    ? process.env.ACCESS_EXPIRES_IN 
    : process.env.REFRESH_EXPIRES_IN;

  if (!expiresIn) {
    throw new JwtError(
      `${type === 'access' ? 'ACCESS' : 'REFRESH'}_EXPIRES_IN is not configured`,
      'MISSING_EXPIRATION'
    );
  }

  return expiresIn;
}

function calculateExpiry(expiresIn: string): string {
  try {
    const milliseconds = ms(expiresIn as StringValue);
    if (!milliseconds) {
      throw new JwtError('Invalid expiration format', 'INVALID_EXPIRATION');
    }
    return moment()
      .add(milliseconds, 'milliseconds')
      .format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    throw new JwtError('Failed to calculate token expiry', 'EXPIRY_CALCULATION_ERROR');
  }
}

export function generateToken(payload: JwtPayload): TokenResponse {
  try {
    if (!payload.user_id || !payload.role) {
      throw new JwtError('Invalid payload: user_id and role are required', 'INVALID_PAYLOAD');
    }

    const accessExpiresIn = getTokenExpiration('access');
    const refreshExpiresIn = getTokenExpiration('refresh');
    const jwtSecret = getJwtSecret();
    const jwtRefreshSecret = getJwtRefreshSecret();

    const access_token = jwt.sign(payload, jwtSecret, {
      expiresIn: accessExpiresIn,
      algorithm: 'HS512',
    } as SignOptions);

    const refresh_token = jwt.sign(payload, jwtRefreshSecret, {
      expiresIn: refreshExpiresIn,
      algorithm: 'HS256',
    } as SignOptions);

    return {
      access_token,
      refresh_token,
      token_expiry: calculateExpiry(accessExpiresIn),
      refresh_token_expiry: calculateExpiry(refreshExpiresIn),
    };
  } catch (error) {
    if (error instanceof JwtError) {
      throw error;
    }
    throw new JwtError(
      `Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TOKEN_GENERATION_ERROR'
    );
  }
}

export function verifyToken(token: string): JwtPayload {
  if (!token) {
    throw new JwtError('Token is required', 'MISSING_TOKEN');
  }

  try {
    const jwtSecret = getJwtSecret();
    const verifyOptions: VerifyOptions = {
      algorithms: ['HS512'],
    };

    const decoded = jwt.verify(token, jwtSecret, verifyOptions) as JsonWebTokenPayload & JwtPayload;
    
    // Validate required payload fields
    if (!decoded.user_id || !decoded.role) {
      throw new JwtError('Invalid token payload', 'INVALID_TOKEN_PAYLOAD');
    }

    return {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof JwtError) {
      throw error;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtError(`Invalid token: ${error.message}`, 'INVALID_TOKEN');
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtError('Token has expired', 'TOKEN_EXPIRED');
    }
    
    if (error instanceof jwt.NotBeforeError) {
      throw new JwtError('Token not active yet', 'TOKEN_NOT_ACTIVE');
    }

    throw new JwtError(
      `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'VERIFICATION_ERROR'
    );
  }
}

export function verifyRefreshToken(refreshToken: string): JwtPayload {
  if (!refreshToken) {
    throw new JwtError('Refresh token is required', 'MISSING_REFRESH_TOKEN');
  }

  try {
    const jwtRefreshSecret = getJwtRefreshSecret();
    const verifyOptions: VerifyOptions = {
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(refreshToken, jwtRefreshSecret, verifyOptions) as JsonWebTokenPayload & JwtPayload;
    
    // Validate required payload fields
    if (!decoded.user_id || !decoded.role) {
      throw new JwtError('Invalid refresh token payload', 'INVALID_TOKEN_PAYLOAD');
    }

    return {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof JwtError) {
      throw error;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtError(`Invalid refresh token: ${error.message}`, 'INVALID_REFRESH_TOKEN');
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }
    
    if (error instanceof jwt.NotBeforeError) {
      throw new JwtError('Refresh token not active yet', 'REFRESH_TOKEN_NOT_ACTIVE');
    }

    throw new JwtError(
      `Refresh token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'REFRESH_VERIFICATION_ERROR'
    );
  }
}
