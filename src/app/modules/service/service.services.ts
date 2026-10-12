import { Request } from "express";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { Gender } from "@prisma/client";
import Stripe from "stripe";
import config from "../../../config";

const stripe = new Stripe(config.stripe.stripe_secret as string);

const createServiceIntoDB = async (req: Request) => {
  const payload = req.body;
  const providerId = req.user.id;
  const subCatId = payload.subCatId;

  const [existingProvider, existingSubCategory, existingService] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: providerId, role: "PROVIDER" },
      }),
      prisma.subCategory.findUnique({
        where: { id: subCatId },
      }),
      prisma.service.findFirst({
        where: { providerId, subCatId },
      }),
    ]);

  if (!existingProvider) {
    throw new ApiError(404, "Provider not found");
  }

  if (existingProvider.status === "Pending") {
    throw new ApiError(
      409,
      "Account pending admin approval. You’ll be notified once verified.",
    );
  }

  if (!existingSubCategory) {
    throw new ApiError(404, "Category not found");
  }

  const account = await stripe.accounts.retrieve(
    existingProvider.stripeCustomerId,
  );
  if (!account.charges_enabled) {
    const accountLink = await stripe.accountLinks.create({
      account: existingProvider.stripeCustomerId,
      refresh_url: "https://yourdomain.com/reauth",
      return_url: "http://72.60.125.50:5003/account/connect/success",
      // return_url: "https://admin.staylocal.online",
      type: "account_onboarding",
    });

    throw new ApiError(403, accountLink.url);
  }

  if (existingService) {
    throw new ApiError(400, "You already have a service under this category");
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const processImages = async (
    files: Express.Multer.File[],
    folder: string,
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/class/${folder}`)),
    );
  };

  const [mediaUrl] = await Promise.all([
    processImages(files?.mediaUrl, "mediaUrl"),
  ]);

  if (!mediaUrl) {
    throw new ApiError(404, "Media is required");
  }

  const service = await prisma.service.create({
    data: {
      ...payload,
      fee: Number(payload.fee),
      providerId,
      mediaUrl: mediaUrl?.[0] && mediaUrl[0],
    },
  });
  return service;
};

const getWorkersBySubCategoryID = async (
  userId: string,
  subCatId: string,
  duration?: string,
  availability?: string,
  gender?: string,
) => {
  const existingSubCategory = await prisma.subCategory.findUnique({
    where: { id: subCatId },
  });

  if (!existingSubCategory) {
    throw new ApiError(404, "Category not found");
  }

  const workers = await prisma.service.findMany({
    where: {
      status: true,
      subCatId,
      ...(duration && { duration }),
      ...(availability && {
        avability: {
          has: availability,
        },
      }),
      provider: {
        ...(gender && { gender: gender as Gender }),

        // 🔥 The real fix: exclude restricted providers
        restrictedByUsers: {
          none: { userId },
        },
      },
    },
    select: {
      fee: true,
      duration: true,
      title: true,
      address: true,
      mediaUrl: true,
      avability: true,
      provider: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          avgRating: true,
          totalReview: true,
          gender: true,
          // restrictedByUsers: {
          //   where: {
          //     userId,
          //   },
          //   select: {
          //     id: true,
          //   },
          // },
          favouriteByUser: {
            where: {
              userId,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (workers.length < 1) {
    throw new ApiError(404, "No workers found for this service");
  }

  return workers;
};

const updateServiceFromDb = async (req: Request) => {
  const serviceData = req.body;

  const existingService = await prisma.service.findUnique({
    where: { id: serviceData.serviceId },
  });

  if (!existingService) {
    throw new ApiError(404, "service not found");
  }

  const updatedService = await prisma.service.update({
    where: { id: serviceData.serviceId },
    data: {
      title: serviceData.title ? serviceData.title : existingService.title,
      description: serviceData.description
        ? serviceData.description
        : existingService.description,
      fee: serviceData.fee ? serviceData.fee : existingService.fee,
      address: serviceData.address
        ? serviceData.address
        : existingService.address,
      duration: serviceData.duration
        ? serviceData.duration
        : existingService.duration,
      avability: serviceData.avability
        ? serviceData.avability
        : existingService.avability,
    },
  });

  return updatedService;
};

const getServicesFromDB = async () => {
  const services = await prisma.service.findMany({
    select: {
      id: true,
      fee: true,
      title: true,
      mediaUrl: true,
      subCategory: {
        select: {
          id: true,
          subCatName: true,
        },
      },
      provider: {
        select: {
          id: true,
          profileImage: true,
          userName: true,
          avgRating: true,
        },
      },
    },
  });
  return services;
};
const getMyServicesFromDB = async (providerId: string) => {
  await prisma.user.findFirstOrThrow({
    where: { id: providerId, role: "PROVIDER" },
  });
  const services = await prisma.service.findMany({
    where: { providerId },
    select: {
      id: true,
      fee: true,
      title: true,
      mediaUrl: true,
      status: true,
      subCategory: {
        select: {
          id: true,
          subCatName: true,
          avgRating: true,
        },
      },
    },
  });
  return services;
};

const getServiceDetailsFromDb = async (serviceId: string) => {
  await prisma.service.findFirstOrThrow({
    where: { id: serviceId },
  });

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      subCategory: {
        select: {
          id: true,
          subCatName: true,
          category: {
            select: {
              id: true,
              categoryName: true,
            },
          },
        },
      },
    },
  });
  return service;
};

const getWorkerDetailsFromDb = async (
  userId: string,
  providerId: string,
  subCatId: string,
) => {
  const service = await prisma.service.findFirst({
    where: { providerId: providerId, subCatId },
  });
  const user = await prisma.user.findUnique({
    where: { id: providerId },
    include: {
      // Service: {
      //   select: {
      //     id: true,
      //     duration: true,
      //     fee: true,
      //     avability: true,
      //     address: true,
      //     subCategory: {
      //       select: {
      //         id: true,
      //         subCatName: true,
      //         mediaUrl: true,
      //       },
      //     },
      //   },
      // },
      favouriteByUser: {
        where: { userId },
        select: {
          id: true,
        },
      },
      receivedReviews: {
        select: {
          id: true,
          comment: true,
          rating: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = user;

  return {
    sanitizedUser,
    service,
  };
};
const getProviderProfileFromDb = async (userId: string, providerId: string) => {
  const service = await prisma.service.findMany({
    where: { providerId, status: true },
    include: {
      subCategory: {
        select: {
          id: true,
          subCatName: true,
          options: true,
          hodsCharge: true,
          charge: true,
        },
      },
    },
  });
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    include: {
      favouriteByUser: {
        where: { userId },
        select: {
          id: true,
        },
      },
      restrictedByUsers: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
      receivedReviews: {
        select: {
          id: true,
          comment: true,
          rating: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!provider) {
    throw new ApiError(404, "Provider not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = provider;

  return {
    sanitizedUser,
    service,
  };
};
const getUserProfileFromDb = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviewPro: {
        select: {
          id: true,
          comment: true,
          rating: true,
          createdAt: true,
          provider: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = user;

  return {
    sanitizedUser,
  };
};

const acceptRejectServiceIntoDB = async (serviceId: string, status: string) => {
  await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });

  if (status == "accept") {
    await prisma.service.update({
      where: { id: serviceId },
      data: { status: true },
    });

    return;
  } else {
    await prisma.service.delete({
      where: { id: serviceId },
    });
    return;
  }
};

const getProviderProfileFromDbForAdmin = async (providerId: string) => {
  const service = await prisma.service.findMany({
    where: { providerId },
    include: {
      subCategory: {
        select: {
          id: true,
          subCatName: true,
          options: true,
          hodsCharge: true,
          charge: true,
        },
      },
    },
  });
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    include: {
      receivedReviews: {
        select: {
          id: true,
          comment: true,
          rating: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!provider) {
    throw new ApiError(404, "Provider not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = provider;

  return {
    sanitizedUser,
    service,
  };
};

export const serviceServices = {
  createServiceIntoDB,
  getWorkersBySubCategoryID,
  getUserProfileFromDb,
  getProviderProfileFromDb,
  updateServiceFromDb,
  getServicesFromDB,
  getWorkerDetailsFromDb,
  getMyServicesFromDB,
  getServiceDetailsFromDb,
  acceptRejectServiceIntoDB,
  getProviderProfileFromDbForAdmin
};
