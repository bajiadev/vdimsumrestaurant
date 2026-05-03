import {
  getShopById,
  getShopOrderSettings,
  type ShopOrderSettings,
  updateShopOrderSettings,
} from "@/lib/firebase";
import { useShopSessionStore } from "@/store/shopSession.store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenTemplate from "../components/ScreenTemplate";

const defaultSettings: ShopOrderSettings = {
  orderTypes: {
    delivery: false,
    pickup: false,
  },
  deliverySettings: {
    methods: {
      nearbyDrivers: false,
      ownDrivers: false,
    },
  },
};

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: ToggleRowProps) {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{label}</Text>
          <Text className="mt-1 text-sm text-gray-500">{description}</Text>
        </View>
        <Switch value={value} disabled={disabled} onValueChange={onChange} />
      </View>
    </View>
  );
}

export default function Settings() {
  const currentShopId = useShopSessionStore((state) => state.shopId);
  const setShopId = useShopSessionStore((state) => state.setShopId);
  const [settings, setSettings] = useState<ShopOrderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopIdInput, setShopIdInput] = useState(currentShopId);
  const [checkingShop, setCheckingShop] = useState(false);
  const [connectionText, setConnectionText] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadSettings = async (shopId: string) => {
    setLoading(true);
    setError(null);

    try {
      const shop = await getShopById(shopId);

      if (!shop) {
        setIsConnected(false);
        setConnectionText("Not connected. Shop ID was not found in Firestore.");
        setSettings(defaultSettings);
        return;
      }

      const shopRecord = shop as { id: string; name?: unknown };
      const shopName = typeof shopRecord.name === "string" ? shopRecord.name : null;
      setIsConnected(true);
      setConnectionText(
        shopName ? `Connected: ${shopName}` : `Connected: ${shop.id}`,
      );

      const data = await getShopOrderSettings();
      setSettings(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load settings";
      setIsConnected(false);
      setConnectionText(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShopIdInput(currentShopId);
    loadSettings(currentShopId);
  }, [currentShopId]);

  const saveSetting = async (
    key: string,
    updater: (current: ShopOrderSettings) => ShopOrderSettings,
  ) => {
    setSavingKey(key);
    setError(null);

    const previous = settings;
    const next = updater(previous);
    setSettings(next);

    try {
      await updateShopOrderSettings(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save settings";
      setSettings(previous);
      setError(message);
    } finally {
      setSavingKey(null);
    }
  };

  const connectShop = async () => {
    const nextShopId = shopIdInput.trim();

    if (!nextShopId) {
      setIsConnected(false);
      setConnectionText("Enter a shop ID first.");
      return;
    }

    setCheckingShop(true);
    setError(null);

    try {
      const shop = await getShopById(nextShopId);

      if (!shop) {
        setIsConnected(false);
        setConnectionText("Shop ID not found in Firestore.");
        return;
      }

      const shopRecord = shop as { id: string; name?: unknown };
      const shopName = typeof shopRecord.name === "string" ? shopRecord.name : null;
      setShopId(nextShopId);
      setIsConnected(true);
      setConnectionText(
        shopName ? `Connected: ${shopName}` : `Connected: ${shop.id}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect shop";
      setIsConnected(false);
      setConnectionText(message);
    } finally {
      setCheckingShop(false);
    }
  };

  const controlsDisabled = !isConnected || savingKey !== null || checkingShop;

  return (
    <ScreenTemplate title="Settings" centered={false}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-3 text-gray-500">Loading settings...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="gap-4">
            <View className="rounded-xl border border-gray-200 bg-white p-4">
              <Text className="text-lg font-bold text-gray-900">Shop Connection</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Enter the shop ID for this printer app.
              </Text>
              <TextInput
                className="mt-4 rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
                value={shopIdInput}
                onChangeText={setShopIdInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter shop ID"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                className={`mt-3 rounded-lg px-4 py-3 ${checkingShop ? "bg-gray-400" : "bg-black"}`}
                onPress={connectShop}
                disabled={checkingShop}
              >
                <Text className="text-center font-semibold text-white">
                  {checkingShop ? "Checking..." : "Connect Shop"}
                </Text>
              </TouchableOpacity>
              <Text
                className={`mt-3 text-sm ${isConnected ? "text-green-600" : "text-gray-500"}`}
              >
                {connectionText ?? `Current shop ID: ${currentShopId}`}
              </Text>
            </View>

            <Text className="text-lg font-bold text-gray-900">Order Types</Text>

            <ToggleRow
              label="Delivery"
              description="Allow customers to place delivery orders."
              value={settings.orderTypes.delivery}
              disabled={controlsDisabled}
              onChange={(value) =>
                saveSetting("orderTypes.delivery", (current) => ({
                  ...current,
                  orderTypes: {
                    ...current.orderTypes,
                    delivery: value,
                  },
                }))
              }
            />

            <ToggleRow
              label="Pickup"
              description="Allow customers to place pickup orders."
              value={settings.orderTypes.pickup}
              disabled={controlsDisabled}
              onChange={(value) =>
                saveSetting("orderTypes.pickup", (current) => ({
                  ...current,
                  orderTypes: {
                    ...current.orderTypes,
                    pickup: value,
                  },
                }))
              }
            />

            <Text className="mt-2 text-lg font-bold text-gray-900">Delivery Methods</Text>

            <ToggleRow
              label="Nearby Drivers"
              description="Enable assignment to nearby marketplace drivers."
              value={settings.deliverySettings.methods.nearbyDrivers}
              disabled={controlsDisabled || !settings.orderTypes.delivery}
              onChange={(value) =>
                saveSetting("deliverySettings.methods.nearbyDrivers", (current) => ({
                  ...current,
                  deliverySettings: {
                    ...current.deliverySettings,
                    methods: {
                      ...current.deliverySettings.methods,
                      nearbyDrivers: value,
                    },
                  },
                }))
              }
            />

            <ToggleRow
              label="Own Drivers"
              description="Enable your own in-house delivery drivers."
              value={settings.deliverySettings.methods.ownDrivers}
              disabled={controlsDisabled || !settings.orderTypes.delivery}
              onChange={(value) =>
                saveSetting("deliverySettings.methods.ownDrivers", (current) => ({
                  ...current,
                  deliverySettings: {
                    ...current.deliverySettings,
                    methods: {
                      ...current.deliverySettings.methods,
                      ownDrivers: value,
                    },
                  },
                }))
              }
            />

            {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

            <TouchableOpacity
              className="rounded-lg border border-gray-300 px-4 py-3"
              disabled={checkingShop}
              onPress={() => loadSettings(currentShopId)}
            >
              <Text className="text-center text-gray-700">Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ScreenTemplate>
  );
}
