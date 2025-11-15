"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfile = exports.UserSession = exports.SystemLog = exports.ConversionTask = exports.EncryptionKey = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const EncryptionKeySchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    keyHex: { type: String, required: true },
    keyType: { type: String, enum: ['master', 'user', 'session'], default: 'user' },
    isActive: { type: Boolean, default: true },
    description: { type: String },
}, { timestamps: true });
exports.EncryptionKey = mongoose_1.default.model('EncryptionKey', EncryptionKeySchema);
const ConversionTaskSchema = new mongoose_1.Schema({
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
    masterKeyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'EncryptionKey' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number },
    error: { type: String },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.ConversionTask = mongoose_1.default.model('ConversionTask', ConversionTaskSchema);
const SystemLogSchema = new mongoose_1.Schema({
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'], required: true, index: true },
    category: { type: String, required: true, index: true },
    message: { type: String, required: true },
    userId: { type: String, index: true },
    conversionId: { type: String, index: true },
    requestId: { type: String, index: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
}, { collection: 'system_logs' });
exports.SystemLog = mongoose_1.default.model('SystemLog', SystemLogSchema);
const UserSessionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    conversionCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });
exports.UserSession = mongoose_1.default.model('UserSession', UserSessionSchema);
const UserProfileSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, index: true },
    displayName: { type: String },
    totalConversions: { type: Number, default: 0 },
    totalProcessedSize: { type: Number, default: 0 },
    subscriptionTier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB default
    usedStorage: { type: Number, default: 0 },
    preferences: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.UserProfile = mongoose_1.default.model('UserProfile', UserProfileSchema);
//# sourceMappingURL=index.js.map