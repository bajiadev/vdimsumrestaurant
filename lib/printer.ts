import { getOrderById, getOrderDetails } from "@/lib/firebase";
import type { Order } from "@/type";
import { NativeModules } from "react-native";

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



export const printOrder = async (orderId: string) => {
  const [order, items] = await Promise.all([
    getOrderById(orderId),
    getOrderDetails(orderId),
  ]);

  const receiptText = buildReceiptText(
    order,
    (items as { name?: string; quantity?: number; price?: number }[]) ?? [],
  );

  try {
    await NativeModules.PrinterModule.printText(receiptText);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};
