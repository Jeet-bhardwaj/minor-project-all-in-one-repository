import { ISystemLog } from '../models';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export interface LogMetadata {
    userId?: string;
    conversionId?: string;
    requestId?: string;
    [key: string]: any;
}
/**
 * Logger utility that logs to console and MongoDB
 */
export declare class Logger {
    private static readonly LOG_LEVEL_COLORS;
    /**
     * Log a message
     */
    static log(level: LogLevel, category: string, message: string, metadata?: LogMetadata): Promise<void>;
    /**
     * Info level logging
     */
    static info(category: string, message: string, metadata?: LogMetadata): void;
    /**
     * Warning level logging
     */
    static warn(category: string, message: string, metadata?: LogMetadata): void;
    /**
     * Error level logging
     */
    static error(category: string, message: string, metadata?: LogMetadata): void;
    /**
     * Debug level logging
     */
    static debug(category: string, message: string, metadata?: LogMetadata): void;
    /**
     * Save log to MongoDB
     */
    private static saveToDatabase;
    /**
     * Get logs from database
     */
    static getLogs(filters?: {
        level?: LogLevel;
        category?: string;
        userId?: string;
        conversionId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<ISystemLog[]>;
}
export default Logger;
//# sourceMappingURL=logger.d.ts.map