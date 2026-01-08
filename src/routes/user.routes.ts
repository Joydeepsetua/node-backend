import express, { Router } from 'express';
import { getAllUsers } from '../controllers/user.controller.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router: Router = express.Router();

router.get('/', requirePermission('USER_READ'), getAllUsers);

export default router;

