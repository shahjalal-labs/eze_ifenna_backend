import { z } from "zod";

const reviewSchema = z.object({
  comment: z.string().min(1, "Comment is required"),
  rating: z
    .number({ required_error: "Rating is required" })
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot be more than 5"),
});

export const reviewValidationSchema = {
  reviewSchema,
};
