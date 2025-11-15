export interface ConversionOptions {
    userId: string;
    masterKeyHex?: string;
    maxChunkBytes?: number;
    compress?: boolean;
    deleteSource?: boolean;
}
export interface ConversionResult {
    success: boolean;
    message: string;
    outputPath?: string;
    error?: string;
    duration?: number;
}
/**
 * Audio to Image Conversion Service
 * Uses Python script: audio_image_chunked.py
 */
export declare class AudioImageConverter {
    private pythonScriptPath;
    private uploadsDir;
    private outputDir;
    constructor(pythonScriptPath: string, uploadsDir: string);
    /**
     * Ensure output directories exist
     */
    ensureDirectories(): Promise<void>;
    /**
     * Convert audio file to image(s)
     */
    audioToImage(inputFilePath: string, options: ConversionOptions): Promise<ConversionResult>;
    /**
     * Convert image(s) back to audio file
     */
    imageToAudio(inputDirPath: string, outputFileName: string, options: ConversionOptions): Promise<ConversionResult>;
    /**
     * Execute Python script and capture output
     */
    private executePython;
    /**
     * List all images in a conversion directory
     */
    listConversionImages(conversionPath: string): Promise<string[]>;
    /**
     * Get conversion result files
     */
    getConversionResults(conversionId: string): Promise<{
        files: string[];
        path: string;
    } | null>;
}
export default AudioImageConverter;
//# sourceMappingURL=converter.d.ts.map