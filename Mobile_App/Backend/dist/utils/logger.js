"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const models_1 = require("../models");
/**
 * Logger utility that logs to console and MongoDB
 */
class Logger {
    /**
     * Log a message
     */
    static async log(level, category, message, metadata) {
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
    static info(category, message, metadata) {
        this.log('info', category, message, metadata);
    }
    /**
     * Warning level logging
     */
    static warn(category, message, metadata) {
        this.log('warn', category, message, metadata);
    }
    /**
     * Error level logging
     */
    static error(category, message, metadata) {
        this.log('error', category, message, metadata);
    }
    /**
     * Debug level logging
     */
    static debug(category, message, metadata) {
        this.log('debug', category, message, metadata);
    }
    /**
     * Save log to MongoDB
     */
    static async saveToDatabase(level, category, message, metadata) {
        try {
            const logEntry = new models_1.SystemLog({
                level,
                category,
                message,
                userId: metadata?.userId,
                conversionId: metadata?.conversionId,
                requestId: metadata?.requestId,
                metadata: metadata ? { ...metadata } : undefined,
            });
            await logEntry.save();
        }
        catch (error) {
            // Silent fail - don't throw errors from logging
        }
    }
    /**
     * Get logs from database
     */
    static async getLogs(filters) {
        try {
            const query = {};
            if (filters?.level)
                query.level = filters.level;
            if (filters?.category)
                query.category = filters.category;
            if (filters?.userId)
                query.userId = filters.userId;
            if (filters?.conversionId)
                query.conversionId = filters.conversionId;
            if (filters?.startDate || filters?.endDate) {
                query.timestamp = {};
                if (filters?.startDate)
                    query.timestamp.$gte = filters.startDate;
                if (filters?.endDate)
                    query.timestamp.$lte = filters.endDate;
            }
            const limit = filters?.limit || 100;
            return await models_1.SystemLog.find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .exec();
        }
        catch (error) {
            console.error('Error retrieving logs:', error);
            return [];
        }
    }
}
exports.Logger = Logger;
Logger.LOG_LEVEL_COLORS = {
    info: '\x1b[36m', // Cyan
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    debug: '\x1b[35m', // Magenta
    reset: '\x1b[0m',
};
exports.default = Logger;
//# sourceMappingURL=logger.js.map