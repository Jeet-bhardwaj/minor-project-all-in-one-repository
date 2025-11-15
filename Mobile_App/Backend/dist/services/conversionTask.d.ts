import { IConversionTask } from '../models';
/**
 * Conversion Task Management Service
 */
export declare class ConversionTaskService {
    /**
     * Create a new conversion task
     */
    static createTask(userId: string, inputFileName: string, inputFileSize: number, conversionType: 'audio-to-image' | 'image-to-audio', options?: {
        compress?: boolean;
        deleteSource?: boolean;
        masterKeyId?: string;
        metadata?: Record<string, any>;
    }): Promise<IConversionTask>;
    /**
     * Update task status
     */
    static updateStatus(conversionId: string, status: 'pending' | 'processing' | 'completed' | 'failed', updates?: {
        outputPath?: string;
        outputFiles?: string[];
        error?: string;
        duration?: number;
    }): Promise<IConversionTask | null>;
    /**
     * Get task by conversion ID
     */
    static getTask(conversionId: string): Promise<IConversionTask | null>;
    /**
     * Get user's conversion history
     */
    static getUserConversions(userId: string, options?: {
        limit?: number;
        skip?: number;
        status?: string;
    }): Promise<IConversionTask[]>;
    /**
     * Get conversion statistics for a user
     */
    static getUserStats(userId: string): Promise<{
        totalConversions: number;
        completedConversions: number;
        failedConversions: number;
        totalDataProcessed: number;
        averageConversionTime: number;
    }>;
    /**
     * Get system statistics
     */
    static getSystemStats(): Promise<{
        totalConversions: number;
        completedConversions: number;
        failedConversions: number;
        totalDataProcessed: number;
        audioToImageCount: number;
        imageToAudioCount: number;
    }>;
}
export default ConversionTaskService;
//# sourceMappingURL=conversionTask.d.ts.map