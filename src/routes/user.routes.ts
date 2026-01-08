import express, { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import imageUploadMiddleware from '../middlewares/blob.middleware.js';

const router: Router = express.Router();

router.get('/', requirePermission('USER_READ'), getAllUsers);
router.post('/', requirePermission('USER_CREATE'), imageUploadMiddleware, createUser);
router.post('/:id', requirePermission('USER_UPDATE'), imageUploadMiddleware, updateUser);
router.delete('/:id', requirePermission('USER_DELETE'), deleteUser);

export default router;

