import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import { User, UserLocation } from "@prisma/client";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { markActiveMessage } from "../../../shared/EmailTemplate";

//login user
const loginUserIntoDB = async (payload: any) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if(user.status == "Blocked"){
    throw new ApiError(404, "User account deactivated by HODS");
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user?.password
  );

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      userName: user.userName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, createdAt, updatedAt, phone, gender, ...userInfo } = user;

  return {
    accessToken,
    userInfo,
  };
};
//auth login
const authLoginIntoDB = async (payload: User) => {
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
    const user = await prisma.user.create({
      data: {
        ...payload,
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

//update or add user location
const userLocationUpdateInDB = async (
  userId: string,
  userLocation: UserLocation
) => {
  const location = await prisma.userLocation.findFirst({
    where: { userId: userId },
  });
  if (!location) {
    const result = await prisma.userLocation.create({
      data: { ...userLocation, userId: userId },
    });

    return result;
  }

  const result = await prisma.userLocation.update({
    where: { id: location.id },
    data: userLocation,
  });

  return result;
};

//send forgot password otp
const sendForgotPasswordOtpDB = async (email: string) => {
  const existringUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (!existringUser) {
    throw new ApiError(404, "User not found");
  }
  // Generate OTP and expiry time
  const otp = generateOTP(); // 4-digit OTP
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minute
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Password Reset OTP";
  const html = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Password Reset Request</h2>
    <p>Hi <b>${existringUser.userName}</b>,</p>
    <p>Your OTP for password reset is:</p>
    <h1 style="color: #007BFF;">${otp}</h1>
    <p>This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
    <p>Thanks, <br>The Support Team</p>
  </div>
`;
  await sendEmail(email, subject, html);
  await prisma.otp.upsert({
    where: {
      email: email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: { email: email, otpCode: otp, expiresAt: new Date(expiresAt) },
  });

  return otp;
};

//create new user
const resendForgotPasswordOTP = async (email: string) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: email },
  });
  if (!existingUser) {
    throw new ApiError(409, "User not found!");
  }
  const existInOTP = await prisma.otp.findFirst({
    where: { email: email },
  });
  if (!existInOTP) {
    throw new ApiError(409, "User not found!");
  }

  const otp = generateOTP();
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Password Reset OTP";
  const html = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Password Reset Request</h2>
    <p>Hi <b>${existingUser.userName}</b>,</p>
    <p>Your OTP for password reset is:</p>
    <h1 style="color: #007BFF;">${otp}</h1>
    <p>This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
    <p>Thanks, <br>The Support Team</p>
  </div>
`;

  await sendEmail(email, subject, html);
  await prisma.otp.update({
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

// verify otp code
const verifyForgotPasswordOtpCodeDB = async (payload: any) => {
  const { email, otp } = payload;

  if (!email && !otp) {
    throw new ApiError(400, "Email and OTP are required.");
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userId = user.id;

  const verifyData = await prisma.otp.findUnique({
    where: {
      email: email,
    },
  });

  if (!verifyData) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  const { otpCode: savedOtp, expiresAt } = verifyData;

  if (otp !== savedOtp) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.otp.delete({
      where: {
        email: email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.otp.delete({
    where: {
      email: email,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    { id: userId, email },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  return { accessToken: accessToken };
};

// reset password
const resetForgotPasswordDB = async (newPassword: string, userId: string) => {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new ApiError(404, "user not found");
  }
  const email = existingUser.email as string;
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt)
  );

  const result = await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      password: hashedPassword,
    },
  });
  const { password, ...userInfo } = result;
  return userInfo;
};

// get profile for logged in user
const getProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      Service: {
        select: {
          id: true,
          duration: true,
          fee: true,
          avability: true,
          address: true,
          subCategory: {
            select: {
              id: true,
              subCatName: true,
              mediaUrl: true,
            },
          },
        },
      },
      receivedReviews: {
        select: {
          id: true,
          comment: true,
          rating: true,
        },
      },
    },
  });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = user;

  return sanitizedUser;
};

// update user profile only logged in user
const updateProfileIntoDB = async (req: Request) => {
  const userId = req.user.id;
  const userData = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "user not found for edit user");
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

  const [profileImage] = await Promise.all([
    processImages(files?.profileImage, "profileImage"),
  ]);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userData,
      ...(profileImage?.[0] && { profileImage: profileImage[0] }),
      isSetup: true,
    },
  });

  const { password, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

const changePasswordFromDB = async (
  userId: string,
  newPassword: string,
  oldPassword: string
) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (
    !existingUser ||
    !(await bcrypt.compare(oldPassword, existingUser.password))
  ) {
    throw new Error("Invalid old password");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt)
  );

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    }),
  ]);

  const { password, ...userInfo } = updatedUser;
  return userInfo;
};

const markProviderAsActiveIntoDB = async (providerId: string) => {
  const provider = await prisma.user.findUniqueOrThrow({
    where: { id: providerId },
  });

  const subject = "Account Verified – You're All Set!";

  const html = markActiveMessage(provider.userName);

  await sendEmail(provider.email, subject, html);

  await prisma.user.update({
    where: { id: providerId },
    data: { status: "Active" },
  });
  return;
};

const updateIdCardIntoDB = async (req: Request) => {
  const userId = req.user.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

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

  const [idFront, idBack] = await Promise.all([
    processImages(files?.idFront, "idFront"),
    processImages(files?.idBack, "idBack"),
  ]);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      idBack: idBack?.[0] ?? user.idBack,
      idFront: idFront?.[0] ?? user.idFront,
    },
  });
  return;
};

const handleToggleUserBlocking = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  await prisma.user.update({
    where: { id },
    data: { status: user.status == "Blocked" ? "Active" : "Blocked" },
  });

  return {
    message: `${
      user.status == "Blocked"
        ? "User activated successfully"
        : "User deactivated successfully"
    }`,
  };
};

export const authService = {
  loginUserIntoDB,
  handleToggleUserBlocking,
  getProfileFromDB,
  updateProfileIntoDB,
  userLocationUpdateInDB,
  sendForgotPasswordOtpDB,
  verifyForgotPasswordOtpCodeDB,
  updateIdCardIntoDB,
  markProviderAsActiveIntoDB,
  resetForgotPasswordDB,
  resendForgotPasswordOTP,
  authLoginIntoDB,
  changePasswordFromDB,
};
