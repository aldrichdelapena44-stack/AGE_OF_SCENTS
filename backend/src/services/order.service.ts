import { supabase } from "../config/supabase";
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
    subtotal?: number;
    shippingFee?: number;
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
    adminDeleted?: boolean;
    adminDeletedAt?: string;
    adminDeletionNote?: string;
    chatMessages: OrderChatMessage[];
    createdAt: string;
    updatedAt?: string;
};

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

function calculateSubtotal(items: CheckoutItem[]) {
    return safeMoney(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
}

function recalculateOrderTotal(order: StoredOrder) {
    order.subtotal = calculateSubtotal(order.items || []);
    order.shippingFee = safeMoney(order.shippingFee || 0);
    order.total = safeMoney(order.subtotal + order.shippingFee);
}

function nextChatId(order: StoredOrder) {
    return (order.chatMessages || []).reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
}

function pushSystemMessage(order: StoredOrder, message: string) {
    order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
    order.chatMessages.push({
        id: nextChatId(order),
        senderId: 0,
        senderName: "AGE OF SCENT Admin",
        senderRole: "ADMIN",
        message,
        createdAt: new Date().toISOString()
    });
}

function fromRow(row: any): StoredOrder {
    const order: StoredOrder = {
        id: Number(row.id),
        userId: Number(row.user_id || 0),
        fullName: String(row.full_name || ""),
        address: String(row.address || ""),
        gcashNumber: String(row.gcash_number || ""),
        customerGcashNumber: String(row.customer_gcash_number || ""),
        selectedLandmark: String(row.selected_landmark || ""),
        customLandmark: String(row.custom_landmark || ""),
        needsLandmarkConfirmation: Boolean(row.needs_landmark_confirmation),
        landmarkStatus: row.landmark_status || (row.needs_landmark_confirmation ? "PENDING" : "APPROVED"),
        adminConfirmationNote: String(row.admin_confirmation_note || ""),
        deliveryNote: String(row.delivery_note || ""),
        paymentMethod: row.payment_method === "COD" ? "COD" : "GCASH",
        paymentProvider: String(row.payment_provider || ""),
        paymentReference: String(row.payment_reference || ""),
        items: Array.isArray(row.items) ? row.items : [],
        subtotal: safeMoney(row.subtotal),
        shippingFee: safeMoney(row.shipping_fee),
        total: safeMoney(row.total),
        status: normalizeStatus(row.status),
        adminDeleted: Boolean(row.admin_deleted),
        adminDeletedAt: row.admin_deleted_at || undefined,
        adminDeletionNote: String(row.admin_deletion_note || ""),
        chatMessages: Array.isArray(row.chat_messages) ? row.chat_messages : [],
        createdAt: String(row.created_at || new Date().toISOString()),
        updatedAt: row.updated_at || undefined
    };

    recalculateOrderTotal(order);
    return order;
}

function toRow(order: StoredOrder) {
    recalculateOrderTotal(order);

    return {
        id: Number(order.id),
        user_id: Number(order.userId),
        full_name: order.fullName,
        address: order.address,
        gcash_number: order.gcashNumber || "",
        customer_gcash_number: order.customerGcashNumber || "",
        selected_landmark: order.selectedLandmark || "",
        custom_landmark: order.customLandmark || "",
        needs_landmark_confirmation: Boolean(order.needsLandmarkConfirmation),
        landmark_status: order.landmarkStatus || "PENDING",
        admin_confirmation_note: order.adminConfirmationNote || "",
        delivery_note: order.deliveryNote || "",
        items: order.items || [],
        subtotal: safeMoney(order.subtotal),
        shipping_fee: safeMoney(order.shippingFee),
        total: safeMoney(order.total),
        status: normalizeStatus(order.status),
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider || "",
        payment_reference: order.paymentReference || "",
        admin_deleted: Boolean(order.adminDeleted),
        admin_deleted_at: order.adminDeletedAt || null,
        admin_deletion_note: order.adminDeletionNote || "",
        chat_messages: order.chatMessages || [],
        created_at: order.createdAt,
        updated_at: order.updatedAt || new Date().toISOString()
    };
}

async function nextOrderId() {
    const { data, error } = await supabase
        .from("orders")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

    if (error) throw new Error(error.message);
    return Number(data?.[0]?.id || 0) + 1;
}

export async function createCheckoutOrder(input: {
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
        await decreaseProductStock(Number(item.id), Number(item.quantity));
    }

    const custom = (input.customLandmark || "").trim();
    const selectedLandmark = String(input.selectedLandmark || "").trim();
    const isOtherLandmark = selectedLandmark.toUpperCase() === "OTHER" || custom.length > 0;
    const matchedLandmark = !isOtherLandmark ? await getDeliveryLandmarkByName(selectedLandmark) : null;
    const shippingFee = matchedLandmark ? safeMoney(matchedLandmark.shippingFee) : 0;
    const needsConfirmation = Boolean(input.needsLandmarkConfirmation || isOtherLandmark || !matchedLandmark);

    const normalizedItems = input.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price)
    }));
    const subtotal = calculateSubtotal(normalizedItems);
    const createdAt = new Date().toISOString();

    const order: StoredOrder = {
        id: await nextOrderId(),
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
        items: normalizedItems,
        subtotal,
        shippingFee,
        total: safeMoney(subtotal + shippingFee),
        status: "PENDING_CONFIRMATION",
        chatMessages: [],
        createdAt,
        updatedAt: createdAt
    };

    const { data, error } = await supabase
        .from("orders")
        .insert(toRow(order))
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

async function saveOrder(order: StoredOrder) {
    const { data, error } = await supabase
        .from("orders")
        .upsert(toRow(order), { onConflict: "id" })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

export async function attachPaymentToOrder(orderId: number, paymentProvider: string, paymentReference: string) {
    const order = await getOrderById(orderId, true);
    if (!order) return null;

    order.paymentProvider = paymentProvider;
    order.paymentReference = paymentReference;
    order.updatedAt = new Date().toISOString();
    return saveOrder(order);
}

export async function markOrderPaidByReference(reference: string) {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_reference", reference)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const order = fromRow(data);
    order.status = "PAYMENT_CONFIRMATION";
    order.updatedAt = new Date().toISOString();
    return saveOrder(order);
}

export async function updateOrderStatus(orderId: number, status: OrderStatus, deliveryNote?: string, shippingFee?: number) {
    const order = await getOrderById(orderId, true);
    if (!order) return null;

    order.status = normalizeStatus(status);
    if (typeof deliveryNote === "string") order.deliveryNote = deliveryNote.trim();
    if (typeof shippingFee !== "undefined" && Number.isFinite(Number(shippingFee))) order.shippingFee = safeMoney(shippingFee);
    recalculateOrderTotal(order);
    order.updatedAt = new Date().toISOString();
    return saveOrder(order);
}

export async function updateOrderLandmarkStatus(orderId: number, landmarkStatus: "APPROVED" | "REJECTED" | "PENDING", note?: string, shippingFee?: number) {
    const order = await getOrderById(orderId, true);
    if (!order) return null;

    order.landmarkStatus = landmarkStatus;
    order.needsLandmarkConfirmation = landmarkStatus === "PENDING";
    order.adminConfirmationNote = note?.trim() || order.adminConfirmationNote;
    if (typeof shippingFee !== "undefined" && Number.isFinite(Number(shippingFee))) order.shippingFee = safeMoney(shippingFee);
    recalculateOrderTotal(order);
    order.updatedAt = new Date().toISOString();
    return saveOrder(order);
}

export async function addOrderChatMessage(orderId: number, input: { senderId: number; senderName: string; senderRole: "ADMIN" | "CUSTOMER"; message: string }) {
    const order = await getOrderById(orderId, true);
    if (!order) return null;

    const message = input.message.trim();
    if (message.length < 1) throw new Error("Message is required.");
    if (message.length > 1000) throw new Error("Message is too long.");

    order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
    order.chatMessages.push({
        id: nextChatId(order),
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        message,
        createdAt: new Date().toISOString()
    });
    order.updatedAt = new Date().toISOString();
    return saveOrder(order);
}

export async function deleteOrderFromAdmin(orderId: number) {
    const order = await getOrderById(orderId, true);
    if (!order) return null;

    order.adminDeleted = true;
    order.adminDeletedAt = new Date().toISOString();
    order.adminDeletionNote = "You're not eligible to pay. Please use a valid and transparent transaction.";
    order.status = "CANCELLED";
    order.updatedAt = new Date().toISOString();
    pushSystemMessage(order, order.adminDeletionNote);
    return saveOrder(order);
}

export async function getOrdersByUser(userId: number) {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .eq("admin_deleted", false)
        .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function getOrderById(orderId: number, includeDeleted = false) {
    let query = supabase
        .from("orders")
        .select("*")
        .eq("id", orderId);

    if (!includeDeleted) query = query.eq("admin_deleted", false);

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function getAllOrders() {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("admin_deleted", false)
        .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function countOrders() {
    const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("admin_deleted", false);

    if (error) throw new Error(error.message);
    return count || 0;
}
