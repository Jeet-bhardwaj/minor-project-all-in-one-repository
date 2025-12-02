import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Conversion } from '../models/Conversion';
import { uploadToGridFS, downloadFromGridFS, deleteFromGridFS } from '../services/gridfsService';
import { EncryptionService } from '../services/encryptionService';
import { getFastApiClient } from '../services/fastApiClient';
import Logger from '../utils/logger';

const fastApiClient = getFastApiClient();

/**
 * Helper function to format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Audio to Image with GridFS Storage
 * Encrypts audio and stores encrypted images in GridFS
 */
export const audioToImageGridFS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, compress } = req.body;
    const audioFile = req.file;

    // Validate inputs
    if (!audioFile) {
      res.status(400).json({
        success: false,
        error: 'No audio file provided',
        message: 'Please upload an audio file',
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID required',
        message: 'Please provide a userId',
      });
      return;
    }

    // Generate unique conversion ID and master key
    const conversionId = `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const masterKey = EncryptionService.generateMasterKey();

    Logger.info('CONVERSION', `🔄 Starting GridFS conversion: ${conversionId}`, {
      userId,
      fileName: audioFile.originalname,
      fileSize: audioFile.size,
    });

    try {
      // Call FastAPI to encrypt audio → images
      const result = await fastApiClient.encodeAudioToImage({
        audioFilePath: audioFile.path,
        userId: userId,
        masterKey: masterKey,
        compress: compress !== 'false',
      });

      if (!result.success || !result.zipFilePath) {
        throw new Error(result.error || 'FastAPI encoding failed');
      }

      Logger.info('CONVERSION', `✅ FastAPI encoding complete`);

      // Upload ZIP file to GridFS
      const zipBuffer = await fs.readFile(result.zipFilePath);
      const zipFileId = await uploadToGridFS(
        zipBuffer,
        `${conversionId}.zip`,
        {
          userId: userId,
          conversionId: conversionId,
          type: 'encrypted_zip',
          originalFileName: audioFile.originalname,
        }
      );

      Logger.info('CONVERSION', `✅ ZIP uploaded to GridFS: ${zipFileId}`);

      // Extract ZIP and upload individual images
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(result.zipFilePath);
      const zipEntries = zip.getEntries();

      const imageDocuments = [];
      let totalImageSize = 0;

      for (let i = 0; i < zipEntries.length; i++) {
        const entry = zipEntries[i];
        
        // Skip metadata.json and non-PNG files
        if (!entry.entryName.endsWith('.png')) {
          continue;
        }

        const imageBuffer = entry.getData();
        
        const imageFileId = await uploadToGridFS(
          imageBuffer,
          entry.entryName,
          {
            userId: userId,
            conversionId: conversionId,
            chunkIndex: i,
            type: 'encrypted_image',
            parentZip: zipFileId,
          }
        );

        imageDocuments.push({
          fileId: imageFileId,
          filename: entry.entryName,
          size: imageBuffer.length,
          chunkIndex: i,
        });

        totalImageSize += imageBuffer.length;

        Logger.info('CONVERSION', `✅ Image ${i + 1}/${zipEntries.length} uploaded: ${imageFileId}`);
      }

      // Create conversion record with all data
      const conversion = new Conversion({
        userId: userId,
        conversionId: conversionId,
        originalFileName: audioFile.originalname,
        originalFileSize: audioFile.size,
        audioFormat: path.extname(audioFile.originalname).slice(1),
        masterKey: EncryptionService.encryptMasterKey(masterKey),
        zipFileId: zipFileId,
        images: imageDocuments as any,
        metadata: {
          numChunks: imageDocuments.length,
          totalImageSize: totalImageSize,
          compressed: compress !== 'false',
        },
        status: 'completed',
      });

      await conversion.save();
      Logger.info('CONVERSION', `✅ Conversion completed: ${conversionId}`);

      // Clean up temp files
      await fs.unlink(audioFile.path).catch(() => {});
      await fs.unlink(result.zipFilePath).catch(() => {});

      Logger.info('CONVERSION', `✅ Temp files cleaned up`);

      // Return success response
      res.json({
        success: true,
        conversionId: conversionId,
        userId: userId,
        originalFileName: audioFile.originalname,
        numImages: imageDocuments.length,
        totalSize: totalImageSize,
        message: 'Audio successfully encrypted and stored in GridFS',
      });

    } catch (error: any) {
      Logger.error('CONVERSION', `❌ Conversion error: ${error.message}`);
      
      // Clean up temp files on error
      if (audioFile?.path) {
        await fs.unlink(audioFile.path).catch(() => {});
      }
      
      throw error;
    }

  } catch (error: any) {
    Logger.error('CONVERSION', `❌ Controller error: ${error.message}`);
    next(error);
  }
};

/**
 * Image to Audio with GridFS Retrieval
 * Retrieves encrypted images from GridFS and decrypts to audio
 */
export const imageToAudioGridFS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, conversionId } = req.body;

    Logger.info('CONVERSION', `📥 Received decode request`, { 
      userId, 
      conversionId,
      body: req.body 
    });

    // Validate inputs
    if (!userId || !conversionId) {
      Logger.warn('CONVERSION', `❌ Missing required fields`, { userId, conversionId });
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide both userId and conversionId',
      });
      return;
    }

    Logger.info('CONVERSION', `🔄 Decoding request: ${conversionId}`, { userId });

    // Find the conversion (include masterKey field)
    Logger.info('CONVERSION', `🔍 Searching for conversion in database...`);
    const conversion = await Conversion.findOne({
      conversionId: conversionId,
      userId: userId, // Security: ensure user owns this conversion
    }).select('+masterKey');

    Logger.info('CONVERSION', `📊 Database query result`, { 
      found: !!conversion,
      conversionId: conversion?.conversionId,
      userId: conversion?.userId,
      status: conversion?.status 
    });

    if (!conversion) {
      Logger.warn('CONVERSION', `❌ Conversion not found or access denied`, { userId, conversionId });
      res.status(404).json({
        success: false,
        error: 'Conversion not found',
        message: 'Conversion not found or you do not have access to it.',
      });
      return;
    }

    if (conversion.status !== 'completed') {
      Logger.warn('CONVERSION', `❌ Conversion status: ${conversion.status}`);
      res.status(400).json({
        success: false,
        error: `Conversion is ${conversion.status}`,
        message: `Cannot decode. Conversion status: ${conversion.status}`,
      });
      return;
    }

    Logger.info('CONVERSION', `✅ Conversion found: ${conversion.originalFileName}`, {
      numImages: conversion.images.length,
    });

    // Decrypt the master key
    let masterKey: string;
    try {
      masterKey = EncryptionService.decryptMasterKey(conversion.masterKey);
      Logger.info('CONVERSION', `✅ Master key decrypted successfully`);
    } catch (error: any) {
      Logger.error('CONVERSION', `❌ Master key decryption failed: ${error.message}`);
      throw new Error(`Master key decryption failed: ${error.message}`);
    }

    // Download ZIP file from GridFS
    Logger.info('CONVERSION', `📥 Downloading ZIP from GridFS: ${conversion.zipFileId}`);
    let zipBuffer: Buffer;
    try {
      zipBuffer = await downloadFromGridFS(conversion.zipFileId.toString());
      Logger.info('CONVERSION', `✅ ZIP downloaded: ${zipBuffer.length} bytes`);
    } catch (error: any) {
      Logger.error('CONVERSION', `❌ GridFS download failed: ${error.message}`);
      throw new Error(`GridFS download failed: ${error.message}`);
    }

    // Save to temp file for FastAPI
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempZipPath = path.join(tempDir, `${conversionId}.zip`);
    
    try {
      await fs.writeFile(tempZipPath, zipBuffer);
      Logger.info('CONVERSION', `✅ ZIP saved to temp: ${tempZipPath}`);
    } catch (error: any) {
      Logger.error('CONVERSION', `❌ Failed to save ZIP to temp: ${error.message}`);
      throw new Error(`Failed to save temp file: ${error.message}`);
    }

    // Call FastAPI to decode images → audio
    Logger.info('CONVERSION', `🔄 Calling FastAPI decode with userId=${userId}, masterKey=${masterKey.substring(0, 10)}...`);
    const result = await fastApiClient.decodeImageToAudio({
      encryptedZipPath: tempZipPath,
      userId: userId,
      masterKey: masterKey,
      outputFilename: conversion.originalFileName,
    });

    Logger.info('CONVERSION', `📊 FastAPI result: success=${result.success}, audioPath=${result.audioFilePath}`);

    if (!result.success || !result.audioFilePath) {
      Logger.error('CONVERSION', `❌ FastAPI decoding failed: ${result.error}`);
      throw new Error(result.error || 'FastAPI decoding failed');
    }

    Logger.info('CONVERSION', `✅ FastAPI decoding complete: ${result.audioFilePath}`);

    // Send audio file back to client
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${conversion.originalFileName}"`);

    const audioStream = require('fs').createReadStream(result.audioFilePath);
    audioStream.pipe(res);

    // Clean up temp files after response sent
    audioStream.on('end', async () => {
      await fs.unlink(tempZipPath).catch(() => {});
      if (result.audioFilePath) {
        await fs.unlink(result.audioFilePath).catch(() => {});
      }
      Logger.info('CONVERSION', `✅ Temp files cleaned up`);
    });

  } catch (error: any) {
    Logger.error('CONVERSION', `❌ Decode error: ${error.message}`, {
      stack: error.stack,
      userId: req.body.userId,
      conversionId: req.body.conversionId
    });
    
    // Send detailed error response
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all conversions for a user
 */
export const getUserConversions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID required',
      });
      return;
    }

    Logger.info('CONVERSION', `📋 Fetching conversions for user: ${userId}`);

    // Find all completed conversions for this user
    const conversions = await Conversion.find({
      userId: userId,
      status: 'completed',
    })
      .select('-masterKey') // Exclude master key
      .sort({ createdAt: -1 }) // Newest first
      .limit(100);

    Logger.info('CONVERSION', `✅ Found ${conversions.length} conversions`);

    // Format response
    const formattedConversions = conversions.map((conv) => ({
      conversionId: conv.conversionId,
      originalFileName: conv.originalFileName,
      fileSize: conv.originalFileSize,
      audioFormat: conv.audioFormat,
      numImages: conv.images.length,
      totalImageSize: conv.metadata.totalImageSize,
      compressed: conv.metadata.compressed,
      createdAt: conv.createdAt,
      createdAgo: formatTimeAgo(conv.createdAt),
      fileSizeReadable: formatFileSize(conv.originalFileSize),
    }));

    res.json({
      success: true,
      userId: userId,
      totalConversions: formattedConversions.length,
      conversions: formattedConversions,
    });

  } catch (error: any) {
    Logger.error('CONVERSION', `❌ List conversions error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete a conversion (ZIP and all images from GridFS)
 */
export const deleteConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, conversionId } = req.params;

    const conversion = await Conversion.findOne({
      conversionId: conversionId,
      userId: userId,
    });

    if (!conversion) {
      res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
      return;
    }

    Logger.info('CONVERSION', `🗑️ Deleting conversion: ${conversionId}`);

    // Delete ZIP from GridFS
    await deleteFromGridFS(conversion.zipFileId);

    // Delete all images from GridFS
    for (const image of conversion.images) {
      await deleteFromGridFS(image.fileId);
    }

    // Delete conversion record from MongoDB
    await Conversion.deleteOne({ _id: conversion._id });

    Logger.info('CONVERSION', `✅ Conversion deleted: ${conversionId}`);

    res.json({
      success: true,
      message: 'Conversion deleted successfully',
    });

  } catch (error: any) {
    Logger.error('CONVERSION', `❌ Delete error: ${error.message}`);
    next(error);
  }
};

/**
 * Download ZIP file from GridFS
 */
export const downloadConversionZip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, conversionId } = req.params;

    const conversion = await Conversion.findOne({
      conversionId: conversionId,
      userId: userId,
    });

    if (!conversion) {
      res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
      return;
    }

    if (!conversion.zipFileId) {
      res.status(404).json({
        success: false,
        error: 'ZIP file not found',
      });
      return;
    }

    Logger.info('CONVERSION', `📥 Downloading ZIP: ${conversionId}`);

    // Download ZIP from GridFS
    const zipBuffer = await downloadFromGridFS(conversion.zipFileId.toString());

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="encrypted_${conversionId}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);

    // Send ZIP file
    res.send(zipBuffer);

    Logger.info('CONVERSION', `✅ ZIP downloaded: ${zipBuffer.length} bytes`);

  } catch (error: any) {
    Logger.error('CONVERSION', `❌ Download ZIP error: ${error.message}`);
    next(error);
  }
};
