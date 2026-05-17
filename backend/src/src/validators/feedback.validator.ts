import { z } from "zod";

export const feedbackSchema = z.object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.string().trim().email("A valid email is required."),
    rating: z.coerce.number().int().min(1).max(5),
    message: z.string().trim().min(1, "Feedback message is required.").max(1000)
});
