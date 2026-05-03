import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://superskin.xuanjian.top/api';
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

logger.info('API Base URL configured', { url: API_BASE_URL });

function getStoredToken(): string | null {
  return localStorage.getItem('token');
}

interface ApiResponse<T> {
  data?: T;
  meta?: { total: number };
  access_token?: string;
  token?: string;
  user?: T;
  message?: string;
  statusCode?: number;
}

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();
  
  logger.info('API Request starting', { method, url, hasData: !!data, hasToken: !!token });
  
  try {
    let responseText: string;
    
    if (method === 'GET') {
      responseText = await invoke<string>('http_get', { url, token });
    } else if (method === 'PUT') {
      const body = data ? JSON.stringify(data) : '{}';
      responseText = await invoke<string>('http_post', { url, body, token });
    } else if (method === 'DELETE') {
      responseText = await invoke<string>('http_post', { url, body: '{}', token });
    } else {
      const body = data ? JSON.stringify(data) : '{}';
      responseText = await invoke<string>('http_post', { url, body, token });
    }
    
    logger.info('API Response received', { url, method, responseLength: responseText?.length || 0 });
    
    const result = responseText ? JSON.parse(responseText) : {};
    return result;
  } catch (error) {
    const errorStr = String(error);
    logger.error('API Request Error', { url, method, error: errorStr });
    
    const match = errorStr.match(/HTTP \d+: (.+)/);
    if (match) {
      try {
        const errorData = JSON.parse(match[1]);
        throw { 
          response: { 
            status: parseInt(errorStr.match(/HTTP (\d+)/)?.[1] || '500'), 
            data: errorData 
          }, 
          message: errorData.message || 'Request failed' 
        };
      } catch {
        throw { message: match[1] };
      }
    }
    
    throw { message: errorStr };
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  token?: string;
}

export interface ServerSkin {
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
  message: string;
  filePath: string;
  fileName: string;
  size: number;
}

export const apiService = {
  async register(username: string, email: string, password: string): Promise<User> {
    logger.info('Attempting registration', { username, email });
    try {
      const response = await apiRequest<ApiResponse<User>>('POST', '/auth/register', { username, email, password });
      const user = response.user || response as unknown as User;
      logger.info('Registration successful', { username });
      return user;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  },

  async login(username: string, password: string): Promise<User> {
    logger.info('Attempting login', { username });
    try {
      const response = await apiRequest<ApiResponse<User>>('POST', '/auth/login', { username, password });
      logger.info('Login response', { 
        hasToken: !!response.token, 
        hasAccessToken: !!response.access_token,
        hasUser: !!response.user,
        responseKeys: Object.keys(response) 
      });
      
      const { token, access_token, user } = response;
      const authToken = token || access_token;
      
      if (authToken) {
        localStorage.setItem('token', authToken);
        logger.info('Token saved to localStorage', { tokenLength: authToken.length });
      } else {
        logger.warn('No token in response');
      }
      
      logger.info('Login successful', { username, hasToken: !!authToken });
      return { ...user, token: authToken } as User;
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
    logger.info('Uploading skin to cloud', { filename: file.name, size: file.size });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      const url = `${SERVER_BASE_URL}/api/upload/skin`;
      const token = getStoredToken();
      
      logger.info('Uploading to', { url, hasToken: !!token });
      
      const responseText = await invoke<string>('http_upload_file', {
        url,
        fileData: base64,
        filename: file.name,
        token,
      });
      
      const result = JSON.parse(responseText);
      logger.info('Skin uploaded successfully', { filePath: result.filePath, fileName: result.fileName });
      return result;
    } catch (error) {
      logger.error('Upload failed', error);
      throw error;
    }
  },

  async createSkin(data: {
    name: string;
    description?: string;
    filePath: string;
    previewPath?: string;
    isPublic: boolean;
  }): Promise<ServerSkin> {
    logger.info('Creating skin record', { name: data.name, filePath: data.filePath });
    try {
      const result = await apiRequest<ServerSkin>('POST', '/skins', data);
      logger.info('Skin created', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Create skin failed', error);
      throw error;
    }
  },

  async getSkins(page: number = 1, limit: number = 20): Promise<{ data: ServerSkin[]; meta: { total: number } }> {
    logger.info('Fetching skins', { page, limit });
    try {
      const result = await apiRequest<{ data: ServerSkin[]; meta: { total: number } }>('GET', `/skins?page=${page}&limit=${limit}`);
      logger.info('Skins fetched', { count: result.data?.length || 0 });
      return result;
    } catch (error) {
      logger.error('Get skins failed', error);
      throw error;
    }
  },

  async getPublicSkins(page: number = 1, limit: number = 20): Promise<{ data: ServerSkin[]; meta: { total: number } }> {
    logger.info('Fetching public skins', { page, limit });
    return await apiRequest<{ data: ServerSkin[]; meta: { total: number } }>('GET', `/skins/public?page=${page}&limit=${limit}`);
  },

  async getSkin(id: string): Promise<ServerSkin> {
    logger.info('Fetching skin', { id });
    return await apiRequest<ServerSkin>('GET', `/skins/${id}`);
  },

  async updateSkin(id: string, data: Partial<ServerSkin>): Promise<ServerSkin> {
    logger.info('Updating skin', { id });
    return await apiRequest<ServerSkin>('POST', `/skins/${id}`, data);
  },

  async deleteSkin(id: string): Promise<void> {
    logger.info('Deleting skin', { id });
    await apiRequest('POST', `/skins/${id}`, {});
  },

  getSkinUrl(path: string): string {
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    return `${SERVER_BASE_URL}${path}`;
  },

  async downloadSkinImage(filePath: string): Promise<string> {
    const url = this.getSkinUrl(filePath);
    logger.info('Downloading skin image via Rust', { url });
    const base64 = await invoke<string>('http_download_bytes', { url });
    const dataUrl = `data:image/png;base64,${base64}`;
    logger.info('Skin image downloaded', { dataUrlLength: dataUrl.length });
    return dataUrl;
  },
};

export default apiService;
