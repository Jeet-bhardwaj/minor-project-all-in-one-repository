import { SystemLog, ISystemLog } from '../models';

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
export class Logger {
  private static readonly LOG_LEVEL_COLORS = {
    info: '\x1b[36m',    // Cyan
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    debug: '\x1b[35m',   // Magenta
    reset: '\x1b[0m',
  };

  /**
   * Log a message
   */
  static async log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: LogMetadata
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const colorCode = this.LOG_LEVEL_COLORS[level];
    const logMessage = `${colorCode}[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${this.LOG_LEVEL_COLORS.reset}`;

    // Console output
    console.log(logMessage);

    // MongoDB logging (non-blocking)
    this.saveToDatabase(level, category, message, metadata).catch((err) => {
      console.error('Failed to save log to database:', err);
    });
  }

  /**
   * Info level logging
   */
  static info(category: string, message: string, metadata?: LogMetadata): void {
    this.log('info', category, message, metadata);
  }

  /**
   * Warning level logging
   */
  static warn(category: string, message: string, metadata?: LogMetadata): void {
    this.log('warn', category, message, metadata);
  }

  /**
   * Error level logging
   */
  static error(category: string, message: string, metadata?: LogMetadata): void {
    this.log('error', category, message, metadata);
  }

  /**
   * Debug level logging
   */
  static debug(category: string, message: string, metadata?: LogMetadata): void {
    this.log('debug', category, message, metadata);
  }

  /**
   * Save log to MongoDB
   */
  private static async saveToDatabase(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: LogMetadata
  ): Promise<void> {
    try {
      const logEntry = new SystemLog({
        level,
        category,
        message,
        userId: metadata?.userId,
        conversionId: metadata?.conversionId,
        requestId: metadata?.requestId,
        metadata: metadata ? { ...metadata } : undefined,
      });

      await logEntry.save();
    } catch (error) {
      // Silent fail - don't throw errors from logging
    }
  }

  /**
   * Get logs from database
   */
  static async getLogs(filters?: {
    level?: LogLevel;
    category?: string;
    userId?: string;
    conversionId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ISystemLog[]> {
    try {
      const query: any = {};

      if (filters?.level) query.level = filters.level;
      if (filters?.category) query.category = filters.category;
      if (filters?.userId) query.userId = filters.userId;
      if (filters?.conversionId) query.conversionId = filters.conversionId;

      if (filters?.startDate || filters?.endDate) {
        query.timestamp = {};
        if (filters?.startDate) query.timestamp.$gte = filters.startDate;
        if (filters?.endDate) query.timestamp.$lte = filters.endDate;
      }

      const limit = filters?.limit || 100;

      return await SystemLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }
}

export default Logger;
