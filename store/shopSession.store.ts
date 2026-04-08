import { create } from "zustand";

// Temporary default — will be replaced by the value returned after login
const DEFAULT_SHOP_ID = "j13bhdjITVrL97UfrwIG";

type ShopSessionState = {
  shopId: string;
  setShopId: (shopId: string) => void;
};

export const useShopSessionStore = create<ShopSessionState>((set) => ({
  shopId: DEFAULT_SHOP_ID,
  setShopId: (shopId) => set({ shopId }),
}));
