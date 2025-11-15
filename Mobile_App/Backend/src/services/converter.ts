import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
export class AudioImageConverter {
  private pythonScriptPath: string;
  private uploadsDir: string;
  private outputDir: string;

  constructor(pythonScriptPath: string, uploadsDir: string) {
    this.pythonScriptPath = pythonScriptPath;
    this.uploadsDir = uploadsDir;
    this.outputDir = path.join(uploadsDir, 'conversions');
  }

  /**
   * Ensure output directories exist
   */
  async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
      throw error;
    }
  }

  /**
   * Convert audio file to image(s)
   */
  async audioToImage(
    inputFilePath: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      await this.ensureDirectories();

      // Create unique output directory for this conversion
      const conversionId = uuidv4();
      const outputPath = path.join(this.outputDir, `audio-to-image-${conversionId}`);
      await fs.mkdir(outputPath, { recursive: true });

      // Validate input file exists
      try {
        await fs.access(inputFilePath);
      } catch {
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
      } else {
        return {
          success: false,
          message: 'Audio to image conversion failed',
          error: result.error,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
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
  async imageToAudio(
    inputDirPath: string,
    outputFileName: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      await this.ensureDirectories();

      // Validate input directory exists
      try {
        await fs.access(inputDirPath);
      } catch {
        return {
          success: false,
          message: 'Input image directory not found',
          error: `Directory not found: ${inputDirPath}`,
          duration: Date.now() - startTime
        };
      }

      // Output file path
      const outputPath = path.join(this.outputDir, outputFileName);

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
      } else {
        return {
          success: false,
          message: 'Image to audio conversion failed',
          error: result.error,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
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
  private executePython(args: string[]): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      console.log(`[CONVERTER] Executing: python ${this.pythonScriptPath} ${args.join(' ')}`);

      const python = spawn('python', [this.pythonScriptPath, ...args], {
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
        } else {
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
  async listConversionImages(conversionPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(conversionPath);
      return files.filter(f => f.endsWith('.png') || f.endsWith('.tiff'));
    } catch (error) {
      console.error('Error listing conversion images:', error);
      return [];
    }
  }

  /**
   * Get conversion result files
   */
  async getConversionResults(conversionId: string): Promise<{ files: string[]; path: string } | null> {
    try {
      const conversionPath = path.join(this.outputDir, `audio-to-image-${conversionId}`);
      const files = await this.listConversionImages(conversionPath);
      return { files, path: conversionPath };
    } catch (error) {
      console.error('Error getting conversion results:', error);
      return null;
    }
  }
}

export default AudioImageConverter;
