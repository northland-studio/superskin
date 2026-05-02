import { create } from 'zustand';
import { Skin } from '@superskin/shared';

interface SkinState {
  skins: Skin[];
  currentSkin: Skin | null;
  setSkins: (skins: Skin[]) => void;
  setCurrentSkin: (skin: Skin | null) => void;
  addSkin: (skin: Skin) => void;
  removeSkin: (id: string) => void;
  updateSkin: (id: string, data: Partial<Skin>) => void;
}

export const useSkinStore = create<SkinState>((set) => ({
  skins: [],
  currentSkin: null,
  setSkins: (skins) => set({ skins }),
  setCurrentSkin: (skin) => set({ currentSkin: skin }),
  addSkin: (skin) => set((state) => ({ skins: [...state.skins, skin] })),
  removeSkin: (id) => set((state) => ({ skins: state.skins.filter((s) => s.id !== id) })),
  updateSkin: (id, data) =>
    set((state) => ({
      skins: state.skins.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),
}));
