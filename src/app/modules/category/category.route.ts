import express from "express";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { categoryController } from "./category.controller";

const router = express.Router();

router.post(
  "/create",
//   auth(UserRole.ADMIN),
  fileUploader.uploadMultiple,
  parseBodyData,
  categoryController.createCategory
);
router.get("/", categoryController.getCategories )

export const categoryRoutes = router;
