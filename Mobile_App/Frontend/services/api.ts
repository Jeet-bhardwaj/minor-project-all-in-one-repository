import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Configuration
// For physical devices and Expo Go app: use your machine's IP address
// For web/localhost: use localhost
const API_BASE_URL = 
  Platform.OS === 'web' 
    ? (process.env.EXPO_PUBLIC_LOCAL_URL || 'http://localhost:3000/api')
    : (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.67:3000/api');

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    profilePicture?: string;
  };
}

interface FileResponse {
  id: string;
  filename: string;
  fileType: 'audio' | 'image' | 'encrypted';
  size: number;
  fileUrl: string;
  createdAt: string;
}

interface ConversionResponse {
  success: boolean;
  outputFile: {
    url: string;
    filename: string;
    size: number;
  };
}

interface EncryptionResponse {
  success: boolean;
  encryptedFile: {
    url: string;
    filename: string;
    size: number;
    encryptedWith: string;
  };
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - clear auth
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ENDPOINTS ============
export const authApi = {
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  googleAuth: async (googleData: any): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/google', {
      id: googleData.id,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
    });
    return response.data.data;
  },

  getProfile: async () => {
    const response = await apiClient.get<any>('/user/profile');
    return response.data.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.put<any>('/user/profile', data);
    return response.data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post<any>('/user/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// ============ FILE ENDPOINTS ============
export const fileApi = {
  listFiles: async (): Promise<FileResponse[]> => {
    const response = await apiClient.get<any>('/files/list');
    return response.data.data || [];
  },

  deleteFile: async (fileId: string) => {
    const response = await apiClient.delete<any>(`/files/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: string) => {
    const response = await apiClient.get<any>(`/files/download/${fileId}`);
    return response.data.data;
  },
};

// ============ CONVERSION ENDPOINTS ============
export const conversionApi = {
  audioToImage: async (
    audioFile: any,
    userId?: string,
    options?: {
      compress?: boolean;
      deleteSource?: boolean;
      masterKeyHex?: string;
    }
  ): Promise<any> => {
    const formData = new FormData();
    
    // Handle both file objects and URIs
    if (audioFile?.uri) {
      // Mobile: Use URI-based file upload
      const fileExtension = audioFile.name?.split('.').pop()?.toLowerCase() || 'mp3';
      const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',
      };
      
      const mimeType = audioFile.mimeType || mimeTypes[fileExtension] || 'audio/mpeg';
      
      formData.append('audioFile', {
        uri: audioFile.uri,
        type: mimeType,
        name: audioFile.name || `audio.${fileExtension}`,
      } as any);
    } else if (audioFile instanceof File || audioFile instanceof Blob) {
      // Web: Use File/Blob directly
      const fileName = (audioFile as File).name || 'audio.mp3';
      formData.append('audioFile', audioFile, fileName);
    } else {
      throw new Error('Invalid audio file format');
    }
    
    if (userId) formData.append('userId', userId);
    if (options?.compress !== undefined) formData.append('compress', String(options.compress));
    if (options?.deleteSource) formData.append('deleteSource', 'true');
    if (options?.masterKeyHex) formData.append('masterKeyHex', options.masterKeyHex);

    const response = await apiClient.post<any>('/convert/audio-to-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large files
    });
    return response.data;
  },

  imageToAudio: async (
    imageDirPath: string,
    outputFileName: string,
    userId?: string,
    options?: {
      masterKeyHex?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post<any>('/convert/image-to-audio', {
      imageDirPath,
      outputFileName,
      userId: userId || 'user-' + Date.now(),
      ...options,
    });
    return response.data;
  },

  listConversions: async (): Promise<any> => {
    const response = await apiClient.get<any>('/conversions');
    return response.data;
  },

  getConversionStatus: async (conversionId: string): Promise<any> => {
    const response = await apiClient.get<any>(`/conversions/${conversionId}`);
    return response.data;
  },

  downloadFile: async (conversionId: string, fileName: string): Promise<any> => {
    const response = await apiClient.get<any>(`/conversions/${conversionId}/${fileName}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============ ENCRYPTION ENDPOINTS ============
export const encryptionApi = {
  encryptFile: async (
    file: File | string,
    password: string,
    fileType: 'audio' | 'image' | 'document'
  ): Promise<EncryptionResponse> => {
    const formData = new FormData();
    if (typeof file === 'string') {
      formData.append('fileUrl', file);
    } else {
      formData.append('file', file);
    }
    formData.append('password', password);
    formData.append('fileType', fileType);

    const response = await apiClient.post<any>('/encryption/encrypt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  decryptFile: async (
    encryptedFileId: string,
    password: string
  ): Promise<ConversionResponse> => {
    const response = await apiClient.post<any>('/encryption/decrypt', {
      fileId: encryptedFileId,
      password,
    });
    return response.data.data;
  },

  validatePassword: async (
    encryptedFileId: string,
    password: string
  ): Promise<{ valid: boolean }> => {
    const response = await apiClient.post<any>('/encryption/validate-password', {
      fileId: encryptedFileId,
      password,
    });
    return response.data.data;
  },
};

// ============ VERCEL API (AudioImageCarrier) ============
const VERCEL_API_URL = 'https://minor-project-all-in-one-repository.vercel.app';
const VERCEL_API_KEY = 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk';

const vercelApiClient = axios.create({
  baseURL: VERCEL_API_URL,
  timeout: 120000, // 2 minutes
  headers: {
    'X-API-Key': VERCEL_API_KEY,
  },
});

export const audioImageApi = {
  /**
   * Encode audio file to encrypted PNG images
   * @param audioFileUri - Local file URI
   * @param userId - User identifier
   * @param masterKey - 64-character hex master key
   * @param compress - Enable compression (default: true)
   */
  encodeAudioToImage: async (
    audioFileUri: string,
    userId: string,
    masterKey: string,
    compress: boolean = true
  ): Promise<Blob> => {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = audioFileUri.split('/').pop() || 'audio.mp3';
    const file = {
      uri: audioFileUri,
      type: 'audio/mpeg', // Will be adjusted based on extension
      name: filename,
    } as any;
    
    formData.append('audio_file', file);
    formData.append('user_id', userId);
    formData.append('master_key', masterKey);
    formData.append('compress', String(compress));

    const response = await vercelApiClient.post('/api/v1/encode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Decode encrypted PNG images back to audio
   * @param zipFileUri - Local ZIP file URI containing encrypted images
   * @param userId - Same user ID used during encoding
   * @param masterKey - Same 64-character hex master key used during encoding
   * @param outputFilename - Optional custom output filename
   */
  decodeImageToAudio: async (
    zipFileUri: string,
    userId: string,
    masterKey: string,
    outputFilename?: string
  ): Promise<Blob> => {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = zipFileUri.split('/').pop() || 'encrypted.zip';
    const file = {
      uri: zipFileUri,
      type: 'application/zip',
      name: filename,
    } as any;
    
    formData.append('encrypted_zip', file);
    formData.append('user_id', userId);
    formData.append('master_key', masterKey);
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }

    const response = await vercelApiClient.post('/api/v1/decode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Check API health
   */
  checkHealth: async (): Promise<any> => {
    const response = await vercelApiClient.get('/health');
    return response.data;
  },
};

export default apiClient;
