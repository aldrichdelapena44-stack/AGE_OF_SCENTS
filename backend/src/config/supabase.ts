import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import path from "path";
import { env } from "./env";

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Supabase-backed persistence will fail until configured.");
}

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

export function requireSupabaseConfig() {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
        throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
}

function safeStorageName(originalName: string) {
    const extension = path.extname(originalName || "").toLowerCase() || ".png";
    const baseName = path
        .basename(originalName || "image", extension)
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "image";

    return `${Date.now()}-${randomUUID()}-${baseName}${extension}`;
}

export async function uploadPublicImage(bucket: string, folder: string, file: Express.Multer.File) {
    requireSupabaseConfig();

    if (!file?.buffer) {
        throw new Error("Image file is required.");
    }

    const objectPath = `${folder.replace(/^\/+|\/+$/g, "")}/${safeStorageName(file.originalname)}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        throw new Error(error.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
}

export async function uploadPrivateImage(bucket: string, folder: string, file: Express.Multer.File) {
    requireSupabaseConfig();

    if (!file?.buffer) {
        throw new Error("Image file is required.");
    }

    const objectPath = `${folder.replace(/^\/+|\/+$/g, "")}/${safeStorageName(file.originalname)}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        throw new Error(error.message);
    }

    return objectPath;
}

export async function createSignedImageUrl(bucket: string, objectPath?: string | null) {
    if (!objectPath) return "";
    if (objectPath.startsWith("http://") || objectPath.startsWith("https://")) return objectPath;

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 60);

    if (error) return "";
    return data.signedUrl;
}

export async function removeStorageObject(bucket: string, objectPathOrUrl?: string | null) {
    if (!objectPathOrUrl) return;

    let objectPath = objectPathOrUrl;

    if (objectPathOrUrl.startsWith("http")) {
        const marker = `/storage/v1/object/public/${bucket}/`;
        const markerIndex = objectPathOrUrl.indexOf(marker);
        if (markerIndex < 0) return;
        objectPath = decodeURIComponent(objectPathOrUrl.slice(markerIndex + marker.length));
    }

    await supabase.storage.from(bucket).remove([objectPath]);
}
