import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encryption Service for Master Keys
 * 
 * CRITICAL: Master keys are encrypted before storing in MongoDB
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  /**
   * Get encryption key from environment
   * Must be 32 bytes (64 hex characters)
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.DB_ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('DB_ENCRYPTION_KEY not set in environment');
    }
    
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('DB_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
    }
    
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt a master key before storing in database
   * @param masterKey - Master key to encrypt (64 hex characters)
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  static encryptMasterKey(masterKey: string): string {
    try {
      const encryptionKey = this.getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      
      const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
      
      let encrypted = cipher.update(masterKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:encryptedData (all in hex)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('❌ Master key encryption failed:', error);
      throw new Error('Failed to encrypt master key');
    }
  }

  /**
   * Decrypt a master key from database
   * @param encryptedMasterKey - Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted master key (64 hex characters)
   */
  static decryptMasterKey(encryptedMasterKey: string): string {
    try {
      const encryptionKey = this.getEncryptionKey();
      const parts = encryptedMasterKey.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted master key format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Master key decryption failed:', error);
      throw new Error('Failed to decrypt master key. Database may be corrupted.');
    }
  }

  /**
   * Generate a random master key (for testing)
   * @returns 64-character hexadecimal master key
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate master key format
   * @param masterKey - Master key to validate
   * @returns true if valid
   */
  static validateMasterKeyFormat(masterKey: string): boolean {
    return /^[0-9a-fA-F]{64}$/.test(masterKey);
  }
}
