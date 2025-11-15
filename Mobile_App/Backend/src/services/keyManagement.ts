import { EncryptionKey, IEncryptionKey } from '../models';
import Logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Encryption Key Management Service
 */
export class KeyManagementService {
  /**
   * Get or create master key
   */
  static async getMasterKey(): Promise<string> {
    try {
      // First, try to get existing master key from database
      const masterKey = await EncryptionKey.findOne({
        keyType: 'master',
        isActive: true,
      });

      if (masterKey) {
        Logger.debug('KEY_MANAGEMENT', 'Using stored master key from database');
        return masterKey.keyHex;
      }

      // Fall back to environment variable
      const envMasterKey = process.env.MASTER_KEY_HEX;
      if (envMasterKey) {
        Logger.debug('KEY_MANAGEMENT', 'Using master key from environment');
        return envMasterKey;
      }

      throw new Error('No master key available. Set MASTER_KEY_HEX environment variable or create one in database.');
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to get master key: ${error}`);
      throw error;
    }
  }

  /**
   * Create and store a new encryption key
   */
  static async createKey(
    userId: string,
    keyHex: string,
    keyType: 'master' | 'user' | 'session' = 'user',
    description?: string
  ): Promise<IEncryptionKey> {
    try {
      const encryptionKey = new EncryptionKey({
        userId,
        keyHex,
        keyType,
        description,
        isActive: true,
      });

      await encryptionKey.save();
      Logger.info('KEY_MANAGEMENT', `Created new ${keyType} key for user ${userId}`, {
        userId,
        keyType,
      });

      return encryptionKey;
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to create key: ${error}`, { userId });
      throw error;
    }
  }

  /**
   * Get user's active encryption key
   */
  static async getUserKey(userId: string): Promise<IEncryptionKey | null> {
    try {
      return await EncryptionKey.findOne({
        userId,
        keyType: 'user',
        isActive: true,
      });
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to get user key: ${error}`, { userId });
      return null;
    }
  }

  /**
   * Deactivate a key
   */
  static async deactivateKey(keyId: string): Promise<void> {
    try {
      await EncryptionKey.findByIdAndUpdate(keyId, { isActive: false });
      Logger.info('KEY_MANAGEMENT', `Key ${keyId} deactivated`);
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to deactivate key: ${error}`);
      throw error;
    }
  }

  /**
   * Rotate user key (create new one and deactivate old one)
   */
  static async rotateKey(userId: string, newKeyHex: string): Promise<IEncryptionKey> {
    try {
      // Deactivate old key
      const oldKey = await this.getUserKey(userId);
      if (oldKey) {
        await this.deactivateKey(oldKey._id as string);
      }

      // Create new key
      const newKey = await this.createKey(userId, newKeyHex, 'user', 'Rotated key');
      Logger.info('KEY_MANAGEMENT', `Key rotated for user ${userId}`);

      return newKey;
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to rotate key: ${error}`, { userId });
      throw error;
    }
  }

  /**
   * List all keys for a user
   */
  static async listUserKeys(userId: string): Promise<IEncryptionKey[]> {
    try {
      return await EncryptionKey.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      Logger.error('KEY_MANAGEMENT', `Failed to list user keys: ${error}`, { userId });
      return [];
    }
  }

  /**
   * Generate a random hex key
   */
  static generateHexKey(length: number = 64): string {
    let key = '';
    for (let i = 0; i < length; i++) {
      key += Math.floor(Math.random() * 16).toString(16);
    }
    return key;
  }
}

export default KeyManagementService;
