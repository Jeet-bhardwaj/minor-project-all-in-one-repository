import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    audioFile: File | string,
    options?: {
      resolution?: string;
      colorMode?: string;
      format?: string;
    }
  ): Promise<ConversionResponse> => {
    const formData = new FormData();
    if (typeof audioFile === 'string') {
      formData.append('audioUrl', audioFile);
    } else {
      formData.append('audio', audioFile);
    }
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await apiClient.post<any>('/conversion/audio-to-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  imageToAudio: async (
    imageFile: File | string,
    options?: {
      quality?: string;
      sampleRate?: string;
      format?: string;
    }
  ): Promise<ConversionResponse> => {
    const formData = new FormData();
    if (typeof imageFile === 'string') {
      formData.append('imageUrl', imageFile);
    } else {
      formData.append('image', imageFile);
    }
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await apiClient.post<any>('/conversion/image-to-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
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
