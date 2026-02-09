import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenTemplate from "../components/ScreenTemplate";
import { getMenuItems, updateMenuItemAvailability } from "@/lib/firebase";

type MenuItem = {
  id: string;
  name?: string;
  isAvailable?: boolean;
};

export default function ItemAvailability() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const loadItems = async () => {
      try {
        const data = await getMenuItems();
        if (mounted) setItems(data as MenuItem[]);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? "Failed to load menu items");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadItems();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleAvailability = async (item: MenuItem) => {
    const nextValue = !item.isAvailable;
    setBusyIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await updateMenuItemAvailability(item.id, nextValue);
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, isAvailable: nextValue } : entry,
        ),
      );
    } catch (err: any) {
      setError(err?.message ?? "Failed to update availability");
    } finally {
      setBusyIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <ScreenTemplate title="Item Availability" centered={false}>
      <View className="flex-1 w-full">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-gray-500">Loading menu...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              items.length
                ? undefined
                : { flex: 1, alignItems: "center", justifyContent: "center" }
            }
            renderItem={({ item }) => {
              const isBusy = busyIds[item.id];
              const isAvailable = item.isAvailable ?? false;

              return (
                <View className="border border-gray-200 rounded-xl p-4 mb-3 bg-white">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="font-semibold">
                        {item.name || "Unnamed item"}
                      </Text>
                      <Text className="text-gray-500 mt-1">
                        Status: {isAvailable ? "Available" : "Not available"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className={`px-3 py-2 rounded ${
                        isAvailable ? "bg-red-600" : "bg-green-600"
                      } ${isBusy ? "opacity-60" : ""}`}
                      onPress={() => toggleAvailability(item)}
                      disabled={isBusy}
                    >
                      <Text className="text-white font-semibold">
                        {isAvailable ? "Set Unavailable" : "Set Available"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text className="text-gray-500">No menu items found.</Text>
            }
          />
        )}
      </View>
    </ScreenTemplate>
  );
}
