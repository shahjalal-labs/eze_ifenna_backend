import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";

const createCategoryIntoDB = async (req: Request) => {
  const payload = req.body;
  const existingCategory = await prisma.category.findUnique({
    where: { categoryName: payload.categoryName },
  });

  if (existingCategory) {
    throw new ApiError(409, "This category already exists");
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

  const category = await prisma.category.create({
    data: {
      ...payload,
      mediaUrl: mediaUrl?.[0] && mediaUrl[0],
    },
  });
  return category;
};

const getCategoriesFromDB = async () => {
  const categories = await prisma.category.findMany();

  return categories;
};

export const categoryService = {
  createCategoryIntoDB,
  getCategoriesFromDB
};
