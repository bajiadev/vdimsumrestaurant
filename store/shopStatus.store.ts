import { create } from "zustand";

type ShopStatusState = {
  isOpen: boolean;
  forceClosed: boolean;
  setStatus: (isOpen: boolean, forceClosed: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setForceClosed: (forceClosed: boolean) => void;
};

export const useShopStatusStore = create<ShopStatusState>((set) => ({
  isOpen: false,
  forceClosed: false,
  setStatus: (isOpen, forceClosed) => set({ isOpen, forceClosed }),
  setIsOpen: (isOpen) => set({ isOpen }),
  setForceClosed: (forceClosed) => set({ forceClosed }),
}));
