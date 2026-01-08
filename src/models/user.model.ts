import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';


export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profilePicture?: string;
  mobileNumber?: string;
  roles: Types.ObjectId[]; // Reference to Role model (many-to-many)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't include password in queries by default
    },
    profilePicture: {
      type: String,
      default: null,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Please provide a valid mobile number'],
    },
    roles: {
      type: [Schema.Types.ObjectId],
      ref: 'Role',
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'users',
    toJSON: {
      transform: function (doc, ret: any) {
        const { password, __v, ...userObject } = ret;
        return userObject;
      },
    },
    toObject: {
      transform: function (doc, ret: any) {
        const { password, __v, ...userObject } = ret;
        return userObject;
      },
    },
  }
);

userSchema.index({ active: 1 });

userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});


userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Create and export the User model
const User = mongoose.model<IUser>('User', userSchema);

export default User;

