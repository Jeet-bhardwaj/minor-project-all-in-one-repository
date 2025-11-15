"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioToImageController = audioToImageController;
exports.imageToAudioController = imageToAudioController;
exports.getConversionStatusController = getConversionStatusController;
exports.listConversionsController = listConversionsController;
exports.downloadConversionController = downloadConversionController;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const converter_1 = __importDefault(require("../services/converter"));
const keyManagement_1 = __importDefault(require("../services/keyManagement"));
const conversionTask_1 = __importDefault(require("../services/conversionTask"));
const logger_1 = __importDefault(require("../utils/logger"));
// Initialize converter with Python script path
const pythonScriptPath = path_1.default.join(__dirname, '../../Python_Script/audio_image_chunked.py');
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
const converter = new converter_1.default(pythonScriptPath, uploadsDir);
/**
 * Audio to Image Conversion Controller
 */
async function audioToImageController(req, res, next) {
    try {
        const { userId = 'default-user', masterKeyHex, maxChunkBytes, compress, deleteSource } = req.body;
        const conversionId = (0, uuid_1.v4)();
        // Validate file upload
        if (!req.file) {
            logger_1.default.warn('CONVERSION', 'No audio file provided', { userId });
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
        logger_1.default.info('CONVERSION', `Starting audio-to-image conversion: ${fileName}`, {
            userId,
            conversionId,
        });
        // Create conversion task in database
        await conversionTask_1.default.createTask(userId, fileName, fileSize, 'audio-to-image', { compress: compress !== false, deleteSource: deleteSource === true, metadata: { masterKeyHex } });
        // Update task status to processing
        await conversionTask_1.default.updateStatus(conversionId, 'processing');
        // Get master key from database or environment
        let effectiveMasterKeyHex = masterKeyHex;
        if (!effectiveMasterKeyHex) {
            effectiveMasterKeyHex = await keyManagement_1.default.getMasterKey();
        }
        // Perform conversion
        const conversionOptions = {
            userId,
            masterKeyHex: effectiveMasterKeyHex,
            maxChunkBytes: maxChunkBytes ? parseInt(maxChunkBytes) : undefined,
            compress: compress !== false,
            deleteSource: deleteSource === true
        };
        const result = await converter.audioToImage(inputPath, conversionOptions);
        if (result.success) {
            // Get list of generated images
            const imageFiles = await fs_1.promises.readdir(result.outputPath);
            const pngFiles = imageFiles.filter(f => f.endsWith('.png'));
            // Update task status to completed
            await conversionTask_1.default.updateStatus(conversionId, 'completed', {
                outputPath: result.outputPath,
                outputFiles: pngFiles,
                duration: result.duration,
            });
            logger_1.default.info('CONVERSION', `Audio-to-image conversion completed: ${conversionId}`, {
                userId,
                conversionId,
                imageCount: pngFiles.length,
                duration: result.duration,
            });
            res.status(200).json({
                success: true,
                message: 'Audio converted to image successfully',
                conversionId: conversionId,
                inputFile: fileName,
                outputPath: result.outputPath,
                imageCount: pngFiles.length,
                images: pngFiles,
                duration: result.duration,
                timestamp: new Date().toISOString()
            });
        }
        else {
            // Update task status to failed
            await conversionTask_1.default.updateStatus(conversionId, 'failed', {
                error: result.error,
            });
            logger_1.default.error('CONVERSION', `Audio-to-image conversion failed: ${result.error}`, {
                userId,
                conversionId,
            });
            res.status(500).json({
                success: false,
                error: result.error || 'Unknown error',
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger_1.default.error('CONVERSION', `Conversion controller error: ${errorMsg}`, { userId: req.body?.userId });
        next(error);
    }
}
/**
 * Image to Audio Conversion Controller
 */
async function imageToAudioController(req, res, next) {
    try {
        const { userId = 'default-user', masterKeyHex, imageDirPath, outputFileName } = req.body;
        const conversionId = (0, uuid_1.v4)();
        // Validate input
        if (!imageDirPath || !outputFileName) {
            res.status(400).json({
                error: 'Missing required parameters',
                message: 'Please provide imageDirPath and outputFileName',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log(`[CONTROLLER] Starting image-to-audio conversion from ${imageDirPath}`);
        // Perform conversion
        const conversionOptions = {
            userId,
            masterKeyHex
        };
        const result = await converter.imageToAudio(imageDirPath, outputFileName, conversionOptions);
        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Image converted to audio successfully',
                conversionId: conversionId,
                outputFile: outputFileName,
                outputPath: result.outputPath,
                duration: result.duration,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error || 'Unknown error',
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get Conversion Status Controller
 */
async function getConversionStatusController(req, res, next) {
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
        const results = await converter.getConversionResults(conversionId);
        if (results) {
            res.status(200).json({
                success: true,
                conversionId: conversionId,
                results: results,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(404).json({
                error: 'Conversion not found',
                message: `No conversion found with ID: ${conversionId}`,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * List All Conversions Controller
 */
async function listConversionsController(_req, res, next) {
    try {
        const conversionsDir = path_1.default.join(__dirname, '../../../uploads/conversions');
        try {
            const items = await fs_1.promises.readdir(conversionsDir);
            const conversions = items.filter(item => item.startsWith('audio-to-image-') || item.startsWith('image-to-audio-'));
            res.status(200).json({
                success: true,
                count: conversions.length,
                conversions: conversions,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(200).json({
                success: true,
                count: 0,
                conversions: [],
                message: 'No conversions found yet',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * Download Conversion File Controller
 */
async function downloadConversionController(req, res, next) {
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
        const filePath = path_1.default.join(__dirname, '../../../uploads/conversions', conversionId, fileName);
        const normalizedPath = path_1.default.normalize(filePath);
        // Security check: ensure file is within conversions directory
        const conversionsDir = path_1.default.normalize(path_1.default.join(__dirname, '../../../uploads/conversions'));
        if (!normalizedPath.startsWith(conversionsDir)) {
            res.status(403).json({
                error: 'Access denied',
                message: 'File access denied',
                timestamp: new Date().toISOString()
            });
            return;
        }
        try {
            await fs_1.promises.access(normalizedPath);
            res.download(normalizedPath, fileName);
        }
        catch {
            res.status(404).json({
                error: 'File not found',
                message: `File not found: ${fileName}`,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        next(error);
    }
}
exports.default = {
    audioToImageController,
    imageToAudioController,
    getConversionStatusController,
    listConversionsController,
    downloadConversionController
};
//# sourceMappingURL=conversionController.js.map