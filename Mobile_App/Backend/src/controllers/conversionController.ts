import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getFastApiClient } from '../services/fastApiClient';
import KeyManagementService from '../services/keyManagement';
import ConversionTaskService from '../services/conversionTask';
import Logger from '../utils/logger';
import AdmZip from 'adm-zip';

// Initialize FastAPI client
const fastApiClient = getFastApiClient();

export interface ConversionRequest extends Request {
  userId?: string;
  conversionId?: string;
  file?: any;
}

/**
 * Audio to Image Conversion Controller
 */
export async function audioToImageController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId = 'default-user', masterKeyHex, maxChunkBytes, compress, deleteSource } = req.body;
    const conversionId = uuidv4();

    // Validate file upload
    if (!req.file) {
      Logger.warn('CONVERSION', 'No audio file provided', { userId });
      res.status(400).json({
        error: 'No audio file provided',
        message: 'Please upload an audio file to convert to image',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const inputPath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    Logger.info('CONVERSION', `Starting audio-to-image conversion: ${fileName}`, {
      userId,
      conversionId,
    });

    // Create conversion task in database
    await ConversionTaskService.createTask(
      conversionId,
      userId,
      fileName,
      fileSize,
      'audio-to-image',
      { compress: compress !== false, deleteSource: deleteSource === true, metadata: { masterKeyHex } }
    );

    // Update task status to processing
    await ConversionTaskService.updateStatus(conversionId, 'processing');

    // Get master key from database or environment
    let effectiveMasterKeyHex = masterKeyHex;
    if (!effectiveMasterKeyHex) {
      effectiveMasterKeyHex = await KeyManagementService.getMasterKey();
    }

    // Validate master key format (64 hex characters)
    if (!effectiveMasterKeyHex || !/^[0-9a-fA-F]{64}$/.test(effectiveMasterKeyHex)) {
      await ConversionTaskService.updateStatus(conversionId, 'failed', {
        error: 'Invalid master key format',
      });
      res.status(400).json({
        success: false,
        error: 'Invalid master key',
        message: 'Master key must be 64 hexadecimal characters',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Call FastAPI to encode audio to image
    const result = await fastApiClient.encodeAudioToImage({
      audioFilePath: inputPath,
      userId,
      masterKey: effectiveMasterKeyHex,
      compress: compress !== false,
      maxChunkBytes: maxChunkBytes ? parseInt(maxChunkBytes) : undefined,
    });

    if (result.success && result.zipFilePath) {
      // Extract the ZIP file to conversions directory
      const conversionsDir = path.join(__dirname, '../../uploads/conversions');
      const outputDir = path.join(conversionsDir, `audio-to-image-${conversionId}`);
      await fs.mkdir(outputDir, { recursive: true });

      // Extract ZIP
      const zip = new AdmZip(result.zipFilePath);
      zip.extractAllTo(outputDir, true);

      // Get list of extracted PNG files
      const extractedFiles = await fs.readdir(outputDir);
      const pngFiles = extractedFiles.filter(f => f.endsWith('.png'));

      // Clean up temporary files
      if (deleteSource) {
        try {
          await fs.unlink(inputPath);
        } catch (error) {
          Logger.warn('CONVERSION', `Failed to delete source file: ${inputPath}`);
        }
      }

      try {
        await fs.unlink(result.zipFilePath);
      } catch (error) {
        Logger.warn('CONVERSION', `Failed to delete temp ZIP: ${result.zipFilePath}`);
      }

      // Update task status to completed
      await ConversionTaskService.updateStatus(conversionId, 'completed', {
        outputPath: outputDir,
        outputFiles: pngFiles,
      });

      Logger.info('CONVERSION', `Audio-to-image conversion completed: ${conversionId}`, {
        userId,
        conversionId,
        imageCount: pngFiles.length,
      });

      res.status(200).json({
        success: true,
        message: 'Audio converted to image successfully',
        conversionId: conversionId,
        inputFile: fileName,
        outputPath: outputDir,
        imageCount: pngFiles.length,
        images: pngFiles,
        timestamp: new Date().toISOString()
      });
    } else {
      // Update task status to failed
      await ConversionTaskService.updateStatus(conversionId, 'failed', {
        error: result.error,
      });

      Logger.error('CONVERSION', `Audio-to-image conversion failed: ${result.error}`, {
        userId,
        conversionId,
      });

      res.status(500).json({
        success: false,
        error: result.error || 'Unknown error',
        message: result.error || 'Conversion failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    Logger.error('CONVERSION', `Conversion controller error: ${errorMsg}`, { userId: req.body?.userId });
    next(error);
  }
}

/**
 * Image to Audio Conversion Controller
 */
export async function imageToAudioController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId = 'default-user', masterKeyHex, conversionId: existingConversionId, outputFileName } = req.body;
    const conversionId = uuidv4();

    // Validate input
    if (!existingConversionId || !outputFileName) {
      res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide conversionId (from audio-to-image) and outputFileName',
        timestamp: new Date().toISOString()
      });
      return;
    }

    Logger.info('CONVERSION', `Starting image-to-audio conversion from: ${existingConversionId}`, {
      userId,
      conversionId,
    });

    // Get master key from database or environment
    let effectiveMasterKeyHex = masterKeyHex;
    if (!effectiveMasterKeyHex) {
      effectiveMasterKeyHex = await KeyManagementService.getMasterKey();
    }

    // Validate master key format
    if (!effectiveMasterKeyHex || !/^[0-9a-fA-F]{64}$/.test(effectiveMasterKeyHex)) {
      res.status(400).json({
        success: false,
        error: 'Invalid master key',
        message: 'Master key must be 64 hexadecimal characters',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find the conversion directory
    const conversionsDir = path.join(__dirname, '../../uploads/conversions');
    const imageDirPath = path.join(conversionsDir, `audio-to-image-${existingConversionId}`);

    // Verify directory exists
    try {
      await fs.access(imageDirPath);
    } catch {
      res.status(404).json({
        error: 'Conversion not found',
        message: `No conversion found with ID: ${existingConversionId}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Create a ZIP file from the images directory
    const tempZipPath = path.join(__dirname, '../../uploads/temp', `temp_${Date.now()}.zip`);
    const zip = new AdmZip();
    
    // Add all files from the conversion directory
    const files = await fs.readdir(imageDirPath);
    for (const file of files) {
      const filePath = path.join(imageDirPath, file);
      zip.addLocalFile(filePath);
    }
    
    // Write the ZIP file
    zip.writeZip(tempZipPath);

    Logger.debug('CONVERSION', `Created temporary ZIP for decoding: ${tempZipPath}`);

    // Call FastAPI to decode image to audio
    const result = await fastApiClient.decodeImageToAudio({
      encryptedZipPath: tempZipPath,
      userId,
      masterKey: effectiveMasterKeyHex,
      outputFilename: outputFileName,
    });

    // Clean up temporary ZIP
    try {
      await fs.unlink(tempZipPath);
    } catch (error) {
      Logger.warn('CONVERSION', `Failed to delete temp ZIP: ${tempZipPath}`);
    }

    if (result.success && result.audioFilePath) {
      // Move the audio file to conversions directory
      const outputDir = path.join(conversionsDir, `image-to-audio-${conversionId}`);
      await fs.mkdir(outputDir, { recursive: true });
      
      const finalAudioPath = path.join(outputDir, outputFileName);
      await fs.rename(result.audioFilePath, finalAudioPath);

      Logger.info('CONVERSION', `Image-to-audio conversion completed: ${conversionId}`, {
        userId,
        conversionId,
        outputFile: outputFileName,
      });

      res.status(200).json({
        success: true,
        message: 'Image converted to audio successfully',
        conversionId: conversionId,
        outputFile: outputFileName,
        outputPath: finalAudioPath,
        timestamp: new Date().toISOString()
      });
    } else {
      Logger.error('CONVERSION', `Image-to-audio conversion failed: ${result.error}`, {
        userId,
        conversionId,
      });

      res.status(500).json({
        success: false,
        error: result.error || 'Unknown error',
        message: result.error || 'Conversion failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    Logger.error('CONVERSION', `Image-to-audio controller error: ${errorMsg}`, { userId: req.body?.userId });
    next(error);
  }
}

/**
 * Get Conversion Status Controller
 */
export async function getConversionStatusController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversionId } = req.params;

    if (!conversionId) {
      res.status(400).json({
        error: 'Conversion ID required',
        message: 'Please provide a valid conversion ID',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Look for the conversion in both audio-to-image and image-to-audio directories
    const conversionsDir = path.join(__dirname, '../../uploads/conversions');
    const possiblePaths = [
      path.join(conversionsDir, `audio-to-image-${conversionId}`),
      path.join(conversionsDir, `image-to-audio-${conversionId}`)
    ];

    let foundPath: string | null = null;
    let files: string[] = [];

    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath);
        foundPath = possiblePath;
        files = await fs.readdir(possiblePath);
        break;
      } catch {
        // Continue checking
      }
    }

    if (foundPath) {
      res.status(200).json({
        success: true,
        conversionId: conversionId,
        results: {
          path: foundPath,
          files: files,
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Conversion not found',
        message: `No conversion found with ID: ${conversionId}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * List All Conversions Controller
 */
export async function listConversionsController(_req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversionsDir = path.join(__dirname, '../../../uploads/conversions');
    
    try {
      const items = await fs.readdir(conversionsDir);
      const conversions = items.filter(item => 
        item.startsWith('audio-to-image-') || item.startsWith('image-to-audio-')
      );

      res.status(200).json({
        success: true,
        count: conversions.length,
        conversions: conversions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(200).json({
        success: true,
        count: 0,
        conversions: [],
        message: 'No conversions found yet',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Download Conversion File Controller
 */
export async function downloadConversionController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversionId, fileName } = req.params;

    if (!conversionId || !fileName) {
      res.status(400).json({
        error: 'Missing parameters',
        message: 'Please provide conversionId and fileName',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const filePath = path.join(__dirname, '../../../uploads/conversions', conversionId, fileName);
    const normalizedPath = path.normalize(filePath);

    // Security check: ensure file is within conversions directory
    const conversionsDir = path.normalize(path.join(__dirname, '../../../uploads/conversions'));
    if (!normalizedPath.startsWith(conversionsDir)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'File access denied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      await fs.access(normalizedPath);
      res.download(normalizedPath, fileName);
    } catch {
      res.status(404).json({
        error: 'File not found',
        message: `File not found: ${fileName}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
}

export default {
  audioToImageController,
  imageToAudioController,
  getConversionStatusController,
  listConversionsController,
  downloadConversionController
};
