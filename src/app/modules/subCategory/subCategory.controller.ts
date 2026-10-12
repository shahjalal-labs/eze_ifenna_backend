import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { subCategoryServices } from "./subCategory.service";

const createSubCategory = catchAsync(async (req, res) => {
  const result = await subCategoryServices.createSubCategoryIntoDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Sub category created successfully",
    data: result,
  });
});
const getSubCategories = catchAsync(async (req, res) => {
  const result = await subCategoryServices.getSubCategoriesFromDb(
    req.params.id,
    req.query.search as string,
    req.query.rating as string
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Sub categories retrieved successfully",
    data: result,
  });
});
const getSingleSubCategory = catchAsync(async (req, res) => {
  const result =
    await subCategoryServices.getSingleSubCategoryFromEveryCategory();

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Sub categories retrieved successfully",
    data: result,
  });
});
const subCategoriesBySearch = catchAsync(async (req, res) => {
  const result = await subCategoryServices.getSubCategoriesBySearch(
    req.query.search as string
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "search result got successfully",
    data: result,
  });
});
const featuredSubCategories = catchAsync(async (req, res) => {
  const result = await subCategoryServices.getFeaturedSubCategories();

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Featured categories retrieved successfully",
    data: result,
  });
});
const getAllForAdmin = catchAsync(async (req, res) => {
  const categoryId = req.query.categoryId;
  const result = await subCategoryServices.getAllSubCategories(
    categoryId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "services retrieved successfully",
    data: result,
  });
});

export const subCategoryController = {
  createSubCategory,
  getSubCategories,
  getSingleSubCategory,
  subCategoriesBySearch,
  featuredSubCategories,
  getAllForAdmin
};
