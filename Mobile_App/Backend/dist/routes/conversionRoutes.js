"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importStar(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const conversionController_1 = require("../controllers/conversionController");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads/temp'));
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${name}_${(0, uuid_1.v4)()}${ext}`);
    }
});
const fileFilter = (_req, file, cb) => {
    // Accept audio files (mp3, wav, flac, m4a)
    const allowedMimes = [
        'audio/mpeg', // mp3
        'audio/wav', // wav
        'audio/x-wav',
        'audio/flac', // flac
        'audio/x-flac',
        'audio/mp4', // m4a
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
    }
    else {
        cb(new Error(`Invalid file type. Only audio (mp3, wav, flac, m4a) and image (png, jpg, tiff) files are allowed.`));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max file size
    }
});
// Error handler middleware for multer
const multerErrorHandler = (err, _req, res, next) => {
    if (err instanceof multer_1.MulterError) {
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
    }
    else if (err && err.message) {
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
router.post('/convert/audio-to-image', upload.single('audioFile'), multerErrorHandler, conversionController_1.audioToImageController);
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
router.post('/convert/image-to-audio', conversionController_1.imageToAudioController);
/**
 * GET /api/conversions
 * List all conversions
 *
 * Response:
 *   - count: number of conversions
 *   - conversions: array of conversion directory names
 */
router.get('/conversions', conversionController_1.listConversionsController);
/**
 * GET /api/conversions/:conversionId
 * Get status and files for a specific conversion
 *
 * Response:
 *   - conversionId: conversion identifier
 *   - results: { files, path }
 */
router.get('/conversions/:conversionId', conversionController_1.getConversionStatusController);
/**
 * GET /api/conversions/:conversionId/:fileName
 * Download a specific file from a conversion
 */
router.get('/conversions/:conversionId/:fileName', conversionController_1.downloadConversionController);
exports.default = router;
//# sourceMappingURL=conversionRoutes.js.map