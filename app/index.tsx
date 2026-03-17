import type { Order } from "@/type";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  acceptOrder,
  cancelOrder,
  markOrderReady,
  startPreparingOrder,
  subscribeLiveOrders,
} from "@/lib/firebase";
import { printOrder } from "@/lib/printer";
import { useShopStatusStore } from "@/store/shopStatus.store";
import ScreenTemplate from "../components/ScreenTemplate";

type OrderLike = Order & {
  amount?: number;
  cartItems?: { id?: string; quantity?: number }[];
  uid?: string;
  shopId?: string;
};

type ActionConfig = {
  label: string;
  onPress?: () => Promise<void>;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

const cancellableStatuses = new Set([
  "pending",
  "confirmed",
  "preparing",
  "ready",
]);

const formatStatusLabel = (status: string) => {
  if (status === "onTheWay") return "On the way";
  if (status === "cancelled") return "Canceled";
  return status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
};

const ALERT_INTERVAL_MS = 15000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const RestaurantWindowSign = ({ isOpen }: { isOpen: boolean }) => {
  const label = isOpen ? "OPEN" : "CLOSED";
  return (
    <View className="items-center">
      <View className="rounded-3xl border-4 border-zinc-900 bg-gray-500 px-8 py-6">
        <View
          className="rounded-2xl border-2 border-zinc-800 bg-gray-800 px-6 py-4"
          style={styles.signInner}
        >
          <Text
            style={[
              styles.neonText,
              isOpen ? styles.neonOpen : styles.neonClosed,
            ]}
          >
            {label}
          </Text>
          <Text className="mt-2 text-center text-xs text-zinc-400">
            {isOpen ? "Kitchen is live" : "Restaurant is closed"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function Index() {
  const router = useRouter();
  const isOpen = useShopStatusStore((state) => state.isOpen);
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderIds, setBusyOrderIds] = useState<Record<string, boolean>>({});
  const alertIntervalsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeLiveOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        setError(err?.message ?? "Failed to load orders");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      alertIntervalsRef.current.forEach((intervalId) =>
        clearInterval(intervalId),
      );
      alertIntervalsRef.current.clear();
      return;
    }

    const pendingOrders = orders.filter((order) => order.status === "pending");
    const pendingIds = new Set(pendingOrders.map((order) => order.id));

    alertIntervalsRef.current.forEach((intervalId, orderId) => {
      if (!pendingIds.has(orderId)) {
        clearInterval(intervalId);
        alertIntervalsRef.current.delete(orderId);
      }
    });

    pendingOrders.forEach((order) => {
      if (alertIntervalsRef.current.has(order.id)) return;

      const notify = () => {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "New order waiting",
            body: `Order #${order.id.slice(0, 6)} is awaiting acceptance.`,
            sound: true,
          },
          trigger: null,
        }).catch(() => undefined);
      };

      notify();
      const intervalId = setInterval(
        notify,
        ALERT_INTERVAL_MS,
      ) as unknown as number;
      alertIntervalsRef.current.set(order.id, intervalId);
    });

    return () => {
      alertIntervalsRef.current.forEach((intervalId) =>
        clearInterval(intervalId),
      );
      alertIntervalsRef.current.clear();
    };
  }, [orders, isOpen]);

  const getOrderItemCount = (order: OrderLike) => {
    if (order.items?.length) return order.items.length;
    if (order.cartItems?.length) return order.cartItems.length;
    return 0;
  };

  const getOrderTotalPence = (order: OrderLike) => {
    if (typeof order.total === "number") return order.total;
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

  const printAndAcceptOrder = async (orderId: string) => {
    await printOrder(orderId);
    await acceptOrder(orderId);
  };

  const getPrimaryAction = (order: OrderLike): ActionConfig | null => {
    switch (order.status) {
      case "pending":
        return {
          label: "Accept",
          onPress: () => printAndAcceptOrder(order.id),
          tone: "primary",
        };
      case "confirmed":
        return {
          label: "Start Preparing",
          onPress: () => startPreparingOrder(order.id),
          tone: "primary",
        };
      case "preparing":
        return {
          label: "Mark Ready",
          onPress: () => markOrderReady(order.id),
          tone: "primary",
        };
      case "ready":
        return { label: "Ready", disabled: true, tone: "secondary" };
      default:
        return null;
    }
  };

  const getSecondaryAction = (order: OrderLike): ActionConfig | null => {
    if (!cancellableStatuses.has(order.status)) return null;
    return {
      label: "Cancel",
      onPress: () => cancelOrder(order.id),
      tone: "danger",
    };
  };

  const runAction = async (orderId: string, action?: () => Promise<void>) => {
    if (!action) return;
    setBusyOrderIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      await action();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update order");
    } finally {
      setBusyOrderIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <ScreenTemplate title="" centered={false}>
      <View className="flex-1 w-full relative">
        {isOpen && !loading && !error ? (
          <View
            className="absolute inset-0 items-center justify-center pointer-events-none"
            style={styles.signBackdrop}
          >
            <RestaurantWindowSign isOpen />
          </View>
        ) : null}
        {!isOpen ? (
          <View className="flex-1 items-center justify-center">
            <RestaurantWindowSign isOpen={false} />
          </View>
        ) : null}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-gray-500">Loading orders...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : isOpen ? (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              orders.length
                ? undefined
                : { flex: 1, alignItems: "center", justifyContent: "center" }
            }
            renderItem={({ item }) => {
              const primaryAction = getPrimaryAction(item);
              const secondaryAction = getSecondaryAction(item);
              const isBusy = busyOrderIds[item.id];

              return (
                <View className="border border-gray-200 rounded-xl p-4 mb-3 bg-white">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold">
                      Order #{item.id.slice(0, 6)}
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
                            params: { id: item.id, from: "live" },
                          })
                        }
                        accessibilityLabel="View order details"
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text className="text-gray-600 mt-2">
                    {getOrderItemCount(item)} items
                  </Text>
                  <Text className="text-gray-600">
                    Total: £{(getOrderTotalPence(item) / 100).toFixed(2)}
                  </Text>
                  <Text className="text-gray-600">
                    Status: {formatStatusLabel(item.status)}
                  </Text>

                  <View className="flex-row items-center justify-between mt-3">
                    <TouchableOpacity
                      className="px-3 py-2 rounded bg-gray-100"
                      onPress={() =>
                        router.push({
                          pathname: "./order-details",
                          params: { id: item.id, from: "live" },
                        })
                      }
                    >
                      <Text className="text-gray-700">Details</Text>
                    </TouchableOpacity>

                    <View className="flex-row gap-2">
                      {secondaryAction ? (
                        <TouchableOpacity
                          className={`px-3 py-2 rounded border border-red-500 ${
                            isBusy ? "opacity-60" : ""
                          }`}
                          onPress={() =>
                            runAction(item.id, secondaryAction.onPress)
                          }
                          disabled={isBusy}
                        >
                          <Text className="text-red-600 font-semibold">
                            {secondaryAction.label}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {primaryAction ? (
                        <TouchableOpacity
                          className={`px-3 py-2 rounded ${
                            primaryAction.tone === "primary"
                              ? "bg-black"
                              : "bg-gray-200"
                          } ${
                            isBusy || primaryAction.disabled ? "opacity-60" : ""
                          }`}
                          onPress={() =>
                            runAction(item.id, primaryAction.onPress)
                          }
                          disabled={isBusy || primaryAction.disabled}
                        >
                          <Text
                            className={
                              primaryAction.tone === "primary"
                                ? "text-white font-semibold"
                                : "text-gray-700 font-semibold"
                            }
                          >
                            {primaryAction.label}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        ) : null}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  neonText: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  signInner: {
    width: 260,
    alignItems: "center",
  },
  signBackdrop: {
    zIndex: 0,
  },
  neonOpen: {
    color: "#22c55e",
    textShadowColor: "#16a34a",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  neonClosed: {
    color: "#ef4444",
    textShadowColor: "#b91c1c",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
