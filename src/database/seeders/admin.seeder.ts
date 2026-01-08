import { connectDB, disconnectDB } from '../db.config.js';
import { User, Role } from '../../models/index.js';
import { seedRoles, getRoleByCode } from './roles.seeder.js';
import * as dotenv from 'dotenv';

dotenv.config();

interface AdminConfig {
  name: string;
  email: string;
  password: string;
  mobileNumber?: string;
  profilePicture?: string;
}

const adminConfig: AdminConfig = { 
  name: 'System Administrator', 
  email: 'admin@example.com', 
  password: 'Admin@123456', 
  mobileNumber: "1234567890", 
  profilePicture: undefined 
};


export async function seedAdmin(): Promise<void> {
  try {
    console.log('🌱 Starting admin user seeder...');

    // Connect to database
    await connectDB();

    // Check if ADMIN role exists, if not seed roles
    let adminRole = await getRoleByCode('ADMIN');
    if (!adminRole) {
      console.log('ADMIN role not found. Seeding roles...');
      await seedRoles();
      adminRole = await getRoleByCode('ADMIN');
      if (!adminRole) {
        throw new Error('ADMIN role not found after seeding. Please check roles seeder.');
      }
    }


    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminConfig.email }).populate('roles');

    if (existingAdmin) {
        console.log(`ℹ️  Admin user already exists with ADMIN role: ${adminConfig.email}`);
      return;
    }

    // Create admin user with ADMIN role
    const adminUser = new User({
      name: adminConfig.name,
      email: adminConfig.email,
      password: adminConfig.password, // Will be hashed by pre-save hook
      mobileNumber: adminConfig.mobileNumber,
      profilePicture: adminConfig.profilePicture,
      roles: [adminRole._id], // Assign ADMIN role by reference
      active: true,
    });

    await adminUser.save();

    console.log(`✅ Admin user created successfully!`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}


async function runSeeder() {
  try {
    await seedAdmin();
    console.log('Admin user seeder completed successfully');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Admin user seeder failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run seeder if this file is executed directly (when run via npm script)
// This check ensures it only runs when executed directly, not when imported
if (process.argv[1] && process.argv[1].includes('admin.seeder')) {
  runSeeder();
}

export default seedAdmin;

