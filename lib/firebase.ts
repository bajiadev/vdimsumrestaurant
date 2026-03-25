import {
  CartItemType,
  CreateUserParams,
  GetMenuParams,
  Order,
  OrderStatus,
  ORDER_STATUSES,
  LIVE_ORDER_STATUSES,
  SignInParams,
} from "@/type";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
//import { getReactNativePersistence } from "firebase/auth/react-native";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

export const app = initializeApp(firebaseConfig);

export const cloudFunctions = getFunctions(app);

const LONDON_TIMEZONE = "Europe/London";
const DEFAULT_SHOP_ID = "j13bhdjITVrL97UfrwIG";

// if (__DEV__) {
//   connectFunctionsEmulator(cloudFunctions, "localhost", 5001);
// }

//import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// import { getReactNativePersistence, initializeAuth } from "firebase/auth";
// export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(ReactNativeAsyncStorage),
// });
/* -------------------------------------------------------------------------- */
/*                                  SERVICES                                  */
/* -------------------------------------------------------------------------- */

//export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// export const signIn = async ({ email, password }: SignInParams) => {
//   try {
//     await signInWithEmailAndPassword(auth, email, password);
//   } catch (e: any) {
//     throw new Error(e.message);
//   }
// };

/* -------------------------------------------------------------------------- */
/*                                   MENU                                     */
/* -------------------------------------------------------------------------- */

export const getMenu = async ({ category, query: search }: GetMenuParams) => {
  try {
    let qRef = collection(db, "menu");
    const conditions = [];

    if (category) conditions.push(where("category", "==", category));
    if (search) conditions.push(where("keywords", "array-contains", search));

    const q = conditions.length ? query(qRef, ...conditions) : qRef;

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const getMenuItemsByIds = async (ids: string[]) => {
  try {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const snaps = await Promise.all(
      uniqueIds.map((id) => getDoc(doc(db, "menu", id))),
    );
    return snaps.reduce<Record<string, unknown>>((acc, snap) => {
      if (snap.exists()) acc[snap.id] = snap.data();
      return acc;
    }, {});
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const getMenuItems = async () => {
  try {
    const snap = await getDocs(collection(db, "menu"));
    return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const updateMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean,
) => {
  const itemRef = doc(db, "menu", itemId);
  await updateDoc(itemRef, { isAvailable });
};

export const getCategories = async () => {
  try {
    const snap = await getDocs(collection(db, "categories"));
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
      };
    });
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, "orders"),
      where("shopId", "==", DEFAULT_SHOP_ID),
      where(
        "createdAt",
        ">=",
        Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      ),
      orderBy("createdAt", "desc"),
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Order, "id">),
    }));
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

// export const getAllOrders = async (): Promise<Order[]> => {
//   const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
//   const snap = await getDocs(q);
//   return snap.docs.map((doc) => ({
//     id: doc.id,
//     ...(doc.data() as Omit<Order, "id">),
//   }));
// };

export const getLiveOrders = async (): Promise<Order[]> => {
  try {
    const { startOfDay, startOfNextDay } = getLondonDayRange();
    const conditions = [
      where("status", "in", [...LIVE_ORDER_STATUSES]),
      where("createdAt", ">=", startOfDay),
      where("createdAt", "<", startOfNextDay),
      orderBy("createdAt", "desc"),
    ];

    conditions.unshift(where("shopId", "==", DEFAULT_SHOP_ID));

    const q = query(collection(db, "orders"), ...conditions);
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Order, "id">),
    }));
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const subscribeLiveOrders = (
  onOrders: (orders: Order[]) => void,
  onError?: (error: Error) => void,
) => {
  try {
    const { startOfDay, startOfNextDay } = getLondonDayRange();
    const conditions = [
      where("status", "in", [...LIVE_ORDER_STATUSES]),
      where("createdAt", ">=", startOfDay),
      where("createdAt", "<", startOfNextDay),
      orderBy("createdAt", "desc"),
    ];

    conditions.unshift(where("shopId", "==", DEFAULT_SHOP_ID));

    const q = query(collection(db, "orders"), ...conditions);

    return onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Order, "id">),
        }));
        onOrders(orders);
      },
      (error) => {
        if (onError) onError(error as Error);
      },
    );
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  paid: ["pending", "confirmed", "canceled", "cancelled"],
  pending: ["confirmed", "canceled", "cancelled"],
  confirmed: ["preparing", "canceled", "cancelled"],
  preparing: ["ready", "canceled", "cancelled"],
  ready: ["onTheWay", "canceled", "cancelled"],
  onTheWay: ["completed", "canceled", "cancelled"],
  completed: [],
  canceled: [],
  cancelled: [],
};

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" &&
  (ORDER_STATUSES as readonly string[]).includes(value);

const canTransitionOrderStatus = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean => ORDER_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus);

export const updateOrderStatus = async (
  orderId: string,
  nextStatus: OrderStatus,
) => {
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error("Order not found");
  }

  const currentStatus = (orderSnap.data() as { status?: unknown })?.status;

  if (!isOrderStatus(currentStatus)) {
    throw new Error("Order status is missing or invalid");
  }

  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
    );
  }

  await updateDoc(orderRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });
};

export const acceptOrder = async (orderId: string) => {
  await updateOrderStatus(orderId, "confirmed");
  await updateOrderStatus(orderId, "preparing");
};

export const startPreparingOrder = async (orderId: string) =>
  updateOrderStatus(orderId, "preparing");

export const markOrderReady = async (orderId: string) =>
  updateOrderStatus(orderId, "ready");

export const markOrderOnTheWay = async (orderId: string) =>
  updateOrderStatus(orderId, "onTheWay");

export const completeOrder = async (orderId: string) =>
  updateOrderStatus(orderId, "completed");

export const cancelOrder = async (orderId: string) =>
  updateOrderStatus(orderId, "canceled");

const getLondonDayRange = (baseDate: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(baseDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const offsetMinutes = getTimezoneOffsetMinutes(
    LONDON_TIMEZONE,
    new Date(Date.UTC(year, month - 1, day, 12, 0, 0)),
  );

  const startUtcMs =
    Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60 * 1000;
  const nextDayUtcMs =
    Date.UTC(year, month - 1, day + 1, 0, 0, 0) - offsetMinutes * 60 * 1000;

  return {
    startOfDay: Timestamp.fromDate(new Date(startUtcMs)),
    startOfNextDay: Timestamp.fromDate(new Date(nextDayUtcMs)),
  };
};

const getTimezoneOffsetMinutes = (timeZone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const tzPart = parts.find((part) => part.type === "timeZoneName")?.value;
  if (!tzPart) return 0;

  const match = tzPart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  const sign = hours < 0 ? -1 : 1;

  return hours * 60 + sign * minutes;
};

export const getOrderDetails = async (orderId: string) => {
  const itemsSnap = await getDocs(
    collection(db, "orders", orderId, "orderItems"),
  );

  return itemsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  const orderSnap = await getDoc(doc(db, "orders", orderId));

  if (!orderSnap.exists()) {
    throw new Error("Order not found");
  }

  return {
    id: orderSnap.id,
    ...(orderSnap.data() as Omit<Order, "id">),
  };
};

export const getShops = async () => {
  try {
    const snap = await getDocs(collection(db, "shops"));
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const getShopInfo = async () => {
  try {
    const shopDoc = await getDoc(doc(db, "shops", DEFAULT_SHOP_ID));

    if (!shopDoc.exists()) {
      throw new Error("Shop info not found");
    }

    return shopDoc.data();
  } catch (error: any) {
    throw new Error(error.message || "Failed to retrieve shop info");
  }
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "open", "yes", "1"].includes(normalized)) return true;
    if (["false", "closed", "no", "0"].includes(normalized)) return false;
  }
  return null;
};

type ShopDaySchedule = {
  open?: string;
  close?: string;
  openAllDay?: boolean;
  closedAllDay?: boolean;
  openAllday?: boolean;
  closedAllday?: boolean;
};

const getLondonWeekdayKey = (date: Date = new Date()): string => {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    weekday: "long",
  }).format(date);

  return weekday.toLowerCase();
};

const getLondonTimeMinutes = (date: Date = new Date()): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour * 60 + minute;
};

const parseTimeToMinutes = (value?: string): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hours = Number(twentyFourMatch[1]);
    const minutes = Number(twentyFourMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i);
  if (!twelveHourMatch) return null;

  let hours = Number(twelveHourMatch[1]);
  const minutes = Number(twelveHourMatch[2] || "0");
  const meridiem = twelveHourMatch[3].toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

  if (meridiem === "am") {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return hours * 60 + minutes;
};

const isOpenNowFromSchedule = (schedule?: ShopDaySchedule): boolean | null => {
  if (!schedule) return null;
  if (schedule.closedAllDay ?? schedule.closedAllday) return false;
  if (schedule.openAllDay ?? schedule.openAllday) return true;

  const openMinutes = parseTimeToMinutes(schedule.open);
  const closeMinutes = parseTimeToMinutes(schedule.close);
  if (openMinutes === null || closeMinutes === null) return null;

  const nowMinutes = getLondonTimeMinutes();
  if (openMinutes === closeMinutes) return false;

  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
};

export const getShopOpenStatus = async (): Promise<boolean> => {
  try {
    const data = await getShopInfo();
    const forceClosed = toBoolean(
      (data as { forceClosed?: unknown })?.forceClosed,
    );

    if (forceClosed === true) {
      return false;
    }

    const weekdayKey = getLondonWeekdayKey();
    const openingHours = (data as { openingHours?: Record<string, unknown> })
      ?.openingHours;
    const schedule = (openingHours?.[weekdayKey] ??
      (data as Record<string, unknown>)[weekdayKey]) as
      | ShopDaySchedule
      | undefined;
    const scheduleStatus = isOpenNowFromSchedule(schedule);

    if (scheduleStatus !== null) {
      return scheduleStatus;
    }
  } catch {
    return false;
  }

  return false;
};

export const getShopForceClosed = async (): Promise<boolean> => {
  try {
    const data = await getShopInfo();
    const forceClosed = toBoolean(
      (data as { forceClosed?: unknown })?.forceClosed,
    );

    if (forceClosed !== null) {
      return forceClosed;
    }
  } catch {
    return false;
  }

  return false;
};

// Update shop info
export const updateShopInfo = async (data: any) => {
  try {
    const {
      name,
      description,
      phone,
      email,
      address,
      openingHours,
      location,
      imageUrl,
    } = data;

    // Validate required fields
    if (!name) {
      throw new Error("Shop name is required");
    }

    const updateData: any = {
      name,
      description: description || "",
      phone: phone || "",
      email: email || "",
      updatedAt: serverTimestamp(),
    };

    if (address) updateData.address = address;
    if (openingHours) updateData.openingHours = openingHours;
    if (location) updateData.location = location;
    if (imageUrl) updateData.imageUrl = imageUrl;

    await setDoc(doc(db, "shops", DEFAULT_SHOP_ID), updateData, {
      merge: true,
    });

    return {
      success: true,
      message: "Shop info updated successfully",
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update shop info");
  }
};

export const forceCloseShop = async (forceClosed: boolean) => {
  try {
    await setDoc(
      doc(db, "shops", DEFAULT_SHOP_ID),
      { forceClosed },
      { merge: true },
    );
  } catch (error: any) {
    throw new Error(error.message || "Failed to update force close status");
  }
};
