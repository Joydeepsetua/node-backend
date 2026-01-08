import express, { Router } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole } from '../controllers/role.controller.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router: Router = express.Router();

router.get('/', requirePermission('ROLE_READ'), getAllRoles);
router.get('/:id', requirePermission('ROLE_READ'), getRoleById);
router.post('/', requirePermission('ROLE_CREATE'), createRole);
router.put('/:id', requirePermission('ROLE_UPDATE'), updateRole);
router.delete('/:id', requirePermission('ROLE_DELETE'), deleteRole);

export default router;

