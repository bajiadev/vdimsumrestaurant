import CryptoJS from "crypto-js";

import { getOrderById, getOrderDetails } from "@/lib/firebase";
import type { Order } from "@/type";

const SUNMI_API_BASE = "https://openapi.sunmi.com";
const DEFAULT_COUNT = 1;
const DEFAULT_SHOP_ID = "";

const getConfigValue = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
};

const getOptionalConfigValue = (value: string | undefined) => value ?? "";

const toHex = (text: string) => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let hex = "";
  bytes.forEach((byte) => {
    hex += byte.toString(16).padStart(2, "0");
  });
  return hex;
};

const formatOrderDate = (order: Order) => {
  const createdAt = order.createdAt as any;
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleString("en-GB");
  }
  if (typeof createdAt?.seconds === "number") {
    return new Date(createdAt.seconds * 1000).toLocaleString("en-GB");
  }
  return "";
};

const getOrderTotalPence = (order: Order) => {
  const total = (order as { total?: number }).total;
  const amount = (order as { amount?: number }).amount;
  if (typeof total === "number") return total;
  if (typeof amount === "number") return amount;
  return 0;
};

const buildReceiptText = (
  order: Order,
  items: { name?: string; quantity?: number; price?: number }[],
) => {
  const header = "VDimSum Kitchen";
  const date = formatOrderDate(order);
  const totalPence = getOrderTotalPence(order);
  const totalPounds = (totalPence / 100).toFixed(2);
  const lines: string[] = [];

  lines.push(header);
  lines.push(`Order #${order.id.slice(0, 6)}`);
  if (date) lines.push(`Time: ${date}`);
  lines.push("--------------------------------");
  lines.push("Item                     Qty   Price");

  items.forEach((item) => {
    const name = (item.name ?? "Item").slice(0, 22);
    const qty = String(item.quantity ?? 1).padStart(3, " ");
    const price = ((item.price ?? 0) / 100).toFixed(2).padStart(6, " ");
    lines.push(`${name.padEnd(22, " ")}   ${qty}   ${price}`);
  });

  lines.push("--------------------------------");
  lines.push(`Total: GBP ${totalPounds}`);
  lines.push("");
  lines.push("");

  return lines.join("\n");
};

const buildSunmiHeaders = (bodyJson: string, appId: string, appKey: string) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = String(Math.floor(100000 + Math.random() * 900000));
  const signStr = bodyJson + appId + timestamp + nonce;
  const sign = CryptoJS.HmacSHA256(signStr, appKey).toString();

  return {
    headers: {
      "Content-Type": "application/json",
      "Sunmi-Appid": appId,
      "Sunmi-Nonce": nonce,
      "Sunmi-Timestamp": timestamp,
      "Sunmi-Sign": sign,
      Source: "openapi",
    },
  };
};

const callSunmiApi = async (
  path: string,
  body: Record<string, unknown>,
  appId: string,
  appKey: string,
) => {
  const bodyJson = JSON.stringify(body);
  const { headers } = buildSunmiHeaders(bodyJson, appId, appKey);

  const response = await fetch(`${SUNMI_API_BASE}${path}`, {
    method: "POST",
    headers,
    body: bodyJson,
  });

  const data = (await response.json()) as { code?: number; msg?: string };
  if (!response.ok || data.code !== 1) {
    throw new Error(data.msg || "Sunmi API request failed");
  }

  return data;
};

const bindPrinterToShop = async (
  sn: string,
  shopId: string | number,
  appId: string,
  appKey: string,
) => {
  return callSunmiApi(
    "/v2/printer/open/open/device/bindShop",
    { sn, shop_id: shopId },
    appId,
    appKey,
  );
};

export const printOrderToSunmi = async (orderId: string) => {
  const appId = getConfigValue(
    process.env.EXPO_PUBLIC_SUNMI_APPID,
    "SUNMI appid",
  );
  const appKey = getConfigValue(
    process.env.EXPO_PUBLIC_SUNMI_APPKEY,
    "SUNMI appkey",
  );
  const sn = getConfigValue(
    process.env.EXPO_PUBLIC_SUNMI_DEVICE_SN,
    "SUNMI device sn",
  );
  const shopIdRaw = getOptionalConfigValue(
    process.env.EXPO_PUBLIC_SUNMI_SHOP_ID,
  );
  const shopId = shopIdRaw === "" ? DEFAULT_SHOP_ID : Number(shopIdRaw);

  await bindPrinterToShop(sn, shopId, appId, appKey);

  const [order, items] = await Promise.all([
    getOrderById(orderId),
    getOrderDetails(orderId),
  ]);

  const receiptText = buildReceiptText(
    order,
    (items as { name?: string; quantity?: number; price?: number }[]) ?? [],
  );
  const contentHex = toHex(receiptText);
  const tradeNo = order.id.slice(0, 32);
  const body = {
    sn,
    trade_no: tradeNo,
    count: DEFAULT_COUNT,
    content: contentHex,
    order_type: 1,
  };

  return callSunmiApi(
    "/v2/printer/open/open/device/pushContent",
    body,
    appId,
    appKey,
  );
};
