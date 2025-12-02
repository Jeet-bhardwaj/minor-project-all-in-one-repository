import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import Logger from '../utils/logger';

export interface EncodeRequest {
  audioFilePath: string;
  userId: string;
  masterKey: string;
  compress?: boolean;
  maxChunkBytes?: number;
  maxWidth?: number;
}

export interface EncodeResponse {
  success: boolean;
  message?: string;
  zipFilePath?: string;
  error?: string;
}

export interface DecodeRequest {
  encryptedZipPath: string;
  userId: string;
  masterKey: string;
  outputFilename?: string;
}

export interface DecodeResponse {
  success: boolean;
  message?: string;
  audioFilePath?: string;
  error?: string;
}

/**
 * FastAPI Client Service
 * Handles communication with the AudioImageCarrier FastAPI backend
 */
export class FastApiClient {
  private client: AxiosInstance;
  private tempDir: string;

  constructor(baseUrl: string, apiKey: string, tempDir: string = './uploads/temp') {
    this.tempDir = tempDir;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 300000, // 5 minutes timeout
      headers: {
        'X-API-Key': apiKey,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    Logger.info('FASTAPI', `Initialized FastAPI client: ${baseUrl}`);
  }

  /**
   * Check if FastAPI backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      Logger.debug('FASTAPI', 'Health check successful', response.data);
      return response.data.status === 'healthy';
    } catch (error) {
      Logger.error('FASTAPI', `Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Encode audio file to encrypted images (ZIP)
   */
  async encodeAudioToImage(request: EncodeRequest): Promise<EncodeResponse> {
    try {
      Logger.info('FASTAPI', `Encoding audio to image: ${request.audioFilePath}`);

      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Validate input file exists
      try {
        await fs.access(request.audioFilePath);
      } catch (error) {
        return {
          success: false,
          error: `Audio file not found: ${request.audioFilePath}`,
        };
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', createReadStream(request.audioFilePath));
      formData.append('user_id', request.userId);
      formData.append('master_key', request.masterKey);

      if (request.compress !== undefined) {
        formData.append('compress', String(request.compress));
      }

      if (request.maxChunkBytes) {
        formData.append('max_chunk_bytes', String(request.maxChunkBytes));
      }

      if (request.maxWidth) {
        formData.append('max_width', String(request.maxWidth));
      }

      // Make request to FastAPI
      const response: AxiosResponse = await this.client.post('/api/v1/encode', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer', // Receive ZIP as binary
      });

      // Save the ZIP file
      const zipFilename = `encoded_${Date.now()}.zip`;
      const zipFilePath = path.join(this.tempDir, zipFilename);
      await fs.writeFile(zipFilePath, response.data);

      Logger.info('FASTAPI', `Audio encoded successfully: ${zipFilePath}`);

      return {
        success: true,
        message: 'Audio converted to image successfully',
        zipFilePath: zipFilePath,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data
        ? Buffer.from(error.response.data).toString('utf-8')
        : error.message;

      Logger.error('FASTAPI', `Encode error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage || 'Unknown error during encoding',
      };
    }
  }

  /**
   * Decode encrypted images (ZIP) to audio file
   */
  async decodeImageToAudio(request: DecodeRequest): Promise<DecodeResponse> {
    try {
      Logger.info('FASTAPI', `Decoding image to audio: ${request.encryptedZipPath}`);

      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Validate input file exists
      try {
        await fs.access(request.encryptedZipPath);
      } catch (error) {
        return {
          success: false,
          error: `Encrypted ZIP file not found: ${request.encryptedZipPath}`,
        };
      }

      // Create form data
      const formData = new FormData();
      formData.append('images', createReadStream(request.encryptedZipPath));
      formData.append('user_id', request.userId);
      formData.append('master_key', request.masterKey);

      if (request.outputFilename) {
        formData.append('output_filename', request.outputFilename);
      }

      // Make request to FastAPI
      const response: AxiosResponse = await this.client.post('/api/v1/decode', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer', // Receive audio file as binary
      });

      // Determine file extension from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `decoded_${Date.now()}.mp3`; // Default

      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Save the audio file
      const audioFilePath = path.join(this.tempDir, filename);
      await fs.writeFile(audioFilePath, response.data);

      Logger.info('FASTAPI', `Image decoded successfully: ${audioFilePath}`);

      return {
        success: true,
        message: 'Image converted to audio successfully',
        audioFilePath: audioFilePath,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data
        ? Buffer.from(error.response.data).toString('utf-8')
        : error.message;

      Logger.error('FASTAPI', `Decode error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage || 'Unknown error during decoding',
      };
    }
  }

  /**
   * Get API information
   */
  async getApiInfo(): Promise<any> {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      Logger.error('FASTAPI', `Failed to get API info: ${error}`);
      return null;
    }
  }
}

// Singleton instance
let fastApiClientInstance: FastApiClient | null = null;

/**
 * Get or create FastAPI client instance
 */
export function getFastApiClient(): FastApiClient {
  if (!fastApiClientInstance) {
    const baseUrl = process.env.FASTAPI_BASE_URL || 'https://minor-project-all-in-one-repository.vercel.app';
    const apiKey = process.env.FASTAPI_API_KEY || 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk';
    const tempDir = process.env.UPLOAD_DIR || './uploads/temp';

    fastApiClientInstance = new FastApiClient(baseUrl, apiKey, tempDir);
  }

  return fastApiClientInstance;
}

export default FastApiClient;
