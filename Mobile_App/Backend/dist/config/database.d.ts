import mongoose from 'mongoose';
/**
 * Connect to MongoDB Atlas
 */
export declare function connectDB(): Promise<void>;
/**
 * Disconnect from MongoDB
 */
export declare function disconnectDB(): Promise<void>;
/**
 * Get MongoDB connection status
 */
export declare function isDBConnected(): boolean;
export default mongoose;
//# sourceMappingURL=database.d.ts.map