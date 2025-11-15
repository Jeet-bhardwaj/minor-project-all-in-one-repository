"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioImageConverter = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
/**
 * Audio to Image Conversion Service
 * Uses Python script: audio_image_chunked.py
 */
class AudioImageConverter {
    constructor(pythonScriptPath, uploadsDir) {
        this.pythonScriptPath = pythonScriptPath;
        this.uploadsDir = uploadsDir;
        this.outputDir = path_1.default.join(uploadsDir, 'conversions');
    }
    /**
     * Ensure output directories exist
     */
    async ensureDirectories() {
        try {
            await fs_1.promises.mkdir(this.uploadsDir, { recursive: true });
            await fs_1.promises.mkdir(this.outputDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating directories:', error);
            throw error;
        }
    }
    /**
     * Convert audio file to image(s)
     */
    async audioToImage(inputFilePath, options) {
        const startTime = Date.now();
        try {
            await this.ensureDirectories();
            // Create unique output directory for this conversion
            const conversionId = (0, uuid_1.v4)();
            const outputPath = path_1.default.join(this.outputDir, `audio-to-image-${conversionId}`);
            await fs_1.promises.mkdir(outputPath, { recursive: true });
            // Validate input file exists
            try {
                await fs_1.promises.access(inputFilePath);
            }
            catch {
                return {
                    success: false,
                    message: 'Input audio file not found',
                    error: `File not found: ${inputFilePath}`,
                    duration: Date.now() - startTime
                };
            }
            // Build command arguments
            const args = [
                'encode',
                '--input', inputFilePath,
                '--outdir', outputPath,
                '--user', options.userId,
            ];
            if (options.masterKeyHex) {
                args.push('--master', options.masterKeyHex);
            }
            if (options.maxChunkBytes) {
                args.push('--max-chunk-bytes', String(options.maxChunkBytes));
            }
            if (options.compress === false) {
                args.push('--no-compress');
            }
            if (options.deleteSource) {
                args.push('--delete');
            }
            // Execute Python script
            const result = await this.executePython(args);
            if (result.success) {
                return {
                    success: true,
                    message: 'Audio converted to image successfully',
                    outputPath: outputPath,
                    duration: Date.now() - startTime
                };
            }
            else {
                return {
                    success: false,
                    message: 'Audio to image conversion failed',
                    error: result.error,
                    duration: Date.now() - startTime
                };
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: 'Audio to image conversion error',
                error: errorMsg,
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Convert image(s) back to audio file
     */
    async imageToAudio(inputDirPath, outputFileName, options) {
        const startTime = Date.now();
        try {
            await this.ensureDirectories();
            // Validate input directory exists
            try {
                await fs_1.promises.access(inputDirPath);
            }
            catch {
                return {
                    success: false,
                    message: 'Input image directory not found',
                    error: `Directory not found: ${inputDirPath}`,
                    duration: Date.now() - startTime
                };
            }
            // Output file path
            const outputPath = path_1.default.join(this.outputDir, outputFileName);
            // Build command arguments
            const args = [
                'decode',
                '--indir', inputDirPath,
                '--out', outputPath,
                '--user', options.userId,
            ];
            if (options.masterKeyHex) {
                args.push('--master', options.masterKeyHex);
            }
            // Execute Python script
            const result = await this.executePython(args);
            if (result.success) {
                return {
                    success: true,
                    message: 'Image converted to audio successfully',
                    outputPath: outputPath,
                    duration: Date.now() - startTime
                };
            }
            else {
                return {
                    success: false,
                    message: 'Image to audio conversion failed',
                    error: result.error,
                    duration: Date.now() - startTime
                };
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: 'Image to audio conversion error',
                error: errorMsg,
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Execute Python script and capture output
     */
    executePython(args) {
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            console.log(`[CONVERTER] Executing: python ${this.pythonScriptPath} ${args.join(' ')}`);
            const python = (0, child_process_1.spawn)('python', [this.pythonScriptPath, ...args], {
                timeout: 5 * 60 * 1000 // 5 minutes timeout
            });
            python.stdout?.on('data', (data) => {
                stdout += data.toString();
                console.log(`[CONVERTER] ${data.toString()}`);
            });
            python.stderr?.on('data', (data) => {
                stderr += data.toString();
                console.error(`[CONVERTER ERROR] ${data.toString()}`);
            });
            python.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                resolve({
                    success: false,
                    error: `Failed to start converter: ${error.message}`
                });
            });
            python.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true });
                }
                else {
                    resolve({
                        success: false,
                        error: `Python script exited with code ${code}: ${stderr}`
                    });
                }
            });
        });
    }
    /**
     * List all images in a conversion directory
     */
    async listConversionImages(conversionPath) {
        try {
            const files = await fs_1.promises.readdir(conversionPath);
            return files.filter(f => f.endsWith('.png') || f.endsWith('.tiff'));
        }
        catch (error) {
            console.error('Error listing conversion images:', error);
            return [];
        }
    }
    /**
     * Get conversion result files
     */
    async getConversionResults(conversionId) {
        try {
            const conversionPath = path_1.default.join(this.outputDir, `audio-to-image-${conversionId}`);
            const files = await this.listConversionImages(conversionPath);
            return { files, path: conversionPath };
        }
        catch (error) {
            console.error('Error getting conversion results:', error);
            return null;
        }
    }
}
exports.AudioImageConverter = AudioImageConverter;
exports.default = AudioImageConverter;
//# sourceMappingURL=converter.js.map