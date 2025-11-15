import mongoose, { Document } from 'mongoose';
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
export declare const EncryptionKey: mongoose.Model<IEncryptionKey, {}, {}, {}, mongoose.Document<unknown, {}, IEncryptionKey, {}, {}> & IEncryptionKey & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
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
export declare const ConversionTask: mongoose.Model<IConversionTask, {}, {}, {}, mongoose.Document<unknown, {}, IConversionTask, {}, {}> & IConversionTask & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
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
export declare const SystemLog: mongoose.Model<ISystemLog, {}, {}, {}, mongoose.Document<unknown, {}, ISystemLog, {}, {}> & ISystemLog & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
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
export declare const UserSession: mongoose.Model<IUserSession, {}, {}, {}, mongoose.Document<unknown, {}, IUserSession, {}, {}> & IUserSession & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
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
export declare const UserProfile: mongoose.Model<IUserProfile, {}, {}, {}, mongoose.Document<unknown, {}, IUserProfile, {}, {}> & IUserProfile & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=index.d.ts.map