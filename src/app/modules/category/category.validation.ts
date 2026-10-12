import { z } from "zod";

const categorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
});

export const categoryValidationSchema = {
  categorySchema,
};
