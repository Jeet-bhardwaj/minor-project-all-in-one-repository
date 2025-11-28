import { Router } from 'express';
import {
  registerController,
  loginController,
  googleAuthController,
  getProfileController,
  updateProfileController,
  changePasswordController,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.post('/auth/register', registerController);
router.post('/auth/login', loginController);
router.post('/auth/google', googleAuthController);

// Protected routes (authentication required)
router.get('/user/profile', authenticateToken, getProfileController);
router.put('/user/profile', authenticateToken, updateProfileController);
router.post('/user/change-password', authenticateToken, changePasswordController);

export default router;
