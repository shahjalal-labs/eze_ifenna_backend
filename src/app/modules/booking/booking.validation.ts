import { z } from "zod";

const bookingSchema = z.object({
  date: z.coerce.date({ invalid_type_error: "Invalid booking date" }),
  time: z.string().min(1, "Time is required"),
  requirement: z.string().min(1, "Service option is required")
});

export const bookingValidationSchema = {
  bookingSchema,
};
