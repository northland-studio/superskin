import axios, { AxiosInstance, AxiosError } from 'axios';
import { useUserStore } from '@/stores/userStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://superskin.xuanjian.top/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = useUserStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          useUserStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  }

  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: { username?: string; email?: string; avatar?: string }) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  async getSkins(page: number = 1, limit: number = 20) {
    const response = await this.client.get('/skins', {
      params: { page, limit },
    });
    return response.data;
  }

  async getPublicSkins(page: number = 1, limit: number = 20) {
    const response = await this.client.get('/skins/public', {
      params: { page, limit },
    });
    return response.data;
  }

  async getSkin(id: string) {
    const response = await this.client.get(`/skins/${id}`);
    return response.data;
  }

  async createSkin(data: {
    name: string;
    description?: string;
    filePath: string;
    previewPath?: string;
    isPublic?: boolean;
  }) {
    const response = await this.client.post('/skins', data);
    return response.data;
  }

  async updateSkin(
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ) {
    const response = await this.client.put(`/skins/${id}`, data);
    return response.data;
  }

  async deleteSkin(id: string) {
    const response = await this.client.delete(`/skins/${id}`);
    return response.data;
  }

  async uploadSkin(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/upload/skin', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.client.post('/auth/verify-email', { token });
    return response.data;
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/auth/request-password-reset', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
