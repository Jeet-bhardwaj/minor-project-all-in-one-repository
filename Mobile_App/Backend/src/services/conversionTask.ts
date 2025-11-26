import { ConversionTask, IConversionTask } from '../models';
import Logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Conversion Task Management Service
 */
export class ConversionTaskService {
  /**
   * Create a new conversion task
   */
  static async createTask(
    conversionId: string,
    userId: string,
    inputFileName: string,
    inputFileSize: number,
    conversionType: 'audio-to-image' | 'image-to-audio',
    options?: {
      compress?: boolean;
      deleteSource?: boolean;
      masterKeyId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IConversionTask> {
    try {
      const task = new ConversionTask({
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

      Logger.info('CONVERSION', `Task created: ${conversionId}`, {
        userId,
        conversionId,
        conversionType,
      });

      return task;
    } catch (error) {
      Logger.error('CONVERSION', `Failed to create conversion task: ${error}`, { userId });
      throw error;
    }
  }

  /**
   * Update task status
   */
  static async updateStatus(
    conversionId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    updates?: {
      outputPath?: string;
      outputFiles?: string[];
      error?: string;
      duration?: number;
    }
  ): Promise<IConversionTask | null> {
    try {
      const updateData: any = { status };

      if (status === 'processing') {
        updateData.status = 'processing';
      } else if (status === 'completed') {
        updateData.endTime = new Date();
        updateData.status = 'completed';
        if (updates?.outputPath) updateData.outputPath = updates.outputPath;
        if (updates?.outputFiles) updateData.outputFiles = updates.outputFiles;
        if (updates?.duration) updateData.duration = updates.duration;
      } else if (status === 'failed') {
        updateData.endTime = new Date();
        updateData.status = 'failed';
        if (updates?.error) updateData.error = updates.error;
      }

      const task = await ConversionTask.findOneAndUpdate(
        { conversionId },
        updateData,
        { new: true }
      );

      if (task) {
        Logger.info('CONVERSION', `Task status updated: ${conversionId} -> ${status}`, {
          conversionId,
          status,
        });
      }

      return task;
    } catch (error) {
      Logger.error('CONVERSION', `Failed to update task status: ${error}`, { conversionId });
      throw error;
    }
  }

  /**
   * Get task by conversion ID
   */
  static async getTask(conversionId: string): Promise<IConversionTask | null> {
    try {
      return await ConversionTask.findOne({ conversionId }).populate('masterKeyId');
    } catch (error) {
      Logger.error('CONVERSION', `Failed to get task: ${error}`, { conversionId });
      return null;
    }
  }

  /**
   * Get user's conversion history
   */
  static async getUserConversions(
    userId: string,
    options?: { limit?: number; skip?: number; status?: string }
  ): Promise<IConversionTask[]> {
    try {
      const limit = options?.limit || 50;
      const skip = options?.skip || 0;
      const query: any = { userId };

      if (options?.status) {
        query.status = options.status;
      }

      return await ConversionTask.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('masterKeyId');
    } catch (error) {
      Logger.error('CONVERSION', `Failed to get user conversions: ${error}`, { userId });
      return [];
    }
  }

  /**
   * Get conversion statistics for a user
   */
  static async getUserStats(userId: string): Promise<{
    totalConversions: number;
    completedConversions: number;
    failedConversions: number;
    totalDataProcessed: number;
    averageConversionTime: number;
  }> {
    try {
      const tasks = await ConversionTask.find({ userId });

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
    } catch (error) {
      Logger.error('CONVERSION', `Failed to get user stats: ${error}`, { userId });
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
  static async getSystemStats(): Promise<{
    totalConversions: number;
    completedConversions: number;
    failedConversions: number;
    totalDataProcessed: number;
    audioToImageCount: number;
    imageToAudioCount: number;
  }> {
    try {
      const tasks = await ConversionTask.find();

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
    } catch (error) {
      Logger.error('CONVERSION', `Failed to get system stats: ${error}`);
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

export default ConversionTaskService;
