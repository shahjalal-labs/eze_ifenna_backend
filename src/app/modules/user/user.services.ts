import { PendingUser, User, UserRole } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import Stripe from "stripe";
import sendEmail from "../../../helpers/sendEmail";
import generateOTP from "../../../helpers/generateOtp";
import { emailBody } from "../../../shared/EmailTemplate";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

const stripe = new Stripe(config.stripe.stripe_secret as string);

//create new user
const createCustomerStripeAccount = async (email: string, name: string) => {
  const account = await stripe.customers.create({
    email,
    name,
  });
  return account;
};
//create new user
const createPendingUserIntoDB = async (payload: PendingUser) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(409, "Email already exists!");
  }

  const hashedPassword = await bcrypt.hash(payload.password as string, 10);
  const otp = generateOTP(); // 4-digit OTP
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Account Verification OTP";
  const html = emailBody(payload.userName, otp);

  await sendEmail(payload.email, subject, html);
  await prisma.pendingUser.upsert({
    where: {
      email: payload.email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: {
      ...payload,
      password: hashedPassword,
      otpCode: otp,      
      expiresAt: new Date(expiresAt),
    },
  });

  return otp;
};

//create new user
const resendVerifyOTP = async (email: string) => {
  const existingUser = await prisma.pendingUser.findFirst({
    where: { email: email },
  });
  if (!existingUser) {
    throw new ApiError(409, "User not found!");
  }

  const otp = generateOTP();
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Account Verification OTP";
  const html = emailBody(existingUser.userName, otp);

  await sendEmail(email, subject, html);
  await prisma.pendingUser.update({
    where: {
      email: email,
    },
    data: {
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
  });

  return otp;
};

//create new user
const createProviderIntoDB = async (email: string, otp: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: email },
  });
  if (existingUser) {
    throw new ApiError(409, "User Already exists!");
  }

  const userPending = await prisma.pendingUser.findUnique({
    where: { email: email },
  });
  if (!userPending) {
    throw new ApiError(409, "User doesn't exist!");
  }

  const { otpCode, expiresAt, userName } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.pendingUser.delete({
      where: {
        email: userPending.email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.pendingUser.delete({
    where: {
      email: email,
    },
  });
  const account = await stripe.accounts.create({
    type: "express",
    capabilities: {
      transfers: { requested: true },
    },
  });

  const user = await prisma.user.create({
    data: {
      email: email,
      password: userPending.password,
      userName: userName,
      phone: userPending.phone,
      stripeCustomerId: account.id,
      fcmToken: userPending.fcmToken,
      role: userPending.role as UserRole,
    },
  });
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "https://yourdomain.com/reauth",
    return_url: "http://72.60.125.50:5003/account/connect/success",
    type: "account_onboarding",
  });

  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, ...sanitizedUser } = user;

  return {
    accessToken,
    userInfo: sanitizedUser,
    accountLink,
  };
};
//create new user
const createUserIntoDB = async (email: string, otp: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: email },
  });
  if (existingUser) {
    throw new ApiError(409, "User Already exists!");
  }

  const userPending = await prisma.pendingUser.findUnique({
    where: { email: email },
  });
  if (!userPending) {
    throw new ApiError(409, "User doesn't exist!");
  }

  const { otpCode, expiresAt, userName } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.pendingUser.delete({
      where: {
        email: userPending.email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.pendingUser.delete({
    where: {
      email: email,
    },
  });
  const stripeAccount = await createCustomerStripeAccount(email, userName);

  const user = await prisma.user.create({
    data: {
      email: email,
      password: userPending.password,
      userName: userName,
      phone: userPending.phone,
      status: "Active",
      fcmToken: userPending.fcmToken,
      stripeCustomerId: stripeAccount.id,
      role: userPending.role as UserRole,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, ...sanitizedUser } = user;

  return {
    accessToken,
    userInfo: sanitizedUser,
  };
};
//auth login
const socialLoginIntoDB = async (payload: User) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });
  if (user) {
    const accessToken = jwtHelpers.generateToken(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );
    const { password, createdAt, updatedAt, ...userInfo } = user;

    return {
      accessToken,
      userInfo,
    };
  } else {
    const plainPassword = "12345Aa@";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const stripeAccount = await createCustomerStripeAccount(
      payload.email,
      payload.userName
    );
    const user = await prisma.user.create({
      data: {
        ...payload,
        stripeCustomerId: stripeAccount.id,
        password: hashedPassword,
      },
    });

    const accessToken = jwtHelpers.generateToken(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );
    const { password, createdAt, updatedAt, ...userInfo } = user;

    return {
      accessToken,
      userInfo,
    };
  }
};
//auth login
const socialLoginForProviderIntoDB = async (payload: User) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });
  if (user) {
    const accessToken = jwtHelpers.generateToken(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );
    const { password, createdAt, updatedAt, ...userInfo } = user;

    return {
      accessToken,
      userInfo,
    };
  } else {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://yourdomain.com/reauth",
      return_url: "https://admin.staylocal.online",
      type: "account_onboarding",
    });

    const plainPassword = "12345Aa@";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        ...payload,
        stripeCustomerId: account.id,
        password: hashedPassword,
      },
    });

    const accessToken = jwtHelpers.generateToken(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );
    const { password, createdAt, updatedAt, ...userInfo } = user;

    return {
      accessToken,
      userInfo,
      accountLink,
    };
  }
};

//get single user
const getSingleUserIntoDB = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

//get all users
const getUsersIntoDB = async () => {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      userName: true,
      email: true,
      profileImage: true,
      phone: true,
      address: true,
      status:true,
      _count: {
        select: {
          customerBookings: true,
        },
      },
    },
  });
  if (users.length === 0) {
    throw new ApiError(404, "Users not found!");
  }

  return users;
};
const getProvidersIntoDB = async () => {
  const users = await prisma.user.findMany({
    where: { role: "PROVIDER" },
    select: {
      id: true,
      userName: true,
      email: true,
      profileImage: true,
      phone: true,
      address: true,
      avgRating: true,
      status: true,
      _count: {
        select: {
          Service: true,
          providerBookings: {
            where: { isPaymentConfirmed: true },
          },
        },
      },
    },
  });
  if (users.length === 0) {
    throw new ApiError(404, "Users not found!");
  }

  return users;
};

//update user
const updateUserIntoDB = async (id: string, userData: any) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const existingUser = await getSingleUserIntoDB(id);
  if (!existingUser) {
    throw new ApiError(404, "user not found for edit user");
  }
  const updatedUser = await prisma.user.update({
    where: { id },
    data: userData,
  });

  const { password, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

//delete user
const deleteUserIntoDB = async (userId: string, loggedId: string) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  if (userId === loggedId) {
    throw new ApiError(403, "You can't delete your own account!");
  }
  const existingUser = await getSingleUserIntoDB(userId);
  if (!existingUser) {
    throw new ApiError(404, "user not found for delete this");
  }
  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

const getAdminAnalysisReportFromDB = async () => {
  const totalUser = await prisma.user.count({
    where: { role: "USER" },
  });

  const totalProvider = await prisma.user.count({
    where: { role: "PROVIDER" },
  });

  const totalServices = await prisma.subCategory.count();

  const completedBookings = await prisma.booking.findMany({
    where: { status: "COMPLETED", isPaymentShared: true },
    select: { totalFee: true },
  });

  const totalFeeSum = completedBookings.reduce((sum, booking) => {
    return sum + booking.totalFee;
  }, 0);

  const totalEarnings = Math.floor(totalFeeSum * 0.1);

  return {
    totalUser,
    totalProvider,
    totalServices,
    totalEarnings,
  };
};

const toggleFavourteProvider = async (userId: string, providerId: string) => {
  const [existingProvider, existingUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: providerId, role: "PROVIDER" } }),
    prisma.user.findUnique({ where: { id: userId, role: "USER" } }),
  ]);

  if (!existingUser) {
    throw new ApiError(404, "user not found");
  }

  if (!existingProvider) {
    throw new ApiError(404, "provider not found");
  }
  const existingFavourite = await prisma.favourite.findFirst({
    where: {
      userId,
      providerId,
    },
  });
  if (existingFavourite) {
    await prisma.favourite.delete({
      where: { id: existingFavourite.id },
    });
    return { message: "Provider removed from favourites" };
  }

  const favourite = await prisma.favourite.create({
    data: {
      userId,
      providerId,
    },
  });

  return { message: "Provider added to favourites", favourite };
};

const getFavouriteServicesFromDB = async (userId: string) => {
  const favourites = await prisma.favourite.findMany({
    where: { userId },
    select: {
      provider: {
        select: {
          id: true,
          profileImage: true,
          userName: true,
          email: true,
          address: true,
        },
      },
    },
  });
  return favourites;
};

const getRestrictionListFromDB = async (userId: string) => {
  const favourites = await prisma.restrict.findMany({
    where: { userId },
    select: {
      createdAt: true,
      provider: {
        select: {
          id: true,
          profileImage: true,
          userName: true,
        },
      },
    },
  });
  return favourites;
};

const toggleRestrictIntoDB = async (userId: string, providerId: string) => {
  const [existingProvider, existingUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: providerId, role: "PROVIDER" } }),
    prisma.user.findUnique({ where: { id: userId, role: "USER" } }),
  ]);

  if (!existingUser) {
    throw new ApiError(404, "user not found");
  }

  if (!existingProvider) {
    throw new ApiError(404, "provider not found");
  }
  const existingRetrict = await prisma.restrict.findFirst({
    where: {
      userId,
      providerId,
    },
  });
  if (existingRetrict) {
    await prisma.restrict.delete({
      where: { id: existingRetrict.id },
    });
    return { message: "Provider removed from restricted list" };
  }

  const restrict = await prisma.restrict.create({
    data: {
      userId,
      providerId,
    },
  });

  return { message: "Provider added to restricted list", restrict };
};

const getUsersByTime = async (type: "daily" | "weekly" | "monthly") => {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      createdAt: true,
      profileImage: true,
    },
  });

  if (users.length === 0) {
    throw new ApiError(404, "Users not found!");
  }

  const now = new Date();
  let startDate: Date;

  if (type === "daily") {
    startDate = startOfDay(now);
  } else if (type === "weekly") {
    startDate = startOfWeek(now, { weekStartsOn: 1 });
  } else {
    startDate = startOfMonth(now);
  }

  const filteredUsers = users.filter(
    (user) => new Date(user.createdAt) >= startDate
  );

  return {
    totalUsers: filteredUsers.length,
    profileImages: filteredUsers.map((u) => u.profileImage).filter(Boolean),
  };
};

export const userService = {
  createUserIntoDB,
  getUsersByTime,
  createPendingUserIntoDB,
  getFavouriteServicesFromDB,
  toggleRestrictIntoDB,
  getUsersIntoDB,
  getSingleUserIntoDB,
  updateUserIntoDB,
  toggleFavourteProvider,
  deleteUserIntoDB,
  socialLoginIntoDB,
  resendVerifyOTP,
  createProviderIntoDB,
  socialLoginForProviderIntoDB,
  getProvidersIntoDB,
  getAdminAnalysisReportFromDB,
  getRestrictionListFromDB
};
