import { invoke } from '@tauri-apps/api/core';

export interface LocalSkin {
  id: string;
  name: string;
  description?: string;
  skin_data: string;
  preview_data?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  token?: string;
  created_at: string;
}

class LocalStorageService {
  private isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  async saveSkin(
    name: string,
    skinData: string,
    description?: string,
    previewData?: string,
    isPublic: boolean = false
  ): Promise<LocalSkin> {
    if (this.isTauri()) {
      return await invoke<LocalSkin>('save_skin', {
        name,
        description,
        skinData,
        previewData,
        isPublic,
      });
    }

    const skins = this.getLocalSkins();
    const newSkin: LocalSkin = {
      id: crypto.randomUUID(),
      name,
      description,
      skin_data: skinData,
      preview_data: previewData,
      is_public: isPublic,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    skins.push(newSkin);
    localStorage.setItem('superskin_local_skins', JSON.stringify(skins));
    return newSkin;
  }

  async getSkins(): Promise<LocalSkin[]> {
    if (this.isTauri()) {
      return await invoke<LocalSkin[]>('get_skins');
    }
    return this.getLocalSkins();
  }

  async deleteSkin(id: string): Promise<void> {
    if (this.isTauri()) {
      return await invoke('delete_skin', { id });
    }

    const skins = this.getLocalSkins().filter((s) => s.id !== id);
    localStorage.setItem('superskin_local_skins', JSON.stringify(skins));
  }

  async updateSkin(
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ): Promise<LocalSkin> {
    if (this.isTauri()) {
      return await invoke<LocalSkin>('update_skin', {
        id,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
      });
    }

    const skins = this.getLocalSkins();
    const index = skins.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Skin not found');

    skins[index] = {
      ...skins[index],
      ...data,
      is_public: data.isPublic ?? skins[index].is_public,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('superskin_local_skins', JSON.stringify(skins));
    return skins[index];
  }

  async saveUser(
    id: string,
    username: string,
    email: string,
    avatar?: string,
    token?: string
  ): Promise<LocalUser> {
    if (this.isTauri()) {
      return await invoke<LocalUser>('save_user', {
        id,
        username,
        email,
        avatar,
        token,
      });
    }

    const user: LocalUser = {
      id,
      username,
      email,
      avatar,
      token,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('superskin_local_user', JSON.stringify(user));
    return user;
  }

  async getUser(): Promise<LocalUser | null> {
    if (this.isTauri()) {
      return await invoke<LocalUser | null>('get_user');
    }

    const userStr = localStorage.getItem('superskin_local_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async clearUser(): Promise<void> {
    if (this.isTauri()) {
      return await invoke('clear_user');
    }
    localStorage.removeItem('superskin_local_user');
  }

  private getLocalSkins(): LocalSkin[] {
    const skinsStr = localStorage.getItem('superskin_local_skins');
    return skinsStr ? JSON.parse(skinsStr) : [];
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;
