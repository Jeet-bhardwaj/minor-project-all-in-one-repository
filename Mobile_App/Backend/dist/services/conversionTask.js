"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionTaskService = void 0;
const models_1 = require("../models");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
/**
 * Conversion Task Management Service
 */
class ConversionTaskService {
    /**
     * Create a new conversion task
     */
    static async createTask(userId, inputFileName, inputFileSize, conversionType, options) {
        try {
            const conversionId = (0, uuid_1.v4)();
            const task = new models_1.ConversionTask({
                conversionId,
                userId,
                inputFileName,
                inputFileSize,
                conversionType,
                compress: options?.compress ?? true,
                deleteSource: options?.deleteSource ?? false,
                masterKeyId: options?.masterKeyId,
                status: 'pending',
                startTime: new Date(),
                metadata: options?.metadata,
            });
            await task.save();
            logger_1.default.info('CONVERSION', `Task created: ${conversionId}`, {
                userId,
                conversionId,
                conversionType,
            });
            return task;
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to create conversion task: ${error}`, { userId });
            throw error;
        }
    }
    /**
     * Update task status
     */
    static async updateStatus(conversionId, status, updates) {
        try {
            const updateData = { status };
            if (status === 'processing') {
                updateData.status = 'processing';
            }
            else if (status === 'completed') {
                updateData.endTime = new Date();
                updateData.status = 'completed';
                if (updates?.outputPath)
                    updateData.outputPath = updates.outputPath;
                if (updates?.outputFiles)
                    updateData.outputFiles = updates.outputFiles;
                if (updates?.duration)
                    updateData.duration = updates.duration;
            }
            else if (status === 'failed') {
                updateData.endTime = new Date();
                updateData.status = 'failed';
                if (updates?.error)
                    updateData.error = updates.error;
            }
            const task = await models_1.ConversionTask.findOneAndUpdate({ conversionId }, updateData, { new: true });
            if (task) {
                logger_1.default.info('CONVERSION', `Task status updated: ${conversionId} -> ${status}`, {
                    conversionId,
                    status,
                });
            }
            return task;
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to update task status: ${error}`, { conversionId });
            throw error;
        }
    }
    /**
     * Get task by conversion ID
     */
    static async getTask(conversionId) {
        try {
            return await models_1.ConversionTask.findOne({ conversionId }).populate('masterKeyId');
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to get task: ${error}`, { conversionId });
            return null;
        }
    }
    /**
     * Get user's conversion history
     */
    static async getUserConversions(userId, options) {
        try {
            const limit = options?.limit || 50;
            const skip = options?.skip || 0;
            const query = { userId };
            if (options?.status) {
                query.status = options.status;
            }
            return await models_1.ConversionTask.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate('masterKeyId');
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to get user conversions: ${error}`, { userId });
            return [];
        }
    }
    /**
     * Get conversion statistics for a user
     */
    static async getUserStats(userId) {
        try {
            const tasks = await models_1.ConversionTask.find({ userId });
            const completed = tasks.filter((t) => t.status === 'completed');
            const failed = tasks.filter((t) => t.status === 'failed');
            const totalDataProcessed = tasks.reduce((sum, t) => sum + (t.inputFileSize || 0), 0);
            const totalDuration = completed.reduce((sum, t) => sum + (t.duration || 0), 0);
            const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;
            return {
                totalConversions: tasks.length,
                completedConversions: completed.length,
                failedConversions: failed.length,
                totalDataProcessed,
                averageConversionTime: Math.round(avgDuration),
            };
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to get user stats: ${error}`, { userId });
            return {
                totalConversions: 0,
                completedConversions: 0,
                failedConversions: 0,
                totalDataProcessed: 0,
                averageConversionTime: 0,
            };
        }
    }
    /**
     * Get system statistics
     */
    static async getSystemStats() {
        try {
            const tasks = await models_1.ConversionTask.find();
            const completed = tasks.filter((t) => t.status === 'completed');
            const failed = tasks.filter((t) => t.status === 'failed');
            const audioToImage = tasks.filter((t) => t.conversionType === 'audio-to-image');
            const imageToAudio = tasks.filter((t) => t.conversionType === 'image-to-audio');
            const totalDataProcessed = tasks.reduce((sum, t) => sum + (t.inputFileSize || 0), 0);
            return {
                totalConversions: tasks.length,
                completedConversions: completed.length,
                failedConversions: failed.length,
                totalDataProcessed,
                audioToImageCount: audioToImage.length,
                imageToAudioCount: imageToAudio.length,
            };
        }
        catch (error) {
            logger_1.default.error('CONVERSION', `Failed to get system stats: ${error}`);
            return {
                totalConversions: 0,
                completedConversions: 0,
                failedConversions: 0,
                totalDataProcessed: 0,
                audioToImageCount: 0,
                imageToAudioCount: 0,
            };
        }
    }
}
exports.ConversionTaskService = ConversionTaskService;
exports.default = ConversionTaskService;
//# sourceMappingURL=conversionTask.js.map