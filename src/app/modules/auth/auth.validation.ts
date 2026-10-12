import { z } from "zod";
const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const authLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const userUpdateValidationSchema = z.object({
  userName: z.string().min(1, "User name is required").optional(),
  phone: z.string().min(8, "Phone number at least 8 digit long").optional(),
  gender: genderEnum.optional(),
});;

export const authValidation = {
  userUpdateValidationSchema,
  authLoginSchema,
};
