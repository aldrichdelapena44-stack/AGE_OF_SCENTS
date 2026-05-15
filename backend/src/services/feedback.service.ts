import fs from "fs";
import path from "path";

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

const dataDir = path.join(process.cwd(), "data");
const feedbackDataFile = path.join(dataDir, "feedback.json");

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadFeedback() {
    try {
        if (!fs.existsSync(feedbackDataFile)) return [] as FeedbackRecord[];
        const parsed = JSON.parse(fs.readFileSync(feedbackDataFile, "utf8")) as FeedbackRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [] as FeedbackRecord[];
    }
}

function saveFeedback() {
    ensureDataDir();
    fs.writeFileSync(feedbackDataFile, JSON.stringify(feedbackRecords, null, 2));
}

const feedbackRecords: FeedbackRecord[] = loadFeedback();
let nextFeedbackId = feedbackRecords.reduce((max, item) => Math.max(max, item.id), 0) + 1;

export function submitFeedback(input: { name: string; email: string; rating: number; message: string }) {
    const feedback: FeedbackRecord = {
        id: nextFeedbackId++,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        rating: input.rating,
        message: input.message.trim(),
        status: "NEW",
        createdAt: new Date().toISOString()
    };
    feedbackRecords.push(feedback);
    saveFeedback();
    return feedback;
}

export function getAllFeedback() {
    return [...feedbackRecords].sort((a, b) => b.id - a.id);
}

export function countNewFeedback() {
    return feedbackRecords.filter((feedback) => feedback.status === "NEW").length;
}

export function markFeedbackReviewed(feedbackId: number) {
    const feedback = feedbackRecords.find((item) => item.id === feedbackId);
    if (!feedback) return null;
    feedback.status = "REVIEWED";
    feedback.reviewedAt = new Date().toISOString();
    saveFeedback();
    return feedback;
}

export function deleteFeedback(feedbackId: number) {
    const index = feedbackRecords.findIndex((item) => item.id === feedbackId);
    if (index === -1) return null;
    const [removed] = feedbackRecords.splice(index, 1);
    saveFeedback();
    return removed;
}
