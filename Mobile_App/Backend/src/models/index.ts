import mongoose, { Schema, Document } from 'mongoose';

/**
 * Encryption Key Schema
 * Stores master keys and user-specific encryption keys
 */
export interface IEncryptionKey extends Document {
  userId: string;
  keyHex: string;
  keyType: 'master' | 'user' | 'session';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  description?: string;
}

const EncryptionKeySchema = new Schema<IEncryptionKey>(
  {
    userId: { type: String, required: true, index: true },
    keyHex: { type: String, required: true },
    keyType: { type: String, enum: ['master', 'user', 'session'], default: 'user' },
    isActive: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true }
);

export const EncryptionKey = mongoose.model<IEncryptionKey>('EncryptionKey', EncryptionKeySchema);

/**
 * Conversion Task Schema
 * Stores information about audio-image conversions
 */
export interface IConversionTask extends Document {
  conversionId: string;
  userId: string;
  inputFileName: string;
  inputFileSize: number;
  conversionType: 'audio-to-image' | 'image-to-audio';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath: string;
  outputFiles: string[];
  compress: boolean;
  deleteSource: boolean;
  masterKeyId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionTaskSchema = new Schema<IConversionTask>(
  {
    conversionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    inputFileName: { type: String, required: true },
    inputFileSize: { type: Number, required: true },
    conversionType: { type: String, enum: ['audio-to-image', 'image-to-audio'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    outputPath: { type: String },
    outputFiles: [{ type: String }],
    compress: { type: Boolean, default: true },
    deleteSource: { type: Boolean, default: false },
    masterKeyId: { type: Schema.Types.ObjectId, ref: 'EncryptionKey' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number },
    error: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ConversionTask = mongoose.model<IConversionTask>('ConversionTask', ConversionTaskSchema);

/**
 * System Log Schema
 * Stores all system logs including API calls, errors, and conversions
 */
export interface ISystemLog extends Document {
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  userId?: string;
  conversionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
  {
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'], required: true, index: true },
    category: { type: String, required: true, index: true },
    message: { type: String, required: true },
    userId: { type: String, index: true },
    conversionId: { type: String, index: true },
    requestId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: 'system_logs' }
);

export const SystemLog = mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);

/**
 * User Session Schema
 * Stores user session information
 */
export interface IUserSession extends Document {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  conversionCount: number;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    conversionCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);

/**
 * User Profile Schema
 * Stores user profile and preferences
 */
export interface IUserProfile extends Document {
  userId: string;
  email?: string;
  displayName?: string;
  totalConversions: number;
  totalProcessedSize: number;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  storageLimit: number;
  usedStorage: number;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, index: true },
    displayName: { type: String },
    totalConversions: { type: Number, default: 0 },
    totalProcessedSize: { type: Number, default: 0 },
    subscriptionTier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB default
    usedStorage: { type: Number, default: 0 },
    preferences: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
