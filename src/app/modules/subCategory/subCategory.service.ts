import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/UploadHelper";

const createSubCategoryIntoDB = async (req: Request) => {
  const payload = req.body;
  const categoryId = req.params.id;

  const category = await prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
  });

  const existingSubCategory = await prisma.subCategory.findUnique({
    where: { subCatName: payload.subCatName, categoryId },
  });

  if (existingSubCategory) {
    throw new ApiError(
      409,
      "This sub category is already availabe under this category"
    );
  }
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const processImages = async (
    files: Express.Multer.File[],
    folder: string
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/class/${folder}`))
    );
  };

  const [mediaUrl] = await Promise.all([
    processImages(files?.mediaUrl, "mediaUrl"),
  ]);

  const subCategory = await prisma.subCategory.create({
    data: {
      ...payload,
      categoryId,
      charge: category.charge,
      hodsCharge: category.hodsCharge,
      mediaUrl: mediaUrl?.[0] && mediaUrl[0],
    },
  });
  return subCategory;
};

const getSubCategoriesFromDb = async (
  categoryId: string,
  searchTerm?: string,
  rating?: string
) => {
  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }
  const minRating = rating ? parseFloat(rating) : undefined;

  const subCategories = await prisma.subCategory.findMany({
    where: {
      categoryId,
      subCatName: {
        contains: searchTerm,
        mode: "insensitive",
      },
      ...(minRating !== undefined && !isNaN(minRating)
        ? { avgRating: { gte: minRating } }
        : {}),
    },
  });
  if (subCategories.length < 1) {
    throw new ApiError(404, "No sub categories found under this category");
  }
  return subCategories;
};

const getSingleSubCategoryFromEveryCategory = async () => {
  const subCategories = await prisma.subCategory.findMany({
    select: {
      id: true,
      subCatName: true,
      categoryId: true,
      mediaUrl: true,
      avgRating: true,
      overview: true,
      category: {
        select: {
          id: true,
          categoryName: true,
        },
      },
      _count: {
        select: {
          Service: true,
        },
      },
    },
  });

  const uniqueMap = new Map();

  for (const sub of subCategories) {
    if (!uniqueMap.has(sub.categoryId)) {
      uniqueMap.set(sub.categoryId, sub);
    }
  }

  return Array.from(uniqueMap.values());
};

const getSubCategoriesBySearch = async (searchTerm: string) => {
  const subCategories = await prisma.subCategory.findMany({
    where: { subCatName: { contains: searchTerm, mode: "insensitive" } },
    select: {
      categoryId: true,
      subCatName: true,
      charge: true,
      hodsCharge: true,
    },
  });

  return subCategories;
};

const getFeaturedSubCategories = async () => {
  const subCategories = await prisma.subCategory.findMany({
    orderBy: {
      Booking: {
        _count: "desc",
      },
    },
    take: 4,
    include: {
      _count: {
        select: {
          Booking: true,
          Service: true,
        },
      },
      category: {
        select: {
          id: true,
          categoryName: true,
        },
      },
    },
  });

  return subCategories;
};

const getAllSubCategories = async (categoryId?: string) => {
  const subCategories = await prisma.subCategory.findMany({
    where: categoryId ? { categoryId } : {},
    include: {
      category: {
        select: {
          categoryName: true,
        },
      },
    },
  });

  return subCategories;
};

export const subCategoryServices = {
  createSubCategoryIntoDB,
  getSubCategoriesFromDb,
  getSingleSubCategoryFromEveryCategory,
  getSubCategoriesBySearch,
  getAllSubCategories,

  getFeaturedSubCategories,
};
