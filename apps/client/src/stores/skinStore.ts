import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';

export interface Skin {
  id: string;
  name: string;
  description?: string;
  skinData: string;
  previewData?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SkinState {
  skins: Skin[];
  currentSkin: Skin | null;
  isLoading: boolean;
  error: string | null;
  setSkins: (skins: Skin[]) => void;
  setCurrentSkin: (skin: Skin | null) => void;
  addSkin: (skin: Skin) => void;
  removeSkin: (id: string) => void;
  updateSkin: (id: string, data: Partial<Skin>) => void;
  loadSkins: () => Promise<void>;
  saveSkin: (name: string, skinData: string, previewData?: string, description?: string) => Promise<Skin | null>;
  deleteSkin: (id: string) => Promise<boolean>;
  updateSkinOnServer: (id: string, data: Partial<Skin>) => Promise<boolean>;
}

export const useSkinStore = create<SkinState>((set, get) => ({
  skins: [],
  currentSkin: null,
  isLoading: false,
  error: null,
  
  setSkins: (skins) => set({ skins }),
  setCurrentSkin: (skin) => set({ currentSkin: skin }),
  addSkin: (skin) => set((state) => ({ skins: [skin, ...state.skins] })),
  removeSkin: (id) => set((state) => ({ skins: state.skins.filter((s) => s.id !== id) })),
  updateSkin: (id, data) => {
    set((state) => ({
      skins: state.skins.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s)),
    }));
    logger.info('Skin updated in store', { id, fields: Object.keys(data) });
  },
    
  loadSkins: async () => {
    set({ isLoading: true, error: null });
    try {
      const skins = await invoke<Skin[]>('get_skins');
      set({ skins: skins || [], isLoading: false });
      logger.info('Skins loaded from local storage', { count: skins?.length || 0 });
    } catch (error) {
      logger.error('Failed to load skins', error);
      set({ isLoading: false, error: String(error) });
    }
  },
  
  saveSkin: async (name, skinData, previewData, description) => {
    try {
      logger.info('saveSkin called', { name, hasSkinData: !!skinData, hasPreviewData: !!previewData, previewDataLength: previewData?.length || 0 });
      const skin = await invoke<Skin>('save_skin', {
        name,
        description: description || null,
        skinData,
        previewData: previewData || null,
        isPublic: false,
      });
      set((state) => ({ skins: [skin, ...state.skins] }));
      logger.info('Skin saved to local storage', { id: skin.id, name, hasPreviewData: !!skin.previewData });
      return skin;
    } catch (error) {
      logger.error('Failed to save skin', error);
      set({ error: String(error) });
      return null;
    }
  },
  
  deleteSkin: async (id) => {
    try {
      await invoke('delete_skin', { id });
      set((state) => ({ skins: state.skins.filter((s) => s.id !== id) }));
      logger.info('Skin deleted', { id });
      return true;
    } catch (error) {
      logger.error('Failed to delete skin', error);
      return false;
    }
  },

  updateSkinOnServer: async (id, data) => {
    try {
      await invoke('update_skin', {
        id,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
      });
      logger.info('Skin updated on server', { id });
      return true;
    } catch (error) {
      logger.error('Failed to update skin on server', error);
      return false;
    }
  },
}));
