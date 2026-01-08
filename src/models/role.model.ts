import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  code: string; // Unique code like 'ADMIN', 'USER'
  description?: string;
  permissions: string[]; // Array of permission strings
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      minlength: [2, 'Role name must be at least 2 characters long'],
      maxlength: [50, 'Role name cannot exceed 50 characters'],
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Role code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      match: [/^[A-Z_]+$/, 'Role code must contain only uppercase letters and underscores'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    permissions: {
      type: [String],
      default: [],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

roleSchema.index({ active: 1 });


roleSchema.pre('save', function (next) {
  if (this.isModified('permissions') && Array.isArray(this.permissions)) {
    this.permissions = [...new Set(this.permissions.map((p: string) => p.toUpperCase().trim()))];
  }
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

// Create and export the Role model
const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;

