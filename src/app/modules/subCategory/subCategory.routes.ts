import express from "express";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { subCategoryController } from "./subCategory.controller";

const router = express.Router();

router.post(
  "/create/:id",
  //   auth(UserRole.ADMIN),
  fileUploader.uploadMultiple,
  parseBodyData,
  subCategoryController.createSubCategory
);
router.get("/:id", subCategoryController.getSubCategories);
router.get("/sub-category/single", subCategoryController.getSingleSubCategory);
router.get("/sub/search", subCategoryController.subCategoriesBySearch);
router.get("/sub/featured", subCategoryController.featuredSubCategories);
router.get("/sub/admin", subCategoryController.getAllForAdmin);

export const subCategoryRoutes = router;
