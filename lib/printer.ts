import { getOrderById, getOrderDetails } from "@/lib/firebase";
import type { Order } from "@/type";
import { NativeModules } from "react-native";
import { PrintStrFormat } from "react-native-smartpos";

const { SmartPos } = NativeModules;
const RECEIPT_WIDTH = 60;
const RECEIPT_SEPARATOR =
  "----------------------------------------------------------".slice(
    0,
    RECEIPT_WIDTH,
  );

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

const getOrderTotalPence = (order: Order) => order.amount ?? 0;

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

  type PrintItem = { name?: string; quantity?: number; price?: number };
  const orderItems: PrintItem[] =
    items.length > 0 ? (items as PrintItem[]) : (order.items ?? []);
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
    format.lineSpacing = 12;
    SmartPos.setPrintAppendString("VDimSum", format);

    // Order type
    format.textSize = 30;
    format.ali = "center";
    format.style = "bold";
    format.underline = true;
    format.lineSpacing = 10;
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
    format.lineSpacing = 10;
    SmartPos.setPrintAppendString(`Order #${order.orderNumber}`, format);
    if (date) SmartPos.setPrintAppendString(`Time: ${date}`, format);

    // Column header
    format.textSize = 25;
    format.ali = "normal";
    format.style = "bold";
    SmartPos.setPrintAppendString(RECEIPT_SEPARATOR, format);

    // Items
    orderItems.forEach((item) => {
      const qty = `${item.quantity ?? 1}x`;
      const name = (item.name ?? "Item").slice(0, 40);
      const price = `£${((item.price ?? 0) / 100).toFixed(2)}`;

      format.ali = "normal";
      format.style = "bold";
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
    SmartPos.setPrintAppendString(`Total: £ ${totalPounds}`, format);

    // Footer spacing
    format.textSize = 25;
    format.ali = "normal";
    format.style = "normal";
    format.lineSpacing = 10;
    SmartPos.setPrintAppendString(" ", format);
    SmartPos.setPrintAppendString(" ", format);
    SmartPos.setPrintAppendString(" ", format);

    const resultMap = await SmartPos.setPrintStart();
    return !!(resultMap && resultMap.code === 0);
  } catch (error) {
    return false;
  }
};
