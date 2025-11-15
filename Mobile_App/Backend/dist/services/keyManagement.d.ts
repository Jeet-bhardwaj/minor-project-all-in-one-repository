import { IEncryptionKey } from '../models';
/**
 * Encryption Key Management Service
 */
export declare class KeyManagementService {
    /**
     * Get or create master key
     */
    static getMasterKey(): Promise<string>;
    /**
     * Create and store a new encryption key
     */
    static createKey(userId: string, keyHex: string, keyType?: 'master' | 'user' | 'session', description?: string): Promise<IEncryptionKey>;
    /**
     * Get user's active encryption key
     */
    static getUserKey(userId: string): Promise<IEncryptionKey | null>;
    /**
     * Deactivate a key
     */
    static deactivateKey(keyId: string): Promise<void>;
    /**
     * Rotate user key (create new one and deactivate old one)
     */
    static rotateKey(userId: string, newKeyHex: string): Promise<IEncryptionKey>;
    /**
     * List all keys for a user
     */
    static listUserKeys(userId: string): Promise<IEncryptionKey[]>;
    /**
     * Generate a random hex key
     */
    static generateHexKey(length?: number): string;
}
export default KeyManagementService;
//# sourceMappingURL=keyManagement.d.ts.map