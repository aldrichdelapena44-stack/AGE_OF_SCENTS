import { createSignedImageUrl, removeStorageObject, supabase } from "../config/supabase";
import { updateUserVerificationStatus } from "../utils/auth-store";

export type VerificationFileStatus = "PENDING_REVIEW" | "KEPT" | "REMOVED";

export type VerificationRecord = {
    id: number;
    userId: number;
    documentType: string;
    fileUrl: string;
    originalFileUrl?: string;
    fileStatus: VerificationFileStatus;
    fileKeptAt?: string;
    fileRemovedAt?: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
};

function normalizeStatus(status?: string): "PENDING" | "APPROVED" | "REJECTED" {
    if (status === "APPROVED" || status === "REJECTED") return status;
    return "PENDING";
}

async function hydrateFileUrl(imageUrl?: string | null) {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
    return createSignedImageUrl("verification-images", imageUrl);
}

async function fromRow(row: any): Promise<VerificationRecord> {
    const fileUrl = await hydrateFileUrl(row.image_url);

    return {
        id: Number(row.id),
        userId: Number(row.user_id || 0),
        documentType: String(row.document_type || "OTHER"),
        fileUrl,
        originalFileUrl: String(row.image_url || ""),
        fileStatus: row.image_url ? "PENDING_REVIEW" : "REMOVED",
        status: normalizeStatus(row.status),
        createdAt: String(row.created_at || new Date().toISOString())
    };
}

async function fromRows(rows: any[]) {
    return Promise.all((rows || []).map(fromRow));
}

async function nextVerificationId() {
    const { data, error } = await supabase
        .from("verifications")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

    if (error) throw new Error(error.message);
    return Number(data?.[0]?.id || 0) + 1;
}

export async function submitVerification(input: { userId: number; documentType: string; fileUrl: string }) {
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
        .from("verifications")
        .insert({
            id: await nextVerificationId(),
            user_id: input.userId,
            document_type: input.documentType,
            image_url: input.fileUrl,
            status: "PENDING",
            created_at: createdAt,
            updated_at: createdAt
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    await updateUserVerificationStatus(input.userId, "PENDING");
    return fromRow(data);
}

export async function getVerificationsByUser(userId: number) {
    const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return fromRows(data || []);
}

export async function getAllVerifications() {
    const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .is("deleted_at", null)
        .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return fromRows(data || []);
}

export async function approveVerification(verificationId: number) {
    const { data, error } = await supabase
        .from("verifications")
        .update({
            status: "APPROVED",
            updated_at: new Date().toISOString()
        })
        .eq("id", verificationId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    await updateUserVerificationStatus(Number(data.user_id), "APPROVED");
    return fromRow(data);
}

export async function rejectVerification(verificationId: number) {
    const { data, error } = await supabase
        .from("verifications")
        .update({
            status: "REJECTED",
            updated_at: new Date().toISOString()
        })
        .eq("id", verificationId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    await updateUserVerificationStatus(Number(data.user_id), "REJECTED");
    return fromRow(data);
}

export async function keepVerificationFile(verificationId: number) {
    const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("id", verificationId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function removeVerificationFile(verificationId: number) {
    const { data: current, error: currentError } = await supabase
        .from("verifications")
        .select("*")
        .eq("id", verificationId)
        .is("deleted_at", null)
        .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) return null;

    if (current.image_url) {
        await removeStorageObject("verification-images", current.image_url);
    }

    const { data, error } = await supabase
        .from("verifications")
        .update({
            image_url: "",
            updated_at: new Date().toISOString()
        })
        .eq("id", verificationId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function countPendingVerifications() {
    const { count, error } = await supabase
        .from("verifications")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")
        .is("deleted_at", null);

    if (error) throw new Error(error.message);
    return count || 0;
}

export async function deleteVerificationSubmission(verificationId: number) {
    const { data: current, error: currentError } = await supabase
        .from("verifications")
        .select("*")
        .eq("id", verificationId)
        .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) return null;

    if (current.image_url) {
        await removeStorageObject("verification-images", current.image_url);
    }

    const { data, error } = await supabase
        .from("verifications")
        .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("id", verificationId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function syncUserVerificationStatus(userId: number) {
    const { data, error } = await supabase
        .from("verifications")
        .select("status")
        .eq("user_id", userId)
        .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const statuses = ((data || []) as any[]).map((item) => normalizeStatus(item.status));

    const verificationStatus =
        statuses.includes("APPROVED") ? "APPROVED" :
            statuses.includes("PENDING") ? "PENDING" :
                statuses.includes("REJECTED") ? "REJECTED" :
                    "PENDING";

    return updateUserVerificationStatus(userId, verificationStatus as any);
}

export async function syncAllUserVerificationStatuses() {
    const { data, error } = await supabase
        .from("verifications")
        .select("user_id")
        .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set(((data || []) as any[]).map((item) => Number(item.user_id))));
    return Promise.all(userIds.map((userId) => syncUserVerificationStatus(Number(userId))));
}
