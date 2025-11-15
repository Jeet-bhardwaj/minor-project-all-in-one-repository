"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManagementService = void 0;
const models_1 = require("../models");
const logger_1 = __importDefault(require("../utils/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Encryption Key Management Service
 */
class KeyManagementService {
    /**
     * Get or create master key
     */
    static async getMasterKey() {
        try {
            // First, try to get existing master key from database
            const masterKey = await models_1.EncryptionKey.findOne({
                keyType: 'master',
                isActive: true,
            });
            if (masterKey) {
                logger_1.default.debug('KEY_MANAGEMENT', 'Using stored master key from database');
                return masterKey.keyHex;
            }
            // Fall back to environment variable
            const envMasterKey = process.env.MASTER_KEY_HEX;
            if (envMasterKey) {
                logger_1.default.debug('KEY_MANAGEMENT', 'Using master key from environment');
                return envMasterKey;
            }
            throw new Error('No master key available. Set MASTER_KEY_HEX environment variable or create one in database.');
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to get master key: ${error}`);
            throw error;
        }
    }
    /**
     * Create and store a new encryption key
     */
    static async createKey(userId, keyHex, keyType = 'user', description) {
        try {
            const encryptionKey = new models_1.EncryptionKey({
                userId,
                keyHex,
                keyType,
                description,
                isActive: true,
            });
            await encryptionKey.save();
            logger_1.default.info('KEY_MANAGEMENT', `Created new ${keyType} key for user ${userId}`, {
                userId,
                keyType,
            });
            return encryptionKey;
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to create key: ${error}`, { userId });
            throw error;
        }
    }
    /**
     * Get user's active encryption key
     */
    static async getUserKey(userId) {
        try {
            return await models_1.EncryptionKey.findOne({
                userId,
                keyType: 'user',
                isActive: true,
            });
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to get user key: ${error}`, { userId });
            return null;
        }
    }
    /**
     * Deactivate a key
     */
    static async deactivateKey(keyId) {
        try {
            await models_1.EncryptionKey.findByIdAndUpdate(keyId, { isActive: false });
            logger_1.default.info('KEY_MANAGEMENT', `Key ${keyId} deactivated`);
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to deactivate key: ${error}`);
            throw error;
        }
    }
    /**
     * Rotate user key (create new one and deactivate old one)
     */
    static async rotateKey(userId, newKeyHex) {
        try {
            // Deactivate old key
            const oldKey = await this.getUserKey(userId);
            if (oldKey) {
                await this.deactivateKey(oldKey._id);
            }
            // Create new key
            const newKey = await this.createKey(userId, newKeyHex, 'user', 'Rotated key');
            logger_1.default.info('KEY_MANAGEMENT', `Key rotated for user ${userId}`);
            return newKey;
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to rotate key: ${error}`, { userId });
            throw error;
        }
    }
    /**
     * List all keys for a user
     */
    static async listUserKeys(userId) {
        try {
            return await models_1.EncryptionKey.find({ userId }).sort({ createdAt: -1 });
        }
        catch (error) {
            logger_1.default.error('KEY_MANAGEMENT', `Failed to list user keys: ${error}`, { userId });
            return [];
        }
    }
    /**
     * Generate a random hex key
     */
    static generateHexKey(length = 64) {
        let key = '';
        for (let i = 0; i < length; i++) {
            key += Math.floor(Math.random() * 16).toString(16);
        }
        return key;
    }
}
exports.KeyManagementService = KeyManagementService;
exports.default = KeyManagementService;
//# sourceMappingURL=keyManagement.js.map