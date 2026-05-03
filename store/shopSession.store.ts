import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const DEFAULT_SHOP_ID = "j13bhdjITVrL97UfrwIG";
const SHOP_SESSION_STORAGE_KEY = "shop-session";

type ShopSessionState = {
  shopId: string;
  isHydrated: boolean;
  setShopId: (shopId: string) => void;
  setHydrated: (isHydrated: boolean) => void;
};

const secureShopSessionStorage = createJSONStorage<Pick<ShopSessionState, "shopId">>(() => ({
  getItem: async (name) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
}));

export const useShopSessionStore = create<ShopSessionState>()(
  persist(
    (set) => ({
      shopId: DEFAULT_SHOP_ID,
      isHydrated: false,
      setShopId: (shopId) =>
        set({ shopId: shopId.trim() || DEFAULT_SHOP_ID }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: SHOP_SESSION_STORAGE_KEY,
      storage: secureShopSessionStorage,
      partialize: (state) => ({ shopId: state.shopId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export const getActiveShopId = () => useShopSessionStore.getState().shopId;
