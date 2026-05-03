import type { Order } from "@/type";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getAllOrders } from "@/lib/firebase";
import { useShopSessionStore } from "@/store/shopSession.store";
import ScreenTemplate from "../components/ScreenTemplate";

type OrderLike = Order & {
  orderNumber?: string;
  amount?: number;
  itemCount?: number;
  cartItems?: { id?: string; quantity?: number }[];
  uid?: string;
  shopId?: string;
};

export default function CompletedOrders() {
  const router = useRouter();
  const shopId = useShopSessionStore((state) => state.shopId);
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    console.log("Loading orders...", orders);
  }, [orders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getOrderItemCount = (order: OrderLike) => {
    if (order.itemCount) return order.itemCount;
    return 0;
  };

  const getOrderTotalPence = (order: OrderLike) => {
    if (typeof order.amount === "number") return order.amount;
    return 0;
  };

  const formatOrderDate = (order: OrderLike) => {
    const createdAt = order.createdAt as any;
    if (createdAt?.toDate) {
      return createdAt.toDate().toLocaleString("en-GB");
    }
    if (typeof createdAt?.seconds === "number") {
      return new Date(createdAt.seconds * 1000).toLocaleString("en-GB");
    }
    return "";
  };

  return (
    <ScreenTemplate title="Completed Orders" centered={false}>
      <View className="flex-1 w-full">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-gray-500">Loading orders...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              orders.length
                ? undefined
                : { flex: 1, alignItems: "center", justifyContent: "center" }
            }
            renderItem={({ item }) => (
              <View className="border border-gray-200 rounded-xl p-4 mb-3 bg-white">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">
                    Order #{item?.orderNumber}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-gray-500 text-xs">
                      {formatOrderDate(item)}
                    </Text>
                    <TouchableOpacity
                      className="rounded-full p-1"
                      onPress={() =>
                        router.push({
                          pathname: "./order-details",
                          params: { id: item.id, from: "completed" },
                        })
                      }
                      accessibilityLabel="View order details"
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#000611"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex flex-row items-center justify-between">
                  <View>
                    <Text className="text-gray-600 mt-2">
                      {item.itemCount} items
                    </Text>
                    <Text className="text-gray-600">
                      Total: £{(item.amount ? (item.amount / 100).toFixed(2) : "0.00")}
                    </Text>
                  </View>
                  <Text className="text-gray-600">Status: {item.status}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text className="text-gray-500">No orders found.</Text>
            }
          />
        )}
      </View>
    </ScreenTemplate>
  );
}



