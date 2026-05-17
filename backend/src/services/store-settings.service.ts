import fs from "fs";
import path from "path";

export type DeliveryLandmark = {
    id: number;
    name: string;
    details?: string;
    shippingFee: number;
    isActive: boolean;
};

export type StoreSettings = {
    gcashNumber: string;
    gcashQrUrl: string;
    gcashInstructions: string;
    codInstructions: string;
    adminDeliveryAddress: string;
    deliveryLandmarks: DeliveryLandmark[];
    updatedAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const settingsDataFile = path.join(dataDir, "store-settings.json");

const defaultSettings: StoreSettings = {
    gcashNumber: "",
    gcashQrUrl: "",
    gcashInstructions: "Scan the QR code or send payment to the GCash number, then submit your order for admin confirmation.",
    codInstructions: "Cash on Delivery is available only for approved delivery landmarks. Custom landmarks need admin confirmation.",
    adminDeliveryAddress: "Set your complete delivery coverage address here.",
    deliveryLandmarks: [
        {
            id: 1,
            name: "Main Gate / Entrance",
            details: "Default meetup point for local delivery.",
            shippingFee: 0,
            isActive: true
        },
        {
            id: 2,
            name: "Barangay Hall",
            details: "Confirm exact barangay and contact number after checkout.",
            shippingFee: 0,
            isActive: true
        }
    ],
    updatedAt: new Date().toISOString()
};

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function safeMoney(value: unknown) {
    if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.\-]/g, "");
        const amount = Number(cleaned || 0);
        if (!Number.isFinite(amount) || amount < 0) return 0;
        return Math.round(amount * 100) / 100;
    }

    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
}

function readLandmarkShippingFee(value: Partial<DeliveryLandmark> & Record<string, unknown>) {
    return safeMoney(
        value.shippingFee ??
        value["shipping fee"] ??
        value["shipping_fee"] ??
        value["deliveryFee"] ??
        value["delivery_fee"] ??
        value["fee"] ??
        value["amount"] ??
        0
    );
}

function loadSettings() {
    try {
        if (!fs.existsSync(settingsDataFile)) return { ...defaultSettings };
        const parsed = JSON.parse(fs.readFileSync(settingsDataFile, "utf8")) as Partial<StoreSettings>;
        const merged = {
            ...defaultSettings,
            ...parsed,
            deliveryLandmarks: Array.isArray(parsed.deliveryLandmarks)
                ? parsed.deliveryLandmarks.map((item, index) => {
                    const value = item as Partial<DeliveryLandmark>;
                    return {
                        id: Number.isInteger(value.id) && Number(value.id) > 0 ? Number(value.id) : index + 1,
                        name: String(value.name || "").trim(),
                        details: String(value.details || "").trim(),
                        shippingFee: readLandmarkShippingFee(value as Partial<DeliveryLandmark> & Record<string, unknown>),
                        isActive: value.isActive !== false
                    };
                }).filter((item) => item.name.length > 0)
                : defaultSettings.deliveryLandmarks
        };
        return merged;
    } catch {
        return { ...defaultSettings };
    }
}

let settings: StoreSettings = loadSettings();

function saveSettings() {
    ensureDataDir();
    fs.writeFileSync(settingsDataFile, JSON.stringify(settings, null, 2));
}

function normalizeLandmarks(input: unknown): DeliveryLandmark[] {
    if (!Array.isArray(input)) return settings.deliveryLandmarks;

    return input
        .map((item, index) => {
            const value = item as Partial<DeliveryLandmark>;
            return {
                id: Number.isInteger(value.id) && Number(value.id) > 0 ? Number(value.id) : index + 1,
                name: String(value.name || "").trim(),
                details: String(value.details || "").trim(),
                shippingFee: readLandmarkShippingFee(value as Partial<DeliveryLandmark> & Record<string, unknown>),
                isActive: value.isActive !== false
            };
        })
        .filter((item) => item.name.length > 0);
}

export function getStoreSettings() {
    return settings;
}

export function getPublicCheckoutSettings() {
    return {
        gcashNumber: settings.gcashNumber,
        gcashQrUrl: settings.gcashQrUrl,
        gcashInstructions: settings.gcashInstructions,
        codInstructions: settings.codInstructions,
        adminDeliveryAddress: settings.adminDeliveryAddress,
        deliveryLandmarks: settings.deliveryLandmarks.filter((item) => item.isActive)
    };
}

export function getDeliveryLandmarkByName(name?: string) {
    const cleanName = String(name || "").trim().toLowerCase();
    if (!cleanName) return null;
    return settings.deliveryLandmarks.find((item) => item.isActive && item.name.trim().toLowerCase() === cleanName) || null;
}

export function updateStoreSettings(input: Partial<StoreSettings>) {
    settings = {
        ...settings,
        gcashNumber:
            typeof input.gcashNumber === "string" ? input.gcashNumber.trim() : settings.gcashNumber,
        gcashQrUrl:
            typeof input.gcashQrUrl === "string" ? input.gcashQrUrl.trim() : settings.gcashQrUrl,
        gcashInstructions:
            typeof input.gcashInstructions === "string" && input.gcashInstructions.trim().length > 0
                ? input.gcashInstructions.trim()
                : settings.gcashInstructions,
        codInstructions:
            typeof input.codInstructions === "string" && input.codInstructions.trim().length > 0
                ? input.codInstructions.trim()
                : settings.codInstructions,
        adminDeliveryAddress:
            typeof input.adminDeliveryAddress === "string" ? input.adminDeliveryAddress.trim() : settings.adminDeliveryAddress,
        deliveryLandmarks:
            typeof input.deliveryLandmarks !== "undefined"
                ? normalizeLandmarks(input.deliveryLandmarks)
                : settings.deliveryLandmarks,
        updatedAt: new Date().toISOString()
    };

    saveSettings();
    return settings;
}

export function updateGcashQrUrl(gcashQrUrl: string) {
    settings.gcashQrUrl = gcashQrUrl;
    settings.updatedAt = new Date().toISOString();
    saveSettings();
    return settings;
}
