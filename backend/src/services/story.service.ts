import fs from "fs";
import path from "path";

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

const dataDir = path.join(process.cwd(), "data");
const storyDataFile = path.join(dataDir, "stories.json");
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadStories() {
    try {
        if (!fs.existsSync(storyDataFile)) return [] as StoryRecord[];
        const parsed = JSON.parse(fs.readFileSync(storyDataFile, "utf8")) as StoryRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [] as StoryRecord[];
    }
}

const stories: StoryRecord[] = loadStories();
let nextStoryId = stories.reduce((max, story) => Math.max(max, story.id), 0) + 1;

function saveStories() {
    ensureDataDir();
    fs.writeFileSync(storyDataFile, JSON.stringify(stories, null, 2));
}

function isActiveStory(story: StoryRecord) {
    return story.status === "APPROVED" && new Date(story.expiresAt).getTime() > Date.now();
}

export function getPublicStories() {
    return stories
        .filter(isActiveStory)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getStoriesByUser(userId: number) {
    return stories
        .filter((story) => story.userId === userId && new Date(story.expiresAt).getTime() > Date.now())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdminStories() {
    return [...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function countPendingStories() {
    return stories.filter((story) => story.status === "PENDING").length;
}

export function createStory(input: {
    userId: number;
    userName: string;
    imageUrl: string;
    note?: string;
}) {
    const note = (input.note || "").trim();

    if (!input.imageUrl) throw new Error("Story photo is required.");
    if (note.length > 240) throw new Error("Story note must be 240 characters or less.");

    const createdAt = new Date();
    const story: StoryRecord = {
        id: nextStoryId++,
        userId: input.userId,
        userName: input.userName.trim() || "AGE OF SCENT Client",
        imageUrl: input.imageUrl,
        note,
        status: "PENDING",
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + STORY_TTL_MS).toISOString()
    };

    stories.push(story);
    saveStories();
    return story;
}

export function updateOwnStory(storyId: number, userId: number, input: { imageUrl?: string; note?: string }) {
    const story = stories.find((item) => item.id === storyId && item.userId === userId);
    if (!story) return null;
    if (new Date(story.expiresAt).getTime() <= Date.now()) throw new Error("This story already expired.");

    if (typeof input.note === "string") {
        const note = input.note.trim();
        if (note.length > 240) throw new Error("Story note must be 240 characters or less.");
        story.note = note;
    }
    if (input.imageUrl) story.imageUrl = input.imageUrl;
    story.status = "PENDING";
    story.reviewedAt = undefined;
    story.rejectionReason = undefined;
    saveStories();
    return story;
}

export function removeOwnStory(storyId: number, userId: number) {
    const index = stories.findIndex((item) => item.id === storyId && item.userId === userId);
    if (index === -1) return null;
    const [removed] = stories.splice(index, 1);
    saveStories();
    return removed;
}

export function approveStory(storyId: number) {
    const story = stories.find((item) => item.id === storyId);
    if (!story) return null;
    story.status = "APPROVED";
    story.reviewedAt = new Date().toISOString();
    story.rejectionReason = undefined;
    saveStories();
    return story;
}

export function rejectStory(storyId: number, reason?: string) {
    const story = stories.find((item) => item.id === storyId);
    if (!story) return null;
    story.status = "REJECTED";
    story.reviewedAt = new Date().toISOString();
    story.rejectionReason = reason?.trim() || "Rejected by admin.";
    saveStories();
    return story;
}

export function removeStory(storyId: number) {
    const index = stories.findIndex((item) => item.id === storyId);
    if (index === -1) return null;
    const [removed] = stories.splice(index, 1);
    saveStories();
    return removed;
}
