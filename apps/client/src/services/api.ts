import axios, { AxiosError, AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://superskin.xuanjian.top/api';

logger.info('API Base URL configured', { url: API_BASE_URL });

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API Request', { method: config.method, url: config.url });
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    logger.debug('API Response', { status: response.status, url: response.config.url });
    return response;
  },
  (error: AxiosError) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    };
    logger.error('API Response Error', errorInfo);
    return Promise.reject(error);
  }
);

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
      const response = await api.post<User>('/auth/register', { username, email, password });
      logger.info('Registration successful', { username });
      return response.data;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  },

  async login(username: string, password: string): Promise<User> {
    logger.info('Attempting login', { username });
    try {
      const response = await api.post<{ access_token: string; user: User }>('/auth/login', { username, password });
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      logger.info('Login successful', { username });
      return { ...user, token: access_token };
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  },

  async verifyEmail(email: string, code: string): Promise<void> {
    logger.info('Verifying email', { email, code });
    try {
      await api.post('/auth/verify-email', { email, code });
      logger.info('Email verification successful');
    } catch (error) {
      logger.error('Email verification failed', error);
      throw error;
    }
  },

  async resendVerificationCode(email: string): Promise<void> {
    logger.info('Resending verification code', { email });
    try {
      await api.post('/auth/resend-verification', { email });
      logger.info('Verification code resent');
    } catch (error) {
      logger.error('Resend verification failed', error);
      throw error;
    }
  },

  async getProfile(): Promise<User> {
    logger.info('Fetching user profile');
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  async uploadSkin(file: File): Promise<UploadResult> {
    logger.info('Uploading skin file', { filename: file.name, size: file.size });
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post<UploadResult>('/upload/skin', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      logger.info('Skin upload successful', { path: response.data.path });
      return response.data;
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
      const response = await api.post<Skin>('/skins', data);
      logger.info('Skin created', { id: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Create skin failed', error);
      throw error;
    }
  },

  async getSkins(page: number = 1, limit: number = 20): Promise<{ data: Skin[]; meta: { total: number } }> {
    logger.info('Fetching skins', { page, limit });
    try {
      const response = await api.get<{ data: Skin[]; meta: { total: number } }>('/skins', {
        params: { page, limit },
      });
      logger.info('Skins fetched', { count: response.data.data.length });
      return response.data;
    } catch (error) {
      logger.error('Get skins failed', error);
      throw error;
    }
  },

  async getPublicSkins(page: number = 1, limit: number = 20): Promise<{ data: Skin[]; meta: { total: number } }> {
    logger.info('Fetching public skins', { page, limit });
    const response = await api.get<{ data: Skin[]; meta: { total: number } }>('/skins/public', {
      params: { page, limit },
    });
    return response.data;
  },

  async getSkin(id: string): Promise<Skin> {
    logger.info('Fetching skin', { id });
    const response = await api.get<Skin>(`/skins/${id}`);
    return response.data;
  },

  async updateSkin(id: string, data: Partial<Skin>): Promise<Skin> {
    logger.info('Updating skin', { id });
    const response = await api.put<Skin>(`/skins/${id}`, data);
    return response.data;
  },

  async deleteSkin(id: string): Promise<void> {
    logger.info('Deleting skin', { id });
    await api.delete(`/skins/${id}`);
  },

  getSkinUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL.replace('/api', '')}/uploads/${path}`;
  },
};

export default apiService;
