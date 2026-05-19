import { supabase } from "../config/supabase";

export type StoryStatus = "PENDING" | "APPROVED" | "REJECTED";

export type StoryRecord = {
    id: number;
    userId: number;
    userName: string;
    imageUrl: string;
    note: string;
    status: StoryStatus;
    createdAt: string;
    expiresAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
};

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeStatus(status?: string): StoryStatus {
    if (status === "APPROVED" || status === "REJECTED") return status;
    return "PENDING";
}

function fromRow(row: any): StoryRecord {
    return {
        id: Number(row.id),
        userId: Number(row.user_id || 0),
        userName: String(row.user_name || "AGE OF SCENT Client"),
        imageUrl: String(row.image_url || ""),
        note: String(row.note || ""),
        status: normalizeStatus(row.status),
        createdAt: String(row.created_at || new Date().toISOString()),
        expiresAt: String(row.expires_at || new Date(Date.now() + STORY_TTL_MS).toISOString()),
        reviewedAt: row.updated_at || undefined,
        rejectionReason: row.admin_note || undefined
    };
}

async function nextStoryId() {
    const { data, error } = await supabase
        .from("stories")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

    if (error) throw new Error(error.message);
    return Number(data?.[0]?.id || 0) + 1;
}

export async function getPublicStories() {
    const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function getStoriesByUser(userId: number) {
    const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function getAdminStories() {
    const { data, error } = await supabase
        .from("stories")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
}

export async function countPendingStories() {
    const { count, error } = await supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")
        .is("deleted_at", null);

    if (error) throw new Error(error.message);
    return count || 0;
}

export async function createStory(input: {
    userId: number;
    userName: string;
    imageUrl: string;
    note?: string;
}) {
    const note = (input.note || "").trim();

    if (!input.imageUrl) throw new Error("Story photo is required.");
    if (note.length > 240) throw new Error("Story note must be 240 characters or less.");

    const createdAt = new Date();
    const { data, error } = await supabase
        .from("stories")
        .insert({
            id: await nextStoryId(),
            user_id: input.userId,
            user_name: input.userName.trim() || "AGE OF SCENT Client",
            image_url: input.imageUrl,
            note,
            status: "PENDING",
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
            expires_at: new Date(createdAt.getTime() + STORY_TTL_MS).toISOString()
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

async function getStoryForUser(storyId: number, userId: number) {
    const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function updateOwnStory(storyId: number, userId: number, input: { imageUrl?: string; note?: string }) {
    const story = await getStoryForUser(storyId, userId);
    if (!story) return null;
    if (new Date(story.expiresAt).getTime() <= Date.now()) throw new Error("This story already expired.");

    const updates: Record<string, unknown> = {
        status: "PENDING",
        updated_at: new Date().toISOString(),
        admin_note: null
    };

    if (typeof input.note === "string") {
        const note = input.note.trim();
        if (note.length > 240) throw new Error("Story note must be 240 characters or less.");
        updates.note = note;
    }

    if (input.imageUrl) updates.image_url = input.imageUrl;

    const { data, error } = await supabase
        .from("stories")
        .update(updates)
        .eq("id", storyId)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function removeOwnStory(storyId: number, userId: number) {
    const { data, error } = await supabase
        .from("stories")
        .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("id", storyId)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function approveStory(storyId: number) {
    const { data, error } = await supabase
        .from("stories")
        .update({
            status: "APPROVED",
            admin_note: null,
            updated_at: new Date().toISOString()
        })
        .eq("id", storyId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function rejectStory(storyId: number, reason?: string) {
    const { data, error } = await supabase
        .from("stories")
        .update({
            status: "REJECTED",
            admin_note: reason?.trim() || "Rejected by admin.",
            updated_at: new Date().toISOString()
        })
        .eq("id", storyId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function removeStory(storyId: number) {
    const { data, error } = await supabase
        .from("stories")
        .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("id", storyId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}
