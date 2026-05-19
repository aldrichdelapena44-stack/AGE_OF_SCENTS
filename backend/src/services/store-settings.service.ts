import { supabase } from "../config/supabase";

export type DeliveryLandmark = {
    id: number;
    name: string;
    details?: string;
    imageUrl?: string;
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
            imageUrl: "",
            shippingFee: 0,
            isActive: true
        },
        {
            id: 2,
            name: "Barangay Hall",
            details: "Confirm exact barangay and contact number after checkout.",
            imageUrl: "",
            shippingFee: 0,
            isActive: true
        }
    ],
    updatedAt: new Date().toISOString()
};

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

function fromSettingsRow(row: any, landmarks: DeliveryLandmark[]): StoreSettings {
    return {
        gcashNumber: String(row?.gcash_number || ""),
        gcashQrUrl: String(row?.gcash_qr_url || ""),
        gcashInstructions: String(row?.gcash_instructions || defaultSettings.gcashInstructions),
        codInstructions: String(row?.cod_instructions || defaultSettings.codInstructions),
        adminDeliveryAddress: String(row?.admin_delivery_address || defaultSettings.adminDeliveryAddress),
        deliveryLandmarks: landmarks,
        updatedAt: String(row?.updated_at || new Date().toISOString())
    };
}

function fromLandmarkRow(row: any): DeliveryLandmark {
    return {
        id: Number(row.id),
        name: String(row.name || ""),
        details: String(row.details || ""),
        imageUrl: String(row.image_url || ""),
        shippingFee: safeMoney(row.shipping_fee),
        isActive: row.is_active !== false
    };
}

function toLandmarkRow(item: DeliveryLandmark) {
    return {
        id: Number(item.id),
        name: String(item.name || "").trim(),
        details: String(item.details || "").trim(),
        image_url: String(item.imageUrl || "").trim(),
        shipping_fee: safeMoney(item.shippingFee),
        is_active: item.isActive !== false,
        updated_at: new Date().toISOString()
    };
}

async function ensureDefaults() {
    const { data: existingSettings, error: settingsError } = await supabase
        .from("store_settings")
        .select("id")
        .eq("id", 1)
        .maybeSingle();

    if (settingsError) throw new Error(settingsError.message);

    if (!existingSettings) {
        const { error } = await supabase.from("store_settings").upsert({
            id: 1,
            gcash_number: defaultSettings.gcashNumber,
            gcash_qr_url: defaultSettings.gcashQrUrl,
            gcash_instructions: defaultSettings.gcashInstructions,
            cod_instructions: defaultSettings.codInstructions,
            admin_delivery_address: defaultSettings.adminDeliveryAddress,
            updated_at: defaultSettings.updatedAt
        }, { onConflict: "id" });
        if (error) throw new Error(error.message);
    }

    const { count, error: countError } = await supabase
        .from("delivery_landmarks")
        .select("id", { count: "exact", head: true });

    if (countError) throw new Error(countError.message);

    if ((count || 0) === 0) {
        const { error } = await supabase
            .from("delivery_landmarks")
            .upsert(defaultSettings.deliveryLandmarks.map(toLandmarkRow), { onConflict: "id" });
        if (error) throw new Error(error.message);
    }
}

async function getLandmarks(includeInactive = true) {
    let query = supabase
        .from("delivery_landmarks")
        .select("*")
        .order("id", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data || []) as any[]).map(fromLandmarkRow).filter((item) => item.name.trim().length > 0);
}

export async function getStoreSettings() {
    await ensureDefaults();

    const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) throw new Error(error.message);

    const landmarks = await getLandmarks(true);
    return fromSettingsRow(data, landmarks);
}

export async function getPublicCheckoutSettings() {
    const settings = await getStoreSettings();

    return {
        gcashNumber: settings.gcashNumber,
        gcashQrUrl: settings.gcashQrUrl,
        gcashInstructions: settings.gcashInstructions,
        codInstructions: settings.codInstructions,
        adminDeliveryAddress: settings.adminDeliveryAddress,
        deliveryLandmarks: settings.deliveryLandmarks.filter((item) => item.isActive)
    };
}

export async function getDeliveryLandmarkByName(name?: string) {
    const cleanName = String(name || "").trim().toLowerCase();
    if (!cleanName) return null;
    const landmarks = await getLandmarks(false);
    return landmarks.find((item) => item.name.trim().toLowerCase() === cleanName) || null;
}

function normalizeLandmarks(input: unknown, current: DeliveryLandmark[]): DeliveryLandmark[] {
    if (!Array.isArray(input)) return current;

    return input
        .map((item, index) => {
            const value = item as Partial<DeliveryLandmark> & Record<string, unknown>;
            const existing = current.find((landmark) => Number(landmark.id) === Number(value.id));

            return {
                id: Number.isInteger(Number(value.id)) && Number(value.id) > 0 ? Number(value.id) : index + 1,
                name: String(value.name || "").trim(),
                details: String(value.details || "").trim(),
                imageUrl: typeof value.imageUrl === "string" ? value.imageUrl.trim() : existing?.imageUrl || "",
                shippingFee: readLandmarkShippingFee(value),
                isActive: value.isActive !== false
            };
        })
        .filter((item) => item.name.length > 0);
}

export async function updateStoreSettings(input: Partial<StoreSettings>) {
    const current = await getStoreSettings();

    const nextSettings = {
        id: 1,
        gcash_number: typeof input.gcashNumber === "string" ? input.gcashNumber.trim() : current.gcashNumber,
        gcash_qr_url: typeof input.gcashQrUrl === "string" ? input.gcashQrUrl.trim() : current.gcashQrUrl,
        gcash_instructions:
            typeof input.gcashInstructions === "string" && input.gcashInstructions.trim().length > 0
                ? input.gcashInstructions.trim()
                : current.gcashInstructions,
        cod_instructions:
            typeof input.codInstructions === "string" && input.codInstructions.trim().length > 0
                ? input.codInstructions.trim()
                : current.codInstructions,
        admin_delivery_address:
            typeof input.adminDeliveryAddress === "string" ? input.adminDeliveryAddress.trim() : current.adminDeliveryAddress,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("store_settings").upsert(nextSettings, { onConflict: "id" });
    if (error) throw new Error(error.message);

    if (typeof input.deliveryLandmarks !== "undefined") {
        const landmarks = normalizeLandmarks(input.deliveryLandmarks, current.deliveryLandmarks);

        if (landmarks.length > 0) {
            const { error: landmarkError } = await supabase
                .from("delivery_landmarks")
                .upsert(landmarks.map(toLandmarkRow), { onConflict: "id" });
            if (landmarkError) throw new Error(landmarkError.message);
        }

        const incomingIds = new Set(landmarks.map((item) => Number(item.id)));
        const toHide = current.deliveryLandmarks.filter((item) => !incomingIds.has(Number(item.id)));
        for (const landmark of toHide) {
            await supabase
                .from("delivery_landmarks")
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq("id", landmark.id);
        }
    }

    return getStoreSettings();
}

export async function updateGcashQrUrl(gcashQrUrl: string) {
    const { error } = await supabase
        .from("store_settings")
        .upsert({
            id: 1,
            gcash_qr_url: String(gcashQrUrl || "").trim(),
            updated_at: new Date().toISOString()
        }, { onConflict: "id" });

    if (error) throw new Error(error.message);
    return getStoreSettings();
}

export async function updateDeliveryLandmarkImageUrl(landmarkId: number, imageUrl: string) {
    const cleanImageUrl = String(imageUrl || "").trim();
    if (!cleanImageUrl) {
        throw new Error("Landmark image is required.");
    }

    const { data, error } = await supabase
        .from("delivery_landmarks")
        .update({
            image_url: cleanImageUrl,
            updated_at: new Date().toISOString()
        })
        .eq("id", landmarkId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return getStoreSettings();
}
