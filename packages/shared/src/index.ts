export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skin {
  id: string;
  name: string;
  description?: string;
  filePath: string;
  previewPath?: string;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateSkinRequest {
  name: string;
  description?: string;
  filePath: string;
  previewPath?: string;
  isPublic?: boolean;
}

export interface UpdateSkinRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}
