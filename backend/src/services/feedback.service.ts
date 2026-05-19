import { supabase } from "../config/supabase";

export type FeedbackRecord = {
    id: number;
    name: string;
    email: string;
    rating: number;
    message: string;
    status: "NEW" | "REVIEWED";
    createdAt: string;
    reviewedAt?: string;
};

function fromRow(row: any): FeedbackRecord {
    return {
        id: Number(row.id),
        name: String(row.name || ""),
        email: String(row.email || ""),
        rating: Number(row.rating || 0),
        message: String(row.message || ""),
        status: row.status === "REVIEWED" ? "REVIEWED" : "NEW",
        createdAt: String(row.created_at || new Date().toISOString()),
        reviewedAt: row.updated_at || undefined
    };
}

async function nextFeedbackId() {
    const { data, error } = await supabase
        .from("feedback")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

    if (error) throw new Error(error.message);
    return Number(data?.[0]?.id || 0) + 1;
}

export async function submitFeedback(input: { name: string; email: string; rating: number; message: string }) {
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
        .from("feedback")
        .insert({
            id: await nextFeedbackId(),
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            rating: Number(input.rating || 0),
            message: input.message.trim(),
            status: "NEW",
            created_at: createdAt,
            updated_at: createdAt
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

export async function getAllFeedback() {
    const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .is("deleted_at", null)
        .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function countNewFeedback() {
    const { count, error } = await supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("status", "NEW")
        .is("deleted_at", null);

    if (error) throw new Error(error.message);
    return count || 0;
}

export async function markFeedbackReviewed(feedbackId: number) {
    const { data, error } = await supabase
        .from("feedback")
        .update({
            status: "REVIEWED",
            updated_at: new Date().toISOString()
        })
        .eq("id", feedbackId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function deleteFeedback(feedbackId: number) {
    const { data, error } = await supabase
        .from("feedback")
        .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("id", feedbackId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}
