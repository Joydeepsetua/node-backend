# Node.js Backend API

A robust Node.js backend API built with Express, TypeScript, MongoDB, and JWT authentication. Features Role-Based Access Control (RBAC), user management, role management, and file uploads to AWS S3.



## 📦 Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd node-task
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## ⚙️ Environment Setup

1. **Create a `.env` file** in the root directory:
   ```bash
   touch .env
   ```

2. **Add the following environment variables** to your `.env` file:

   ```env
   # Server Configuration
   PORT=3000

   # MongoDB Configuration
   MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/
   MONGO_DB_NAME=nodejs-backend

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # AWS S3 Configuration (for file uploads)
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   AWS_REGION=ap-south-1
   S3_BUCKET_NAME=your-s3-bucket-name
   S3_FOLDER_NAME=uploads

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

3. **Update the values** with your actual credentials:
   - **MONGO_DB_URL**: Your MongoDB connection string
     - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/`
     - For local MongoDB: `mongodb://localhost:27017/`
   - **JWT_SECRET** & **JWT_REFRESH_SECRET**: Generate strong random strings (use a password generator)
   - **AWS Credentials**: Your AWS IAM user credentials with S3 permissions
   - **S3_BUCKET_NAME**: Your S3 bucket name
   - **ALLOWED_ORIGINS**: Comma-separated list of allowed frontend origins


## 🌱 Running Seeders

Seeders populate the database with initial data (default roles and admin user).

### Run All Seeders

```bash
npm run seed
```

This command runs:
1. **Roles Seeder**: Creates default roles (ADMIN, SUB_ADMIN, USER) with their permissions
2. **Admin Seeder**: Creates a default admin user

### Default Admin Credentials

After running the admin seeder, you can login with:
- **Email**: `admin@example.com`
- **Password**: `Admin@123456` (or as configured in `admin.seeder.ts`)

## 🚀 Running the Project

### Development Mode

Run the project in development mode with hot-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).


### Verify

1. Open your browser:
   ```bash
   http://localhost:3000
   ```

2. You should see:
   ```json
   {
     "success": true,
     "message": "Welcome to NodeJS Backend API"
   }
   ```

## 📡 API Endpoints

### Authentication

- `POST /api/auth/login` - User login

### User Management

- `GET /api/users/profile` - Get own profile (requires `USER_READ_SELF`)
- `POST /api/users/profile` - Update own profile (requires `USER_UPDATE_SELF`)
- `GET /api/users` - Get all users (requires `USER_READ`)
- `GET /api/users/:id` - Get user by ID (requires `USER_READ`)
- `POST /api/users` - Create user (requires `USER_CREATE`)
- `POST /api/users/:id` - Update user (requires `USER_UPDATE`)
- `DELETE /api/users/:id` - Delete user (soft delete, requires `USER_DELETE`)

### Role Management

- `GET /api/roles` - Get all roles (requires `ROLE_READ`)
- `GET /api/roles/:id` - Get role by ID (requires `ROLE_READ`)
- `POST /api/roles` - Create role (requires `ROLE_CREATE`)
- `PUT /api/roles/:id` - Update role (requires `ROLE_UPDATE`)
- `DELETE /api/roles/:id` - Delete role (soft delete, requires `ROLE_DELETE`)

### Example API Request

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

**Get All Users (with authentication):**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Joi** - Validation
- **AWS SDK** - S3 file uploads
- **Winston** - Logging
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

## 🔐 Default Roles and Permissions

After running seeders, the following roles are created:

### ADMIN
- Full system access
- All user and role management permissions
- System configuration permissions

### SUB_ADMIN
- User read and update permissions
- Limited administrative access

### USER
- Self profile read (`USER_READ_SELF`)
- Self profile update (`USER_UPDATE_SELF`)


## 📄 License

ISC

## 👤 Author

Joydeep Setua


