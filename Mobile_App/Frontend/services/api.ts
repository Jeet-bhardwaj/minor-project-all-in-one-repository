import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

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
      const response = await fetch(audioFile.uri);
      const blob = await response.blob();
      formData.append('audioFile', blob, audioFile.name || 'audio.mp3');
    } else if (audioFile instanceof File || audioFile instanceof Blob) {
      formData.append('audioFile', audioFile);
    } else {
      throw new Error('Invalid audio file');
    }
    
    if (userId) formData.append('userId', userId);
    if (options?.compress) formData.append('compress', 'true');
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

export default apiClient;
