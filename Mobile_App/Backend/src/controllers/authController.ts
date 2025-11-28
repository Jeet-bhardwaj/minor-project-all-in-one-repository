import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Register new user with email/password
 */
export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, email, and password are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      authProvider: 'local',
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    Logger.info('AUTH', `New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error: any) {
    Logger.error('AUTH', `Registration error: ${error.message}`);
    next(error);
  }
}

/**
 * Login user with email/password
 */
export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.authProvider !== 'local') {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    Logger.info('AUTH', `User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error: any) {
    Logger.error('AUTH', `Login error: ${error.message}`);
    next(error);
  }
}

/**
 * Google OAuth login/register
 */
export async function googleAuthController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: googleId, email, name, picture } = req.body;

    // Validate input
    if (!googleId || !email || !name) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Google ID, email, and name are required',
      });
      return;
    }

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    if (user) {
      // Update existing user
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
      }
      user.authProvider = 'google';
      await user.save();

      Logger.info('AUTH', `Existing user logged in via Google: ${email}`);
    } else {
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        profilePicture: picture || '',
        authProvider: 'google',
      });

      Logger.info('AUTH', `New user registered via Google: ${email}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error: any) {
    Logger.error('AUTH', `Google auth error: ${error.message}`);
    next(error);
  }
}

/**
 * Get user profile
 */
export async function getProfileController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please login to access this resource',
      });
      return;
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    Logger.error('AUTH', `Get profile error: ${error.message}`);
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateProfileController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    const { name, profilePicture } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please login to access this resource',
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found',
      });
      return;
    }

    if (name) user.name = name;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    Logger.info('AUTH', `Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error: any) {
    Logger.error('AUTH', `Update profile error: ${error.message}`);
    next(error);
  }
}

/**
 * Change password
 */
export async function changePasswordController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please login to access this resource',
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Current password and new password are required',
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user || user.authProvider !== 'local') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Password change not available for this account',
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    Logger.info('AUTH', `Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    Logger.error('AUTH', `Change password error: ${error.message}`);
    next(error);
  }
}
