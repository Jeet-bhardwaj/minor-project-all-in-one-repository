import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  audioToImageController,
  imageToAudioController,
  getConversionStatusController,
  listConversionsController,
  downloadConversionController,
  downloadConversionZipController
} from '../controllers/conversionController';

// Import GridFS controllers
import {
  audioToImageGridFS,
  imageToAudioGridFS,
  getUserConversions,
  deleteConversion,
  downloadConversionZip
} from '../controllers/gridfsConversionController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uuidv4()}${ext}`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept audio files (mp3, wav, flac, m4a)
  const allowedMimes = [
    'audio/mpeg',           // mp3
    'audio/wav',            // wav
    'audio/x-wav',
    'audio/flac',           // flac
    'audio/x-flac',
    'audio/mp4',            // m4a
    'audio/x-m4a'
  ];

  // Accept image files (png, jpg, jpeg, tiff)
  const imageMimes = [
    'image/png',
    'image/jpeg',
    'image/tiff',
    'image/x-tiff'
  ];

  if ([...allowedMimes, ...imageMimes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only audio (mp3, wav, flac, m4a) and image (png, jpg, tiff) files are allowed.`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  }
});

// Error handler middleware for multer
const multerErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 500MB',
        timestamp: new Date().toISOString()
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time',
        timestamp: new Date().toISOString()
      });
      return;
    }
  } else if (err && err.message) {
    res.status(400).json({
      error: 'Upload error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
    return;
  }
  next(err);
};

/**
 * POST /api/convert/audio-to-image
 * Convert audio file to image(s)
 * 
 * Request:
 *   - multipart/form-data with audio file
 *   - body: { userId?, masterKeyHex?, compress?, deleteSource? }
 * 
 * Response:
 *   - success: true/false
 *   - conversionId: unique conversion identifier
 *   - images: array of generated image filenames
 *   - imageCount: number of images generated
 */
router.post(
  '/convert/audio-to-image',
  upload.single('audioFile'),
  multerErrorHandler,
  audioToImageController
);

/**
 * POST /api/convert/image-to-audio
 * Convert image(s) back to audio file
 * 
 * Request Body:
 *   - imageDirPath: path to directory containing images
 *   - outputFileName: name for output audio file
 *   - userId?: user identifier
 *   - masterKeyHex?: encryption master key
 * 
 * Response:
 *   - success: true/false
 *   - conversionId: unique conversion identifier
 *   - outputFile: generated audio filename
 *   - outputPath: full path to output file
 */
router.post(
  '/convert/image-to-audio',
  imageToAudioController
);

/**
 * GET /api/conversions
 * List all conversions
 * 
 * Response:
 *   - count: number of conversions
 *   - conversions: array of conversion directory names
 */
router.get(
  '/conversions',
  listConversionsController
);

/**
 * GET /api/conversions/:conversionId
 * Get status and files for a specific conversion
 * 
 * Response:
 *   - conversionId: conversion identifier
 *   - results: { files, path }
 */
router.get(
  '/conversions/:conversionId',
  getConversionStatusController
);

/**
 * GET /api/conversions/:conversionId/download-zip
 * Download all files from a conversion as a ZIP archive
 * IMPORTANT: This must come BEFORE the /:fileName route
 */
router.get(
  '/conversions/:conversionId/download-zip',
  downloadConversionZipController
);

/**
 * GET /api/conversions/:conversionId/:fileName
 * Download a specific file from a conversion
 */
router.get(
  '/conversions/:conversionId/:fileName',
  downloadConversionController
);

/**
 * ============================================
 * GridFS-based Conversion Routes (NEW)
 * ============================================
 */

/**
 * POST /api/v2/audio-to-image
 * Convert audio to encrypted images using GridFS storage
 */
router.post(
  '/v2/audio-to-image',
  upload.single('audio'),
  audioToImageGridFS
);

/**
 * POST /api/v2/image-to-audio
 * Convert encrypted images back to audio using GridFS retrieval
 */
router.post(
  '/v2/image-to-audio',
  imageToAudioGridFS
);

/**
 * GET /api/v2/user/:userId/conversions
 * Get all conversions for a specific user
 */
router.get(
  '/v2/user/:userId/conversions',
  getUserConversions
);

/**
 * DELETE /api/v2/conversions/:userId/:conversionId
 * Delete a conversion and all associated files from GridFS
 */
router.delete(
  '/v2/conversions/:userId/:conversionId',
  deleteConversion
);

/**
 * GET /api/v2/conversions/:userId/:conversionId/download-zip
 * Download ZIP file from GridFS for a specific conversion
 */
router.get(
  '/v2/conversions/:userId/:conversionId/download-zip',
  downloadConversionZip
);

export default router;
