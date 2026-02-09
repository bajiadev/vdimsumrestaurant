import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { Text, TouchableOpacity } from "react-native";
import "./global.css";

import {
  forceCloseShop,
  getShopForceClosed,
  getShopOpenStatus,
} from "@/lib/firebase";
import { useShopStatusStore } from "@/store/shopStatus.store";

export default function RootLayout() {
  const { isOpen, forceClosed, setForceClosed, setIsOpen, setStatus } =
    useShopStatusStore();

  useEffect(() => {
    const loadOpenStatus = async () => {
      try {
        const [open, forced] = await Promise.all([
          getShopOpenStatus(),
          getShopForceClosed(),
        ]);
        setStatus(open, forced);
      } catch {
        setStatus(false, false);
      }
    };

    loadOpenStatus();
  }, []);

  const handleToggleOpen = async () => {
    const nextForceClosed = !forceClosed;
    try {
      await forceCloseShop(nextForceClosed);
      setForceClosed(nextForceClosed);
      const open = await getShopOpenStatus();
      setIsOpen(open);
    } catch {
      setForceClosed(forceClosed);
    }
  };

  const screenOptions = ({ navigation }: any) => ({
    headerLeft: () => (
      <TouchableOpacity
        className="ml-4"
        onPress={() => navigation.openDrawer()}
      >
        <Ionicons name="menu" size={32} color="black" />
      </TouchableOpacity>
    ),
    headerTitle: "VDimsum",
    headerRight: () => (
      <TouchableOpacity
        className={`mr-4 px-4 py-2 rounded ${isOpen ? "bg-red-600" : "bg-green-600"}`}
        onPress={handleToggleOpen}
      >
        <Text className="text-white font-bold">
          {isOpen ? "CLOSE" : "OPEN"}
        </Text>
      </TouchableOpacity>
    ),
  });

  return (
    <Drawer screenOptions={screenOptions}>
      <Drawer.Screen
        name="index"
        options={{ title: "Live Orders", drawerLabel: "Live Orders" }}
      />
      <Drawer.Screen
        name="completed-orders"
        options={{ title: "Completed Orders", drawerLabel: "Completed Orders" }}
      />
      <Drawer.Screen
        name="item-availability"
        options={{
          title: "Item Availability",
          drawerLabel: "Item Availability",
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: "Settings", drawerLabel: "Settings" }}
      />
      <Drawer.Screen
        name="help"
        options={{ title: "Help", drawerLabel: "Help" }}
      />
      <Drawer.Screen
        name="order-details"
        options={{
          title: "Order Details",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
