import type { Order, OrderItem } from "@/type";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  acceptOrder,
  cancelOrder,
  getOrderById,
  getOrderDetails,
  markOrderReady,
  startPreparingOrder,
} from "@/lib/firebase";
import { printOrder } from "@/lib/printer";

import ScreenTemplate from "../components/ScreenTemplate";

type OrderLike = Order & {
  orderNumber?: string;
  amount?: number;
  cartItems?: { id?: string; quantity?: number }[];
  uid?: string;
  shopId?: string;
};

// type OrderItemLike = {
//   id?: string;
//   name?: string;
//   price?: number;
//   quantity?: number;
// };

type ActionConfig = {
  label: string;
  onPress?: () => Promise<void>;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

const cancellableStatuses = new Set([
  "pending",
  "paid",
  "accepted",
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

export default function OrderDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = typeof params.id === "string" ? params.id : "";
  const from = typeof params.from === "string" ? params.from : "";

  const [order, setOrder] = useState<OrderLike | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  // Debugging states
  // const [printInfo, setPrintInfo] = useState<string>("");
  // const [printerDebug, setPrinterDebug] = useState<string>("");

  //const [orderItems, setOrderItems] = useState<OrderItemLike[]>([]);
  const [priceById, setPriceById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setError(null);
      const [orderData, itemsData] = await Promise.all([
        getOrderById(orderId),
        getOrderDetails(orderId),
      ]);
      setOrder(orderData);
      setOrderItems(itemsData as OrderItem[]);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const displayedItems = useMemo(() => {
    if (orderItems.length) return orderItems;
    if (order?.items?.length) return order.items;
    return [];
  }, [orderItems, order]);

  // useEffect(() => {
  //   const missingIds = displayedItems
  //     .filter((item) => typeof item.price !== "number" && item.id)
  //     .map((item) => item.id as string)
  //     .filter((id) => !(id in priceById));

  //   if (!missingIds.length) return;

  //   let mounted = true;
  //   getMenuItemsByIds(missingIds)
  //     .then((items) => {
  //       if (!mounted) return;
  //       const nextPrices: Record<string, number> = {};
  //       Object.entries(items).forEach(([id, data]) => {
  //         const price = (data as { price?: number }).price;
  //         if (typeof price === "number") nextPrices[id] = price;
  //       });
  //       if (Object.keys(nextPrices).length) {
  //         setPriceById((prev) => ({ ...prev, ...nextPrices }));
  //       }
  //     })
  //     .catch(() => undefined);

  //   return () => {
  //     mounted = false;
  //   };
  // }, [displayedItems, priceById]);

  const getOrderTotalPence = (orderValue?: OrderLike | null) => {
    if (!orderValue) return 0;
    if (typeof orderValue.amount === "number") return orderValue.amount;
    return 0;
  };

  const formatOrderDate = (orderValue?: OrderLike | null) => {
    const createdAt = orderValue?.createdAt as any;
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

  const getPrimaryAction = (
    orderValue?: OrderLike | null,
  ): ActionConfig | null => {
    if (!orderValue) return null;
    switch (orderValue.status) {
      case "pending":
        return {
          label: "Awaiting Payment",
          disabled: true,
          tone: "secondary",
        };
      case "paid":
        return {
          label: "Accept",
          onPress: () => printAndAcceptOrder(orderValue.id),
          tone: "primary",
        };
      case "accepted":
        return {
          label: "Start Preparing",
          onPress: () => startPreparingOrder(orderValue.id),
          tone: "primary",
        };
      case "preparing":
        return {
          label: "Mark Ready",
          onPress: () => markOrderReady(orderValue.id),
          tone: "primary",
        };
      case "ready":
        return { label: "Ready for Driver", disabled: true, tone: "secondary" };
      default:
        return null;
    }
  };

  const getSecondaryAction = (
    orderValue?: OrderLike | null,
  ): ActionConfig | null => {
    if (!orderValue) return null;
    if (!cancellableStatuses.has(orderValue.status)) return null;
    return {
      label: "Cancel",
      onPress: () => cancelOrder(orderValue.id),
      tone: "danger",
    };
  };

  const runAction = async (action?: () => Promise<void>) => {
    if (!action) return;
    setBusy(true);
    try {
      await action();
      await loadOrder();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update order");
    } finally {
      setBusy(false);
    }
  };

  // const primaryAction = getPrimaryAction(order);
  // const secondaryAction = getSecondaryAction(order);

  const handleBack = () => {
    if (from === "completed") {
      router.replace("./completed-orders");
      return;
    }
    if (from === "live") {
      router.replace("./");
      return;
    }
    router.back();
  };

  // const handleTestPrint = async () => {
  //   try {
  //     const result = await testPrint();
  //     if (result.length > 0) {
  //       setPrintInfo(prev => prev + "\n" + result.join("\n"));
  //     } else {
  //       setPrinterDebug("Test print completed successfully with no debug info.");
  //     }
  //   } catch (error) {
  //     console.error("Test print failed:", error);
  //   }
  // };

  // useEffect(() => {
  //   if (NativeModules) {
  //     const { SmartPos } = NativeModules;
  //     setPrintInfo(
  //       `NativeModules: ${JSON.stringify(NativeModules)} \nSmartPos: ${JSON.stringify(SmartPos)}`,
  //     );
  //   }
  // }, []);

  return (
    <ScreenTemplate title="Order Details" centered={false}>
      <View className="flex-1 w-full">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-gray-500">Loading order...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : !order ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">Order not found.</Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            <View className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold">
                  Order #{order.orderNumber}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {formatOrderDate(order)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600">
                  Total: £
                  {order.amount ? (order.amount / 100).toFixed(2) : "0.00"}
                </Text>
                <Text className="text-gray-600 mt-2">
                  Status: {formatStatusLabel(order.status)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 mt-2">
                  Type: {order.orderType ?? "N/A"}
                </Text>
              </View>
              <View className="flex-row items-start justify-between">
                <Text className="text-gray-600 mt-2 flex-1 leading-5">
                  {order.deliveryAddress?.formatted ?? ""}
                </Text>
              </View>
            </View>

            <View className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
              <Text className="font-semibold mb-2">Items</Text>
              {displayedItems.length ? (
                displayedItems.map((item, index) => (
                  <View
                    key={item.id ?? `${index}`}
                    className="flex-row items-center justify-between py-2"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-800">
                        {item.name ?? "Item"}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        Qty: {item.quantity ?? 1}
                      </Text>
                    </View>
                    {typeof item.price === "number" || item.id ? (
                      <Text className="text-gray-700">
                        £
                        {(
                          (typeof item.price === "number"
                            ? item.price
                            : (priceById[item.id ?? ""] ?? 0)) / 100
                        ).toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text className="text-gray-500">No items found.</Text>
              )}
            </View>

            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="px-3 py-2 rounded bg-gray-400"
                  onPress={handleBack}
                >
                  <Text className="text-gray-900">Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-3 py-2 rounded bg-gray-400"
                  onPress={() => printOrder(order.id)}
                >
                  <Text className="text-gray-900">Print</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenTemplate>
  );
}
