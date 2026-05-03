import { fetch } from '@tauri-apps/plugin-http';
import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://superskin.xuanjian.top/api';

logger.info('API Base URL configured', { url: API_BASE_URL });

function getStoredToken(): string | null {
  return localStorage.getItem('token');
}

interface ApiResponse<T> {
  data?: T;
  meta?: { total: number };
  access_token?: string;
  user?: T;
  message?: string;
  statusCode?: number;
}

async function apiRequest<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  isFormData: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();
  
  const headers: Record<string, string> = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  logger.debug('API Request', { method, url });
  
  let body: string | FormData | undefined;
  
  if (data) {
    if (isFormData && data instanceof FormData) {
      body = data;
    } else {
      body = JSON.stringify(data);
    }
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      const errorData = responseText ? JSON.parse(responseText) : {};
      logger.error('API Response Error', { 
        url, 
        method, 
        status: response.status, 
        data: errorData 
      });
      throw { 
        response: { 
          status: response.status, 
          data: errorData 
        }, 
        message: errorData.message || 'Request failed' 
      };
    }
    
    const result = responseText ? JSON.parse(responseText) : {};
    logger.debug('API Response', { status: response.status, url });
    return result;
  } catch (error) {
    logger.error('API Request Error', { url, method, error });
    throw error;
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  token?: string;
}

export interface Skin {
  id: string;
  name: string;
  description?: string;
  filePath: string;
  previewPath?: string;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  path: string;
  filename: string;
  url: string;
}

export const apiService = {
  async register(username: string, email: string, password: string): Promise<User> {
    logger.info('Attempting registration', { username, email });
    try {
      const result = await apiRequest<User>('POST', '/auth/register', { username, email, password });
      logger.info('Registration successful', { username });
      return result;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  },

  async login(username: string, password: string): Promise<User> {
    logger.info('Attempting login', { username });
    try {
      const response = await apiRequest<ApiResponse<User>>('POST', '/auth/login', { username, password });
      const { access_token, user } = response;
      if (access_token) {
        localStorage.setItem('token', access_token);
      }
      logger.info('Login successful', { username });
      return { ...user, token: access_token } as User;
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  },

  async verifyEmail(email: string, code: string): Promise<void> {
    logger.info('Verifying email', { email, code });
    try {
      await apiRequest('POST', '/auth/verify-email', { email, code });
      logger.info('Email verification successful');
    } catch (error) {
      logger.error('Email verification failed', error);
      throw error;
    }
  },

  async resendVerificationCode(email: string): Promise<void> {
    logger.info('Resending verification code', { email });
    try {
      await apiRequest('POST', '/auth/resend-verification', { email });
      logger.info('Verification code resent');
    } catch (error) {
      logger.error('Resend verification failed', error);
      throw error;
    }
  },

  async getProfile(): Promise<User> {
    logger.info('Fetching user profile');
    return await apiRequest<User>('GET', '/auth/profile');
  },

  async uploadSkin(file: File): Promise<UploadResult> {
    logger.info('Uploading skin file', { filename: file.name, size: file.size });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const result = await apiRequest<UploadResult>('POST', '/upload/skin', formData, true);
      logger.info('Skin upload successful', { path: result.path });
      return result;
    } catch (error) {
      logger.error('Skin upload failed', error);
      throw error;
    }
  },

  async createSkin(data: {
    name: string;
    description?: string;
    filePath: string;
    previewPath?: string;
    isPublic: boolean;
  }): Promise<Skin> {
    logger.info('Creating skin record', { name: data.name });
    try {
      const result = await apiRequest<Skin>('POST', '/skins', data);
      logger.info('Skin created', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Create skin failed', error);
      throw error;
    }
  },

  async getSkins(page: number = 1, limit: number = 20): Promise<{ data: Skin[]; meta: { total: number } }> {
    logger.info('Fetching skins', { page, limit });
    try {
      const result = await apiRequest<{ data: Skin[]; meta: { total: number } }>('GET', `/skins?page=${page}&limit=${limit}`);
      logger.info('Skins fetched', { count: result.data.length });
      return result;
    } catch (error) {
      logger.error('Get skins failed', error);
      throw error;
    }
  },

  async getPublicSkins(page: number = 1, limit: number = 20): Promise<{ data: Skin[]; meta: { total: number } }> {
    logger.info('Fetching public skins', { page, limit });
    return await apiRequest<{ data: Skin[]; meta: { total: number } }>('GET', `/skins/public?page=${page}&limit=${limit}`);
  },

  async getSkin(id: string): Promise<Skin> {
    logger.info('Fetching skin', { id });
    return await apiRequest<Skin>('GET', `/skins/${id}`);
  },

  async updateSkin(id: string, data: Partial<Skin>): Promise<Skin> {
    logger.info('Updating skin', { id });
    return await apiRequest<Skin>('PUT', `/skins/${id}`, data);
  },

  async deleteSkin(id: string): Promise<void> {
    logger.info('Deleting skin', { id });
    await apiRequest('DELETE', `/skins/${id}`);
  },

  getSkinUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL.replace('/api', '')}/uploads/${path}`;
  },
};

export default apiService;
