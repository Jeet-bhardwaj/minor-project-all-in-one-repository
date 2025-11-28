import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  profilePicture?: string;
  googleId?: string;
  authProvider: 'local' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: false, // Removed unique here, using index instead
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Required only for local auth
      required: function(this: IUser) {
        return this.authProvider === 'local';
      },
    },
    profilePicture: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      sparse: false, // Removed sparse here, using index instead
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });

export default mongoose.model<IUser>('User', UserSchema);
