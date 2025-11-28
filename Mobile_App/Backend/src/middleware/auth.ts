import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware to verify JWT token and extract user ID
 */
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required',
      });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        Logger.warn('AUTH', `Invalid token: ${err.message}`);
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Invalid or expired token',
        });
        return;
      }

      req.userId = decoded.userId;
      next();
    });
  } catch (error: any) {
    Logger.error('AUTH', `Authentication error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (!err && decoded) {
          req.userId = decoded.userId;
        }
      });
    }

    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
}
