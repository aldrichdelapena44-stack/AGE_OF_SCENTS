import fs from "fs";
import path from "path";
import { decreaseProductStock } from "./product.service";

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
    chatMessages: OrderChatMessage[];
    createdAt: string;
    updatedAt?: string;
};

const dataDir = path.join(process.cwd(), "data");
const ordersDataFile = path.join(dataDir, "orders.json");

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadOrders() {
    try {
        if (!fs.existsSync(ordersDataFile)) return [] as StoredOrder[];
        const parsed = JSON.parse(fs.readFileSync(ordersDataFile, "utf8")) as StoredOrder[];
        return Array.isArray(parsed) ? parsed.map((order) => ({
            ...order,
            status: normalizeStatus(order.status as string),
            landmarkStatus: order.landmarkStatus || (order.needsLandmarkConfirmation ? "PENDING" : "APPROVED"),
            chatMessages: Array.isArray(order.chatMessages) ? order.chatMessages : []
        })) : [];
    } catch {
        return [] as StoredOrder[];
    }
}

function normalizeStatus(status?: string): OrderStatus {
    if (status === "PAID") return "PAYMENT_CONFIRMATION";
    if (status === "PROCESSING") return "ORDER_PROCESSING";
    if (status === "PENDING_PAYMENT") return "PENDING_CONFIRMATION";
    const allowed: OrderStatus[] = ["PENDING_CONFIRMATION", "PAYMENT_CONFIRMATION", "ORDER_PROCESSING", "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
    return allowed.includes(status as OrderStatus) ? status as OrderStatus : "PENDING_CONFIRMATION";
}

const orders: StoredOrder[] = loadOrders();
let nextOrderId = orders.reduce((max, order) => Math.max(max, order.id), 0) + 1;

function saveOrders() {
    ensureDataDir();
    fs.writeFileSync(ordersDataFile, JSON.stringify(orders, null, 2));
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
}) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new Error("Cart is empty.");
    }

    for (const item of input.items) {
        decreaseProductStock(Number(item.id), Number(item.quantity));
    }

    const total = input.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const custom = (input.customLandmark || "").trim();
    const needsConfirmation = Boolean(input.needsLandmarkConfirmation || custom || input.selectedLandmark === "OTHER");

    const order: StoredOrder = {
        id: nextOrderId++,
        userId: input.userId,
        fullName: input.fullName.trim(),
        address: input.address.trim(),
        gcashNumber: input.gcashNumber?.trim(),
        customerGcashNumber: input.customerGcashNumber?.trim(),
        selectedLandmark: input.selectedLandmark?.trim(),
        customLandmark: custom,
        needsLandmarkConfirmation: needsConfirmation,
        landmarkStatus: needsConfirmation ? "PENDING" : "APPROVED",
        paymentMethod: input.paymentMethod,
        items: input.items.map((item) => ({ ...item, quantity: Number(item.quantity), price: Number(item.price) })),
        total,
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

export function updateOrderStatus(orderId: number, status: OrderStatus, deliveryNote?: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    order.status = normalizeStatus(status);
    if (typeof deliveryNote === "string") order.deliveryNote = deliveryNote.trim();
    order.updatedAt = new Date().toISOString();
    saveOrders();
    return order;
}

export function updateOrderLandmarkStatus(orderId: number, landmarkStatus: "APPROVED" | "REJECTED" | "PENDING", note?: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return null;
    order.landmarkStatus = landmarkStatus;
    order.needsLandmarkConfirmation = landmarkStatus === "PENDING";
    order.adminConfirmationNote = note?.trim() || order.adminConfirmationNote;
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
    return [...orders].sort((a, b) => b.id - a.id);
}

export function countOrders() {
    return orders.length;
}
