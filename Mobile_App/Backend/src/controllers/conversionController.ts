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

    // Support both audio-to-image-{id} and image-to-audio-{id} formats
    let filePath = path.join(__dirname, '../../uploads/conversions', `audio-to-image-${conversionId}`, fileName);
    
    // Check if file exists in audio-to-image directory
    try {
      await fs.access(filePath);
    } catch {
      // Try image-to-audio directory
      filePath = path.join(__dirname, '../../uploads/conversions', `image-to-audio-${conversionId}`, fileName);
      try {
        await fs.access(filePath);
      } catch {
        // Try without prefix (legacy)
        filePath = path.join(__dirname, '../../uploads/conversions', conversionId, fileName);
      }
    }
    
    const normalizedPath = path.normalize(filePath);

    // Security check: ensure file is within conversions directory
    const conversionsDir = path.normalize(path.join(__dirname, '../../uploads/conversions'));
    if (!normalizedPath.startsWith(conversionsDir)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'File access denied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // File access already checked above, now send it
    try {
      await fs.access(normalizedPath);
      
      Logger.info('DOWNLOAD', `Serving file: ${fileName} from ${normalizedPath}`);
      res.download(normalizedPath, fileName);
    } catch (error) {
      Logger.error('DOWNLOAD', `File not found: ${fileName} in conversion ${conversionId}`);
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

/**
 * Download Conversion as ZIP Controller
 */
export async function downloadConversionZipController(req: ConversionRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversionId } = req.params;

    if (!conversionId) {
      res.status(400).json({
        error: 'Missing conversionId',
        message: 'Please provide conversionId',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find the conversion directory
    let conversionDir = path.join(__dirname, '../../uploads/conversions', `audio-to-image-${conversionId}`);
    
    // Check if directory exists
    try {
      await fs.access(conversionDir);
    } catch {
      // Try image-to-audio directory
      conversionDir = path.join(__dirname, '../../uploads/conversions', `image-to-audio-${conversionId}`);
      try {
        await fs.access(conversionDir);
      } catch {
        // Try without prefix (legacy)
        conversionDir = path.join(__dirname, '../../uploads/conversions', conversionId);
      }
    }

    const normalizedPath = path.normalize(conversionDir);
    const conversionsDir = path.normalize(path.join(__dirname, '../../uploads/conversions'));
    
    // Security check
    if (!normalizedPath.startsWith(conversionsDir)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Directory access denied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
    } catch (error) {
      Logger.error('DOWNLOAD', `Conversion directory not found: ${conversionId}`);
      res.status(404).json({
        error: 'Conversion not found',
        message: `Conversion ${conversionId} not found`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Create ZIP file
    Logger.info('DOWNLOAD', `Creating ZIP for conversion: ${conversionId}`);
    const zip = new AdmZip();
    
    // Read all files in the directory
    const files = await fs.readdir(normalizedPath);
    
    for (const file of files) {
      const filePath = path.join(normalizedPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        zip.addLocalFile(filePath);
      }
    }

    // Generate ZIP buffer
    const zipBuffer = zip.toBuffer();
    const zipFileName = `encrypted_${conversionId}.zip`;

    Logger.info('DOWNLOAD', `Serving ZIP: ${zipFileName} (${zipBuffer.length} bytes)`);

    // Send ZIP file
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);

  } catch (error) {
    Logger.error('DOWNLOAD', `ZIP download error: ${error instanceof Error ? error.message : String(error)}`);
    next(error);
  }
}

export default {
  audioToImageController,
  imageToAudioController,
  getConversionStatusController,
  listConversionsController,
  downloadConversionController,
  downloadConversionZipController
};
