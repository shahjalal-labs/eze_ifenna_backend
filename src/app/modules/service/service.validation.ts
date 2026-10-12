import { z } from "zod";

const availabilityEnum = z.enum([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

const durationEnum = z.enum([
  "",
  "1h",
  "2h",
  "3h",
  "4h",
]);

const serviceSchema = z.object({
  // fee: z.number().positive("Fee must be a positive number"),
  avability: z
    .array(availabilityEnum)
    .min(1, "At least one availability day is required"),
  duration: durationEnum,
  // question: z
  //   .array(z.string().min(1, "Question cannot be empty"))
  //   .min(1, "At least one question is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().min(1, "Description is required"),
});

export const serviceValidationSchema = {
  serviceSchema,
};

