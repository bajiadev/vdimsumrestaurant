/* -------------------------------------------------------------------------- */
/*                                   MENU                                     */
/* -------------------------------------------------------------------------- */
export interface MenuItemCustomization {
  id: string;
  name: string;
  price?: number;
  type: string;
  required?: boolean;
}
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  description: string;
  calories: number;
  //protein: number;
  rating: number;
  type: string;
  customizations?: MenuItemCustomization[];
}

/* -------------------------------------------------------------------------- */
/*                                 CATEGORY                                   */
/* -------------------------------------------------------------------------- */

export interface Category {
  id: string;
  name: string;
  description: string;
}

/* -------------------------------------------------------------------------- */
/*                                   USER                                     */
/* -------------------------------------------------------------------------- */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

/* -------------------------------------------------------------------------- */
/*                              CART & STORE                                  */
/* -------------------------------------------------------------------------- */
export const toCartCustomizations = (
  customizations: MenuItem["customizations"] = [],
): CartCustomization[] => {
  return customizations.map((c) => ({
    id: c.id,
    name: c.name,
    price: c.price ?? 0,
    type: c.type,
  }));
};

export interface CartCustomization {
  id: string;
  name: string;
  price: number;
  type: string;
}

export interface CartItemType {
  id: string; // menu item id
  name: string;
  price: number;
  image_url?: string;
  quantity: number;
  customizations?: CartCustomization[];
}

export interface CartStore {
  items: CartItemType[];
  orderType: "delivery" | "pickup" | null;
  setOrderType: (type: "delivery" | "pickup") => void;
  addItem: (
    product: MenuItem,
    quantity?: number,
    customizations?: CartCustomization[],
  ) => void;
  removeItem: (id: string, customizations: CartCustomization[]) => void;
  increaseQty: (id: string, customizations: CartCustomization[]) => void;
  decreaseQty: (id: string, customizations: CartCustomization[]) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  createOrder: (userId: string) => Promise<string>;
  reorder: (
    items: { id: string; name: string; price: number; quantity: number }[],
  ) => void;
}

/* -------------------------------------------------------------------------- */
/*                                  UI TYPES                                  */
/* -------------------------------------------------------------------------- */

import { Timestamp } from "firebase/firestore";
import React from "react";
import { ImageSourcePropType } from "react-native";

export interface TabBarIconProps {
  focused: boolean;
  icon: ImageSourcePropType;
  title: string;
}

export interface PaymentInfoStripeProps {
  label: string;
  value: string;
  labelStyle?: string;
  valueStyle?: string;
}

export interface CustomButtonProps {
  onPress?: () => void;
  title?: string;
  style?: string;
  leftIcon?: React.ReactNode;
  textStyle?: string;
  isLoading?: boolean;
}

export interface CustomHeaderProps {
  title?: string;
}

export interface CustomInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  label: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

export interface ProfileFieldProps {
  label: string;
  value: string;
  icon: ImageSourcePropType;
}

/* -------------------------------------------------------------------------- */
/*                               AUTH PARAMS                                  */
/* -------------------------------------------------------------------------- */

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface GetMenuParams {
  category?: string;
  query?: string;
}

export interface createPaymentIntentResponse {
  clientSecret: string;
}

export interface createPaymentIntentRequest {
  // cartItems: CartItemType[];
  cartItems: { id: string; quantity: number }[];
  orderId: string;
}

export const ORDER_STATUSES = [
  "paid",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const LIVE_ORDER_STATUSES = [
  "paid",
  "accepted",
  "preparing",
  "ready",
] as const satisfies readonly OrderStatus[];

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  orderType: string;
  deliveryAddress?: {
    name?: string;
    street1?: string;
    street2?: string;
    city?: string;
    postcode?: string;
    formatted?: string;
    [key: string]: any;
  };
  itemCount: number;
  items: {
    id: string;
    name: string;
    price: number; // pence
    quantity: number;
    image?: string;
  }[];
  amount: number; // pence
  status: OrderStatus;
  createdAt: Timestamp;
};

export type OrderItem = {
  id: string; // document ID
  menuItemId: string;
  name: string;
  price: number; // pence
  quantity: number;
  image_url?: string;
  customizations?: OrderCustomization[];
  isRewardRedemption?: boolean;
  rewardPointsCost?: number;
  redemptionId?: string;
};

export interface OrderCustomization {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}
