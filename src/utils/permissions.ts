import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { Role } from '../models/index.js';


export async function hasPermission(
  user: JwtPayload,
  permission: string
): Promise<boolean> {
  try {
    // Check if user has roles
    if (!user.role || user.role.length === 0) {
      return false;
    }

    // Find roles by code (role codes are stored in JWT payload)
    const roles = await Role.find(
      { code: { $in: user.role }, active: true },
      { permissions: 1 }
    ).exec();

    if (!roles || roles.length === 0) {
      return false;
    }

    // Collect all permissions from all user's roles
    const allPermissions = [
      ...new Set(
        roles.flatMap((role) => role.permissions || []).map((p) => p.toUpperCase().trim())
      ),
    ];

    // Check if the required permission exists
    return allPermissions.includes(permission.toUpperCase().trim());
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}


