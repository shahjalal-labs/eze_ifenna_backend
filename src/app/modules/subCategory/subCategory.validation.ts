import { z } from "zod";

const suCategorySchema = z.object({
  subCatName: z.string().min(1, "Sub Category name is required"),
  overview: z.string().min(1, "Overview is required"),
   options: z
    .array(z.string().min(1, "Each option must be a non-empty string"))
    .nonempty("At least one option is required"),
});


export const subCategoryValidationSchema = {
  suCategorySchema,  
};
