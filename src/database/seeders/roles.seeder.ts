import { connectDB, disconnectDB } from '../db.config.js';
import { Role } from '../../models/index.js';
import * as dotenv from 'dotenv';

dotenv.config();

interface RoleDefinition {
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

const defaultRoles: RoleDefinition[] = [
  {
    name: 'Admin',
    code: 'ADMIN',
    description: 'Administrator with full system access',
    permissions: [
      'USER_CREATE',
      'USER_READ',
      'USER_UPDATE',
      'USER_DELETE',
      'ROLE_CREATE',
      'ROLE_READ',
      'ROLE_UPDATE',
      'ROLE_DELETE',
      'PERMISSION_READ',
      'PERMISSION_ASSIGN',
      'SYSTEM_CONFIG',
      'SYSTEM_MANAGE',
    ],
  },
  {
    name: 'Sub-Admin',
    code: 'SUB_ADMIN',
    description: 'Sub-Admin with content management and user management permissions',
    permissions: [
      'USER_READ',
      'USER_UPDATE',
    ],
  },
  {
    name: 'User',
    code: 'USER',
    description: 'Regular user with basic permissions',
    permissions: [
      'USER_READ_SELF',
      'USER_UPDATE_SELF'
    ],
  },
];


export async function seedRoles(): Promise<void> {
  try {
    console.log('🌱 Starting roles seeder...');

    // Connect to database
    await connectDB();

    // Create or update each role
    for (const roleDef of defaultRoles) {
      const existingRole = await Role.findOne({ code: roleDef.code });

      if (existingRole) {
          console.log(`ℹ️  Role already exists: ${roleDef.code}`);
      } else {
        // Create new role
        const newRole = new Role({
          name: roleDef.name,
          code: roleDef.code,
          description: roleDef.description,
          permissions: roleDef.permissions,
          active: true,
        });

        await newRole.save();
        console.log(`✅ Role created: ${roleDef.code} with ${roleDef.permissions.length} permissions`);
      }
    }

    console.log('✅ Roles seeder completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}


export async function getRoleByCode(code: string) {
  return await Role.findOne({ code: code.toUpperCase(), active: true });
}


async function runSeeder() {
  try {
    await seedRoles();
    console.log('✅ Seeder completed successfully');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run seeder if this file is executed directly (when run via npm script)
if (process.argv[1] && process.argv[1].includes('roles.seeder')) {
  runSeeder();
}

export default seedRoles;

