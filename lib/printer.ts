import { getOrderById, getOrderDetails } from "@/lib/firebase";
import type { Order } from "@/type";
import { NativeModules } from "react-native";
import { PrintStrFormat } from "react-native-smartpos";

const { SmartPos } = NativeModules;
const RECEIPT_WIDTH = 42;
const RECEIPT_SEPARATOR =
  "------------------------------------------------------------------------";

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

const getPrintableDeliveryAddressLines = (
  deliveryAddress?: Order["deliveryAddress"],
) => {
  if (!deliveryAddress) return [] as string[];

  return [
    deliveryAddress.name,
    deliveryAddress.street1,
    deliveryAddress.street2,
    deliveryAddress.city,
    deliveryAddress.postcode,
  ].filter(
    (line): line is string =>
      typeof line === "string" && line.trim().length > 0,
  );
};

export const printOrder = async (orderId: string) => {
  const initResult = await SmartPos.sysInit();
  if (initResult.code !== 0) {
    throw new Error("Printer initialization failed");
  }

  const [order, items] = await Promise.all([
    getOrderById(orderId),
    getOrderDetails(orderId),
  ]);

  const orderItems =
    (items as { name?: string; quantity?: number; price?: number }[]) ?? [];
  const date = formatOrderDate(order);
  const totalPounds = (getOrderTotalPence(order) / 100).toFixed(2);
  const deliveryAddressLines = getPrintableDeliveryAddressLines(
    order.deliveryAddress,
  );

  try {
    const format = new PrintStrFormat();

    // Header
    format.textSize = 40;
    format.ali = "center";
    format.style = "bold";
    format.lineSpacing = 8;
    SmartPos.setPrintAppendString("VDimSum", format);

    // Order type
    format.textSize = 30;
    format.ali = "center";
    format.style = "bold";
    format.underline = true;
    format.lineSpacing = 6;
    SmartPos.setPrintAppendString(
      (order.orderType ?? "Order").toUpperCase(),
      format,
    );

    // Delivery address (if applicable)
    if (deliveryAddressLines.length) {
      format.textSize = 30;
      format.ali = "normal";
      format.style = "bold";
      format.lineSpacing = 4;
      deliveryAddressLines.forEach((line) => {
        SmartPos.setPrintAppendString(line, format);
      });
    }

    // Order meta
    format.textSize = 25;
    format.ali = "normal";
    format.style = "normal";
    format.lineSpacing = 4;
    SmartPos.setPrintAppendString(`Order #${order.orderNumber}`, format);
    if (date) SmartPos.setPrintAppendString(`Time: ${date}`, format);
    SmartPos.setPrintAppendString(RECEIPT_SEPARATOR, format);

    // Column header
    format.textSize = 25;
    format.ali = "normal";
    format.style = "bold";
    SmartPos.setPrintAppendString(RECEIPT_SEPARATOR, format);
    format.style = "normal";
    SmartPos.setPrintAppendString(RECEIPT_SEPARATOR, format);

    // Items
    orderItems.forEach((item) => {
      const qty = `${item.quantity ?? 1}x`;
      const name = (item.name ?? "Item").slice(0, 40);
      const price = `£${((item.price ?? 0) / 100).toFixed(2)}`;

      format.ali = "normal";
      SmartPos.setPrintAppendString(`${qty} ${name}`, format);

      // SmartPos maps right alignment to ALIGN_OPPOSITE.
      format.ali = "right";
      SmartPos.setPrintAppendString(price, format);

      format.ali = "normal";
      format.lineSpacing = 2;
    });
    // Total
    SmartPos.setPrintAppendString(RECEIPT_SEPARATOR, format);
    format.textSize = 30;
    format.ali = "normal";
    format.style = "bold";
    format.lineSpacing = 6;
    SmartPos.setPrintAppendString(`Total: GBP ${totalPounds}`, format);

    // Footer spacing
    format.textSize = 25;
    format.ali = "normal";
    format.style = "normal";
    format.lineSpacing = 4;
    SmartPos.setPrintAppendString(" ", format);
    SmartPos.setPrintAppendString(" ", format);
    SmartPos.setPrintAppendString(" ", format);

    const resultMap = await SmartPos.setPrintStart();
    return !!(resultMap && resultMap.code === 0);
  } catch (error) {
    return false;
  }
};
