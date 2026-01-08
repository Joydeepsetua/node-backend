import express, { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getMyProfile, updateMyProfile } from '../controllers/user.controller.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import imageUploadMiddleware from '../middlewares/blob.middleware.js';

const router: Router = express.Router();

// Profile routes (authenticated users can access their own profile)
router.get('/profile', requirePermission('USER_READ_SELF'), getMyProfile);
router.post('/profile', requirePermission('USER_UPDATE_SELF'), imageUploadMiddleware, updateMyProfile);

// Admin routes (require permissions)
router.get('/', requirePermission('USER_READ'), getAllUsers);
router.get('/:id', requirePermission('USER_READ'), getUserById);
router.post('/', requirePermission('USER_CREATE'), imageUploadMiddleware, createUser);
router.post('/:id', requirePermission('USER_UPDATE'), imageUploadMiddleware, updateUser);
router.delete('/:id', requirePermission('USER_DELETE'), deleteUser);

export default router;

