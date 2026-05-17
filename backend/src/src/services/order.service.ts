import fs from "fs";
import path from "path";
import { decreaseProductStock } from "./product.service";
import { getDeliveryLandmarkByName } from "./store-settings.service";

export type CheckoutItem = {
    id: number;
    slug: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    volume?: string;
};

export type PaymentMethod = "GCASH" | "COD";

export type OrderStatus =
    | "PENDING_CONFIRMATION"
    | "PAYMENT_CONFIRMATION"
    | "ORDER_PROCESSING"
    | "READY_TO_SHIP"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";

export type OrderChatMessage = {
    id: number;
    senderId: number;
    senderName: string;
    senderRole: "ADMIN" | "CUSTOMER";
    message: string;
    createdAt: string;
};

export type StoredOrder = {
    id: number;
    userId: number;
    fullName: string;
    address: string;
    gcashNumber?: string;
    items: CheckoutItem[];
    subtotal: number;
    shippingFee: number;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentProvider?: string;
    paymentReference?: string;
    customerGcashNumber?: string;
    selectedLandmark?: string;
    customLandmark?: string;
    needsLandmarkConfirmation?: boolean;
    landmarkStatus?: "APPROVED" | "REJECTED" | "PENDING";
    adminConfirmationNote?: string;
    deliveryNote?: string;
    deletedFromAdmin?: boolean;
    adminDeletedAt?: string;
    chatMessages: OrderChatMessage[];
    createdAt: string;
    updatedAt?: string;
};

const dataDir = path.join(process.cwd(), "data");
const ordersDataFile = path.join(dataDir, "orders.json");
const REJECTED_TRANSACTION_NOTE = "you're not eligible to pay please use a valid and transparent transaction";

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function normalizeStatus(status?: string): OrderStatus {
    if (status === "PAID") return "PAYMENT_CONFIRMATION";
    if (status === "PROCESSING") return "ORDER_PROCESSING";
    if (status === "PENDING_PAYMENT") return "PENDING_CONFIRMATION";
    const allowed: OrderStatus[] = ["PENDING_CONFIRMATION", "PAYMENT_CONFIRMATION", "ORDER_PROCESSING", "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
    return allowed.includes(status as OrderStatus) ? status as OrderStatus : "PENDING_CONFIRMATION";
}

function safeMoney(value: unknown) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
}

function calculateItemsSubtotal(items: CheckoutItem[]) {
    return safeMoney(items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0));
}

function loadOrders() {
    try {
        if (!fs.existsSync(ordersDataFile)) return [] as StoredOrder[];
        const parsed = JSON.parse(fs.readFileSync(ordersDataFile, "utf8")) as StoredOrder[];
        return Array.isArray(parsed) ? parsed.map((order) => {
            const subtotal = safeMoney(order.subtotal ?? calculateItemsSubtotal(order.items || []));
            const shippingFee = safeMoney(order.shippingFee ?? Math.max(Number(order.total || 0) - subtotal, 0));
            return {
                ...order,
                subtotal,
                shippingFee,
                total: safeMoney(subtotal + shippingFee),
                status: normalizeStatus(order.status as string),
                landmarkStatus: order.landmarkStatus || (order.needsLandmarkConfirmation ? "PENDING" : "APPROVED"),
                chatMessages: Array.isArray(order.chatMessages) ? order.chatMessages : []
            };
        }) : [];
    } catch {
        return [] as StoredOrder[];
    }
}

const orders: StoredOrder[] = loadOrders();
let nextOrderId = orders.reduce((max, order) => Math.max(max, order.id), 0) + 1;

function saveOrders() {
    ensureDataDir();
    fs.writeFileSync(ordersDataFile, JSON.stringify(orders, null, 2));
}

function addSystemAdminMessage(order: StoredOrder, message: string) {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    const nextId = order.chatMessages.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    order.chatMessages.push({
        id: nextId,
        senderId: 0,
        senderName: "AGE OF SCENT Admin",
        senderRole: "ADMIN",
        message: cleanMessage,
        createdAt: new Date().toISOString()
    });
}

function applyShippingFee(order: StoredOrder, nextShippingFee: unknown, note?: string) {
    const shippingFee = safeMoney(nextShippingFee);
    order.shippingFee = shippingFee;
    order.subtotal = safeMoney(order.subtotal ?? calculateItemsSubtotal(order.items || []));
    order.total = safeMoney(order.subtotal + order.shippingFee);
    if (typeof note === "string") order.deliveryNote = note.trim();
    if (note?.trim()) addSystemAdminMessage(order, note.trim());
    order.updatedAt = new Date().toISOString();
}

export function createCheckoutOrder(input: {
    userId: number;
    fullName: string;
    address: string;
    gcashNumber?: string;
    customerGcashNumber?: string;
    selectedLandmark?: string;
    customLandmark?: string;
    needsLandmarkConfirmation?: boolean;
    paymentMethod: PaymentMethod;
    items: CheckoutItem[];
    subtotal?: number;
    shippingFee?: number;
}) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new Error("Cart is empty.");
    }

    for (const item of input.items) {
        decreaseProductStock(Number(item.id), Number(item.quantity));
    }

    const custom = (input.customLandmark || "").trim();
    const selectedLandmark = (input.selectedLandmark || "").trim();
    const isCustomLandmark = selectedLandmark === "CUSTOM" || selectedLandmark === "OTHER" || Boolean(custom);
    const landmark = isCustomLandmark ? null : getDeliveryLandmarkByName(selectedLandmark);
    const shippingFee = isCustomLandmark ? safeMoney(input.shippingFee) : safeMoney(landmark?.shippingFee ?? input.shippingFee);
    const subtotal = safeMoney(input.subtotal ?? calculateItemsSubtotal(input.items));
    const needsConfirmation = Boolean(input.needsLandmarkConfirmation || custom || isCustomLandmark);

    const order: StoredOrder = {
        id: nextOrderId++,
        userId: input.userId,
        fullName: input.fullName.trim(),
        address: input.address.trim(),
        gcashNumber: input.gcashNumber?.trim(),
        customerGcashNumber: input.customerGcashNumber?.trim(),
        selectedLandmark,
        customLandmark: custom,
        needsLandmarkConfirmation: needsConfirmation,
        landmarkStatus: needsConfirmation ? "PENDING" : "APPROVED",
        paymentMethod: input.paymentMethod,
        items: input.items.map((item) => ({ ...item, quantity: Number(item.quantity), price: Number(item.price) })),
        subtotal,
        shippingFee,
        total: safeMoney(subtotal + shippingFee),
        status: "PENDING_CONFIRMATION",
        chatMessages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orders.push(order);
    saveOrders();
    return order;
}

export function attachPaymentToOrder(orderId: number, paymentProvider: string, paymentReference: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;

    order.paymentProvider = paymentProvider;
    order.paymentReference = paymentReference;
    order.updatedAt = new Date().toISOString();
    saveOrders();
    return order;
}

export function markOrderPaidByReference(reference: string) {
    const order = orders.find((item) => item.paymentReference === reference);
    if (!order) return null;

    order.status = "PAYMENT_CONFIRMATION";
    order.updatedAt = new Date().toISOString();
    saveOrders();
    return order;
}

export function updateOrderStatus(orderId: number, status: OrderStatus, deliveryNote?: string, shippingFee?: number) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    order.status = normalizeStatus(status);
    if (typeof shippingFee !== "undefined") {
        applyShippingFee(order, shippingFee, deliveryNote);
    } else {
        if (typeof deliveryNote === "string") order.deliveryNote = deliveryNote.trim();
        if (deliveryNote?.trim()) addSystemAdminMessage(order, deliveryNote.trim());
        order.updatedAt = new Date().toISOString();
    }
    saveOrders();
    return order;
}

export function updateOrderLandmarkStatus(orderId: number, landmarkStatus: "APPROVED" | "REJECTED" | "PENDING", note?: string, shippingFee?: number) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    order.landmarkStatus = landmarkStatus;
    order.needsLandmarkConfirmation = landmarkStatus === "PENDING";
    order.adminConfirmationNote = note?.trim() || order.adminConfirmationNote;
    if (typeof shippingFee !== "undefined") {
        applyShippingFee(order, shippingFee, note);
    } else {
        if (note?.trim()) addSystemAdminMessage(order, note.trim());
        order.updatedAt = new Date().toISOString();
    }
    saveOrders();
    return order;
}

export function deleteOrderFromAdmin(orderId: number) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    order.deletedFromAdmin = true;
    order.adminDeletedAt = new Date().toISOString();
    order.status = "CANCELLED";
    order.deliveryNote = REJECTED_TRANSACTION_NOTE;
    addSystemAdminMessage(order, REJECTED_TRANSACTION_NOTE);
    order.updatedAt = new Date().toISOString();
    saveOrders();
    return order;
}

export function addOrderChatMessage(orderId: number, input: { senderId: number; senderName: string; senderRole: "ADMIN" | "CUSTOMER"; message: string }) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    const message = input.message.trim();
    if (message.length < 1) throw new Error("Message is required.");
    if (message.length > 1000) throw new Error("Message is too long.");

    const nextId = order.chatMessages.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    order.chatMessages.push({
        id: nextId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        message,
        createdAt: new Date().toISOString()
    });
    order.updatedAt = new Date().toISOString();
    saveOrders();
    return order;
}

export function getOrdersByUser(userId: number) {
    return orders.filter((order) => order.userId === userId).sort((a, b) => b.id - a.id);
}

export function getOrderById(orderId: number) {
    return orders.find((order) => order.id === orderId) || null;
}

export function getAllOrders() {
    return orders.filter((order) => !order.deletedFromAdmin).sort((a, b) => b.id - a.id);
}

export function countOrders() {
    return orders.filter((order) => !order.deletedFromAdmin).length;
}
